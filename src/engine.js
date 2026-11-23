import { equipmentEvent } from './equipment-effects.js';
import { resolveSpellEffect } from './spell-effects.js';
import { vaults, weekSeed, chooseMutators, mutators } from './campaign.js';
import { resolvePickup } from './component-effects.js';
import { units, realmBosses, companions, covers, summonedBy, deathSummons, encounterTable, pick, readyAttack, unitStats } from './bestiary.js';
import { namedKey, textRef, enemyNameKey } from './text-keys.js';
import { migrateLogEntry } from './log-migration.js';
import { nodeMap, spellInfo } from './catalog.js';
import { enhanceSpell } from './artifacts.js';
import {
  addComponent, forge as forgeEquipment, equipItem, equipmentByName, componentByName, spellById,
  effectiveRw3Spell, canLearnRw3Spell, canLearnRw3Upgrade,
  getEquipmentModifiers, computeElementalDamage,
  knownSpellIds, transmutationChoices, getEquippedItems, spellByName, rw3Spells, rw3Equipment, rw3Tags,
  SHRINE_TYPES, CLOUD_TYPES, getModeConfig, GAME_MODES,
} from './rw3.js';

const SAVE_VERSION = 2;
export const SIZE = 23;
export const FINAL_REALM = 100;

const ENEMY_ARCHETYPES = [
  { name: 'Cinder imp', tags: ['Demon', 'Fire'], resistances: { Fire: 75, Ice: -50 }, flying: false, shields: 0 },
  { name: 'Hollow knight', tags: ['Undead', 'Metallic'], resistances: { Dark: 50, Poison: 100, Holy: -50 }, flying: false, shields: 1 },
  { name: 'Thorn eye', tags: ['Arcane', 'Nature', 'Eye'], resistances: { Arcane: 50, Poison: 50, Fire: -25 }, flying: true, shields: 1 },
  { name: 'Rift moth', tags: ['Living', 'Lightning'], resistances: { Lightning: 75, Physical: -25 }, flying: true, shields: 0 },
];

export const distance = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
export function random(seed) { let state = seed >>> 0; return () => { state += 0x6D2B79F5; let n = state; n = Math.imul(n ^ n >>> 15, n | 1); n ^= n + Math.imul(n ^ n >>> 7, n | 61); return ((n ^ n >>> 14) >>> 0) / 4294967296; }; }
export function log(game, key, params = {}, tone = '') { game.log.unshift({ key, params, tone, turn: game.turn }); game.log = game.log.slice(0, 60); }
export function finalRealmOf(game) { return getModeConfig(game.mode).finalRealm; }
export function maxHealth(game) {
  return 55 + (game.bonusMaxHp || 0);
}

export function createGame(seed = Date.now() % 2147483647, { mode = 'standard', selectedMutators = [], now = Date.now() } = {}) {
  if (mode === 'weekly') seed = weekSeed(now);
  const cfg = getModeConfig(mode);
  const isRw3Mode = cfg.id !== 'standard';
  const game = {
    version: SAVE_VERSION, seed, mode: cfg.id, realm: 1, turn: 0, points: cfg.startPoints,
    learned: [],
    rw3Spells: [...cfg.starterRw3], rw3Upgrades: {}, spellBoosts: {},
    rw3Components: [], equipment: {},
    player: { x: 3, y: 11, hp: 55, shield: 0, shields: isRw3Mode ? 2 : 0, resistances: {}, statuses: {} },
    mutators: chooseMutators(mode, selectedMutators, random(seed)), vault: null, defeatedSpecies: [], clearedVaults: [],
    riftRoll: 0, rerolls: 1, rerolledRealms: [], pendingReward: null,
    offeringTags: [], realmTurn: 0, lastCast: null,
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
    const spells = quarter(rw3Spells.filter(s => !s.granted_by && !game.rw3Spells.includes(s.id)));
    game.allowedSpells = [...game.rw3Spells, ...spells.map(s => s.id)];
    game.allowedEquipment = quarter(rw3Equipment).map(e => e.name);
  }
  generateRealm(game);
  log(game, 'log.start', {}, 'gold');
  return game;
}

export function availableSpells(game) {
  return knownSpellIds(game).map(id => effectiveRw3Spell(game, id)).filter(Boolean);
}

export function generateRealm(game) {
  const cfg = getModeConfig(game.mode);
  const rng = random(game.seed + game.realm * 7919 + game.theme * 101 + (game.riftRoll || 0) * 557 + (game.riftVariant || 0) * 65537);
  game.tiles = Array.from({ length: SIZE }, (_, y) => Array.from({ length: SIZE }, (_, x) => x === 0 || y === 0 || x === SIZE - 1 || y === SIZE - 1 ? 1 : rng() < .13 ? 1 : 0));
  // Carve a connected backbone, then keep only the component reachable from spawn.
  for (let i = 1; i < SIZE - 1; i++) { game.tiles[11][i] = 0; game.tiles[i][3] = 0; game.tiles[i][19] = 0; }
  const reachable = new Set(['3,11']), queue = [{ x: 3, y: 11 }];
  for (let i = 0; i < queue.length; i++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const x = queue[i].x + dx, y = queue[i].y + dy, key = `${x},${y}`;
    if (game.tiles[y]?.[x] === 0 && !reachable.has(key)) { reachable.add(key); queue.push({ x, y }); }
  }
  for (let y = 1; y < SIZE - 1; y++) for (let x = 1; x < SIZE - 1; x++) if (!reachable.has(`${x},${y}`)) game.tiles[y][x] = 1;

  // Convert a few non-backbone wall tiles into chasms (tile === 2) for flying & ice-bridging tactics.
  if (game.realm >= 2) {
    for (let y = 2; y < SIZE - 2; y++) for (let x = 5; x < SIZE - 5; x++) {
      if (game.tiles[y][x] === 1 && rng() < 0.18) game.tiles[y][x] = 2;
    }
  }

  game.player.x = 3; game.player.y = 11;
  game.player.shield = 0;
  game.player.shields = (cfg.id !== 'standard' ? 2 : 0) + (game.player.shields || 0);
  if (game.player.shields > 12) game.player.shields = 12;
  game.player.statuses = {};
  game.allies = []; game.clouds = []; game.buffs = []; game.channel = null; game.quickstepUsed = false;
  game.enemies = []; game.items = []; game.portals = [{ x: 19, y: 7, theme: 0 }, { x: 19, y: 15, theme: 1 }];
  const occupied = new Set(['3,11', '19,7', '19,15']);
  function position(radius = 0) {
    const choices = queue.filter(p => p.x > 6 && !occupied.has(`${p.x},${p.y}`));
    if (radius) {
      const centers = choices.filter(p => p.x - radius > 6 && p.x + radius < SIZE - 1 && p.y - radius > 0 && p.y + radius < SIZE - 1
        && [...occupied].every(key => { const [x, y] = key.split(',').map(Number); return !covers({ ...p, radius }, { x, y }); }));
      const center = pick(centers, rng);
      if (!center) return null;
      for (let y = center.y - radius; y <= center.y + radius; y++) for (let x = center.x - radius; x <= center.x + radius; x++) {
        occupied.add(`${x},${y}`); game.tiles[y][x] = 0;
      }
      return { ...center };
    }
    const p = pick(choices, rng);
    occupied.add(`${p.x},${p.y}`);
    return { ...p };
  }
  const finalRealm = finalRealmOf(game);
  const isFinalBossRealm = game.realm === finalRealm;
  game.realmTurn = 0;
  game.lastCast = null;
  const roster = encounterTable(game.realm, finalRealm, rng, game.theme);
  const bossChoiceRealm = cfg.id !== 'standard' && game.realm === 20;
  if (bossChoiceRealm) {
    const index = Math.floor(random(game.seed + game.realm * 311 + game.riftRoll * 557)() * realmBosses.length);
    roster.boss = realmBosses[(index + game.theme) % realmBosses.length];
  }
  if (isFinalBossRealm && cfg.id !== 'standard') roster.boss = units.get('Mordred');
  game.vault = game.realm >= 3 && !isFinalBossRealm && !bossChoiceRealm && game.theme === 1 && (game.realm % 4 === 0 || rng() < 0.15) ? pick(Object.keys(vaults), rng) : null;
  if (game.vault) {
    const [guardian, ...names] = vaults[game.vault];
    roster.elite = units.get(guardian); roster.group = names.map(n => units.get(n));
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
    const pool = [...componentByName.values()].filter(c => c.tier <= tier && c.rare === rare);
    const favored = pool.filter(c => rewardTags.some(tag => c.tags.includes(tag)));
    const component = pick(favored.length && rng() < 0.6 ? favored : pool, rng);
    game.items.push({ ...position(), type: 'rw3-component', name: component.name });
  }

  if (game.vault === 'the Fettered Fae') {
    const ally = spawnAlly(game, position(), { ...unitStats(units.get('Fae Queen')), name: 'Great Faery' });
    ally.rescue = true;
  } else if (!game.vault && game.realm % 5 === 3) {
    game.items.push({ ...position(), type: 'companion', name: pick(companions, rng).name });
  }
  if ((game.vault && game.vault !== 'the Fettered Fae') || game.mode === 'trial-scavenger') {
    const kinds = game.mode === 'trial-scavenger' ? ['scroll', 'chest'] : ['chest'];
    for (const type of kinds) {
      const pool = type === 'scroll' ? rw3Spells.filter(s => !s.granted_by && !knownSpellIds(game).includes(s.id)).map(s => s.id) : [...(game.allowedEquipment || rw3Equipment.map(e => e.name))];
      const options = [];
      while (pool.length && options.length < (game.mode === 'trial-scavenger' ? 4 : 3)) options.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
      if (options.length) game.items.push({ ...position(), type, options });
    }
  }
  game.riftRoll = 0;
  game.rerolls = 1 + Object.values(game.equipment).filter(e => e.components.includes('Skeleton Key') && rw3Equipment.find(item => item.name === e.name)?.tags.includes('Translocation')).length;
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

function enterRealmEffects(game) {
  const drake = spellByName.get('Void Drake');
  if (game.rw3Upgrades[drake.id]?.includes(drake.upgrades.find(u => u.name === 'Void Mutations').sp_id)) {
    const mastery = availableSpells(game).filter(s => s.tags.includes('Arcane')).reduce((n,s) => n + s.level, 0);
    const boost = game.spellBoosts['rw3-' + drake.id] ??= {};
    boost.voidMutations = (boost.voidMutations || 0) + mastery;
  }
  for (const member of game.companions || []) {
    const ally = summonCreature(game, member.species, game.player);
    if (ally) { ally.name = member.name; ally.companion = true; }
  }
  equipmentAction(game, 'enter');
  for (const item of getEquippedItems(game)) {
    if (item.name === 'Flame of Findias') for (const e of game.enemies) for (const tag of Object.keys(e.resistances)) e.resistances[tag] = Math.trunc(e.resistances[tag] / 2);
    if (item.name === 'Boreal Armor') game.player.shields += 7;
    if (item.name === 'Glaive of Gorias') for (const spell of availableSpells(game).filter(s => s.damage > 0)) {
      const boost = game.spellBoosts[spell.id] ??= {};
      boost.damage = (boost.damage || 0) + spell.level;
    }
    if (item.name === "Tzango's Cleaver") for (const enemy of game.enemies.filter(e => distance(game.player, e) <= 1).slice(0, 2)) freeCast(game, 'Death Shock', enemy);
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

export function isPassable(game, x, y, flying = false) {
  const tile = game.tiles[y]?.[x];
  return tile === 0 || (flying && tile === 2);
}

export function hasSight(game, from, to, allowWallEndpoint = false) {
  let x = from.x, y = from.y;
  const dx = Math.abs(to.x - x), sx = x < to.x ? 1 : -1, dy = -Math.abs(to.y - y), sy = y < to.y ? 1 : -1;
  let error = dx + dy;
  while (x !== to.x || y !== to.y) {
    const e = 2 * error;
    if (e >= dy) { error += dy; x += sx; }
    if (e <= dx) { error += dx; y += sy; }
    if (allowWallEndpoint && x === to.x && y === to.y) return true;
    const tile = game.tiles[y]?.[x];
    // Chasms (2) do NOT block line of sight; only walls (1) and out-of-bounds block sight.
    if (tile !== 0 && tile !== 2) return false;
  }
  return true;
}

export function shortestPath(game, from, target, flying = false) {
  if (!Number.isInteger(target?.x) || !Number.isInteger(target?.y) || !isPassable(game, target.x, target.y, flying)) return null;
  if (from.x === target.x && from.y === target.y) return [];
  const startKey = `${from.x},${from.y}`, targetKey = `${target.x},${target.y}`;
  const queue = [{ x: from.x, y: from.y }], previous = new Map([[startKey, null]]);
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
      const next = { x: current.x + dx, y: current.y + dy }, key = `${next.x},${next.y}`;
      if (!isPassable(game, next.x, next.y, flying) || previous.has(key)) continue;
      previous.set(key, current);
      if (key === targetKey) {
        const path = [];
        for (let step = next; `${step.x},${step.y}` !== startKey; step = previous.get(`${step.x},${step.y}`)) path.unshift(step);
        return path;
      }
      queue.push(next);
    }
  }
  return null;
}

export function learningPlan(game, id) {
  const pending = [];
  let node = nodeMap.get(id);
  while (node && !game.learned.includes(node.id)) {
    pending.unshift(node);
    node = nodeMap.get(node.parent);
  }
  const cost = pending.reduce((total, skill) => total + skill.cost, 0);
  return { nodes: pending, cost, canLearn: game.status === 'playing' && pending.length > 0 && game.points >= cost };
}

export function learn(game, id) {
  const plan = learningPlan(game, id);
  if (!plan.canLearn) return false;
  const oldMax = maxHealth(game);
  game.points -= plan.cost; game.progress.pointsSpent += plan.cost;
  game.learned.push(...plan.nodes.map(node => node.id));
  game.player.hp += maxHealth(game) - oldMax;
  for (const node of plan.nodes) {
    if (node.rank === 1) {
      const spell = enhanceSpell(game, spellInfo(node.school, node.path, game.learned));
      game.charges[spell.id] = spell.maxCharges;
    }
    log(game, 'log.learned', { skill: textRef('atlas.nodeName', { spell: textRef(`spells.${node.school}-${node.path}.name`), rank: node.rank }) }, 'gold');
  }
  return true;
}

export function learnRw3Spell(game, spellId) {
  if (!canLearnRw3Spell(game, spellId)) return false;
  const base = spellById.get(spellId);
  game.points -= base.level;
  game.progress.pointsSpent += base.level;
  game.rw3Spells ??= [];
  game.rw3Spells.push(spellId);
  const eff = effectiveRw3Spell(game, spellId);
  game.charges[eff.id] = eff.maxCharges;
  log(game, 'log.learnedRw3', { spell: base.name }, 'gold');
  return true;
}

export function learnRw3Upgrade(game, spellId, spId) {
  if (!canLearnRw3Upgrade(game, spellId, spId)) return false;
  const base = spellById.get(spellId);
  const upgrade = base.upgrades.find(u => u.sp_id === spId);
  const previousCapacity = effectiveRw3Spell(game, spellId).maxCharges;
  game.points -= upgrade.level;
  game.progress.pointsSpent += upgrade.level;
  game.rw3Upgrades ??= {};
  game.rw3Upgrades[spellId] ??= [];
  game.rw3Upgrades[spellId].push(spId);
  const eff = effectiveRw3Spell(game, spellId);
  game.charges[eff.id] = Math.max(0, Math.min(eff.maxCharges, (game.charges[eff.id] || 0) + eff.maxCharges - previousCapacity));
  log(game, 'log.upgradedRw3', { spell: base.name, upgrade: upgrade.name }, 'gold');
  return true;
}

function awardPoints(game, amount) { game.points += amount; game.progress.pointsEarned += amount; }

function damageEnemy(game, enemy, amount, damageType = null, pierce = 0, secondary = false) {
  if (enemy.hp <= 0) return 0;
  if (enemy.name === 'Amaru' && game.castingTags?.some(t => t === 'Sorcery' || t === 'Enchantment')) return 0;
  if (enemy.name === 'Ophan') {
    const guard = game.enemies.find(e => e.name !== 'Ophan' && e.hp > 0);
    if (guard) return damageEnemy(game, guard, amount, damageType, pierce, true);
  }
  let finalAmount = damageType ? computeElementalDamage(amount, damageType, enemy, pierce) : Math.max(0, amount);
  if (finalAmount <= 0) return 0;
  if (enemy.shields > 0 && damageType) {
    enemy.shields--;
    game.effects.push({ x: enemy.x, y: enemy.y, color: '#7dd3fc' });
    return 0;
  }
  if (enemy.guardianId != null && game.enemies.some(e => e.id === enemy.guardianId && e.hp > 0)) finalAmount = Math.min(finalAmount, enemy.hp - 1);
  if (enemy.name === 'Pope the Frog') {
    if (enemy.damageTurn !== game.turn) { enemy.damageTurn = game.turn; enemy.damageThisTurn = 0; }
    finalAmount = Math.min(finalAmount, 700 - enemy.damageThisTurn);
    enemy.damageThisTurn += Math.min(enemy.hp, finalAmount);
  }
  const dealt = Math.min(enemy.hp, finalAmount);
  if (damageType === 'Arcane') for (const whale of game.allies.filter(a => a.hp > 0 && a.starbask)) {
    const amount = Math.floor(dealt / 2);
    whale.hp = Math.min(whale.maxHp, whale.hp + amount); game.player.hp = Math.min(maxHealth(game), game.player.hp + amount);
  }
  if (dealt && damageType && ['Jormungandr', 'Insanity Queen', 'Maweth'].includes(enemy.name)) {
    enemy.temporaryResistance = { tag: damageType, amount: { Jormungandr: 10, 'Insanity Queen': 25, Maweth: 20 }[enemy.name], expires: game.turn + 1 };
  }
  if (dealt > 0) { delete enemy.statuses.sleep; enemy.lastDamageType = damageType; }
  enemy.hp -= dealt; game.progress.damageDealt += dealt;
  // Fire or Physical hit breaks freeze (RW3 shatter interaction)
  if ((damageType === 'Fire' || damageType === 'Physical') && enemy.statuses?.freeze > 0) {
    enemy.statuses.freeze = 0;
  }
  if (!secondary && dealt) {
    equipmentAction(game, 'damage', { victim: enemy, amount: dealt, type: damageType, tags: game.castingTags || [] });
    const others = game.enemies.filter(e => e !== enemy && e.hp > 0);
    if (enemy.sharedPain || enemy.statuses.sharedPain) for (const e of others.filter(e => e.sharedPain || e.statuses.sharedPain)) damageEnemy(game, e, dealt, damageType, 0, true);
    const carnival = game.buffs.find(b => b.type === 'carnival');
    if (carnival && ['Physical', 'Fire', 'Lightning'].includes(damageType)) {
      for (const e of others.filter(e => hasSight(game, enemy, e)).sort((a, b) => distance(enemy, a) - distance(enemy, b)).slice(0, carnival.targets)) damageEnemy(game, e, Math.floor(dealt / 2), 'Dark', 0, true);
    }
    if (['Arcane', 'Lightning'].includes(damageType)) for (const b of game.buffs.filter(b => b.type === 'garden')) {
      b.stored += dealt;
      while (b.stored >= b.threshold) { b.stored -= b.threshold; summonCreature(game, 'Butterfly Demon', enemy, { duration: b.minionDuration }); }
    }
    if (damageType === 'Fire') {
      for (const b of game.buffs.filter(b => b.type === 'searing')) b.stored += dealt;
      const curse = enemy.curses?.['Pyrostatic Curse'];
      if (curse) for (const e of others.filter(e => hasSight(game, enemy, e)).slice(0, curse.targets)) damageEnemy(game, e, dealt, 'Lightning', 0, true);
    }
    if (damageType === 'Holy' && enemy.curses?.Sanction) {
      damageEnemy(game, enemy, enemy.curses.Sanction.damage, 'Holy', 0, true);
      game.player.hp = Math.min(maxHealth(game), game.player.hp + 1);
    }
  }
  return dealt;
}

function damageAlly(game, ally, amount, damageType = 'Physical') {
  amount = computeElementalDamage(amount, damageType, ally);
  if (!amount || ally.hp <= 0) return 0;
  if (ally.shields > 0) { ally.shields--; return 0; }
  const dealt = Math.min(Math.max(0, ally.hp - (ally.soulbound && game.player.hp > 0 ? 1 : 0)), amount);
  ally.hp -= dealt;
  if (ally.orb === 'Orb of Reflection') {
    const opposite = { Fire: 'Ice', Ice: 'Fire', Lightning: 'Physical', Physical: 'Lightning', Dark: 'Holy', Holy: 'Dark', Poison: 'Arcane', Arcane: 'Poison' };
    for (const e of game.enemies.filter(e => e.hp > 0 && hasSight(game, ally, e))) {
      orbDamage(game, ally, e, dealt, damageType);
      if (ally.upgrades.includes('Inverted Mirror')) orbDamage(game, ally, e, dealt, opposite[damageType]);
      if (ally.hp <= 0 && ally.upgrades.includes('Shattered Orb')) e.statuses.bleed = Number.MAX_SAFE_INTEGER;
    }
  }
  if (!ally.hp && ally.upgrades?.includes('Supercritical')) for (const e of game.enemies) {
    orbDamage(game, ally, e, ally.maxHp, 'Fire'); orbDamage(game, ally, e, ally.maxHp, 'Poison');
  }
  return dealt;
}

function damagePlayer(game, amount, damageType = 'Physical', source = null) {
  const scaled = damageType ? computeElementalDamage(amount, damageType, game.player, 0, game) : amount;
  if (scaled <= 0) return 0;
  if (game.channel && game.channel.invulnerable) return 0;
  if (game.player.shields > 0) {
    game.player.shields--;
    if (source && game.buffs.some(b => b.reflect)) damageEnemy(game, source, amount, damageType);
    if (source && equipped(game, 'Boreal Armor')) damageEnemy(game, source, 12, 'Ice');
    log(game, 'log.shieldBlock', {}, 'gold');
    return 0;
  }
  const incoming = Math.max(1, scaled), absorbed = Math.min(game.player.shield, incoming);
  game.player.shield -= absorbed;
  game.player.hp = Math.max(0, game.player.hp - incoming + absorbed);
  const dealt = incoming - absorbed;
  if (dealt) {
    if (equipped(game, 'Mask of Nihilo')) game.player.resistances[damageType] = (game.player.resistances[damageType] || 0) - dealt;
    for (const copy of Object.values(game.equipment)) {
      if (equipmentByName.get(copy.name)?.tags.includes('Blood') && copy.components.includes('Bloodrage Serum')) game.buffs.push({ name: 'Bloodrage', type: 'bonus', stat: 'damage', amount: 1, duration: 3 });
    }
    if (game.buffs.some(b => b.type === 'Pain Mirror')) for (const e of game.enemies.filter(e => hasSight(game, game.player, e))) damageEnemy(game, e, dealt, 'Dark');
    if (source && game.buffs.some(b => b.name === 'Golden Dragonscale')) damageEnemy(game, source, 10, 'Holy');
    const shard = game.buffs.find(b => b.name === 'Fulminite Shard' && b.last !== game.turn);
    if (source && shard) { shard.last = game.turn; freeCast(game, 'Chain Lightning', source); }
  }
  return dealt;
}

function isTileOccupied(game, x, y, except = null) {
  if (game.player !== except && game.player.x === x && game.player.y === y) return true;
  if (game.enemies.some(e => e !== except && e.hp > 0 && covers(e, { x, y }))) return true;
  if ((game.allies || []).some(a => a !== except && a.hp > 0 && covers(a, { x, y }))) return true;
  return false;
}

function findOpenTileNear(game, origin, maxDist = 2, flying = false, unit = null) {
  for (let r = 0; r <= maxDist; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = origin.x + dx, y = origin.y + dy;
      if (isPassable(game, x, y, flying) && !isTileOccupied(game, x, y) && (!unit?.radius || canStand(game, unit, { x, y }))) return { x, y };
    }
  }
  return null;
}

function spawnAlly(game, pos, spec) {
  game.allies ??= [];
  const ally = {
    id: `ally-${game.turn}-${game.allies.length}-${(game.nextAllyId = (game.nextAllyId || 0) + 1)}`,
    species: spec.species || null, cooldowns: {}, stationary: !!spec.stationary,
    radius: spec.radius || 0, lives: spec.lives || 0, regen: spec.regen || 0, shieldRegen: spec.shieldRegen || 0,
    name: spec.name || 'Summon',
    x: pos.x, y: pos.y,
    hp: Math.max(1, spec.hp || 12), maxHp: Math.max(1, spec.hp || 12),
    damage: Math.max(0, spec.damage ?? 5),
    range: Math.max(1, spec.range || 1),
    shields: spec.shields || 0,
    duration: spec.duration || 0,
    tags: spec.tags || ['Conjuration'],
    flying: !!spec.flying,
    statuses: {},
    resistances: spec.resistances || {},
    color: spec.color || '#4ade80',
    icon: spec.icon || '♙',
  };
  game.allies.push(ally);
  return ally;
}

function addCloud(game, x, y, type, duration = 6, customDamage = null) {
  if (!isPassable(game, x, y, true)) return;
  game.clouds ??= [];
  const def = CLOUD_TYPES[type] || CLOUD_TYPES.fire;
  game.clouds = game.clouds.filter(c => !(c.x === x && c.y === y));
  game.clouds.push({
    x, y, type, duration: Math.max(1, duration),
    damage: customDamage ?? def.damage,
    damageType: def.damageType,
    status: def.status || null,
    statusDuration: def.statusDuration || 0,
    color: def.color,
  });
  return game.clouds.at(-1);
}

function addEquipmentRift(game, item) {
  const tag = item.desc.match(/a Rift containing \[(\w+):/i)?.[1];
  if (item.name !== 'Rift Key Staff' && !tag) return;
  const candidates = areaCells(game.player, SIZE).filter(p => isPassable(game, p.x, p.y) && !isTileOccupied(game, p.x, p.y)
    && ![...game.portals, ...game.items, game.shrine].filter(Boolean).some(o => !distance(o, p)));
  const variant = Math.max(0, ...game.portals.map(r => r.variant || 0)) + 1;
  const pos = pick(candidates, random(game.seed + game.realm * 17 + variant));
  if (pos) game.portals.push({ ...pos, theme: variant % 2, variant, affinity: tag || null });
}

function finishRealm(game) {
  equipmentAction(game, 'clear');
  awardPoints(game, 6 + Math.floor(game.realm / 3));
  const rescued = game.allies.find(a => a.rescue && a.hp > 0);
  if (rescued) recruitCompanion(game, rescued.species, rescued.name, rescued);
  if (game.vault && (game.vault !== 'the Fettered Fae' || rescued) && !game.clearedVaults.includes(game.vault)) game.clearedVaults.push(game.vault);
  game.allies = []; game.clouds = []; game.channel = null;
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

function onUnitDeath(game, unit, allied) {
  const nearby = [game.player, ...game.allies, ...game.enemies].filter(u => u !== unit && u.hp > 0);
  for (const passive of units.get(unit.species)?.passives || []) {
    for (const rule of deathSummons(passive)) {
      for (let i = 0; i < rule.count; i++) (allied ? summonCreature : spawnHostile)(game, rule.name, unit);
    }
    const blast = passive.match(/^On death, deal (\d+) \[(\w+)(?::\w+)?\] damage to units within (\d+)/);
    if (blast) for (const u of nearby.filter(u => distance(u,unit) <= Number(blast[3]))) {
      if (u === game.player) damagePlayer(game, Number(blast[1]), blast[2]);
      else (game.enemies.includes(u) ? damageEnemy : damageAlly)(game, u, Number(blast[1]), blast[2]);
    }
    const affliction = passive.match(/^On death, apply (\w+) to adjacent units for (\d+) turns/);
    if (affliction) {
      const st = ({ Stunned: 'stun', Hemorrhage: 'bleed' })[affliction[1]] || affliction[1].toLowerCase();
      for (const u of nearby.filter(u => distance(u,unit) <= 1)) u.statuses[st] = Math.max(u.statuses[st] || 0, Number(affliction[2]));
    }
  }
}

function cleanup(game) {
  for (const e of game.enemies.filter(e => e.hp <= 0)) {
    if (e.nextForm) {
      (e.previousForms ??= []).push(e.species);
      const oldHp = e.maxHp, next = e.nextForm;
      Object.assign(e, unitStats(units.get(next)));
      if (e.radius && !canStand(game, e, e)) {
        const center = findOpenTileNear(game, e, SIZE, e.flying, e);
        if (center) Object.assign(e, center);
      }
      if (next === 'Maweth') { e.maxHp += oldHp; e.hp = e.maxHp; }
      if (next === 'Snow Queen, Dethroned') spawnHostile(game, 'Frost Saber', e);
      if (next === 'The Sparking Soul') {
        const allies = game.enemies.filter(other => other !== e && other.hp > 0);
        e.shields += allies.length; for (const other of allies) other.hp = 0;
      }
    } else if (e.lives > 0) {
      e.lives--; e.hp = e.maxHp;
      if (e.name === 'Insanity Queen') for (const a of game.allies.filter(a => a.tags.includes('Living') && hasSight(game, e, a))) a.statuses.berserk = 12;
    }
  }
  const dead = game.enemies.filter(e => e.hp <= 0); game.kills += dead.length;
  for (const enemy of dead) {
    if (game.enemies.some(e => e.hp > 0 && e.name === 'Gaia')) for (const e of game.enemies.filter(e => e.hp > 0)) e.gaiaBlessing = (e.gaiaBlessing || 0) + 10;
    for (const name of [...(enemy.previousForms || []), enemy.species]) if (name && !game.defeatedSpecies.includes(name)) game.defeatedSpecies.push(name);
    log(game, 'log.fall', { enemy: enemy.species || (enemy.isSpawner ? enemy.name : textRef(enemyNameKey(enemy))) }, 'green');
    onUnitDeath(game, enemy, false);
    equipmentAction(game, 'kill', { victim: enemy });
    if (game.buffs.some(b => b.type === 'The Restless Dead') && enemy.tags?.includes('Living')) summonCreature(game, 'Skeleton', enemy, { hp: enemy.maxHp, flying: enemy.flying });
    if (enemy.curses?.Mercurize) summonCreature(game, 'Mercurial Geist', enemy, { hp: enemy.maxHp, duration: 10 });
    if (enemy.curses?.['Death Chill']) {
      const curse = enemy.curses['Death Chill'];
      for (const e of game.enemies.filter(e => e.hp > 0 && distance(e, enemy) <= curse.radius)) { damageEnemy(game, e, curse.damage, 'Ice'); e.statuses.freeze = 5; }
    }
    if (enemy.species?.startsWith('Mordred') && game.player.hp <= 0) game.mutualDestruction = true;
    if (game.allies.some(a => a.hp > 0 && a.dream && a.hungeringDepths) && areaCells(enemy,1).some(p => game.tiles[p.y][p.x] === 2)) freeCast(game, 'Hungry Maw', enemy);
    if (enemy.golemDamage && (enemy.statuses.petrify || enemy.statuses.glassed)) summonCreature(game, 'Golem', enemy, { hp: enemy.maxHp, damage: enemy.golemDamage });
    if (enemy.boss) awardPoints(game, 5);
    if (enemy.isSpawner) awardPoints(game, 2);
  }
  game.enemies = game.enemies.filter(e => !dead.includes(e));
  if (game.enemies.some(e => e.hp <= 0)) { cleanup(game); return; }
  for (const a of game.allies.filter(a => a.hp <= 0)) {
    if (a.lives > 0) { a.lives--; a.hp = a.maxHp; continue; }
    onUnitDeath(game, a, true);
    equipmentAction(game, 'allyDeath', { victim: a });
    if (a.deathSummons) for (let i = 0; i < a.deathSummons[1]; i++) summonCreature(game, a.deathSummons[0], a);
  }
  game.allies = game.allies.filter(a => a.hp > 0);
  if (dead.length && !game.enemies.length) {
    finishRealm(game);
  }
}

const activeItemEvents = new WeakMap();

function equipmentAction(game, event, extra = {}) {
  const copies = Object.entries(game.equipment);
  if (!copies.length) return;
  const seq = (game.equipmentEventCount || 0) + 1;
  game.equipmentEventCount = seq;
  const rng = random(game.seed + game.turn * 313 + game.progress.spellsCast + game.realm + seq * 19);
  const enemies = game.enemies.filter(e => e.hp > 0);
  const spells = () => availableSpells(game);
  const context = {
    ...extra, enemies, visible: enemies.filter(e => hasSight(game, game.player, e)), rng, roll: a => pick(a, rng),
    spells, mastery: tag => spells().filter(s => s.tags.includes(tag)).reduce((n, s) => n + s.level, 0),
    dist: distance, see: (a, b) => hasSight(game, a, b), act: a => allyTurn(game, a), cast: (n, p) => freeCast(game, n, p),
    summon: (n, p, spec) => summonCreature(game, n, p, Object.fromEntries(Object.entries(spec).filter(([, v]) => v != null))),
    hurt: (e, n, t) => damageEnemy(game, e, n, t), heal: n => { game.player.hp = Math.min(maxHealth(game), game.player.hp + n); },
    pickupEligible: n => componentByName.get(n)?.on_pickup, pickup: n => applyComponentPickupEffects(game, n),
    afflict: (e, st, n) => { e.statuses[st] = Math.max(e.statuses[st] || 0, n); },
    weather: type => addCloud(game, 1 + Math.floor(rng() * (SIZE - 2)), 1 + Math.floor(rng() * (SIZE - 2)), type, 5),
    giveUpgrade: s => {
      if (!s) return;
      const u = pick(s.upgrades.filter(u => !s.learnedUpgrades.includes(u.sp_id)), rng);
      if (u) (game.rw3Upgrades[s.rw3Id] ??= []).push(u.sp_id);
    },
  };
  const active = activeItemEvents.get(game) || new Set();
  activeItemEvents.set(game, active);
  for (const [slot, copy] of copies) {
    const item = equipmentByName.get(copy.name);
    if (!item) continue;
    const key = slot + '/' + event;
    if (active.has(key)) continue;
    active.add(key);
    try { equipmentEvent(event, game, item, copy, context); }
    finally { active.delete(key); }
  }
}

function equipped(game, name) {
  return Object.values(game.equipment).some(item => item.name === name);
}

function freeCast(game, name, target) {
  const spell = effectiveRw3Spell(game, spellByName.get(name)?.id);
  if (spell) resolveRw3Cast(game, spell, { x: target.x, y: target.y }, false);
}

function canStand(game, unit, pos) {
  const radius = unit.radius || 0;
  for (let y = pos.y - radius; y <= pos.y + radius; y++) for (let x = pos.x - radius; x <= pos.x + radius; x++) {
    if (!isPassable(game, x, y, unit.flying) || isTileOccupied(game, x, y, unit)) return false;
  }
  return true;
}

function enemyMoved(game, enemy) {
  if (distance(game.player, enemy) === 1 && equipped(game, "Masseter's Mace")) {
    damageEnemy(game, enemy, 16, 'Arcane');
    damageEnemy(game, enemy, 16, 'Physical');
    if (enemy.hp <= 0) freeCast(game, 'Hungry Maw', enemy);
  }
  for (const orb of game.allies.filter(a => a.hp > 0 && a.upgrades?.includes('Motion Sensors'))) {
    if ((orb.x === enemy.x || orb.y === enemy.y) && hasSight(game, orb, enemy)) fireOrbBeams(game, orb);
  }
}

function summonCreature(game, name, target, spec = {}) {
  const def = units.get(name);
  const unit = def ? unitStats(def) : {};
  const pos = findOpenTileNear(game, target, 3, spec.flying ?? unit.flying, unit);
  if (!pos) return null;
  return spawnAlly(game, pos, { ...unit, ...spec, name });
}

function orbDamage(game, orb, enemy, amount, type) {
  const dealt = damageEnemy(game, enemy, amount, type);
  if (dealt && !enemy.hp && orb.upgrades.includes('Cursed Reflection')) for (const e of game.enemies.filter(e => e.name === enemy.name && e.hp > 0)) e.statuses.sharedPain = 3;
  if (dealt && equipped(game, 'Empyrean Astrolabe')) damageEnemy(game, enemy, Math.floor(dealt / 2), 'Holy');
  return dealt;
}

function fireOrbBeams(game, orb) {
  const origins = [orb], visited = new Set(origins), detonations = new Map();
  const queueBlast = pos => detonations.set(`${pos.x},${pos.y}`, pos);
  const hit = enemy => {
    if (enemy.hp <= 0) return;
    orbDamage(game, orb, enemy, orb.damage, 'Fire');
    if (enemy.hp <= 0 && orb.upgrades.includes('Detonator')) queueBlast(enemy);
  };
  for (const origin of origins) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      for (let x = origin.x + dx, y = origin.y + dy; x > 0 && y > 0 && x < SIZE - 1 && y < SIZE - 1; x += dx, y += dy) {
        const pos = { x, y };
        if (game.tiles[y][x] === 1) { if (orb.upgrades.includes('Detonator')) queueBlast(pos); break; }
        for (const e of game.enemies.filter(e => e.x === x && e.y === y)) hit(e);
        if (orb.upgrades.includes('Crossfire')) {
          const ally = [game.player, ...game.allies].find(a => a.x === x && a.y === y && !visited.has(a));
          if (ally) { origins.push(ally); visited.add(ally); }
        }
      }
    }
  }
  for (const pos of detonations.values()) {
    for (let y = Math.max(1, pos.y - 2); y <= Math.min(SIZE - 2, pos.y + 2); y++) for (let x = Math.max(1, pos.x - 2); x <= Math.min(SIZE - 2, pos.x + 2); x++) {
      if (game.tiles[y][x] === 1) game.tiles[y][x] = 0;
    }
    for (const enemy of game.enemies.filter(e => distance(e, pos) <= 2)) hit(enemy);
  }
}

function tickOrb(game, orb) {
  if (orb.orb === 'Orb of Explosions') fireOrbBeams(game, orb);
  if (orb.orb === 'Orb of Anima') {
    for (const ally of [game.player, ...game.allies].filter(a => a !== orb && a.hp > 0 && a.hp < (a.maxHp || maxHealth(game)) && hasSight(game, orb, a)).slice(0, orb.targets)) {
      const heal = Math.min(orb.hp, (ally.maxHp || maxHealth(game)) - ally.hp);
      ally.hp += heal; orb.hp -= heal;
    }
  }
  if (orb.orb === 'Orb of Assimilation') for (const granted of orb.granted || []) {
    const target = game.enemies.find(e => e.hp > 0 && distance(orb, e) <= granted.range && hasSight(game, orb, e));
    if (target && game.turn >= granted.next) {
      for (const type of granted.types) orbDamage(game, orb, target, granted.damage, type);
      granted.next = game.turn + granted.cooldown;
    }
  }
  if (orb.orb === 'Orb of Night' || orb.orb === 'Orb of Unraveling') {
    const night = orb.orb === 'Orb of Night';
    const rng = random(game.seed + game.turn + orb.x * SIZE + orb.y);
    for (const enemy of game.enemies.filter(e => e.hp > 0 && distance(orb, e) <= orb.auraRadius)) {
      const dealt = orbDamage(game, orb, enemy, orb.damage, night ? 'Dark' : pick(['Fire', 'Lightning', 'Physical'], rng));
      if (night) enemy.statuses.blind = 2;
      else { const type = pick(['Fire', 'Lightning', 'Physical', 'Dark', 'Holy', 'Ice', 'Arcane', 'Poison'], rng); enemy.resistances[type] = (enemy.resistances[type] || 0) - dealt; }
    }
  }
}

function spawnHostile(game, species, near, duration = 0) {
  const def = units.get(species);
  if (!def || game.enemies.length >= 48) return null;
  const u = unitStats(def);
  const pos = findOpenTileNear(game, near, 4, u.flying, u);
  if (!pos || !canStand(game, u, pos)) return null;
  const e = { ...u, ...pos, id: 100000 + (game.nextEnemyId = (game.nextEnemyId || 0) + 1), school: 0, duration };
  game.enemies.push(e);
  return e;
}

function relocateUnit(game, unit, rng) {
  const pos = { x: 1 + Math.floor(rng() * (SIZE - 2)), y: 1 + Math.floor(rng() * (SIZE - 2)) };
  const dest = findOpenTileNear(game, pos, 4, unit.flying);
  if (dest && canStand(game, unit, dest)) Object.assign(unit, dest);
}

function unitPassiveTurn(game, unit, allied) {
  const def = units.get(unit.species);
  if (!def) return;
  const friends = allied ? game.allies : game.enemies;
  const foes = allied ? game.enemies : [game.player, ...game.allies];
  const rng = random(game.seed + unit.x * SIZE + unit.y + game.turn * 977);
  const summon = (name, count) => {
    for (let i = 0; i < count; i++) {
      const result = allied ? summonCreature(game, name, unit) : spawnHostile(game, name, unit);
      if (!result) break;
    }
  };
  if (unit.gaiaBlessing > 0) { unit.hp = Math.min(unit.maxHp, unit.hp + unit.gaiaBlessing--); unit.shields += 3; }
  if (unit.temporaryResistance?.expires <= game.turn) delete unit.temporaryResistance;
  for (const p of def.passives) {
    const chance = p.match(/^Each turn, (\d+)% chance to (.+)/);
    if (chance && rng() * 100 < Number(chance[1])) {
      const rule = chance[2];
      if (rule === 'gain Flying') unit.flying = true;
      if (rule.startsWith('become a ')) {
        const next = units.get(rule.slice(9));
        if (next) { Object.assign(unit, unitStats(next)); break; }
      }
      if (rule.startsWith('blink to')) {
        const options = areaCells(unit, Number(rule.match(/(\d+) tiles/)?.[1] || 4)).filter(pos => canStand(game,unit,pos));
        if (options.length) Object.assign(unit, pick(options,rng));
      }
      if (rule.startsWith('heal for 10% of original max HP')) {
        unit.originalHp ??= unit.maxHp;
        unit.hp += Math.max(1, Math.ceil(unit.originalHp / 10)); unit.maxHp = Math.max(unit.hp, unit.maxHp);
        if (unit.maxHp >= 2 * unit.originalHp) {
          const child = allied ? summonCreature(game,unit.species,unit,{ hp: unit.originalHp, damage: unit.damage }) : spawnHostile(game,unit.species,unit);
          if (child) { child.hp = child.maxHp = unit.hp = unit.maxHp = unit.originalHp; }
        }
      }
    }
    const threshold = p.match(/^Summon (\d+) (.+) when HP falls below (\d+)%/i);
    if (threshold && unit.hp * 100 < unit.maxHp * Number(threshold[3]) && !unit.triggeredThresholds?.includes(p)) {
      (unit.triggeredThresholds ??= []).push(p); summon(threshold[2], Number(threshold[1]));
    }
    const spawn = p.match(/^Has a (\d+)% chance each turn to spawn (?:a |(\d+) )(.+)/i);
    if (spawn && rng() * 100 < Number(spawn[1])) summon(spawn[3], Number(spawn[2]) || 1);
    const regen = p.match(/^Heal allies within (\d+) tiles for (\d+) each turn/i);
    if (regen) for (const friend of friends.filter(f => f.hp > 0 && distFrom(f) <= Number(regen[1]))) friend.hp = Math.min(friend.maxHp, friend.hp + Number(regen[2]));
    const shields = p.match(/^Gain (\d+) \[SH:shields\] every (\d+) turns up to a max of (\d+)/i);
    if (shields && game.turn % Number(shields[2]) === 0 && unit.shields < Number(shields[3])) unit.shields = Math.min(Number(shields[3]), unit.shields + Number(shields[1]));
    const aura = p.match(/^Each turn, deal (\d+) (\w+) damage to enemies within (\d+) tiles/i);
    if (aura) for (const foe of foes.filter(f => f.hp > 0 && distFrom(f) <= Number(aura[3]))) {
      const amount = Number(aura[1]), type = aura[2];
      if (foe === game.player) damagePlayer(game, amount, type, unit);
      else (allied ? damageEnemy : damageAlly)(game, foe, amount, type);
    }
  }
  function distFrom(e) { return distance(unit, e); }
  if (unit.name === 'Starwhale') for (const foe of foes.filter(e => e.hp > 0 && distFrom(e) <= 4)) {
    const t = pick(['Arcane', 'Ice'], rng);
    if (foe === game.player) damagePlayer(game, 5, t, unit);
    else (allied ? damageEnemy : damageAlly)(game, foe, 5, t);
    if (unit.iceDream) foe.statuses.freeze = Math.max(foe.statuses.freeze || 0, unit.iceDream);
  }
  if (unit.name === 'Jormungandr') summon('Snake', 3);
  if (unit.name === 'Yaldabaoth') {
    const ally = pick(friends.filter(e => e !== unit && e.hp > 0 && e.guardianId == null), rng);
    if (ally) ally.guardianId = unit.id;
  }
  if (unit.name === 'Snow Queen, Enthroned') for (const f of foes) addCloud(game, f.x, f.y, 'blizzard', 3);
  if (['Yaldabaoth', 'Mordred, Ascendant'].includes(unit.name)) {
    const props = [...game.portals, ...game.items, game.shrine].filter(Boolean);
    const radius = unit.name === 'Yaldabaoth' ? 7 : 9;
    for (const p of areaCells(unit, radius)) if (rng() < 0.015 && !isTileOccupied(game, p.x, p.y) && !props.some(o => !distance(o, p))) {
      game.tiles[p.y][p.x] = pick([0, 1, 2], rng);
    }
  }
  if (unit.name === 'Mordred, Ascendant') unit.vulnerable = pick(['Dark', 'Holy', 'Arcane', 'Fire', 'Ice', 'Physical', 'Poison', 'Lightning'], rng);
  if (unit.name === 'The Sparking Soul') unit.chargedAttack = pick(def.abilities, rng).name;
}

function specialMonsterAction(game, unit, target, allied) {
  const def = units.get(unit.species);
  if (!def) return false;
  const rng = random(game.seed + game.turn * 503 + unit.x * SIZE + unit.y);
  const allies = allied ? game.allies : game.enemies;
  const foes = allied ? game.enemies : [game.player, ...game.allies];
  const summon = (n, pos, dur) => allied ? summonCreature(game, n, pos, { duration: dur }) : spawnHostile(game, n, pos, dur);
  for (const a of def.abilities) {
    if (a.damage > 0 || !a.cool_down || (unit.cooldowns[a.name] || 0) > game.turn) continue;
    const rule = summonedBy(a);
    if (rule) {
      for (let i = 0; i < rule.count; i++) summon(rule.name, a.desc.includes('near every enemy') ? target : unit, rule.temporary ? 8 : 0);
    } else if (a.name === 'Electric Engirth') {
      for (const foe of foes.filter(e => hasSight(game, unit, e))) {
        const near = findOpenTileNear(game, unit, 4, foe.flying, foe);
        if (near) Object.assign(foe, near);
        summon('Spark Spirit', foe);
      }
    } else if (a.name === 'Teleport') {
      relocateUnit(game, unit, rng);
    } else if (a.name === 'Void Tango' || a.name === 'Aether Swap') {
      if (unit.radius || target.radius) continue;
      const origin = { x: unit.x, y: unit.y };
      if (a.name === 'Void Tango') relocateUnit(game, unit, rng);
      else Object.assign(unit, { x: target.x, y: target.y });
      if (distance(unit, origin)) Object.assign(target, origin);
    } else if (a.name === 'Blood Tax') {
      const n = Math.floor(target.hp * 0.3); target.hp -= n;
      for (const e of allies) e.hp = Math.min(e.maxHp, e.hp + Math.floor(n / allies.length));
    } else if (a.name === 'Swamp Horde' || a.name === 'Empty the Depths' || a.name === 'Void Eggs') {
      const names = a.name === 'Swamp Horde' ? ['Horned Toad', 'Swamp Queen', 'Giant Spider'] : a.name === 'Void Eggs' ? ['Void Wyrm Egg', 'Void Bomber'] : ['Chaos Fiend', 'Ash Fiend', 'Furnace Fiend'];
      const available = names.filter(n => units.has(n));
      for (let i = 0; i < 6; i++) summon(pick(available, rng), unit);
    } else if (a.name === 'Inversion') {
      for (const p of areaCells(unit, SIZE)) {
        if (!isTileOccupied(game, p.x, p.y) && ![...game.portals, ...game.items, game.shrine].filter(Boolean).some(o => !distance(o, p))) {
          game.tiles[p.y][p.x] = [2, 0, 1][game.tiles[p.y][p.x]];
        }
      }
    } else if (a.name === 'Shield Tide') {
      for (const e of allies) e.shields += 3;
      for (const e of foes) e.shields = Math.max(0, e.shields - 3);
    } else if (a.name === 'Perfect Procession') {
      for (const e of allies.filter(e => e !== unit && e.hp > 0)) {
        const hit = readyAttack(e, distance(e, target), game.turn);
        if (hit && hasSight(game, e, target)) strikeUnit(game, e, target, hit, allied);
      }
    } else if (a.name === 'Planar Interposition' || a.name === 'Ophan Blast') {
      for (const p of areaCells(target, 2)) if (!isTileOccupied(game, p.x, p.y) && rng() < 0.25 && !game.portals.some(r => !distance(r, p)) && !game.items.some(i => !distance(i, p)) && (!game.shrine || distance(game.shrine, p))) game.tiles[p.y][p.x] = rng() < 0.5 ? 0 : 2;
      if (a.name === 'Planar Interposition') summon(pick(['Void Bomber', 'Arcane Slime', 'Void Drake', 'Ghost'], rng), unit);
    } else if (a.name === "Nature's Fury") {
      for (const e of foes) for (const p of areaCells(e, 2)) addCloud(game, p.x, p.y, pick(['storm', 'rain', 'blizzard'], rng), 5);
    } else if (a.name === 'Invoke Chaos') {
      for (const e of [...allies, ...foes].filter(e => e !== unit)) relocateUnit(game, e, rng);
      for (const e of foes) e.statuses.stun = 1;
    } else if (a.name === 'Gaze of Winter') {
      for (const e of foes.filter(e => hasSight(game, unit, e))) e.statuses.freeze = 3;
    } else if (a.name === 'Blood Tap') {
      for (const e of foes.filter(e => hasSight(game, unit, e))) e.statuses.bleed = 10;
    } else continue;
    unit.cooldowns[a.name] = game.turn + a.cool_down;
    return true;
  }
  return false;
}

function strikeUnit(game, source, target, attack, allied, bonus = 0) {
  const element = attack?.damage_type[game.turn % attack.damage_type.length] || 'Physical';
  const amount = ((allied ? source.damage : attack?.damage ?? source.damage) + bonus) * (attack && source.chargedAttack === attack.name ? 2 : 1);
  const hit = u => u === game.player ? damagePlayer(game, amount, element, source)
    : game.enemies.includes(u) ? damageEnemy(game, u, amount, element) : damageAlly(game, u, amount, element);
  let dealt = hit(target);
  const count = Number(attack?.desc.match(/Attacks (\d+) times/i)?.[1] || 1);
  for (let i = 1; i < count && target.hp > 0; i++) dealt += hit(target);
  if (attack?.desc.includes('permanent bleed')) target.statuses.bleed = Number.MAX_SAFE_INTEGER;
  if (attack?.name === 'Life Vortex' || attack?.name === 'Edict of Worms') {
    const all = attack.name === 'Life Vortex';
    const pool = all ? [game.player, ...game.allies, ...game.enemies] : allied ? game.enemies : [game.player, ...game.allies];
    for (const u of pool.filter(u => u !== source && u !== target && u.hp > 0 && (!all || hasSight(game, source, u)))) dealt += hit(u);
    if (all) source.hp = Math.min(source.maxHp, source.hp + dealt);
    else for (const u of pool.filter(u => u.hp <= 0)) (allied ? summonCreature : spawnHostile)(game, 'Worm Shambler', u);
  }
  if (attack?.cool_down) source.cooldowns[attack.name] = game.turn + attack.cool_down;
  if (attack?.desc.includes('Heals for damage dealt')) source.hp = Math.min(source.maxHp, source.hp + dealt);
  const match = attack?.desc.match(/(?:apply|inflicts?) \[?(frozen|blind|fear(?:ed)?|stun(?:ned)?|poison|bleed|silence|necrosis)\]? for (\d+)/i);
  if (match && !(target === game.player && game.buffs.some(b => b.type === 'purity'))) {
    const st = ({ frozen: 'freeze', feared: 'fear', stunned: 'stun' })[match[1].toLowerCase()] || match[1].toLowerCase();
    target.statuses[st] = Math.max(target.statuses[st] || 0, Number(match[2]));
  }
  if (dealt && source.tags?.some(tag => ['Dark', 'Demon', 'Undead'].includes(tag))) {
    for (const boss of game.enemies.filter(e => e.name === 'Bafflement, Demon King' && e.hp > 0)) boss.hp = Math.min(boss.maxHp, boss.hp + dealt);
  }
  if (source.name === 'Amaru' && target.hp <= 0) { source.maxHp += target.maxHp || maxHealth(game); source.hp += target.maxHp || maxHealth(game); }
  if (source.name === 'The Gardener' && attack?.name === 'Prune') {
    if (target === game.player) game.bonusMaxHp = target.hp - 55; else target.maxHp = Math.max(1, target.hp);
  }
  if (attack?.name === 'Necrotic Breath') target.statuses.necrosis = (target.statuses.necrosis || 0) + 1;
  return dealt;
}

function allyTurn(game, ally) {
  if (ally.hp <= 0) return;
  if (ally.statuses.stun > 0 || ally.statuses.freeze > 0) { for (const st of ['stun', 'freeze']) if (ally.statuses[st]) ally.statuses[st]--; return; }
  if (ally.statuses.ironize > 0 && --ally.statuses.ironize === 0 && ally.ironTag) ally.tags = ally.tags.filter(t => t !== 'Metallic');
  if (ally.statuses.berserk > 0) {
    ally.statuses.berserk--;
    const target = [game.player, ...game.allies, ...game.enemies].filter(u => u !== ally && u.hp > 0 && distance(u, ally) <= ally.range && hasSight(game, ally, u)).sort((a,b) => distance(a,ally) - distance(b,ally))[0];
    if (target) { strikeUnit(game, ally, target, readyAttack(ally, distance(ally, target), game.turn), true); return; }
  }
  if (ally.fullRegen) ally.hp = ally.maxHp;
  if (ally.regen) ally.hp = Math.min(ally.maxHp, ally.hp + ally.regen);
  if (ally.shieldRegen) ally.shields += ally.shieldRegen;
  unitPassiveTurn(game, ally, true);
  if (ally.orb) { tickOrb(game, ally); return; }
  const enemies = game.enemies.filter(e => e.hp > 0).sort((a, b) => distance(ally, a) - distance(ally, b));
  const target = enemies[0];
  if (!target) return;
  if (specialMonsterAction(game, ally, target, true)) return;
  const attack = readyAttack(ally, distance(ally, target), game.turn);
  if (distance(ally, target) <= ally.range && hasSight(game, ally, target)) {
    if (ally.species && !attack) return;
    const bonus = game.buffs.filter(b => b.type === 'boiling').reduce((sum, b) => sum + b.amount, 0);
    const dealt = strikeUnit(game, ally, target, attack, true, bonus);
    if (dealt) equipmentAction(game, 'allyHit', { victim: target, amount: dealt, source: ally });
    if (ally.crystal) damageEnemy(game, target, Math.floor(dealt / 2), 'Arcane');
    if (ally.vampiric) ally.hp = Math.min(ally.maxHp, ally.hp + dealt);
    if (ally.armageddon && distance(ally, target) <= 1) freeCast(game, 'Annihilate', target);
    if (attack?.cool_down) ally.cooldowns[attack.name] = game.turn + attack.cool_down;
    game.effects.push({ x: target.x, y: target.y, color: ally.color });
  } else if (!ally.stationary) {
    const next = shortestPath(game, ally, target, ally.flying)?.[0];
    if (next && canStand(game, ally, next)) Object.assign(ally, next);
  }
}

function tickAllies(game) {
  for (const ally of [...game.allies]) {
    allyTurn(game, ally);
    if (ally.hp > 0 && ally.haste) allyTurn(game, ally);
    if (ally.duration > 0 && --ally.duration === 0) ally.hp = 0;
  }
}

function tickCloudsAndBuffs(game) {
  if (game.mutators?.includes('weather') && game.realmTurn % 3 === 0 && game.enemies.length) {
    const rng = random(game.seed + game.turn);
    const e = pick(game.enemies, rng);
    addCloud(game, e.x, e.y, pick(['storm', 'rain', 'blizzard'], rng), 4);
  }
  // Tick Clouds
  for (const cloud of game.clouds || []) {
    for (const enemy of game.enemies) {
      if (enemy.hp > 0 && enemy.x === cloud.x && enemy.y === cloud.y) {
        if (cloud.damage > 0) damageEnemy(game, enemy, cloud.damage, cloud.damageType);
        if (cloud.status) enemy.statuses[cloud.status] = Math.max(enemy.statuses[cloud.status] || 0, cloud.statusDuration);
      }
    }
    cloud.duration--;
  }
  game.clouds = (game.clouds || []).filter(c => c.duration > 0);

  // Tick Wizard Buffs (Eyes, Auras, Regeneration, Mounts)
  for (const buff of game.buffs || []) {
    const nearby = game.enemies.filter(e => e.hp > 0).sort((a, b) => distance(game.player, a) - distance(game.player, b));
    if (buff.type === 'returnBeam' && buff.duration === 1) {
      for (const e of nearby.filter(e => onSegment(buff.from, buff.to, e))) for (const t of buff.types) damageEnemy(game, e, buff.damage, t);
    } else if (buff.type === 'tentacles') {
      const count = buff.base + Math.min(buff.duration - 1, buff.total - buff.duration);
      for (const e of nearby.slice(0, count)) damageEnemy(game, e, buff.damage, game.turn % 2 ? 'Arcane' : 'Lightning');
    } else if (buff.type === 'magnet') {
      const anchor = [...game.enemies, ...game.allies].find(e => e.hp > 0 && e.id === buff.targetId);
      if (anchor) for (const e of nearby.filter(e => e !== anchor && distance(e, anchor) <= buff.radius)) {
        const pos = { x: e.x + Math.sign(anchor.x - e.x), y: e.y + Math.sign(anchor.y - e.y) };
        if (canStand(game, e, pos)) Object.assign(e, pos);
        if (distance(e, anchor) <= 1) damageEnemy(game, e, buff.damage, 'Lightning');
      }
    } else if (buff.type === 'watcher') {
      const e = nearby.filter(e => hasSight(game, game.player, e)).at(-1);
      if (e) freeCast(game, 'Lightning Bolt', e);
    } else if (buff.type === 'demon') {
      for (const s of availableSpells(game).filter(s => s.tags.includes('Chaos') && s.name !== 'Demon Form')) game.charges[s.id] = Math.min(s.maxCharges, game.charges[s.id] + 1);
    } else if (buff.type === 'produce') {
      const rng = random(game.turn + game.seed);
      for (let i = 0; i < buff.count; i++) summonCreature(game, buff.species === 'Imp' ? pick(['Fire Imp', 'Spark Imp', 'Iron Imp'], rng) : buff.species, game.player);
    } else if (buff.type === 'petrification') {
      for (const e of nearby.filter(e => distance(game.player, e) <= buff.radius).slice(0, buff.targets)) e.statuses.petrify = buff.turns;
    } else if (buff.type === 'darkness') {
      for (const e of nearby) e.statuses.blind = 2;
    } else if (buff.type === 'dispersion') {
      for (const e of nearby.filter(e => distance(game.player, e) <= buff.radius).slice(0, buff.targets)) {
        const pos = findOpenTileNear(game, { x: SIZE - 1 - e.x, y: SIZE - 1 - e.y }, 3, e.flying);
        if (pos && canStand(game, e, pos)) Object.assign(e, pos);
      }
    } else if (buff.type === 'searing' && buff.duration === 1) {
      for (const e of nearby.filter(e => hasSight(game, game.player, e))) damageEnemy(game, e, Math.floor(buff.stored / 5), 'Fire');
    } else if (buff.type === 'lifedrain') {
      const e = game.enemies.find(e => e.hp > 0 && e.id === buff.target);
      if (!e) { buff.duration = 0; continue; }
      for (const victim of [e, ...game.enemies.filter(v => v.hp > 0 && v !== e && distance(e, v) <= buff.radius).slice(0, buff.targets)]) {
        game.player.hp = Math.min(maxHealth(game), game.player.hp + damageEnemy(game, victim, buff.damage, 'Dark'));
      }
    } else if (buff.type === 'component' && game.turn >= buff.next) {
      buff.next += buff.interval; buff.pulses++; applyComponentPickupEffects(game, buff.name, buff);
    } else if (buff.type === 'selfRegen') {
      game.player.hp = Math.min(maxHealth(game), game.player.hp + buff.amount);
    } else if (buff.type === 'shields') {
      game.player.shields += buff.amount;
    } else if (buff.type === 'aura' && buff.damage > 0) {
      for (const enemy of game.enemies) {
        if (enemy.hp > 0 && distance(game.player, enemy) <= (buff.radius || 3) && (!buff.ring || distance(game.player, enemy) === buff.radius)) {
          damageEnemy(game, enemy, buff.damage, buff.damageType || 'Fire');
          game.effects.push({ x: enemy.x, y: enemy.y, color: '#f97316' });
        }
      }
    } else if (buff.type === 'eye') {
      buff.timer = (buff.timer || 0) - 1;
      if (buff.timer <= 0) {
        buff.timer = buff.shotCooldown || 3;
        const visible = game.enemies.filter(e => e.hp > 0 && hasSight(game, game.player, e));
        if (visible.length) {
          const target = visible[game.turn % visible.length];
          if (buff.damage > 0) {
            const dealt = damageEnemy(game, target, buff.damage, buff.damageType || 'Fire');
            if (buff.healOnHit && dealt > 0) game.player.hp = Math.min(maxHealth(game), game.player.hp + dealt);
          }
          if (buff.status) target.statuses[buff.status] = Math.max(target.statuses[buff.status] || 0, 2);
          game.effects.push({ x: target.x, y: target.y, color: buff.color || '#facc15' });
        }
      }
    } else if (buff.type === 'regen') {
      for (const ally of game.allies || []) {
        if (distance(game.player, ally) <= (buff.radius || 8)) ally.hp = Math.min(ally.maxHp, ally.hp + (buff.amount || 4));
      }
      if (buff.selfHeal) game.player.hp = Math.min(maxHealth(game), game.player.hp + (buff.amount || 4));
    }
    if (buff.duration > 0) buff.duration--;
  }
  game.buffs = (game.buffs || []).filter(b => b.duration !== 0);

  if (game.enemies.some(e => e.hp > 0)) {
    const rng = random(game.seed + game.realm * 101 + game.turn * 97);
    if (equipped(game, 'Mazer of Murias')) {
      game.player.hp = Math.min(maxHealth(game), game.player.hp + 10);
      const spell = pick(availableSpells(game).filter(s => game.charges[s.id] < s.maxCharges), rng);
      if (spell) game.charges[spell.id]++;
    }
    if (equipped(game, 'Crown of Ea')) {
      const strongest = game.enemies.reduce((a, b) => a.hp >= b.hp ? a : b);
      strongest.statuses.sleep = 3;
    }
    if (equipped(game, 'Death Fob') && game.realmTurn >= 12 && game.realmTurn < 24) freeCast(game, 'Death Clock', game.player);
    if (equipped(game, 'Constellation Cloak')) for (const orb of game.allies.filter(a => a.orb)) {
      const tiles = [];
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
        const pos = { x: orb.x + dx, y: orb.y + dy };
        if (isPassable(game, pos.x, pos.y, true) && !isTileOccupied(game, pos.x, pos.y)) tiles.push(pos);
      }
      if (tiles.length) Object.assign(orb, pick(tiles, rng));
    }
  }

  equipmentAction(game, 'turn');
  // Tick Equipment Turn Triggers (e.g., Acidifier)
  const mods = getEquipmentModifiers(game);
  for (const trig of mods.turnEffects) {
    const alive = game.enemies.filter(e => e.hp > 0);
    if (!alive.length) continue;
    const target = alive[game.turn % alive.length];
    if (trig.type === 'acidify_random') target.statuses.acidified = Math.max(target.statuses.acidified || 0, 3);
    else if (trig.type === 'damage_random') damageEnemy(game, target, trig.amount, trig.damageType);
  }
}

export function endTurn(game) {
  for (const [status, turns] of Object.entries(game.player.statuses)) {
    if (status === 'bleed' || status === 'poison') damagePlayer(game, status === 'bleed' ? 3 : 1, status === 'bleed' ? 'Physical' : 'Poison');
    if (turns > 0 && --game.player.statuses[status] <= 0) delete game.player.statuses[status];
  }
  game.turn++;
  game.realmTurn = (game.realmTurn || 0) + 1;
  game.quickstepUsed = false;

  for (const enemy of game.enemies.filter(e => e.hp > 0)) {
    for (const [name, curse] of Object.entries(enemy.curses || {})) {
      if (name === 'Mercurize') { damageEnemy(game, enemy, curse.damage, 'Poison'); damageEnemy(game, enemy, curse.damage, 'Physical'); }
      if (name === 'Scourge') for (const e of game.enemies.filter(e => distance(e, enemy) <= curse.radius)) damageEnemy(game, e, curse.damage, 'Holy');
      if (name === 'Death Chill' || name === 'Shadow Hex') damageEnemy(game, enemy, curse.damage, 'Dark');
      if (name === 'Slimify') {
        const dealt = damageEnemy(game, enemy, curse.damage, 'Physical');
        if (dealt) { enemy.maxHp = Math.max(1, enemy.maxHp - dealt); summonCreature(game, 'Green Slime', enemy); }
      }
      if (curse.duration > 0 && --curse.duration === 0) {
        if (name === 'Seal Fate') damageEnemy(game, enemy, curse.damage, 'Dark');
        if (enemy.hp > 0) delete enemy.curses[name];
      }
    }
  }
  if (game.enemies.some(e => e.statuses.freeze > 0 || e.statuses.refreezing > 0)) {
    const freeze = spellByName.get('Freeze');
    const frostbite = freeze.upgrades.find(u => u.name === 'Frostbite');
    const damage = game.rw3Upgrades[freeze.id]?.includes(frostbite.sp_id) ? effectiveRw3Spell(game, freeze.id).damage : 0;
    for (const e of game.enemies) {
      if (e.statuses.refreezing > 0) e.statuses.freeze = Math.max(e.statuses.freeze || 0, e.statuses.refreezing--);
      if (damage && e.statuses.freeze) for (const t of ['Ice', 'Dark']) damageEnemy(game, e, damage, t);
    }
  }
  // 1. Clouds & Wizard Buffs / Equipment triggers
  tickCloudsAndBuffs(game);
  cleanup(game);

  // 2. Allied Minions take their turn
  tickAllies(game);
  cleanup(game);

  // 3. Enemies & Spawners take their turn
  const spawnedThisTurn = [];
  for (const enemy of [...game.enemies]) {
    if (enemy.hp <= 0) continue;
    if (enemy.duration > 0 && --enemy.duration === 0) { enemy.hp = 0; continue; }
    unitPassiveTurn(game, enemy, false);
    if (enemy.regen) enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.regen);
    if (enemy.shieldRegen) enemy.shields += enemy.shieldRegen;
    if (enemy.statuses.sleep > 0) { enemy.statuses.sleep--; continue; }
    // DoT statuses
    if (enemy.statuses.burn > 0) { damageEnemy(game, enemy, 3); enemy.statuses.burn--; }
    if (enemy.statuses.immolate > 0) {
      enemy.immolateStacks = (enemy.immolateStacks || 1);
      damageEnemy(game, enemy, 3 * enemy.immolateStacks, 'Fire');
      enemy.immolateStacks++;
      enemy.statuses.immolate--;
    }
    if (enemy.statuses.poison > 0) { damageEnemy(game, enemy, 2); enemy.statuses.poison--; }
    if (enemy.statuses.bleed > 0) { damageEnemy(game, enemy, 3, 'Physical'); enemy.statuses.bleed--; }
    if (enemy.hp <= 0) continue;

    // Incapacitating statuses
    if (enemy.statuses.freeze > 0) { enemy.statuses.freeze--; continue; }
    if (enemy.statuses.stun > 0) { enemy.statuses.stun--; continue; }
    if (enemy.statuses.petrify > 0) { enemy.statuses.petrify--; continue; }
    if (enemy.statuses.shock > 0) { enemy.statuses.shock--; if (game.turn % 2 === 0) continue; }

    // Spawner / Lair behavior
    if (enemy.isSpawner) {
      enemy.spawnCooldown--;
      if (enemy.spawnCooldown <= 0 && game.enemies.length + spawnedThisTurn.length < 30) {
        enemy.spawnCooldown = enemy.maxCooldown || 5;
        const open = findOpenTileNear(game, enemy, 1, false);
        if (open) {
          const arch = ENEMY_ARCHETYPES[enemy.spawnType % 4];
          const hp = Math.round((8 + enemy.spawnType * 2 + game.realm * 2) * getModeConfig(game.mode).enemyHpMult);
          spawnedThisTurn.push({
            ...open, id: 500 + game.turn * 10 + spawnedThisTurn.length,
            type: enemy.spawnType, name: arch.name, hp, maxHp: hp,
            damage: 2 + enemy.spawnType + Math.floor(game.realm / 5),
            range: enemy.spawnType === 2 ? 5 : 1, school: enemy.school,
            boss: false, tags: [...arch.tags], resistances: { ...arch.resistances },
            shields: arch.shields, flying: arch.flying, statuses: {},
          });
          if (units.has(enemy.spawnSpecies)) {
            const def = units.get(enemy.spawnSpecies);
            if (!def.radius) Object.assign(spawnedThisTurn.at(-1), unitStats(def));
          }
          log(game, 'log.spawned', { enemy: spawnedThisTurn.at(-1).name }, 'red');
        }
      }
      continue;
    }

    const effectiveRange = (enemy.statuses.blind > 0 || enemy.statuses.silence > 0) ? 1 : enemy.range;

    // Berserk: attacks nearest unit (including other enemies!)
    if (enemy.statuses.berserk > 0) {
      const others = game.enemies.filter(other => other !== enemy && other.hp > 0);
      if (others.length) {
        others.sort((a, b) => distance(enemy, a) - distance(enemy, b));
        const victim = others[0];
        if (distance(enemy, victim) <= effectiveRange && hasSight(game, enemy, victim)) {
          damageEnemy(game, victim, enemy.damage, 'Physical');
          game.effects.push({ x: victim.x, y: victim.y, color: '#f87171' });
          continue;
        }
      }
    }

    // Fear: flees away from the player
    if (enemy.statuses.fear > 0) {
      if (!enemy.statuses.immobilized) {
        const moves = [[0, 1], [1, 0], [0, -1], [-1, 0]]
          .map(([dx, dy]) => ({ x: enemy.x + dx, y: enemy.y + dy }))
          .filter(p => isPassable(game, p.x, p.y, enemy.flying) && !isTileOccupied(game, p.x, p.y))
          .sort((a, b) => distance(b, game.player) - distance(a, game.player));
        if (moves.length && distance(moves[0], game.player) > distance(enemy, game.player)) {
          enemy.x = moves[0].x; enemy.y = moves[0].y;
        }
      }
      continue;
    }

    // Choose target: nearest of player or allied minions
    const targets = [game.player, ...(game.allies || []).filter(a => a.hp > 0)];
    targets.sort((a, b) => distance(enemy, a) - distance(enemy, b));
    const target = targets[0];

    if (!enemy.statuses.silence && specialMonsterAction(game, enemy, target, false)) continue;
    const gap = distance(enemy, target);
    const attack = readyAttack(enemy, gap, game.turn);
    if (gap <= effectiveRange && (!enemy.species || attack) && hasSight(game, enemy, target)) {
      const dealt = strikeUnit(game, enemy, target, attack, false);
      if (target === game.player) log(game, 'log.hit', { enemy: enemy.species || textRef(enemyNameKey(enemy)), damage: dealt }, 'red');
      else game.effects.push({ x: target.x, y: target.y, color: '#f87171' });
    } else if (!enemy.stationary && !enemy.statuses.immobilized) {
      const moves = [[0, 1], [1, 0], [0, -1], [-1, 0]]
        .map(([dx, dy]) => ({ x: enemy.x + dx, y: enemy.y + dy }))
        .filter(p => isPassable(game, p.x, p.y, enemy.flying) && !isTileOccupied(game, p.x, p.y, enemy));
      // Breadth-first pathfinding avoids enemies getting stuck behind corners.
      const queue = [{ x: target.x, y: target.y }], seen = new Set([`${target.x},${target.y}`]);
      let best;
      for (let i = 0; i < queue.length && !best; i++) {
        const p = queue[i]; best = moves.find(mv => mv.x === p.x && mv.y === p.y);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const x = p.x + dx, y = p.y + dy, key = `${x},${y}`;
          if (isPassable(game, x, y, enemy.flying) && !seen.has(key)) { seen.add(key); queue.push({ x, y }); }
        }
      }
      if (best && canStand(game, enemy, best)) { enemy.x = best.x; enemy.y = best.y; enemyMoved(game, enemy); }
    }
    if (game.player.hp <= 0) break;
  }
  for (const enemy of game.enemies) {
    if (enemy.conductivity) enemy.conductivity = enemy.conductivity.map(n => n - 1).filter(n => n > 0);
    for (const s of ['blind', 'fear', 'berserk', 'silence', 'soaked', 'acidified', 'glassed', 'immobilized', 'armor_melted', 'twilight', 'pyrostatic', 'sharedPain']) {
      if (enemy.statuses[s] > 0) enemy.statuses[s]--;
    }
  }
  if (spawnedThisTurn.length) game.enemies.push(...spawnedThisTurn);
  cleanup(game);
  if (game.player.hp <= 0) { game.status = 'dead'; log(game, 'log.dead', {}, 'red'); }
}

function recruitCompanion(game, species, name, present = null) {
  game.companions ??= [];
  if (game.companions.some(c => c.name === name)) return;
  const ally = present || summonCreature(game, species, game.player);
  if (!ally) return;
  ally.name = name;
  ally.companion = true;
  game.companions.push({ species, name });
  log(game, 'log.companion', { name }, 'green');
}

function collectItem(game, item) {
  game.items = game.items.filter(i => i !== item);
  if (item.type === 'tome') {
    const spell = availableSpells(game).find(s => s.id === item.spellId);
    if (spell) {
      const boost = game.spellBoosts[spell.id] ??= {};
      boost.max_charges = (boost.max_charges || 0) + spell.maxCharges;
      game.charges[spell.id] += spell.maxCharges;
      log(game, 'log.tome', { spell: spell.name }, 'gold');
    }
  } else if (item.type === 'companion') {
    recruitCompanion(game, item.name, item.name);
  } else if (item.type === 'scroll' || item.type === 'chest') {
    game.pendingReward = { type: item.type, options: [...item.options] };
  } else if (item.type === 'rw3-component') {
    addComponent(game, item.name);
    log(game, 'log.collected', { item: textRef(namedKey('components', item.name)) }, 'gold');
    applyComponentPickupEffects(game, item.name);
    equipmentAction(game, 'pickup');
  } else if (item.type === 'shard') {
    awardPoints(game, 3);
    equipmentAction(game, 'shard');
    log(game, 'log.shard', {}, 'gold');
  } else if (item.type === 'potion') {
    game.potions++; log(game, 'log.potion', {}, 'green');
  }
}

export function applyComponentPickupEffects(game, name, repeat) {
  const rng = random(game.seed + game.turn * 97 + game.items.length);
  const nearby = game.enemies.filter(e => e.hp > 0).sort((a, b) => distance(a, game.player) - distance(b, game.player));
  const spells = availableSpells(game);
  resolvePickup(game, name, {
    rng, nearby, spells, pulses: repeat?.pulses, visible: nearby.filter(e => hasSight(game, e, game.player)),
    mastery: tag => spells.filter(s => s.tags.includes(tag)).reduce((n, s) => n + s.level, 0),
    distance: e => distance(e, game.player), heal: n => { game.player.hp = Math.min(maxHealth(game), game.player.hp + n); },
    hurt: (e, n, type) => damageEnemy(game, e, n, type), summon: (n, p, spec) => summonCreature(game, n, p, spec),
    act: a => allyTurn(game, a), cast: (n, p) => freeCast(game, n, p), convert: e => convertEnemy(game, e),
    cloud: (e, type, dur, n) => addCloud(game, e.x, e.y, type, dur, n),
    relocate: () => {
      const item = pick(game.items.filter(i => ['shard', 'rw3-component'].includes(i.type)), rng);
      if (item) collectItem(game, item);
    },
  }, !!repeat);
}

export function move(game, dx, dy, extraStep = false) {
  if (!Number.isInteger(dx) || !Number.isInteger(dy) || Math.max(Math.abs(dx), Math.abs(dy)) !== 1 || (game.mode === 'standard' && dx && dy)) return false;
  if (game.status !== 'playing' || game.deploying || game.pendingReward || ['freeze', 'stun', 'petrify', 'immobilized'].some(st => game.player.statuses[st] > 0) || game.buffs.some(b => b.type === 'watcher')) return false;
  const mods = getEquipmentModifiers(game);
  const p = { x: game.player.x + dx, y: game.player.y + dy };
  if (!isPassable(game, p.x, p.y, mods.flying)) return false;

  // Moving cancels channeling unless wearing Channel Boots
  if (game.channel && !mods.channelMove) cancelChannel(game);

  const enemy = game.enemies.find(e => covers(e, p));
  if (enemy) {
    damageEnemy(game, enemy, 5 + Math.floor(game.realm / 3));
    game.progress.staffStrikes++;
    game.effects = [{ ...p, color: '#ded6b7' }];
    log(game, 'log.staff');
    cleanup(game);
    endTurn(game);
    return true;
  }

  if (game.allies.some(a => covers(a, p))) return false;
  game.buffs = game.buffs.filter(b => b.type !== 'Flame Gate');
  Object.assign(game.player, p);
  game.movedAt = game.turn + 1;
  equipmentAction(game, 'step');
  const item = game.items.find(i => distance(i, p) === 0);
  if (item) collectItem(game, item);
  const portal = game.portals.find(r => distance(r, p) === 0);
  if (portal && !game.enemies.length) {
    game.progress.realmsCleared++;
    if (game.realm >= finalRealmOf(game)) {
      game.status = 'won';
      log(game, 'log.won', {}, 'gold');
      return true;
    }
    game.riftAffinity = portal.affinity || null; game.riftVariant = portal.variant || 0;
    game.realm++; game.deploying = game.mode !== 'standard'; game.theme = portal.theme; game.player.hp = maxHealth(game);
    generateRealm(game);
    log(game, 'log.entered', { realm: game.realm }, 'gold');
    return true;
  }

  const boots = dx && dy ? 'Bishop Boots' : 'Castellan Clogs';
  if (!extraStep && equipped(game, boots) && !isTileOccupied(game, p.x + dx, p.y + dy) && move(game, dx, dy, true)) return true;
  // Quickstep Boots / Ride Drake: 1 free step per turn without ending turn!
  if (mods.quickstep && !game.quickstepUsed) {
    game.quickstepUsed = true;
    return true;
  }
  endTurn(game);
  return true;
}

function convertEnemy(game, enemy) {
  game.enemies = game.enemies.filter(e => e !== enemy);
  enemy.color = '#4ade80'; enemy.duration = 0; enemy.cooldowns ??= {};
  game.allies.push(enemy);
  if (enemy.species?.startsWith('Mordred')) game.befriendedMordred = true;
  if (enemy.species && !game.defeatedSpecies.includes(enemy.species)) game.defeatedSpecies.push(enemy.species);
  if (!game.enemies.length) finishRealm(game);
}

function specialSpell(game, spell, target, unit, manual) {
  const has = name => spell.upgradeNames.includes(name);
  const visible = (origin, pool = game.enemies) => pool.filter(e => e.hp > 0 && hasSight(game, origin, e));
  const heal = amount => { game.player.hp = Math.min(maxHealth(game), game.player.hp + amount); };
  const rng = random(game.seed + game.turn * 7919 + game.progress.spellsCast);
  switch (spell.name) {
    case 'Dominate':
      if (unit) convertEnemy(game, unit);
      return unit ? 1 : 0;
    case 'Magic Missile': {
      if (!unit) return 0;
      const visited = new Set();
      let e = unit;
      while (e) {
        visited.add(e);
        const hit = () => {
          if (has('Shield Burn')) e.shields = 0;
          const types = has('Disruption Bolt') && e.tags?.includes('Arcane') ? ['Dark', 'Holy'] : ['Arcane'];
          for (const type of types) damageEnemy(game, e, spell.damage, type);
        };
        hit();
        if (manual && e === unit && has('Arcane Crossfire')) for (const ally of visible(e, game.allies).filter(a => a.tags.includes('Arcane')).slice(0, 3)) hit();
        if (!has('Ricochet') || visited.size > 2) break;
        e = visible(e).find(other => !visited.has(other) && distance(e, other) <= spell.range);
      }
      return visited.size;
    }
    case 'Death Bolt': {
      if (!unit) return 0;
      for (const type of spell.damageTypes) {
        const dealt = damageEnemy(game, unit, spell.damage, type);
        if (has('Blood Bolt')) heal(dealt);
      }
      if (!unit.hp) {
        if (unit.tags?.includes('Living')) summonCreature(game, 'Skeleton', unit, { hp: unit.maxHp, damage: spell.stats.minion_damage });
        if (has('Corpse Explosion')) for (const e of game.enemies.filter(e => distance(e, unit) <= spell.radius)) {
          for (const type of ['Dark', 'Physical']) damageEnemy(game, e, 3, type);
        }
        if (has('Soul Battery')) game.buffs.push({ name: 'Soulcharge', type: 'bonus', tag: 'Dark', stat: 'damage', amount: 1, duration: -1 });
      }
      return 1;
    }
    case 'Lifedrain':
      if (!unit) return 0;
      if (!has('Exsanguinate')) game.buffs = game.buffs.filter(b => b.type !== 'lifedrain' || b.target !== unit.id);
      game.buffs.push({ name: spell.name, type: 'lifedrain', target: unit.id, damage: spell.damage, radius: spell.radius, targets: has('Life Funnel') ? spell.stats.num_targets : 0, duration: spell.duration });
      return 1;
    case 'Lumbriogenesis': {
      const hp = Math.ceil(game.player.hp / 2);
      game.player.hp -= hp;
      const names = [hp >= 50 ? 'Worm Shambler' : 'Worm Ball'];
      for (const [up, n] of Object.entries({ Toxogenesis: 'Toxic Worm Ball', Ectogenesis: 'Ghost Worm Ball', Mechanogenesis: 'Iron Worm Ball' })) if (has(up)) names.push(n);
      for (const n of names) summonCreature(game, n, target, { hp, damage: Math.max(1, Math.floor(hp / 2)) });
      return 1;
    }
    case 'Shatter': {
      const frozen = game.enemies.filter(e => e.statuses.freeze > 0);
      for (const e of frozen) {
        const dealt = damageEnemy(game, e, spell.damage, 'Physical');
        if (has('Gather Ice') && dealt && hasSight(game, game.player, e)) game.player.shields++;
        if (has('Steam Anima')) {
          damageEnemy(game, e, spell.damage, 'Fire');
          if (!e.hp) summonCreature(game, 'Steam Elemental', e, { hp: 20, range: 4, damage: 10, duration: 6 });
        }
        if (has('Glacial Excision')) e.maxHp = e.hp;
        if (has('Razor Ice')) e.statuses.bleed = spell.duration;
      }
      return frozen.length;
    }
    case 'Death Clock': {
      const hour = (game.realmTurn % 12) * Math.PI / 6;
      const dx = Math.sin(hour), dy = -Math.cos(hour);
      const affected = [...game.enemies, ...game.allies].filter(e => {
        const x = e.x - game.player.x, y = e.y - game.player.y;
        return x * dx + y * dy > 0 && Math.abs(x * dy - y * dx) < 0.55;
      });
      for (const e of affected) {
        if (game.allies.includes(e) && has('Ritual of Acceleration')) { allyTurn(game, e); continue; }
        for (const type of ['Dark', 'Physical']) (game.allies.includes(e) ? damageAlly : damageEnemy)(game, e, spell.damage, type);
        e.statuses.stun = 1;
      }
      return affected.length;
    }
    case 'Word of Ice':
      for (const e of game.enemies) {
        if (e.tags.includes('Fire')) damageEnemy(game, e, spell.damage, 'Ice');
        e.statuses.freeze = spell.duration;
      }
      return game.enemies.length;
    case 'Word of Beauty':
      heal(maxHealth(game));
      for (const e of [...game.enemies, ...game.allies]) {
        if (e.tags.includes('Living')) e.hp = e.maxHp;
        if (e.tags.some(tag => ['Dark', 'Demon', 'Undead'].includes(tag))) (game.allies.includes(e) ? damageAlly : damageEnemy)(game, e, spell.damage, 'Lightning');
        if (e.tags.includes('Arcane')) e.statuses.stun = spell.duration;
      }
      return game.enemies.length;
    case 'Word of Madness':
      for (const e of [...game.enemies, ...game.allies]) {
        if (!has('Selective Madness') || game.enemies.includes(e)) e.statuses.berserk = spell.duration;
        if (e.tags.includes('Construct')) (game.allies.includes(e) ? damageAlly : damageEnemy)(game, e, Math.floor(e.maxHp / 2), 'Dark');
        if (e.tags.some(tag => ['Demon', 'Arcane'].includes(tag))) e.hp = e.maxHp;
      }
      return game.enemies.length;
    case 'Word of Undeath':
      for (const e of [...game.enemies, ...game.allies]) {
        const factor = e.tags.includes('Undead') ? 2 : 0.5;
        e.hp = Math.max(1, Math.floor(e.hp * factor)); e.maxHp = Math.max(1, Math.floor(e.maxHp * factor));
      }
      return game.enemies.length;
    case 'Word of Chaos':
      for (const e of game.enemies) {
        const pos = findOpenTileNear(game, { x: 1 + Math.floor(rng() * (SIZE - 2)), y: 1 + Math.floor(rng() * (SIZE - 2)) }, 4, e.flying);
        if (pos && canStand(game, e, pos)) Object.assign(e, pos);
        e.statuses[pick(['stun', 'berserk', 'fear'], rng)] = spell.duration;
        if (e.tags.includes('Fire')) damageEnemy(game, e, spell.damage, 'Lightning');
        if (e.tags.includes('Lightning')) damageEnemy(game, e, spell.damage, 'Fire');
        if (e.tags.includes('Construct')) { e.resistances.Physical = 0; damageEnemy(game, e, spell.damage, 'Physical'); }
      }
      return game.enemies.length;
    case 'Death Shock': {
      let e = unit, hits = 0;
      while (e) {
        for (const type of spell.damageTypes) damageEnemy(game, e, spell.damage, type);
        hits++;
        if (e.hp > 0) break;
        e = visible(e).find(other => distance(e, other) <= spell.range);
      }
      return hits;
    }
  }
  return 0;
}

function areaCells(center, radius) {
  const cells = [];
  for (let y = Math.max(1, center.y - radius); y <= Math.min(SIZE - 2, center.y + radius); y++) {
    for (let x = Math.max(1, center.x - radius); x <= Math.min(SIZE - 2, center.x + radius); x++) cells.push({ x, y });
  }
  return cells;
}
function onSegment(from, to, p) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const px = p.x - from.x, py = p.y - from.y;
  const dot = px * dx + py * dy;
  return dot > 0 && dot <= dx * dx + dy * dy && Math.abs(px * dy - py * dx) <= 0.55 * Math.hypot(dx, dy);
}

function resolveRw3Cast(game, spell, target, manual = true) {
  if (game.castCounterTurn !== game.turn) {
    game.castCounterTurn = game.turn; game.castCount = 0;
  }
  if (game.castCount >= 2048 || (game.castDepth || 0) >= 64) { game.castChainCapped = true; return 0; }
  game.castCount++; game.castDepth = (game.castDepth || 0) + 1;
  const previous = game.castingTags;
  game.castingTags = spell.tags;
  try { return applySpell(game, spell, target, manual); }
  finally { if (!--game.castDepth) delete game.castDepth; if (previous) game.castingTags = previous; else delete game.castingTags; }
}

function applySpell(game, spell, target, manual) {
  const mods = getEquipmentModifiers(game);
  const desc = (spell.desc || '').toLowerCase();
  const primaryDmgType = spell.damageTypes[0] || 'Arcane';
  let hitCount = 0;

  // Apply on-cast equipment triggers (e.g. Arcane Shield)
  if (manual) for (const trig of mods.onCastShieldTags) {
    if (spell.tags.includes(trig.tag)) game.player.shields = (game.player.shields || 0) + trig.amount;
  }
  if (spell.stats.shields > 0 && ['self_buff', 'teleport', 'heal_allies'].includes(spell.behavior)) {
    game.player.shields = (game.player.shields || 0) + spell.stats.shields;
  }

  const upgrades = spell.upgradeNames;
  const unit = game.enemies.find(e => e.hp > 0 && covers(e, target));
  const ally = game.allies.find(a => a.hp > 0 && covers(a, target));
  if (manual && game.enemies.some(e => e.hp > 0 && e.name === 'Sanguine Hierophant')) game.player.statuses.bleed = 10;
  if (manual && ['The Body Electric', 'The Sparking Soul'].includes(unit?.name)) damagePlayer(game, 10, 'Lightning', unit);
  if (manual && ally?.orb === 'Orb of Assimilation' && spell.tags.includes('Sorcery')) {
    const cooldown = Math.max(1, 10 - (game.charges[spell.id] || 0));
    game.charges[spell.id] = 0;
    ally.granted = [...(ally.granted || []).filter(s => s.id !== spell.id), { id: spell.id, types: spell.damageTypes, damage: spell.damage, range: spell.range, next: game.turn, cooldown }];
    return 1;
  }
  const rng = random(game.seed + game.turn * 313 + target.x * SIZE + target.y + game.effects.length);
  const result = resolveSpellEffect(game, spell, target, {
    manual, enemy: unit, ally, dist: distance, see: (a, b) => hasSight(game, a, b), roll: choices => pick(choices, rng),
    hurt: (e, n, t) => damageEnemy(game, e, n, t), hurtAlly: (a, n, t) => damageAlly(game, a, n, t),
    heal: n => { game.player.hp = Math.min(maxHealth(game), game.player.hp + n); },
    summon: (n, p, spec) => summonCreature(game, n, p, spec), act: a => allyTurn(game, a),
    cast: (name, p) => freeCast(game, name, p), openNear: (p, r, fly) => findOpenTileNear(game, p, r, fly),
    free: p => isPassable(game, p.x, p.y) && !isTileOccupied(game, p.x, p.y), cells: areaCells,
    spells: () => availableSpells(game), cloud: (p, t, dur, dmg) => addCloud(game, p.x, p.y, t, dur, dmg),
    floor: p => { game.tiles[p.y][p.x] = 0; }, moveUnit: (e, p) => { if (canStand(game, e, p)) Object.assign(e, p); }, onSegment,
  });
  if (result !== null) return result;
  if (spell.behavior === 'special') return specialSpell(game, spell, target, unit, manual);
  if (spell.behavior === 'orb') {
    let orb = game.allies.find(a => a.orb === spell.name && a.hp > 0);
    if (orb) {
      Object.assign(orb, target);
      if (equipped(game, "Orb Controller's Mitts")) {
        if (manual) game.charges[spell.id] = Math.min(spell.maxCharges, game.charges[spell.id] + 1);
        tickOrb(game, orb);
      }
    } else {
      orb = spawnAlly(game, target, { name: spell.name, hp: spell.stats.minion_health, damage: spell.stats.minion_damage, tags: spell.tags, color: spell.color, stationary: true });
      Object.assign(orb, { orb: spell.name, upgrades, auraRadius: spell.radius, targets: spell.stats.num_targets });
    }
    if (equipped(game, 'Acanthine Armillary')) for (let y = target.y - 2; y <= target.y + 2; y++) for (let x = target.x - 2; x <= target.x + 2; x++) {
      if (isPassable(game, x, y) && !isTileOccupied(game, x, y)) summonCreature(game, 'Vine', { x, y });
    }
    return 1;
  }
  if (spell.behavior === 'teleport') {
    const before = { x: game.player.x, y: game.player.y };
    if ((unit || ally) && upgrades.includes('Aether Swap')) {
      Object.assign(unit || ally, before);
      if (unit) damageEnemy(game, unit, spell.damage, 'Arcane'); else damageAlly(game, ally, spell.damage, 'Arcane');
    }
    if (isPassable(game, target.x, target.y, mods.flying) && !isTileOccupied(game, target.x, target.y)) {
      game.player.x = target.x; game.player.y = target.y;
      game.effects.push({ x: target.x, y: target.y, color: spell.color });
    }
    if (upgrades.includes('Group Teleport')) for (const friend of game.allies.slice(0, spell.stats.num_targets)) {
      const pos = findOpenTileNear(game, target, 3, friend.flying); if (pos) Object.assign(friend, pos);
    }
    let refund = false;
    for (const e of game.enemies.filter(e => e.hp > 0)) {
      if (upgrades.includes('Assassinate') && distance(e, target) <= 1 && !hasSight(game, before, e)) {
        damageEnemy(game, e, spell.damage, 'Arcane'); e.statuses.silence = spell.duration;
      }
      if (upgrades.includes('Void Teleport') && hasSight(game, target, e)) damageEnemy(game, e, spell.maxCharges, 'Arcane');
      if (e.hp <= 0) refund = true;
    }
    if (manual && refund && upgrades.includes('Assassinate')) game.charges[spell.id] = Math.min(spell.maxCharges, game.charges[spell.id] + 1);
    if (upgrades.includes('Dissolution')) freeCast(game, 'Disperse', target);
    if (upgrades.includes('Thunderblink')) for (const e of game.enemies.filter(e => e.hp > 0 && hasSight(game, target, e)).sort((a, b) => distance(target, a) - distance(target, b)).slice(0, spell.stats.num_targets)) freeCast(game, 'Thunder Strike', e);
    if (upgrades.includes('Guarded Entrance')) freeCast(game, 'Earthen Sentinel', before);
    if (upgrades.includes('Make Entrance') && ![...game.portals, ...game.items, game.shrine].filter(Boolean).some(p => !distance(before, p))) game.tiles[before.y][before.x] = 2;
    if (upgrades.includes('Return to Hell')) for (const e of game.enemies.filter(e => e.tags?.includes('Demon') && !e.radius && distance(e, before) <= 1)) e.hp = 0;
    if (upgrades.includes('Tremorsensitivity')) for (const p of [before, target]) for (let i = 0; i < spell.stats.num_summons; i++) summonCreature(game, 'Rock Worm', p, { hp: spell.stats.minion_health, damage: spell.stats.minion_damage });
  } else if (spell.behavior === 'disperse') {
    const affected = game.enemies.filter(e => !e.isSpawner && distance(e, target) <= (spell.radius || 3));
    for (const enemy of affected) {
      const dest = findOpenTileNear(game, { x: SIZE - 1 - enemy.x, y: SIZE - 1 - enemy.y }, 6, enemy.flying);
      if (dest) { enemy.x = dest.x; enemy.y = dest.y; hitCount++; game.effects.push({ x: dest.x, y: dest.y, color: spell.color }); }
    }
  } else if (spell.behavior === 'summon') {
    if (spell.name === 'Dream the Starwhale' && game.channel?.spellId === spell.id && !manual) return 0;
    if (spell.name === 'Demonic Ritual' && !manual && game.channel?.spellId === spell.id) {
      if (upgrades.includes("Solomon's Binding")) for (const e of game.enemies.filter(e => e.tags.includes('Demon'))) e.statuses.stun = spell.duration;
      return 0;
    }
    const options = spell.name === 'Summon Wizard' && !upgrades.includes('Dragon Wizard') ? [...units.values()].filter(u => u.pools.includes('Wizard')).map(u => u.name) : spell.summons;
    const replacements = options.filter(name => upgrades.some(up => up === name || up.endsWith(' ' + name)));
    const multiple = upgrades.includes('Four Horsemen') || upgrades.includes('Grand Ritual');
    const count = multiple ? options.length : Math.max(1, spell.stats.num_summons);
    const consumed = upgrades.includes('Ravenous Wolf') ? Math.max(1, game.charges[spell.id]) : 1;
    if (upgrades.includes('Ravenous Wolf')) game.charges[spell.id] = 0;
    for (let i = 0; i < count; i++) {
      const pos = findOpenTileNear(game, target, 2, false);
      if (!pos) break;
      const variable = ['Summon Wizard', 'Summon Rider', 'Horde of Halfmen', 'Demonic Ritual'].includes(spell.name);
      let species = multiple ? options[i] : replacements[0] || (variable ? pick(options, rng) : options[0]) || spell.name;
      if (spell.name === 'Wyrm Eggs') species = pick(['Fire Wyrm Egg', 'Ice Wyrm Egg'], rng);
      if (species === 'Orochi' && !canStand(game, { radius: 1 }, pos)) species = 'Frostfire Hydra';
      const def = units.get(species);
      const spec = {
        hp: (spell.stats.minion_health || def?.hp || 14) * consumed,
        damage: (spell.stats.minion_damage || def?.abilities.find(a => a.damage)?.damage || 5) * consumed,
        range: spell.stats.minion_range > 1 ? spell.stats.minion_range : def ? unitStats(def).range : 1,
        shields: spell.stats.shields || def?.shields || 0,
        duration: spell.stats.minion_duration, tags: def?.tags || spell.tags, color: spell.color, icon: spell.icon,
      };
      const summoned = summonCreature(game, species, pos, spec);
      if (summoned) {
        if (spell.name === 'Demonic Ritual') summoned.boundRitual = true;
        if (spell.name === 'Dream the Starwhale') {
          summoned.dream = true; summoned.hungeringDepths = upgrades.includes('Hungering Depths'); summoned.starbask = upgrades.includes('Starbask'); summoned.iceDream = upgrades.includes('Ice Dream') ? spell.duration : 0;
          for (const damageType of ['Ice','Arcane']) game.buffs.push({ name: spell.name, type: 'resist', damageType, amount: 100, duration: -1 });
        }
        if (upgrades.includes('Hydra Regrowth')) summoned.fullRegen = true;
        if (upgrades.includes('Crystalline Hydra')) summoned.crystal = true;
        if (upgrades.includes('Double Dragon')) {
          const opposite = { x: 2 * game.player.x - pos.x, y: 2 * game.player.y - pos.y };
          if (isPassable(game, opposite.x, opposite.y) && !isTileOccupied(game, opposite.x, opposite.y)) summonCreature(game, species, opposite, spec);
        }
      }
      game.effects.push({ x: pos.x, y: pos.y, color: spell.color });
      hitCount++;
    }
  } else if (spell.behavior === 'cloud') {
    const cloudType = spell.tags.includes('Ice') ? 'blizzard'
      : spell.tags.includes('Lightning') ? 'storm'
      : spell.tags.includes('Fire') ? 'fire'
      : /rain/i.test(desc) ? 'rain'
      : /web/i.test(desc) ? 'web' : 'poison';
    const r = Math.max(1, spell.radius || 2);
    for (let y = Math.max(1, target.y - r); y <= Math.min(SIZE - 2, target.y + r); y++) {
      for (let x = Math.max(1, target.x - r); x <= Math.min(SIZE - 2, target.x + r); x++) {
        if (distance(target, { x, y }) <= r && isPassable(game, x, y, true)) {
          addCloud(game, x, y, cloudType, spell.duration || 8, spell.damage || null);
          game.effects.push({ x, y, color: spell.color });
        }
      }
    }
  } else if (spell.behavior === 'self_buff') {
    game.buffs ??= [];
    if (spell.tags.includes('Eye')) {
      game.buffs.push({
        id: `eye-${spell.rw3Id}`, name: spell.name, type: 'eye',
        damage: spell.damage || 12, damageType: primaryDmgType,
        shotCooldown: spell.stats.shot_cooldown || 3, timer: 1,
        duration: spell.duration || 20, healOnHit: spell.tags.includes('Blood'),
        status: /berserk/i.test(desc) ? 'berserk' : null, color: spell.color,
      });
    } else if (/ride drake|mounted/i.test(desc)) {
      game.buffs.push({ id: `mount-${spell.rw3Id}`, name: spell.name, type: 'mount', flying: true, quickstep: true, duration: spell.duration || 10 });
    } else if (/regeneration/i.test(spell.name)) {
      game.buffs.push({ id: `regen-${spell.rw3Id}`, name: spell.name, type: 'regen', amount: 4, radius: spell.radius || 8, selfHeal: true, duration: spell.duration || 8 });
    } else {
      // Generic Enchantment buff: boost allies damage & grant aura/shields
      for (const ally of game.allies || []) ally.damage += 4;
      game.buffs.push({ id: `buff-${spell.rw3Id}`, name: spell.name, type: 'aura', damage: Math.max(3, spell.damage), damageType: primaryDmgType, radius: spell.radius || 3, duration: spell.duration || 8 });
    }
    game.effects.push({ x: game.player.x, y: game.player.y, color: spell.color });
  } else if (spell.behavior === 'heal_allies') {

    for (const ally of game.allies || []) {
      if (hasSight(game, game.player, ally)) {
        if (upgrades.includes('Purifying Light')) ally.statuses = {};
        const healed = Math.min(50, ally.maxHp - ally.hp);
        ally.hp += healed;
        if (upgrades.includes('Heartflame') && healed > 0) {
          const e = game.enemies.filter(e => e.hp > 0 && hasSight(game, ally, e)).sort((a, b) => distance(ally, a) - distance(ally, b))[0];
          if (e) { damageEnemy(game, e, healed, 'Fire'); damageEnemy(game, e, healed, 'Holy'); }
        }
        if (ally.upgrades?.includes('Prismatic Reflection')) for (const friend of [game.player, ...game.allies].filter(a => a !== ally && hasSight(game, ally, a))) {
          friend.hp = Math.min(friend.maxHp || maxHealth(game), friend.hp + healed);
          friend.shields += spell.stats.shields;
        }
        if (spell.stats.shields > 0) ally.shields += spell.stats.shields;
        game.effects.push({ x: ally.x, y: ally.y, color: spell.color });
      }
    }
  } else {
    // Offensive targeting: single, burst, beam, cone, chain
    let targets = [];
    if (spell.behavior === 'beam') {
      const dx = target.x - game.player.x, dy = target.y - game.player.y, len = Math.hypot(dx, dy);
      // Destroy wall if Bone Spear / wall-melting spell
      if (/destroy a wall/i.test(desc) && game.tiles[target.y]?.[target.x] === 1 && target.x > 0 && target.y > 0 && target.x < SIZE - 1 && target.y < SIZE - 1) {
        game.tiles[target.y][target.x] = 0;
      }
      targets = game.enemies.filter(e => len > 0 && distance(e, game.player) <= spell.range && (!spell.requiresLos || hasSight(game, game.player, e))
        && (e.x - game.player.x) * dx + (e.y - game.player.y) * dy > 0
        && Math.abs((e.x - game.player.x) * dy - (e.y - game.player.y) * dx) / len <= 0.55);
    } else if (spell.behavior === 'cone') {
      const dx = target.x - game.player.x, dy = target.y - game.player.y, len = Math.hypot(dx, dy);
      targets = game.enemies.filter(e => {
        if (distance(e, game.player) > spell.range || (spell.requiresLos && !hasSight(game, game.player, e))) return false;
        if (len === 0) return distance(e, game.player) <= 1;
        const ex = e.x - game.player.x, ey = e.y - game.player.y, elen = Math.hypot(ex, ey);
        return elen > 0 && (ex * dx + ey * dy) / (len * elen) >= 0.5;
      });
    } else if (spell.behavior === 'chain') {
      const first = game.enemies.find(e => distance(e, target) <= 1);
      if (first) {
        targets.push(first);
        const maxBounces = Math.max(1, spell.stats.num_targets || 3);
        for (let i = 1; i < maxBounces; i++) {
          const prev = targets[targets.length - 1];
          const next = game.enemies.find(e => !targets.includes(e) && distance(prev, e) <= 5 && hasSight(game, prev, e));
          if (next) targets.push(next); else break;
        }
      }
    } else if (spell.behavior === 'burst') {
      // Ice spells that freeze chasms into floors (Icicle)
      if (/turns chasms into floors/i.test(desc)) {
        for (let y = Math.max(1, target.y - spell.radius); y <= Math.min(SIZE - 2, target.y + spell.radius); y++) {
          for (let x = Math.max(1, target.x - spell.radius); x <= Math.min(SIZE - 2, target.x + spell.radius); x++) {
            if (game.tiles[y][x] === 2) game.tiles[y][x] = 0;
          }
        }
      }
      targets = game.enemies.filter(e => distance(e, target) <= spell.radius);
    } else {
      const direct = game.enemies.find(e => covers(e, target));
      if (direct) targets = [direct];
    }

    const totalHits = spell.behavior === 'single' ? Math.max(1, spell.stats.num_targets || 1) : 1;
    for (const enemy of targets) {
      hitCount++;
      for (let h = 0; h < totalHits && enemy.hp > 0; h++) {
        for (const dt of spell.damageTypes) {
          const dealt = damageEnemy(game, enemy, spell.damage, dt);
          if ((spell.tags.includes('Blood') && /heals the caster/i.test(desc)) && dealt > 0) {
            game.player.hp = Math.min(maxHealth(game), game.player.hp + dealt);
          }
        }
      }
      // Status effects from spell description & upgrades
      const dur = Math.max(2, spell.duration || 3);
      if (/\[frozen\]|\[freeze\]/i.test(desc)) enemy.statuses.freeze = Math.max(enemy.statuses.freeze || 0, dur);
      if (/\[poison\]/i.test(desc)) enemy.statuses.poison = Math.max(enemy.statuses.poison || 0, dur);
      if (/\[fear\]/i.test(desc)) enemy.statuses.fear = Math.max(enemy.statuses.fear || 0, dur);
      if (/\[petrify\]/i.test(desc)) enemy.statuses.petrify = Math.max(enemy.statuses.petrify || 0, dur);
      if (/\[stun\]/i.test(desc)) enemy.statuses.stun = Math.max(enemy.statuses.stun || 0, dur);
      if (/\[blind\]/i.test(desc)) enemy.statuses.blind = Math.max(enemy.statuses.blind || 0, dur);
      if (/\[bleed\]/i.test(desc)) enemy.statuses.bleed = Math.max(enemy.statuses.bleed || 0, dur);
      if (/\[berserk\]/i.test(desc)) enemy.statuses.berserk = Math.max(enemy.statuses.berserk || 0, dur);
      if (/immolate/i.test(spell.name)) { enemy.statuses.immolate = Math.max(enemy.statuses.immolate || 0, dur); enemy.immolateStacks = 1; }
      if (/loses \[100 physical/i.test(desc)) enemy.statuses.armor_melted = Math.max(enemy.statuses.armor_melted || 0, dur);
      if (/pull the target/i.test(desc) && !enemy.isSpawner) {
        const stepX = Math.sign(game.player.x - enemy.x), stepY = Math.sign(game.player.y - enemy.y);
        const pulled = { x: enemy.x + stepX, y: enemy.y + stepY };
        if (isPassable(game, pulled.x, pulled.y, enemy.flying) && !isTileOccupied(game, pulled.x, pulled.y)) {
          enemy.x = pulled.x; enemy.y = pulled.y;
        }
      }
      for (const st of spell.extraStatuses || []) {
        enemy.statuses[st] = Math.max(enemy.statuses[st] || 0, dur);
      }
      // Raise skeleton on Death Bolt kill
      if (enemy.hp <= 0 && /raised as skeletons/i.test(desc)) {
        spawnAlly(game, { x: enemy.x, y: enemy.y }, { name: 'Skeleton', hp: enemy.maxHp, damage: spell.stats.minion_damage || 5, range: 1, tags: ['Undead'], color: '#a78bfa', icon: '☠' });
      }
      game.effects.push({ x: enemy.x, y: enemy.y, color: spell.color });
    }
  }
  return hitCount;
}

export function cast(game, spellId, target) {
  if (game.status !== 'playing' || game.deploying || game.pendingReward || ['freeze', 'stun', 'petrify', 'fear', 'silence'].some(st => game.player.statuses[st] > 0) || game.buffs.some(b => b.type === 'watcher')) return false;
  const spell = availableSpells(game).find(s => s.id === spellId);
  if (!spell || !Number.isInteger(target?.x) || !Number.isInteger(target?.y)) return false;

  const originOrTarget = spell.range === 0 ? game.player : target;
  const effectiveTarget = { x: originOrTarget.x, y: originOrTarget.y };
  const interior = effectiveTarget.x > 0 && effectiveTarget.y > 0 && effectiveTarget.x < SIZE - 1 && effectiveTarget.y < SIZE - 1;
  const canTargetWall = interior && (spell.name === 'Shrapnel Blast' || /destroy (?:a )?walls?|melts walls/i.test(spell.desc || '')) && game.tiles[effectiveTarget.y]?.[effectiveTarget.x] === 1;
  if (spell.name === 'Shrapnel Blast' && !canTargetWall) return false;
  const tileOk = canTargetWall || isPassable(game, effectiveTarget.x, effectiveTarget.y, true);
  if (!tileOk) return false;
  if (spell.range > 0 && distance(game.player, effectiveTarget) > spell.range) return false;
  if (spell.range > 0 && spell.requiresLos && !hasSight(game, game.player, effectiveTarget, canTargetWall)) return false;
  const unit = game.enemies.find(e => covers(e, effectiveTarget));
  const occupant = unit || game.allies.find(a => covers(a, effectiveTarget));
  if (['Devour Flesh', 'Temporal Transfusion', 'Vampiricism', 'Suspend Mortality', 'Armageddon Blade'].includes(spell.name) && (!occupant || unit || (spell.name === 'Devour Flesh' && !occupant.tags.includes('Living')))) return false;
  if (spell.name === 'Devour Mind' && !unit?.tags?.some(t => ['Living', 'Demon', 'Arcane'].includes(t))) return false;
  if (spell.name === 'Ice Vortex' && !occupant?.statuses.freeze) return false;
  if (spell.name === 'Prison of Thorns' && !unit) return false;
  if (spell.name === 'Lightning Spire' && game.tiles[effectiveTarget.y][effectiveTarget.x] === 2) return false;
  if (spell.name === 'Moon Glaive' && isTileOccupied(game, effectiveTarget.x, effectiveTarget.y)) return false;
  if (spell.name === 'Magnetize' && !occupant?.tags?.includes('Metallic')) return false;
  if (spell.name === 'Volcanic Eruption' && game.tiles[effectiveTarget.y][effectiveTarget.x] !== 2) return false;
  if (spell.name === 'Underworld Passage') {
    const nearChasm = p => areaCells(p, 1).some(t => game.tiles[t.y][t.x] === 2);
    if (!nearChasm(effectiveTarget) || (!spell.upgradeNames.includes('Make Entrance') && !nearChasm(game.player))) return false;
  }
  if (spell.name === 'Earthen Passage') {
    const walls = areaCells(game.player, 1).filter(p => game.tiles[p.y][p.x] === 1);
    const seen = new Set(walls.map(p => p.x + ',' + p.y));
    let exit = false;
    for (let i = 0; i < walls.length && !exit; i++) {
      exit = distance(walls[i], effectiveTarget) <= 1;
      for (const p of areaCells(walls[i], 1)) if (game.tiles[p.y][p.x] === 1 && !seen.has(p.x + ',' + p.y)) { walls.push(p); seen.add(p.x + ',' + p.y); }
    }
    if (!exit) return false;
  }
  if (spell.name === 'Storm Walk' && !game.clouds.some(c => !distance(c, effectiveTarget) && ['storm', 'rain', 'blizzard'].includes(c.type))) return false;
  if (spell.behavior === 'teleport') {
    if (!isPassable(game, effectiveTarget.x, effectiveTarget.y, getEquipmentModifiers(game).flying) || !distance(game.player, effectiveTarget)) return false;
    if (occupant && (!spell.upgradeNames.includes('Aether Swap') || occupant.radius)) return false;
  }
  if (spell.behavior === 'orb' && (isTileOccupied(game, effectiveTarget.x, effectiveTarget.y) || !isPassable(game, effectiveTarget.x, effectiveTarget.y, true))) return false;
  if (spell.behavior === 'summon' && spell.name !== 'Prison of Thorns' && spell.range > 0 && spell.desc.startsWith('Summon') && (isTileOccupied(game, effectiveTarget.x, effectiveTarget.y) || !isPassable(game, effectiveTarget.x, effectiveTarget.y))) return false;
  if (spell.name === 'Lumbriogenesis' && (game.player.hp <= 1 || !findOpenTileNear(game, effectiveTarget))) return false;
  if (spell.name === 'Dominate' && (!unit || unit.isSpawner || ((spell.upgradeNames.includes('Brute Force') ? unit.hp : unit.maxHp) > spell.damage && !(unit.tags.includes('Undead') && spell.upgradeNames.includes('Death Lord'))))) return false;
  if (spell.maxCharges > 0 && !(game.charges[spellId] > 0)) return false;
  if (spell.hpCost > 0 && game.player.hp <= spell.hpCost) return false;

  if (game.channel) { cancelChannel(game); if (game.player.hp <= 0) { game.status = 'dead'; return true; } }
  if (spell.maxCharges > 0) game.charges[spellId]--;
  if (spell.hpCost > 0) {
    game.player.hp -= spell.hpCost;
    equipmentAction(game, 'payHP', { amount: spell.hpCost });
    if (game.buffs.some(b => b.type === 'Pain Mirror')) for (const e of game.enemies.filter(e => hasSight(game, game.player, e))) damageEnemy(game, e, spell.hpCost, 'Dark');
  }
  game.lastCast = { spellId, target: { ...effectiveTarget } };
  game.progress.spellsCast++;
  game.effects = [];
  if (equipped(game, 'Rift Breaker')) {
    const portal = game.portals.find(p => !distance(p, game.player));
    if (portal && (game.enemies.length || game.portals.length > 1)) {
      game.portals = game.portals.filter(p => p !== portal);
      game.player.hp = maxHealth(game); game.player.shields += 20;
      for (const s of availableSpells(game)) game.charges[s.id] = s.maxCharges;
    }
  }

  if (game.buffs.some(b => b.type === 'rechargeSorcery') && spell.tags.includes('Sorcery')) {
    for (const other of availableSpells(game)) if (other.id !== spellId) game.charges[other.id] = Math.min(other.maxCharges, game.charges[other.id] + 1);
  }
  const origin = { x: game.player.x, y: game.player.y };
  const hits = resolveRw3Cast(game, spell, effectiveTarget);
  equipmentAction(game, 'cast', { spell, target: effectiveTarget, victim: unit, origin });
  if (spell.tags.includes('Sorcery') && game.buffs.some(b => b.type === 'Multicast')) resolveRw3Cast(game, spell, effectiveTarget, false);
  if (game.buffs.some(b => b.type === 'Death Cleave') && unit?.hp === 0) {
    const next = game.enemies.find(e => e.hp > 0 && distance(game.player, e) <= spell.range && hasSight(game, game.player, e));
    if (next) resolveRw3Cast(game, spell, next, false);
  }
  if (game.buffs.some(b => b.type === 'Flame Gate') && spell.name !== 'Flame Gate') {
    if (spell.tags.includes('Fire')) summonCreature(game, 'Fire Elemental', effectiveTarget, { duration: 8 });
    else game.buffs = game.buffs.filter(b => b.type !== 'Flame Gate');
  }
  if (game.buffs.some(b => b.type === 'lightningForm') && spell.name !== 'Lightning Form') {
    if (spell.tags.includes('Lightning') && !isTileOccupied(game, effectiveTarget.x, effectiveTarget.y) && isPassable(game, effectiveTarget.x, effectiveTarget.y)) Object.assign(game.player, effectiveTarget);
    if (!spell.tags.includes('Lightning')) game.buffs = game.buffs.filter(b => b.name !== 'Lightning Form');
  }
  if (spell.name === 'Storm Walk') game.clouds = game.clouds.filter(c => distance(c, effectiveTarget));
  if (spell.maxChannel > 1) {
    game.channel = {
      spellId, target: { ...effectiveTarget }, targetId: occupant?.id ?? null,
      turnsLeft: spell.maxChannel - 1, totalTurns: spell.maxChannel,
      isRitual: spell.tags.includes('Ritual'), invulnerable: spell.upgradeNames.includes('Inviolate Ritual'),
    };
  } else {
    game.channel = null;
  }

  game.effects.push({ ...effectiveTarget, color: spell.color });
  log(game, hits === 1 ? 'log.cast.one' : 'log.cast.other', { spell: spell.name, count: hits });
  cleanup(game);
  if (!spell.quickCast) endTurn(game);
  return true;
}

export function wait(game) {
  if (game.status !== 'playing' || game.deploying || game.pendingReward) return false;
  if (game.channel) {
    const spell = availableSpells(game).find(s => s.id === game.channel.spellId);
    if (spell) {
      game.effects = [];
      const allyTarget = spell.name === 'Temporal Transfusion' ? game.allies.find(a => a.id === game.channel.targetId) : null;
      if (spell.name === 'Temporal Transfusion' && !allyTarget) { cancelChannel(game); endTurn(game); return true; }
      resolveRw3Cast(game, spell, allyTarget || game.channel.target, false);
      if (!game.channel) { cleanup(game); endTurn(game); return true; }
      game.channel.turnsLeft--;
      if (game.channel.turnsLeft <= 0) {
        releaseChannel(game, spell, true);
        if (game.channel.isRitual) {
          if (spell.upgradeNames.includes('Ritual of Acceleration')) for (const a of game.allies) a.haste = true;
          if (spell.name === 'Temporal Transfusion' && spell.upgradeNames.includes('Ritual of Haste')) {
            const target = game.allies.find(a => a.id === game.channel.targetId); if (target) target.haste = true;
          }
          if (spell.name === 'Ritual of Revelation') for (let i = 0; i < spell.stats.num_summons; i++) summonCreature(game, spell.upgradeNames.includes("Arbiter's Revelation") ? 'Arbiter' : 'False Prophet', game.player);
          if (spell.name === 'Ritual of the Opening Eye') for (let i = 0; i < spell.stats.num_summons; i++) freeCast(game, 'Floating Eye', game.player);
          if (Object.values(game.equipment).some(e => e.components.includes('Cursed Rosary') && rw3Equipment.find(item => item.name === e.name)?.tags.some(tag => ['Dark', 'Ritual'].includes(tag)))) game.player.hp = maxHealth(game);
          log(game, 'log.ritualComplete', { spell: spell.name }, 'gold');
        }
        game.channel = null;
      } else {
        log(game, 'log.channeling', { spell: spell.name, turns: game.channel.turnsLeft }, 'gold');
      }
      cleanup(game);
      endTurn(game);
      return true;
    }
    game.channel = null;
  }
  log(game, 'log.wait');
  endTurn(game);
  return true;
}

function releaseChannel(game, spell, completed) {
  if (spell.name === 'Dream the Starwhale') {
    const keep = completed && spell.upgradeNames.includes('Ritual of Stars');
    for (const a of game.allies.filter(a => a.dream)) {
      delete a.dream; delete a.starbask;
      if (!keep) game.allies = game.allies.filter(u => u !== a);
    }
    game.buffs = game.buffs.filter(b => b.name !== spell.name);
    if (!keep) game.player.statuses.freeze = 3;
  }
  if (spell.name === 'Ritual of Flying Daggers') {
    const count = ((game.daggers || 0) + (game.soulDaggers || 0)) * (completed ? spell.stats.num_targets : 1);
    const rng = random(game.seed + game.turn);
    for (let i = 0; i < count; i++) {
      const e = pick(game.enemies.filter(e => e.hp > 0 && hasSight(game, game.player, e)), rng);
      if (!e) break;
      damageEnemy(game, e, spell.damage, 'Physical');
      if (spell.upgradeNames.includes('Weighted Knives')) e.statuses.stun = 1;
      if (e.hp <= 0) {
        if (spell.upgradeNames.includes('Anima Thief')) freeCast(game, 'Summon Blade', e);
        if (spell.upgradeNames.includes('Soul Blades')) game.soulDaggers = (game.soulDaggers || 0) + 1;
      }
    }
    game.largestDaggerVolley = Math.max(game.largestDaggerVolley || 0, count);
    game.daggers = 0;
  }
  if (spell.name === 'Demonic Ritual') {
    for (const a of game.allies.filter(a => a.boundRitual)) {
      delete a.boundRitual;
      if (!completed) {
        game.allies = game.allies.filter(other => other !== a);
        game.enemies.push({ ...a, id: 100000 + (game.nextEnemyId = (game.nextEnemyId || 0) + 1), school: 0, duration: spell.maxChannel });
      }
    }
  }
  if (spell.name === 'Hatebolts') for (const t of ['Fire', 'Dark']) damagePlayer(game, game.enemies.filter(e => e.hp > 0).length, t);
  if (completed && spell.name === 'Litany of Curses') for (const e of game.enemies) {
    for (const st of Object.keys(e.statuses).filter(st => e.statuses[st] > 0).slice(0, spell.stats.num_targets)) e.statuses[st] = Number.MAX_SAFE_INTEGER;
  }
}

export function cancelChannel(game) {
  if (!game.channel) return false;
  const spell = availableSpells(game).find(s => s.id === game.channel.spellId);
  if (spell) releaseChannel(game, spell, false);
  game.channel = null;
  return true;
}

export function drink(game) {
  if (game.status !== 'playing' || game.deploying || game.pendingReward || !game.potions) return false;
  game.potions--; game.progress.potionsUsed++;
  game.player.hp = maxHealth(game);
  for (const spell of availableSpells(game)) game.charges[spell.id] = spell.maxCharges;
  log(game, 'log.restored', {}, 'green');
  endTurn(game); return true;
}

export function serialize(game) { return JSON.stringify(game); }
export function restore(value) {
  try {
    const game = JSON.parse(value);
    const maxRealm = finalRealmOf(game);
    if (game.version !== SAVE_VERSION || !Number.isInteger(game.seed) || !Number.isInteger(game.realm) || game.realm < 1 || game.realm > maxRealm
      || !Array.isArray(game.learned) || !game.learned.every(id => nodeMap.has(id)) || new Set(game.learned).size !== game.learned.length
      || !['playing', 'dead', 'won'].includes(game.status)
      || !Array.isArray(game.tiles) || game.tiles.length !== SIZE || !game.tiles.every(row => Array.isArray(row) && row.length === SIZE && row.every(t => t === 0 || t === 1 || t === 2))
      || !Number.isFinite(game.player?.hp) || !Number.isInteger(game.player.x) || !Number.isInteger(game.player.y)
      || (game.tiles[game.player.y]?.[game.player.x] !== 0 && game.tiles[game.player.y]?.[game.player.x] !== 2)
      || !Array.isArray(game.enemies) || !Array.isArray(game.items) || !Array.isArray(game.portals) || !Array.isArray(game.log)
      || !game.charges || !Number.isFinite(game.points)) return null;
    const defaults = { damageDealt: 0, pointsEarned: 0, pointsSpent: 0, spellsCast: 0, staffStrikes: 0, potionsUsed: 0, realmsCleared: 0 };
    game.progress = { ...defaults, ...game.progress };
    if (!Object.values(game.progress).every(val => Number.isInteger(val) && val >= 0)) return null;
    game.mutators ??= []; game.vault ??= null; game.defeatedSpecies ??= []; game.clearedVaults ??= [];
    game.riftRoll ??= 0; game.rerolls ??= 1; game.rerolledRealms ??= []; game.pendingReward ??= null;
    if (!Array.isArray(game.mutators) || !game.mutators.every(m => mutators.includes(m))) return null;
    game.realmTurn ??= 0; game.offeringTags ??= []; game.lastCast ??= null;
    game.mode ??= 'standard';
    if (!Object.hasOwn(GAME_MODES, game.mode)) return null;
    game.rw3Spells ??= []; game.rw3Upgrades ??= {}; game.spellBoosts ??= {};
    if (!game.rw3Spells.length) {
      game.rw3Spells = [...getModeConfig(game.mode).starterRw3];
      for (const id of game.rw3Spells) {
        const eff = effectiveRw3Spell(game, id);
        if (eff && !(eff.id in game.charges)) game.charges[eff.id] = eff.maxCharges;
      }
    }
    game.allies ??= []; game.clouds ??= []; game.buffs ??= []; game.channel ??= null;
    game.quickstepUsed ??= false; game.bonusMaxHp ??= 0;
    game.player.shields ??= 0; game.player.resistances ??= {}; game.player.statuses ??= {};
    game.rw3Components ??= []; game.equipment ??= {};
    game.shrine ??= null;
    delete game.bigBangEnabled;
    delete game.charges['dev-big-bang'];
    delete game.spellBoosts['dev-big-bang'];
    if (!Array.isArray(game.rw3Components) || !game.rw3Components.every(name => componentByName.has(name))
      || !Array.isArray(game.rw3Spells) || !game.rw3Spells.every(id => spellById.has(id))
      || !Object.values(game.equipment).every(entry => entry && typeof entry.name === 'string' && Array.isArray(entry.components))
      || (game.shrine && (!Number.isInteger(game.shrine.x) || !Number.isInteger(game.shrine.y)
        || game.tiles[game.shrine.y]?.[game.shrine.x] !== 0 || !Number.isInteger(game.shrine.uses) || game.shrine.uses < 0 || game.shrine.uses > 3))) return null;
    if (game.status === 'won' && game.realm === 24 && game.mode === 'standard') {
      game.status = 'playing';
      game.progress.realmsCleared = Math.max(0, game.progress.realmsCleared - 1);
      log(game, 'log.expanded', {}, 'gold');
    }
    game.log = game.log.map(migrateLogEntry);
    return game;
  } catch { return null; }
}

function syncCharges(game, oldSpells) {
  const previous = new Map(oldSpells.map(s => [s.id, s.maxCharges]));
  for (const spell of availableSpells(game)) {
    const used = Math.max(0, (previous.get(spell.id) || 0) - (game.charges[spell.id] || 0));
    game.charges[spell.id] = Math.max(0, spell.maxCharges - used);
    previous.delete(spell.id);
  }
  for (const id of previous.keys()) delete game.charges[id];
}

export function forge(game, name, componentNames) {
  const previous = availableSpells(game);
  const item = forgeEquipment(game, name, componentNames);
  if (!item) return false;
  syncCharges(game, previous);
  equipmentAction(game, 'forge');
  if (!game.enemies.length) addEquipmentRift(game, item);
  log(game, 'log.forged', { item: textRef(namedKey('equipment', item.name)), slot: textRef(`slots.${item.slot.toLowerCase()}`) }, 'gold');
  return true;
}

export function useShrine(game, options = {}) {
  if (game.status !== 'playing' || game.deploying || game.pendingReward || !game.shrine?.uses || distance(game.player, game.shrine) > 1) return false;
  const type = game.shrine.type || 'transmutation';
  if (type === 'transmutation') {
    const source = options.component || game.rw3Components?.[0];
    if (!source || !game.rw3Components.includes(source)) return false;
    const pool = transmutationChoices(source).map(c => c.name);
    if (!pool.length || (options.result && !pool.includes(options.result))) return false;
    const rng = random(game.seed + game.realm * 313 + game.turn * 97 + game.shrine.uses * 17);
    const result = options.result || pick(pool, rng);
    game.rw3Components.splice(game.rw3Components.indexOf(source), 1);
    game.rw3Components.push(result);
    game.shrine.uses--;
    log(game, 'log.transmuted', { from: textRef(namedKey('components', source)), to: textRef(namedKey('components', result)) }, 'gold');
    endTurn(game); return true;
  }
  if (type === 'offering' || type === 'knowledge') {
    const name = options.component;
    const comp = componentByName.get(name);
    if (!comp || !game.rw3Components.includes(name)) return false;
    if (type === 'offering') {
      if (!comp.tags.includes(options.tag)) return false;
      game.offeringTags.push(options.tag);
    } else {
      const rng = random(game.seed + game.turn * 17 + game.realm);
      const pool = availableSpells(game).flatMap(s => s.upgrades.filter(u => !s.learnedUpgrades.includes(u.sp_id)).map(u => [s.rw3Id, u.sp_id]));
      if (!pool.length) return false;
      for (let i = 0; i < (comp.rare && comp.on_craft ? 4 : 1) && pool.length; i++) {
        const [[id, upgrade]] = pool.splice(Math.floor(rng() * pool.length), 1);
        (game.rw3Upgrades[id] ??= []).push(upgrade);
      }
    }
    game.rw3Components.splice(game.rw3Components.indexOf(name), 1);
    game.shrine.uses--; endTurn(game); return true;
  }
  if (type === 'reformation') {
    const slot = options.slot;
    const item = game.equipment[slot];
    if (!item?.components?.length) return false;
    const prev = availableSpells(game);
    game.rw3Components.push(...item.components);
    delete game.equipment[slot]; syncCharges(game, prev);
    game.shrine.uses--; endTurn(game); return true;
  }
  if (type === 'spellgraft') {
    const s = availableSpells(game).find(s => s.id === options.spellId);
    if (!s || !rw3Tags.includes(options.tag) || s.tags.includes(options.tag)) return false;
    const previous = availableSpells(game);
    ((game.spellBoosts[s.id] ??= {}).tags ??= []).push(options.tag);
    syncCharges(game, previous);
    game.shrine.uses--; endTurn(game); return true;
  }
  if (type === 'haste') {
    const spell = availableSpells(game).find(s => s.id === options.spellId && !s.quickCast);
    if (!spell) return false;
    (game.spellBoosts[spell.id] ??= {}).quickCast = true;
    game.shrine.uses--; endTurn(game); return true;
  }
  if (type === 'duplication') {
    const targetComp = options.component || game.rw3Components?.[0];
    if (!targetComp || !game.rw3Components.includes(targetComp)) return false;
    game.rw3Components.push(targetComp);
    game.shrine.uses--;
    log(game, 'log.shrineDuplicated', { item: textRef(namedKey('components', targetComp)) }, 'gold');
    endTurn(game); return true;
  }
  if (type === 'empowerment') {
    const spells = availableSpells(game);
    const chosen = spells.find(s => s.id === options.spellId) || spells[0];
    if (!chosen) return false;
    game.spellBoosts ??= {};
    game.spellBoosts[chosen.id] ??= { damage: 0, max_charges: 0, minion_damage: 0 };
    game.spellBoosts[chosen.id].damage = (game.spellBoosts[chosen.id].damage || 0) + 3;
    game.spellBoosts[chosen.id].max_charges = (game.spellBoosts[chosen.id].max_charges || 0) + 2;
    game.spellBoosts[chosen.id].minion_damage = (game.spellBoosts[chosen.id].minion_damage || 0) + 3;
    game.charges[chosen.id] = (game.charges[chosen.id] || 0) + 2;
    game.shrine.uses--;
    log(game, 'log.shrineEmpowered', { spell: chosen.name }, 'gold');
    endTurn(game); return true;
  }
  if (type === 'chronomancy') {
    for (const spell of availableSpells(game)) game.charges[spell.id] = spell.maxCharges;
    game.player.shields = (game.player.shields || 0) + 4;
    game.shrine.uses--;
    log(game, 'log.shrineChronomancy', {}, 'gold');
    endTurn(game); return true;
  }
  if (type === 'calling') {
    const pos = findOpenTileNear(game, game.player, 2, false);
    if (!pos) return false;
    spawnAlly(game, pos, { name: 'Arcane Sentinel', hp: 45, damage: 9, range: 3, shields: 3, duration: 0, tags: ['Arcane', 'Conjuration'], color: '#c084fc', icon: '✧' });
    game.shrine.uses--;
    log(game, 'log.shrineCalling', {}, 'gold');
    endTurn(game); return true;
  }
  return false;
}

export function threateningEnemies(game, target) {
  return game.enemies.filter(e => e.hp > 0 && !e.isSpawner
    && !e.statuses.sleep && !e.statuses.freeze && !e.statuses.stun && !e.statuses.petrify
    && !(e.statuses.shock > 0 && (game.turn + 1) % 2 === 0)
    && distance(e, target) <= ((e.statuses.blind > 0 || e.statuses.silence > 0) ? 1 : e.range)
    && (!e.species || readyAttack(e, distance(e, target), game.turn + 1)) && hasSight(game, e, target));
}

export function rerollRifts(game) {
  if (game.status !== 'playing' || game.realm >= finalRealmOf(game) || !game.rerolls || game.pendingReward) return false;
  game.rerolls--; game.riftRoll++;
  if (!game.rerolledRealms.includes(game.realm)) game.rerolledRealms.push(game.realm);
  return true;
}

export function claimReward(game, choice) {
  const reward = game.pendingReward;
  if (game.status !== 'playing' || !reward?.options.includes(choice)) return false;
  if (reward.type === 'scroll') {
    if (!game.rw3Spells.includes(choice)) game.rw3Spells.push(choice);
    const spell = effectiveRw3Spell(game, choice);
    game.charges[spell.id] = spell.maxCharges;
    log(game, 'log.learnedRw3', { spell: spell.name }, 'gold');
  } else {
    const item = rw3Equipment.find(e => e.name === choice);
    if (!item) return false;
    const previous = availableSpells(game);
    equipItem(game, item);
    syncCharges(game, previous);
    log(game, 'log.forged', { item: choice, slot: textRef('slots.' + item.slot.toLowerCase()) }, 'gold');
  }
  game.pendingReward = null;
  return true;
}

export function previewPortal(game, destination) {
  if (game.realm >= finalRealmOf(game)) return null;
  const portal = typeof destination === 'number' ? { theme: destination } : destination;
  const preview = { ...structuredClone(game), realm: game.realm + 1, theme: portal.theme, riftVariant: portal.variant || 0, riftAffinity: portal.affinity || null, deploying: game.mode !== 'standard' };
  generateRealm(preview);
  return {
    enemies: preview.enemies.length,
    spawners: preview.enemies.filter(e => e.isSpawner).length,
    boss: preview.enemies.some(e => e.boss),
    vault: preview.vault,
    species: [...new Set(preview.enemies.map(e => e.name))],
    schools: [...new Set(preview.enemies.map(e => e.school))],
    rw3Components: preview.items.filter(i => i.type === 'rw3-component').map(i => i.name),
    shrine: preview.shrine?.type || 'transmutation',
  };
}
