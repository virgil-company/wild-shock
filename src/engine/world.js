import { SAVE_VERSION, SHRINE_TYPES, SIZE, getModeConfig } from '../data/constants.js';
import { companions, encounterTable, pick, realmBosses, unitStats, units } from '../data/bestiary.js';
import { chooseMutators, vaults, weekSeed } from '../data/campaign.js';
import {
  componentByName, equipment, equipmentByName, getEquippedItems, getSpellUpgradeId,
  knownSpellIds, spellByName, spells, tagMastery,
} from '../rules/core.js';
import { areaCells, distance, findOpenTileNear, isPassable, isTileOccupied, random, shortestPath } from './grid.js';
import { availableSpells, awardPoints, finalRealmOf, log } from './context.js';
import { cleanup } from './combat.js';
import { recruitCompanion, spawnAlly, summonCreature } from './units.js';
import { freeCast } from './spells.js';
import { collectItem, equipmentAction } from './actions.js';

const allComponents = [...componentByName.values()];

export function createGame(seed = Date.now() % 2147483647, { mode = 'standard', selectedMutators = [], now = Date.now() } = {}) {
  if (mode === 'weekly') seed = weekSeed(now);
  const cfg = getModeConfig(mode);
  const isClassicMode = cfg.id !== 'standard';
  const game = {
    version: SAVE_VERSION, seed, mode: cfg.id, realm: 1, turn: 0, points: cfg.startPoints,
    learned: [],
    spells: [...cfg.starterSpells], spellUpgrades: {}, spellBoosts: {},
    components: [], equipment: {},
    player: { x: 3, y: 11, hp: 55, shield: 0, shields: isClassicMode ? 2 : 0, resistances: {}, statuses: {} },
    mutators: chooseMutators(mode, selectedMutators, random(seed)), vault: null, defeatedSpecies: [], clearedVaults: [],
    riftRoll: 0, rerolls: 1, rerolledRealms: [], pendingReward: null,
    offeringTags: [], realmTurn: 0, lastCast: null, lastEffect: null, damagedPlayerBy: null,
    bonusMaxHp: 0, allies: [], clouds: [], buffs: [], channel: null, quickstepUsed: false,
    charges: {}, potions: cfg.potions ? 3 : 0, kills: 0, status: 'playing', log: [], effects: [], theme: 0,
    progress: { damageDealt: 0, pointsEarned: 0, pointsSpent: 0, spellsCast: 0, staffStrikes: 0, potionsUsed: 0, realmsCleared: 0 },
  };
  if (mode === 'trial-improviser') {
    const rng = random(seed);
    const quarter = list => {
      const pool = [...list];
      const count = Math.ceil(pool.length / 4);
      return Array.from({ length: count }, () => pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    };
    const poolSpells = quarter(spells.filter(s => !s.granted_by && !game.spells.includes(s.id)));
    game.allowedSpells = [...game.spells, ...poolSpells.map(s => s.id)];
    game.allowedEquipment = quarter(equipment).map(e => e.name);
  }
  generateRealm(game);
  log(game, 'log.start', {}, 'gold');
  return game;
}

export function generateRealm(game) {
  const cfg = getModeConfig(game.mode);
  const rng = random(game.seed + game.realm * 7919 + game.theme * 101 + (game.riftRoll || 0) * 557 + (game.riftVariant || 0) * 65537);
  const tiles = Array.from({ length: SIZE }, (_, y) =>
    Array.from({ length: SIZE }, (_, x) => (x === 0 || y === 0 || x === SIZE - 1 || y === SIZE - 1 ? 1 : rng() < 0.13 ? 1 : 0)));
  game.tiles = tiles;

  // Carve a connected backbone, then keep only the component reachable from spawn using flat typed arrays.
  for (let i = 1; i < SIZE - 1; i++) { tiles[11][i] = 0; tiles[i][3] = 0; tiles[i][19] = 0; }
  const reachable = new Uint8Array(SIZE * SIZE);
  const queue = [{ x: 3, y: 11 }];
  reachable[11 * SIZE + 3] = 1;
  for (let i = 0; i < queue.length; i++) {
    const q = queue[i];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = q.x + dx, y = q.y + dy;
      const idx = y * SIZE + x;
      if (tiles[y]?.[x] === 0 && !reachable[idx]) {
        reachable[idx] = 1;
        queue.push({ x, y });
      }
    }
  }
  for (let y = 1; y < SIZE - 1; y++) {
    for (let x = 1; x < SIZE - 1; x++) {
      if (!reachable[y * SIZE + x]) tiles[y][x] = 1;
    }
  }

  // Convert a few non-backbone wall tiles into chasms (tile === 2) for flying & ice-bridging tactics.
  if (game.realm >= 2) {
    for (let y = 2; y < SIZE - 2; y++) {
      for (let x = 5; x < SIZE - 5; x++) {
        if (tiles[y][x] === 1 && rng() < 0.18) tiles[y][x] = 2;
      }
    }
  }

  game.player.x = 3; game.player.y = 11;
  game.player.shield = 0;
  game.player.shields = (cfg.id !== 'standard' ? 2 : 0) + (game.player.shields || 0);
  if (game.player.shields > 12) game.player.shields = 12;
  game.player.statuses = {};
  game.allies = []; game.clouds = []; game.buffs = []; game.channel = null; game.quickstepUsed = false;
  game.enemies = []; game.items = []; game.portals = [{ x: 19, y: 7, theme: 0 }, { x: 19, y: 15, theme: 1 }];

  // Flat occupancy grid avoids O(N*M) string splitting when placing multi-tile footprints.
  const occupied = new Uint8Array(SIZE * SIZE);
  occupied[11 * SIZE + 3] = 1;
  occupied[7 * SIZE + 19] = 1;
  occupied[15 * SIZE + 19] = 1;

  const spawnable = queue.filter(p => p.x > 6);
  function position(radius = 0) {
    if (radius) {
      const centers = [];
      for (let i = 0; i < spawnable.length; i++) {
        const p = spawnable[i];
        if (p.x - radius <= 6 || p.x + radius >= SIZE - 1 || p.y - radius <= 0 || p.y + radius >= SIZE - 1) continue;
        let free = true;
        for (let y = p.y - radius; y <= p.y + radius && free; y++) {
          for (let x = p.x - radius; x <= p.x + radius; x++) {
            if (occupied[y * SIZE + x]) { free = false; break; }
          }
        }
        if (free) centers.push(p);
      }
      const center = pick(centers, rng);
      if (!center) return null;
      for (let y = center.y - radius; y <= center.y + radius; y++) {
        for (let x = center.x - radius; x <= center.x + radius; x++) {
          occupied[y * SIZE + x] = 1;
          tiles[y][x] = 0;
        }
      }
      return { ...center };
    }
    const choices = spawnable.filter(p => !occupied[p.y * SIZE + p.x]);
    const p = pick(choices, rng);
    occupied[p.y * SIZE + p.x] = 1;
    return { ...p };
  }

  const finalRealm = finalRealmOf(game);
  const isFinalBossRealm = game.realm === finalRealm;
  game.realmTurn = 0;
  game.lastCast = null;
  game.lastEffect = null;
  game.damagedPlayerBy = null;
  const roster = encounterTable(game.realm, finalRealm, rng, game.theme);
  const bossChoiceRealm = cfg.id !== 'standard' && game.realm === 20;
  if (bossChoiceRealm) {
    const index = Math.floor(random(game.seed + game.realm * 311 + game.riftRoll * 557)() * realmBosses.length);
    roster.boss = realmBosses[(index + game.theme) % realmBosses.length];
  }
  if (isFinalBossRealm && cfg.id !== 'standard') roster.boss = units.get('Mordred');
  game.vault = game.realm >= 3 && !isFinalBossRealm && !bossChoiceRealm && game.theme === 1 && (game.realm % 4 === 0 || rng() < 0.15)
    ? pick(Object.keys(vaults), rng)
    : null;
  if (game.vault) {
    const [guardian, ...names] = vaults[game.vault];
    roster.elite = units.get(guardian);
    roster.group = names.map(n => units.get(n));
  }
  if (game.riftAffinity) {
    const candidates = [...units.values()].filter(u => u.is_monster && u.difficulty && u.tags.includes(game.riftAffinity));
    if (candidates.length) roster.group = [pick(candidates, rng)];
  }

  const count = Math.min(5 + game.realm, 16);
  for (let i = 0; i < count; i++) {
    const boss = i === 0 && (isFinalBossRealm || bossChoiceRealm || game.realm % 6 === 0);
    let def = (isFinalBossRealm || bossChoiceRealm) && boss ? roster.boss : boss || (i === 0 && (game.vault || game.realm >= 4)) ? roster.elite : pick(roster.group, rng);
    let pos = position(def.radius);
    if (!pos) { def = units.get('Goblin'); pos = position(); }
    const enemy = unitStats(def);
    enemy.hp = enemy.maxHp = Math.max(1, Math.round(enemy.hp * cfg.enemyHpMult));
    if (game.mutators?.includes('enemyResistance')) enemy.resistances.Fire = Math.min(100, (enemy.resistances.Fire || 0) + 50);
    game.enemies.push({ ...enemy, ...pos, id: i, school: (i + game.theme) % 12, boss, isFinalBoss: boss && isFinalBossRealm });
  }

  // Spawn destructible Rift Lairs (Spawners) from Realm 3 onward (1–2 per realm).
  if (game.realm >= 3) {
    const lairCount = game.realm >= 12 ? 2 : 1;
    for (let s = 0; s < lairCount; s++) {
      const spawnerHp = Math.round((24 + game.realm * 3) * cfg.enemyHpMult);
      game.enemies.push({
        ...position(), id: 100 + s, type: 2,
        name: 'Rift Lair', hp: spawnerHp, maxHp: spawnerHp,
        damage: 0, range: 0, school: (game.realm + s) % 12,
        boss: false, isSpawner: true, spawnCooldown: 4, maxCooldown: 5,
        spawnType: (game.realm + s) % 4, spawnSpecies: roster.group[s % roster.group.length].name,
        tags: ['Arcane', 'Construct'], resistances: { Poison: 100, Dark: 25 },
        shields: 1, flying: false, statuses: {},
      });
    }
  }

  for (let i = 0; i < 3; i++) {
    const itemType = i === 2 ? (cfg.potions ? 'potion' : 'shard') : 'shard';
    game.items.push({ ...position(), type: itemType });
  }
  const tier = Math.min(3, 1 + Math.floor(game.realm / 4));
  const rewardTags = [...(cfg.allowedTags || []), ...(game.offeringTags || [])];
  for (let i = 0; i < 4; i++) {
    const rare = i === 3 && rng() < 0.2;
    const pool = allComponents.filter(c => c.tier <= tier && c.rare === rare);
    const favored = pool.filter(c => rewardTags.some(tag => c.tags.includes(tag)));
    const component = pick(favored.length && rng() < 0.6 ? favored : pool, rng);
    game.items.push({ ...position(), type: 'component', name: component.name });
  }

  if (game.vault === 'the Fettered Fae') {
    const ally = spawnAlly(game, position(), { ...unitStats(units.get('Fae Queen')), name: 'Great Faery', skipSummonHooks: true });
    ally.rescue = true;
  } else if (!game.vault && game.realm % 5 === 3) {
    game.items.push({ ...position(), type: 'companion', name: pick(companions, rng).name });
  }
  if ((game.vault && game.vault !== 'the Fettered Fae') || game.mode === 'trial-scavenger') {
    const kinds = game.mode === 'trial-scavenger' ? ['scroll', 'chest'] : ['chest'];
    const known = new Set(knownSpellIds(game));
    for (const type of kinds) {
      const pool = type === 'scroll'
        ? spells.filter(s => !s.granted_by && !known.has(s.id)).map(s => s.id)
        : [...(game.allowedEquipment || equipment.map(e => e.name))];
      const options = [];
      while (pool.length && options.length < (game.mode === 'trial-scavenger' ? 4 : 3)) {
        options.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
      }
      if (options.length) game.items.push({ ...position(), type, options });
    }
  }
  game.riftRoll = 0;
  game.rerolls = 1 + Object.values(game.equipment).filter(e => e.components.includes('Skeleton Key') && equipmentByName.get(e.name)?.tags.includes('Translocation')).length;
  if (game.realm % 5 === 0) {
    const candidates = availableSpells(game).filter(s => s.maxCharges > 0);
    if (candidates.length) game.items.push({ ...position(), type: 'tome', spellId: pick(candidates, rng).id });
  }
  const shrineType = game.realm === 1 ? 'transmutation' : SHRINE_TYPES[(game.realm + game.theme) % SHRINE_TYPES.length];
  game.shrine = { ...position(), type: shrineType, uses: shrineType === 'transmutation' ? 3 : 1 };
  game.charges = Object.fromEntries(availableSpells(game).map(s => [s.id, s.maxCharges]));
  game.effects = [];
  if (!game.deploying) enterRealmEffects(game);
}

export function enterRealmEffects(game) {
  const drake = spellByName.get('Void Drake');
  const mutId = getSpellUpgradeId(drake, 'Void Mutations');
  if (mutId != null && game.spellUpgrades[drake.id]?.includes(mutId)) {
    const mastery = tagMastery(game, 'Arcane');
    const boost = game.spellBoosts['spell-' + drake.id] ??= {};
    boost.voidMutations = (boost.voidMutations || 0) + mastery;
  }
  for (const member of game.companions || []) {
    const ally = summonCreature(game, member.species, game.player);
    if (ally) { ally.name = member.name; ally.companion = true; }
  }
  equipmentAction(game, 'enter');
  for (const item of getEquippedItems(game)) {
    if (item.name === 'Flame of Findias') {
      for (const e of game.enemies) for (const tag of Object.keys(e.resistances)) e.resistances[tag] = Math.trunc(e.resistances[tag] / 2);
    }
    if (item.name === 'Boreal Armor') game.player.shields += 7;
    if (item.name === 'Glaive of Gorias') {
      for (const spell of availableSpells(game).filter(s => s.damage > 0)) {
        const boost = game.spellBoosts[spell.id] ??= {};
        boost.damage = (boost.damage || 0) + spell.level;
      }
    }
    if (item.name === "Tzango's Cleaver") {
      for (const enemy of game.enemies.filter(e => distance(game.player, e) <= 1).slice(0, 2)) freeCast(game, 'Death Shock', enemy);
    }
  }
}

export function deploy(game, target) {
  if (!game.deploying || game.status !== 'playing' || !Number.isInteger(target?.x) || !Number.isInteger(target?.y) || !isPassable(game, target.x, target.y)) return false;
  if (distance(game.player, target) && isTileOccupied(game, target.x, target.y)) return false;
  game.player.x = target.x; game.player.y = target.y; game.deploying = false;
  enterRealmEffects(game);
  const item = game.items.find(i => !distance(i, target));
  if (item) collectItem(game, item);
  cleanup(game);
  return true;
}

export function addEquipmentRift(game, item) {
  const tag = item.desc.match(/a Rift containing \[(\w+):/i)?.[1];
  if (item.name !== 'Rift Key Staff' && !tag) return;
  const props = [...game.portals, ...game.items, game.shrine].filter(Boolean);
  const candidates = areaCells(game.player, SIZE).filter(p => isPassable(game, p.x, p.y) && !isTileOccupied(game, p.x, p.y) && !props.some(o => !distance(o, p)));
  const variant = Math.max(0, ...game.portals.map(r => r.variant || 0)) + 1;
  const pos = pick(candidates, random(game.seed + game.realm * 17 + variant));
  if (pos) game.portals.push({ ...pos, theme: variant % 2, variant, affinity: tag || null });
}

export function finishRealm(game) {
  equipmentAction(game, 'clear');
  awardPoints(game, 6 + Math.floor(game.realm / 3));
  const rescued = game.allies.find(a => a.rescue && a.hp > 0);
  if (rescued) recruitCompanion(game, rescued.species, rescued.name, rescued);
  if (game.vault && (game.vault !== 'the Fettered Fae' || rescued) && !game.clearedVaults.includes(game.vault)) {
    game.clearedVaults.push(game.vault);
  }
  game.allies = []; game.clouds = []; game.channel = null; game.damagedPlayerBy = null;
  game.buffs = (game.buffs || []).filter(b => b.name === 'Relocator Beacon');
  if (!game.portals.length) {
    const pos = findOpenTileNear(game, game.player, SIZE) || game.player;
    game.portals.push({ x: pos.x, y: pos.y, theme: game.theme });
  }
  for (const item of getEquippedItems(game)) addEquipmentRift(game, item);
  for (const prop of [...game.items, ...game.portals, game.shrine].filter(Boolean)) {
    game.tiles[prop.y][prop.x] = 0;
    if (shortestPath(game, game.player, prop)) continue;
    for (let x = Math.min(prop.x, game.player.x); x <= Math.max(prop.x, game.player.x); x++) game.tiles[game.player.y][x] = 0;
    for (let y = Math.min(prop.y, game.player.y); y <= Math.max(prop.y, game.player.y); y++) game.tiles[y][prop.x] = 0;
  }
  log(game, 'log.cleared', {}, 'gold');
}

export function rerollRifts(game) {
  if (game.status !== 'playing' || game.realm >= finalRealmOf(game) || !game.rerolls || game.pendingReward) return false;
  game.rerolls--;
  game.riftRoll++;
  if (!game.rerolledRealms.includes(game.realm)) game.rerolledRealms.push(game.realm);
  return true;
}

export function previewPortal(game, destination) {
  if (game.realm >= finalRealmOf(game)) return null;
  const portal = typeof destination === 'number' ? { theme: destination } : destination;
  // Lightweight snapshot with only the state read or mutated by generateRealm().
  const preview = {
    seed: game.seed,
    mode: game.mode,
    realm: game.realm + 1,
    turn: game.turn,
    theme: portal.theme,
    riftRoll: game.riftRoll || 0,
    riftVariant: portal.variant || 0,
    riftAffinity: portal.affinity || null,
    mutators: [...(game.mutators || [])],
    offeringTags: [...(game.offeringTags || [])],
    spells: [...(game.spells || [])],
    spellUpgrades: Object.fromEntries(Object.entries(game.spellUpgrades || {}).map(([k, v]) => [k, [...v]])),
    spellBoosts: Object.fromEntries(Object.entries(game.spellBoosts || {}).map(([k, v]) => [k, { ...v, ...(v.tags ? { tags: [...v.tags] } : {}) }])),
    equipment: Object.fromEntries(Object.entries(game.equipment || {}).map(([k, v]) => [k, { ...v, components: [...(v.components || [])] }])),
    allowedEquipment: game.allowedEquipment ? [...game.allowedEquipment] : undefined,
    components: [...(game.components || [])],
    companions: (game.companions || []).map(c => ({ ...c })),
    points: game.points,
    bonusMaxHp: game.bonusMaxHp || 0,
    player: { ...game.player, resistances: { ...(game.player.resistances || {}) }, statuses: {} },
    progress: { ...game.progress },
    log: [],
    deploying: game.mode !== 'standard',
  };
  generateRealm(preview);
  return {
    enemies: preview.enemies.length,
    spawners: preview.enemies.filter(e => e.isSpawner).length,
    boss: preview.enemies.some(e => e.boss),
    vault: preview.vault,
    species: [...new Set(preview.enemies.map(e => e.name))],
    schools: [...new Set(preview.enemies.map(e => e.school))],
    components: preview.items.filter(i => i.type === 'component').map(i => i.name),
    shrine: preview.shrine?.type || 'transmutation',
  };
}
