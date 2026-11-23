import { namedKey, textRef, enemyNameKey } from './text-keys.js';
import { migrateLogEntry } from './log-migration.js';
import { nodeMap } from './catalog.js';
import {
  addComponent, forge as forgeEquipment, componentByName, spellById,
  effectiveRw3Spell, canLearnRw3Spell, canLearnRw3Upgrade,
  applyComponentPickupEffects, getEquipmentModifiers, computeElementalDamage,
  SHRINE_TYPES, CLOUD_TYPES, getModeConfig, GAME_MODES,
} from './rw3.js';

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

export function createGame(seed = Date.now() % 2147483647, { mode = 'standard' } = {}) {
  const cfg = getModeConfig(mode);
  const isRw3Mode = cfg.id !== 'standard';
  const game = {
    version: 1, seed, mode: cfg.id, realm: 1, turn: 0, points: cfg.startPoints,
    learned: [],
    rw3Spells: [...cfg.starterRw3], rw3Upgrades: {}, spellBoosts: {},
    rw3Components: [], equipment: {},
    player: { x: 3, y: 11, hp: 55, shield: 0, shields: isRw3Mode ? 2 : 0, resistances: {}, statuses: {} },
    bonusMaxHp: 0, allies: [], clouds: [], buffs: [], channel: null, quickstepUsed: false,
    charges: {}, potions: cfg.potions ? 3 : 0, kills: 0, status: 'playing', log: [], effects: [], theme: 0,
    progress: { damageDealt: 0, pointsEarned: 0, pointsSpent: 0, spellsCast: 0, staffStrikes: 0, potionsUsed: 0, realmsCleared: 0 },
  };
  generateRealm(game);
  log(game, 'log.start', {}, 'gold');
  return game;
}

export function availableSpells(game) {
  return (game.rw3Spells || []).map(id => effectiveRw3Spell(game, id)).filter(Boolean);
}

export function generateRealm(game) {
  const cfg = getModeConfig(game.mode);
  const rng = random(game.seed + game.realm * 7919 + game.theme * 101);
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
  function position() {
    const choices = queue.filter(p => p.x > 6 && !occupied.has(`${p.x},${p.y}`));
    const p = choices[Math.floor(rng() * choices.length)];
    occupied.add(`${p.x},${p.y}`);
    return { ...p };
  }
  const finalRealm = finalRealmOf(game);
  const isFinalBossRealm = game.realm === finalRealm;
  const count = Math.min(7 + game.realm, 27);
  for (let i = 0; i < count; i++) {
    const type = (i + game.theme) % 4;
    const arch = ENEMY_ARCHETYPES[type];
    const boss = (game.realm % 6 === 0 || isFinalBossRealm) && i === 0;
    const baseHp = (boss ? (isFinalBossRealm ? 140 : 35) : 9 + type * 3) + game.realm * 2;
    const hp = Math.round(baseHp * cfg.enemyHpMult);
    const resistances = boss && isFinalBossRealm
      ? { Fire: 50, Ice: 50, Lightning: 50, Dark: 75, Arcane: 50 }
      : { ...arch.resistances };
    game.enemies.push({
      ...position(), id: i, type,
      name: boss ? (isFinalBossRealm ? 'Mordred' : 'The Rift Sovereign') : arch.name,
      hp, maxHp: hp,
      damage: (boss ? (isFinalBossRealm ? 14 : 7) : 2 + type) + Math.floor(game.realm / 5),
      range: boss && isFinalBossRealm ? 6 : type === 2 ? 5 : 1,
      school: (type + game.theme) % 12,
      boss, isFinalBoss: boss && isFinalBossRealm,
      tags: boss ? ['Boss', ...arch.tags] : [...arch.tags],
      resistances,
      shields: boss ? (isFinalBossRealm ? 6 : 2) : arch.shields,
      flying: boss ? true : arch.flying,
      statuses: {},
    });
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
        spawnType: (game.realm + s) % 4,
        tags: ['Arcane', 'Construct'], resistances: { Poison: 100, Dark: 25 },
        shields: 1, flying: false, statuses: {},
      });
    }
  }

  for (let i = 0; i < 3; i++) {
    const itemType = i === 2 ? (cfg.potions ? 'potion' : 'shard') : 'shard';
    game.items.push({ ...position(), type: itemType });
  }
  const named = [...componentByName.keys()];
  for (let i = 0; i < 4; i++) game.items.push({ ...position(), type: 'rw3-component', name: named[Math.floor(rng() * named.length)] });

  const shrineType = game.realm === 1 ? 'transmutation' : SHRINE_TYPES[(game.realm + game.theme) % SHRINE_TYPES.length];
  game.shrine = { ...position(), type: shrineType, uses: shrineType === 'transmutation' ? 3 : 1 };
  game.charges = Object.fromEntries(availableSpells(game).map(s => [s.id, s.maxCharges]));
  game.effects = [];
}

export function isPassable(game, x, y, flying = false) {
  const tile = game.tiles[y]?.[x];
  return tile === 0 || (flying && tile === 2);
}

export function hasSight(game, from, to) {
  let x = from.x, y = from.y;
  const dx = Math.abs(to.x - x), sx = x < to.x ? 1 : -1, dy = -Math.abs(to.y - y), sy = y < to.y ? 1 : -1;
  let error = dx + dy;
  while (x !== to.x || y !== to.y) {
    const e = 2 * error;
    if (e >= dy) { error += dy; x += sx; }
    if (e <= dx) { error += dx; y += sy; }
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
  game.points -= upgrade.level;
  game.progress.pointsSpent += upgrade.level;
  game.rw3Upgrades ??= {};
  game.rw3Upgrades[spellId] ??= [];
  game.rw3Upgrades[spellId].push(spId);
  const eff = effectiveRw3Spell(game, spellId);
  if (eff.maxCharges > (game.charges[eff.id] || 0)) {
    game.charges[eff.id] = Math.min(eff.maxCharges, (game.charges[eff.id] || 0) + 1);
  }
  log(game, 'log.upgradedRw3', { spell: base.name, upgrade: upgrade.name }, 'gold');
  return true;
}

function awardPoints(game, amount) { game.points += amount; game.progress.pointsEarned += amount; }

function damageEnemy(game, enemy, amount, damageType = null, pierce = 0) {
  let finalAmount = damageType ? computeElementalDamage(amount, damageType, enemy, pierce) : Math.max(0, amount);
  if (finalAmount <= 0) return 0;
  if (enemy.shields > 0 && damageType) {
    enemy.shields--;
    game.effects.push({ x: enemy.x, y: enemy.y, color: '#7dd3fc' });
    return 0;
  }
  const dealt = Math.min(enemy.hp, finalAmount);
  enemy.hp -= dealt; game.progress.damageDealt += dealt;
  // Fire or Physical hit breaks freeze (RW3 shatter interaction)
  if ((damageType === 'Fire' || damageType === 'Physical') && enemy.statuses?.freeze > 0) {
    enemy.statuses.freeze = 0;
  }
  return dealt;
}

function damageAlly(game, ally, amount) {
  if (ally.shields > 0) { ally.shields--; return 0; }
  const dealt = Math.min(ally.hp, Math.max(1, amount));
  ally.hp -= dealt;
  return dealt;
}

function damagePlayer(game, amount, damageType = 'Physical') {
  if (game.player.shields > 0) {
    game.player.shields--;
    log(game, 'log.shieldBlock', {}, 'gold');
    return 0;
  }
  const scaled = damageType ? computeElementalDamage(amount, damageType, game.player, 0, game) : amount;
  if (scaled <= 0) return 0;
  const incoming = Math.max(1, scaled), absorbed = Math.min(game.player.shield, incoming);
  game.player.shield -= absorbed;
  game.player.hp = Math.max(0, game.player.hp - incoming + absorbed);
  return incoming - absorbed;
}

function isTileOccupied(game, x, y) {
  if (game.player.x === x && game.player.y === y) return true;
  if (game.enemies.some(e => e.hp > 0 && e.x === x && e.y === y)) return true;
  if ((game.allies || []).some(a => a.hp > 0 && a.x === x && a.y === y)) return true;
  return false;
}

function findOpenTileNear(game, origin, maxDist = 2, flying = false) {
  for (let r = 0; r <= maxDist; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = origin.x + dx, y = origin.y + dy;
      if (isPassable(game, x, y, flying) && !isTileOccupied(game, x, y)) return { x, y };
    }
  }
  return null;
}

function spawnAlly(game, pos, spec) {
  game.allies ??= [];
  const ally = {
    id: `ally-${game.turn}-${game.allies.length}-${Math.floor(Math.random() * 10000)}`,
    name: spec.name || 'Summon',
    x: pos.x, y: pos.y,
    hp: Math.max(1, spec.hp || 12), maxHp: Math.max(1, spec.hp || 12),
    damage: Math.max(1, spec.damage || 5),
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
}

function cleanup(game) {
  const dead = game.enemies.filter(e => e.hp <= 0); game.kills += dead.length;
  for (const enemy of dead) {
    log(game, 'log.fall', { enemy: enemy.isSpawner ? enemy.name : enemy.isFinalBoss ? 'Mordred' : textRef(enemyNameKey(enemy)) }, 'green');
    if (enemy.boss) awardPoints(game, 5);
    if (enemy.isSpawner) awardPoints(game, 2);
  }
  game.enemies = game.enemies.filter(e => e.hp > 0);
  game.allies = (game.allies || []).filter(a => a.hp > 0);
  if (dead.length && !game.enemies.length) {
    awardPoints(game, 6 + Math.floor(game.realm / 3));
    log(game, 'log.cleared', {}, 'gold');
  }
}

function tickAllies(game) {
  for (const ally of game.allies || []) {
    if (ally.hp <= 0) continue;
    if (ally.duration > 0) {
      ally.duration--;
      if (ally.duration <= 0) { ally.hp = 0; continue; }
    }
    const livingEnemies = game.enemies.filter(e => e.hp > 0);
    if (!livingEnemies.length) continue;
    // Find nearest enemy
    livingEnemies.sort((a, b) => distance(ally, a) - distance(ally, b));
    const target = livingEnemies[0];
    if (distance(ally, target) <= ally.range && hasSight(game, ally, target)) {
      damageEnemy(game, target, ally.damage, 'Physical');
      game.effects.push({ x: target.x, y: target.y, color: ally.color });
    } else {
      const path = shortestPath(game, ally, target, ally.flying);
      if (path?.length) {
        const next = path[0];
        if (!isTileOccupied(game, next.x, next.y)) { ally.x = next.x; ally.y = next.y; }
      }
    }
  }
  game.allies = (game.allies || []).filter(a => a.hp > 0);
}

function tickCloudsAndBuffs(game) {
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
    if (buff.type === 'aura' && buff.damage > 0) {
      for (const enemy of game.enemies) {
        if (enemy.hp > 0 && distance(game.player, enemy) <= (buff.radius || 3)) {
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
    buff.duration--;
  }
  game.buffs = (game.buffs || []).filter(b => b.duration > 0);

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
  game.turn++;
  game.quickstepUsed = false;

  // 1. Clouds & Wizard Buffs / Equipment triggers
  tickCloudsAndBuffs(game);
  cleanup(game);

  // 2. Allied Minions take their turn
  tickAllies(game);
  cleanup(game);

  // 3. Enemies & Spawners take their turn
  const spawnedThisTurn = [];
  for (const enemy of game.enemies) {
    if (enemy.hp <= 0) continue;
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
    for (const s of ['blind', 'fear', 'berserk', 'silence', 'soaked', 'acidified', 'glassed', 'immobilized', 'armor_melted']) {
      if (enemy.statuses[s] > 0) enemy.statuses[s]--;
    }
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
          log(game, 'log.spawned', { enemy: textRef(enemyNameKey({ type: enemy.spawnType })) }, 'red');
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

    if (distance(enemy, target) <= effectiveRange && hasSight(game, enemy, target)) {
      if (target === game.player) {
        damagePlayer(game, enemy.damage, 'Physical');
        log(game, 'log.hit', { enemy: enemy.isFinalBoss ? 'Mordred' : textRef(enemyNameKey(enemy)), damage: enemy.damage }, 'red');
      } else {
        damageAlly(game, target, enemy.damage);
        game.effects.push({ x: target.x, y: target.y, color: '#f87171' });
      }
    } else if (!enemy.statuses.immobilized) {
      const moves = [[0, 1], [1, 0], [0, -1], [-1, 0]]
        .map(([dx, dy]) => ({ x: enemy.x + dx, y: enemy.y + dy }))
        .filter(p => isPassable(game, p.x, p.y, enemy.flying) && !isTileOccupied(game, p.x, p.y));
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
      if (best) { enemy.x = best.x; enemy.y = best.y; }
    }
    if (game.player.hp <= 0) break;
  }
  if (spawnedThisTurn.length) game.enemies.push(...spawnedThisTurn);
  cleanup(game);
  if (game.player.hp <= 0) { game.status = 'dead'; log(game, 'log.dead', {}, 'red'); }
}

export function move(game, dx, dy) {
  if (game.status !== 'playing' || Math.abs(dx) + Math.abs(dy) !== 1) return false;
  const mods = getEquipmentModifiers(game);
  const p = { x: game.player.x + dx, y: game.player.y + dy };
  if (!isPassable(game, p.x, p.y, mods.flying)) return false;

  // Moving cancels channeling unless wearing Channel Boots
  if (game.channel && !mods.channelMove) game.channel = null;

  const enemy = game.enemies.find(e => distance(e, p) === 0);
  if (enemy) {
    damageEnemy(game, enemy, 5 + Math.floor(game.realm / 3));
    game.progress.staffStrikes++;
    game.effects = [{ ...p, color: '#ded6b7' }];
    log(game, 'log.staff');
    cleanup(game);
    endTurn(game);
    return true;
  }

  Object.assign(game.player, p);
  const item = game.items.find(i => distance(i, p) === 0);
  if (item) {
    if (item.type === 'rw3-component') {
      addComponent(game, item.name);
      applyComponentPickupEffects(game, item.name);
      log(game, 'log.collected', { item: textRef(namedKey('components', item.name)) }, 'gold');
    } else if (item.type === 'shard') {
      awardPoints(game, 3);
      log(game, 'log.shard', {}, 'gold');
    } else if (item.type === 'potion') {
      game.potions++;
      log(game, 'log.potion', {}, 'green');
    }
    game.items = game.items.filter(i => i !== item);
  }
  const portal = game.portals.find(r => distance(r, p) === 0);
  if (portal && !game.enemies.length) {
    game.progress.realmsCleared++;
    if (game.realm >= finalRealmOf(game)) {
      game.status = 'won';
      log(game, 'log.won', {}, 'gold');
      return true;
    }
    game.realm++; game.theme = portal.theme; game.player.hp = maxHealth(game);
    generateRealm(game);
    log(game, 'log.entered', { realm: game.realm }, 'gold');
    return true;
  }

  // Quickstep Boots / Ride Drake: 1 free step per turn without ending turn!
  if (mods.quickstep && !game.quickstepUsed) {
    game.quickstepUsed = true;
    return true;
  }
  endTurn(game);
  return true;
}

function resolveRw3Cast(game, spell, target) {
  const mods = getEquipmentModifiers(game);
  const desc = (spell.desc || '').toLowerCase();
  const primaryDmgType = spell.damageTypes[0] || 'Arcane';
  let hitCount = 0;

  // Apply on-cast equipment triggers (e.g. Arcane Shield)
  for (const trig of mods.onCastShieldTags) {
    if (spell.tags.includes(trig.tag)) game.player.shields = (game.player.shields || 0) + trig.amount;
  }
  if (spell.stats.shields > 0 && ['self_buff', 'teleport', 'heal_allies'].includes(spell.behavior)) {
    game.player.shields = (game.player.shields || 0) + spell.stats.shields;
  }

  if (spell.behavior === 'teleport') {
    if (isPassable(game, target.x, target.y, mods.flying) && !isTileOccupied(game, target.x, target.y)) {
      game.player.x = target.x; game.player.y = target.y;
      game.effects.push({ x: target.x, y: target.y, color: spell.color });
    }
  } else if (spell.behavior === 'disperse') {
    const affected = game.enemies.filter(e => !e.isSpawner && distance(e, target) <= (spell.radius || 3));
    for (const enemy of affected) {
      const dest = findOpenTileNear(game, { x: SIZE - 1 - enemy.x, y: SIZE - 1 - enemy.y }, 6, enemy.flying);
      if (dest) { enemy.x = dest.x; enemy.y = dest.y; hitCount++; game.effects.push({ x: dest.x, y: dest.y, color: spell.color }); }
    }
  } else if (spell.behavior === 'summon') {
    const count = Math.max(1, spell.stats.num_summons || 1);
    for (let i = 0; i < count; i++) {
      const pos = findOpenTileNear(game, target, 2, false);
      if (!pos) break;
      spawnAlly(game, pos, {
        name: spell.name,
        hp: spell.stats.minion_health || 14,
        damage: spell.stats.minion_damage || 5,
        range: spell.stats.minion_range || 1,
        shields: spell.stats.shields || 0,
        duration: spell.stats.minion_duration || 0,
        tags: spell.tags,
        color: spell.color,
        icon: spell.icon,
      });
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
    game.player.hp = Math.min(maxHealth(game), game.player.hp + 25);
    for (const ally of game.allies || []) {
      if (hasSight(game, game.player, ally)) {
        ally.hp = Math.min(ally.maxHp, ally.hp + 50);
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
      const direct = game.enemies.find(e => distance(e, target) === 0);
      if (direct) targets = [direct];
    }

    const totalHits = spell.behavior === 'single' ? Math.max(1, spell.stats.num_targets || 1) : 1;
    for (const enemy of targets) {
      hitCount++;
      for (let h = 0; h < totalHits && enemy.hp > 0; h++) {
        for (const dt of spell.damageTypes) {
          const dealt = damageEnemy(game, enemy, spell.damage || 8, dt);
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
  if (game.status !== 'playing') return false;
  const spell = availableSpells(game).find(s => s.id === spellId);
  if (!spell || !Number.isInteger(target?.x) || !Number.isInteger(target?.y)) return false;

  const effectiveTarget = spell.range === 0 ? { x: game.player.x, y: game.player.y } : target;
  const canTargetWall = /destroy a wall/i.test(spell.desc || '') && game.tiles[effectiveTarget.y]?.[effectiveTarget.x] === 1;
  const tileOk = canTargetWall || isPassable(game, effectiveTarget.x, effectiveTarget.y, true);
  if (!tileOk) return false;
  if (spell.range > 0 && distance(game.player, effectiveTarget) > spell.range) return false;
  if (spell.range > 0 && spell.requiresLos && !hasSight(game, game.player, effectiveTarget)) return false;
  if (spell.maxCharges > 0 && !(game.charges[spellId] > 0)) return false;
  if (spell.hpCost > 0 && game.player.hp <= spell.hpCost) return false;

  if (spell.maxCharges > 0) game.charges[spellId]--;
  if (spell.hpCost > 0) game.player.hp -= spell.hpCost;
  game.progress.spellsCast++;
  game.effects = [];

  const hits = resolveRw3Cast(game, spell, effectiveTarget);
  if (spell.maxChannel > 1) {
    game.channel = {
      spellId, target: { ...effectiveTarget },
      turnsLeft: spell.maxChannel - 1, totalTurns: spell.maxChannel,
      isRitual: spell.tags.includes('Ritual'),
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
  if (game.status !== 'playing') return false;
  if (game.channel) {
    const spell = availableSpells(game).find(s => s.id === game.channel.spellId);
    if (spell) {
      game.effects = [];
      resolveRw3Cast(game, spell, game.channel.target);
      game.channel.turnsLeft--;
      if (game.channel.turnsLeft <= 0) {
        if (game.channel.isRitual) {
          game.player.shields = (game.player.shields || 0) + 4;
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

export function cancelChannel(game) {
  if (!game.channel) return false;
  game.channel = null;
  return true;
}

export function drink(game) {
  if (game.status !== 'playing' || !game.potions) return false;
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
    if (game.version !== 1 || !Number.isInteger(game.seed) || !Number.isInteger(game.realm) || game.realm < 1 || game.realm > maxRealm
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

export function forge(game, name, componentNames) {
  const item = forgeEquipment(game, name, componentNames);
  if (!item) return false;
  log(game, 'log.forged', { item: textRef(namedKey('equipment', item.name)), slot: textRef(`slots.${item.slot.toLowerCase()}`) }, 'gold');
  return true;
}

export function useShrine(game, options = {}) {
  if (game.status !== 'playing' || !game.shrine?.uses || distance(game.player, game.shrine) > 1) return false;
  const type = game.shrine.type || 'transmutation';
  if (type === 'transmutation') {
    const source = options.component || game.rw3Components?.[0];
    if (!source || !game.rw3Components.includes(source)) return false;
    const pool = [...componentByName.keys()].filter(name => name !== source);
    const rng = random(game.seed + game.realm * 313 + game.turn * 97 + game.shrine.uses * 17);
    const result = pool[Math.floor(rng() * pool.length)];
    game.rw3Components.splice(game.rw3Components.indexOf(source), 1);
    game.rw3Components.push(result);
    game.shrine.uses--;
    log(game, 'log.transmuted', { from: textRef(namedKey('components', source)), to: textRef(namedKey('components', result)) }, 'gold');
    endTurn(game); return true;
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
    game.spellBoosts[chosen.id].damage += 3;
    game.spellBoosts[chosen.id].max_charges += 2;
    game.spellBoosts[chosen.id].minion_damage += 3;
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
    && !e.statuses.freeze && !e.statuses.stun && !e.statuses.petrify
    && !(e.statuses.shock > 0 && (game.turn + 1) % 2 === 0)
    && distance(e, target) <= ((e.statuses.blind > 0 || e.statuses.silence > 0) ? 1 : e.range)
    && hasSight(game, e, target));
}

export function previewPortal(game, theme) {
  if (game.realm >= finalRealmOf(game)) return null;
  const preview = { ...game, realm: game.realm + 1, theme, player: { ...game.player } };
  generateRealm(preview);
  return {
    enemies: preview.enemies.length,
    spawners: preview.enemies.filter(e => e.isSpawner).length,
    boss: preview.enemies.some(e => e.boss),
    schools: [...new Set(preview.enemies.map(e => e.school))],
    rw3Components: preview.items.filter(i => i.type === 'rw3-component').map(i => i.name),
    shrine: preview.shrine?.type || 'transmutation',
  };
}
