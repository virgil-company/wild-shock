import { ENEMY_ARCHETYPES, SIZE, getModeConfig } from '../data/constants.js';
import { getUnitMeta, pick, readyAttack, summonedBy, unitStats, units } from '../data/bestiary.js';
import { equipmentByName, getSpellUpgradeId, knownSpellIds, spellByName } from '../rules/rw3.js';
import { enemyNameKey, textRef } from '../i18n/text-keys.js';
import { areaCells, canStand, distance, findBestStepToward, findOpenTileNear, hasSight, isPassable, isTileOccupied, random, shortestPath } from './grid.js';
import { equipped, log, maxHealth, withActionContext } from './context.js';
import { applyStatus, damageAlly, damageEnemy, damagePlayer, strikeUnit } from './combat.js';
import { addCloud } from './context.js';
import { equipmentAction } from './actions.js';
import { freeCast } from './spells.js';
import { finishRealm } from './world.js';

export function spawnAlly(game, pos, spec) {
  game.allies ??= [];
  const baseHp = Math.max(1, (spec.hp || 12) + (spec.bonusHp || 0));
  const ally = {
    id: `ally-${game.turn}-${game.allies.length}-${(game.nextAllyId = (game.nextAllyId || 0) + 1)}`,
    species: spec.species || null, cooldowns: {}, stationary: !!spec.stationary,
    radius: spec.radius || 0, lives: spec.lives || 0, regen: spec.regen || 0, shieldRegen: spec.shieldRegen || 0,
    name: spec.name || 'Summon',
    x: pos.x, y: pos.y,
    hp: baseHp, maxHp: baseHp,
    damage: Math.max(0, spec.damage ?? 5),
    range: Math.max(1, spec.range || 1),
    shields: spec.shields || 0,
    duration: spec.duration || 0,
    tags: [...(spec.tags || ['Conjuration'])],
    flying: !!spec.flying,
    statuses: {},
    resistances: { ...(spec.resistances || {}) },
    color: spec.color || '#4ade80',
    icon: spec.icon || '♙',
  };
  game.allies.push(ally);
  if (!spec.skipSummonHooks) {
    equipmentAction(game, 'summon', { ally });
    const clawBase = spellByName.get('Dragon Claw');
    const tutorUpId = getSpellUpgradeId(clawBase, 'Dragon Tutor');
    if (tutorUpId != null && knownSpellIds(game).includes(clawBase.id) && game.rw3Upgrades[clawBase.id]?.includes(tutorUpId)) {
      const def = units.get(ally.species);
      if (ally.tags.includes('Dragon') && def && getUnitMeta(def).hasMelee) {
        ally.dragonTutor = true;
      }
    }
  }
  return ally;
}

export function summonCreature(game, name, target, spec = {}) {
  const def = units.get(name);
  const unit = def ? unitStats(def) : {};
  const pos = findOpenTileNear(game, target, 3, spec.flying ?? unit.flying, unit);
  if (!pos) return null;
  return spawnAlly(game, pos, { ...unit, ...spec, name });
}

export function spawnHostile(game, species, near, duration = 0) {
  const def = units.get(species);
  if (!def || game.enemies.length >= 48) return null;
  const u = unitStats(def);
  const pos = findOpenTileNear(game, near, 4, u.flying, u);
  if (!pos || !canStand(game, u, pos)) return null;
  const e = { ...u, ...pos, id: 100000 + (game.nextEnemyId = (game.nextEnemyId || 0) + 1), school: 0, duration };
  game.enemies.push(e);
  return e;
}

export function relocateUnit(game, unit, rng) {
  const pos = { x: 1 + Math.floor(rng() * (SIZE - 2)), y: 1 + Math.floor(rng() * (SIZE - 2)) };
  const dest = findOpenTileNear(game, pos, 4, unit.flying);
  if (dest && canStand(game, unit, dest)) Object.assign(unit, dest);
}

export function convertEnemy(game, enemy) {
  game.enemies = game.enemies.filter(e => e !== enemy);
  enemy.color = '#4ade80';
  enemy.duration = 0;
  enemy.cooldowns ??= {};
  game.allies.push(enemy);
  if (enemy.species?.startsWith('Mordred')) game.befriendedMordred = true;
  if (enemy.species && !game.defeatedSpecies.includes(enemy.species)) game.defeatedSpecies.push(enemy.species);
  if (!game.enemies.length) finishRealm(game);
}

export function recruitCompanion(game, species, name, present = null) {
  game.companions ??= [];
  if (game.companions.some(c => c.name === name)) return;
  const ally = present || summonCreature(game, species, game.player);
  if (!ally) return;
  ally.name = name;
  ally.companion = true;
  game.companions.push({ species, name });
  log(game, 'log.companion', { name }, 'green');
}

export function orbDamage(game, orb, enemy, amount, type) {
  const dealt = withActionContext(game, { caster: orb, sourceKind: 'unit', sourceName: orb.orb || orb.name, sourceTags: orb.tags || [], manual: false }, () => damageEnemy(game, enemy, amount, type));
  if (dealt && !enemy.hp && orb.upgrades.includes('Cursed Reflection')) {
    for (const e of game.enemies.filter(e => e.name === enemy.name && e.hp > 0)) applyStatus(game, e, 'sharedPain', 3);
  }
  if (dealt && equipped(game, 'Empyrean Astrolabe')) {
    const astro = equipmentByName.get('Empyrean Astrolabe');
    withActionContext(game, { caster: game.player, sourceKind: 'equipment', sourceName: astro.name, sourceTags: astro.tags, sourceEquipment: astro.name, manual: false }, () => damageEnemy(game, enemy, Math.floor(dealt / 2), 'Holy'));
  }
  return dealt;
}

export function fireOrbBeams(game, orb) {
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
    for (let y = Math.max(1, pos.y - 2); y <= Math.min(SIZE - 2, pos.y + 2); y++) {
      for (let x = Math.max(1, pos.x - 2); x <= Math.min(SIZE - 2, pos.x + 2); x++) {
        if (game.tiles[y][x] === 1) game.tiles[y][x] = 0;
      }
    }
    for (const enemy of game.enemies.filter(e => distance(e, pos) <= 2)) hit(enemy);
  }
}

export function tickOrb(game, orb) {
  if (orb.orb === 'Orb of Explosions') fireOrbBeams(game, orb);
  if (orb.orb === 'Orb of Anima') {
    for (const ally of [game.player, ...game.allies].filter(a => a !== orb && a.hp > 0 && a.hp < (a.maxHp || maxHealth(game)) && hasSight(game, orb, a)).slice(0, orb.targets)) {
      const heal = Math.min(orb.hp, (ally.maxHp || maxHealth(game)) - ally.hp);
      ally.hp += heal; orb.hp -= heal;
    }
  }
  if (orb.orb === 'Orb of Assimilation') {
    for (const granted of orb.granted || []) {
      const target = game.enemies.find(e => e.hp > 0 && distance(orb, e) <= granted.range && hasSight(game, orb, e));
      if (target && game.turn >= granted.next) {
        for (const type of granted.types) orbDamage(game, orb, target, granted.damage, type);
        granted.next = game.turn + granted.cooldown;
      }
    }
  }
  if (orb.orb === 'Orb of Night' || orb.orb === 'Orb of Unraveling') {
    const night = orb.orb === 'Orb of Night';
    const rng = random(game.seed + game.turn + orb.x * SIZE + orb.y);
    for (const enemy of game.enemies.filter(e => e.hp > 0 && distance(orb, e) <= orb.auraRadius)) {
      const dealt = orbDamage(game, orb, enemy, orb.damage, night ? 'Dark' : pick(['Fire', 'Lightning', 'Physical'], rng));
      if (night) applyStatus(game, enemy, 'blind', 2);
      else {
        const type = pick(['Fire', 'Lightning', 'Physical', 'Dark', 'Holy', 'Ice', 'Arcane', 'Poison'], rng);
        enemy.resistances[type] = (enemy.resistances[type] || 0) - dealt;
      }
    }
  }
}

export function enemyMoved(game, enemy) {
  if (distance(game.player, enemy) === 1 && equipped(game, "Masseter's Mace")) {
    const mace = equipmentByName.get("Masseter's Mace");
    const ctx = { caster: game.player, sourceKind: 'equipment', sourceName: mace.name, sourceTags: mace.tags, sourceEquipment: mace.name, manual: false };
    withActionContext(game, ctx, () => {
      damageEnemy(game, enemy, 16, 'Arcane');
      damageEnemy(game, enemy, 16, 'Physical');
    });
    if (enemy.hp <= 0) freeCast(game, 'Hungry Maw', enemy, { sourceEquipment: mace.name });
  }
  for (const orb of game.allies.filter(a => a.hp > 0 && a.upgrades?.includes('Motion Sensors'))) {
    if ((orb.x === enemy.x || orb.y === enemy.y) && hasSight(game, orb, enemy)) fireOrbBeams(game, orb);
  }
}

export function unitPassiveTurn(game, unit, allied) {
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

  const meta = getUnitMeta(def);
  for (const p of meta.turnPassives) {
    if (p.kind === 'chance') {
      if (rng() * 100 < p.pct) {
        if (p.rule === 'gain Flying') unit.flying = true;
        else if (p.becomeSpecies) {
          const next = units.get(p.becomeSpecies);
          if (next) { Object.assign(unit, unitStats(next)); break; }
        } else if (p.blinkDist) {
          const options = areaCells(unit, p.blinkDist).filter(pos => canStand(game, unit, pos));
          if (options.length) Object.assign(unit, pick(options, rng));
        } else if (p.rule.startsWith('heal for 10% of original max HP')) {
          unit.originalHp ??= unit.maxHp;
          unit.hp += Math.max(1, Math.ceil(unit.originalHp / 10));
          unit.maxHp = Math.max(unit.hp, unit.maxHp);
          if (unit.maxHp >= 2 * unit.originalHp) {
            const child = allied ? summonCreature(game, unit.species, unit, { hp: unit.originalHp, damage: unit.damage }) : spawnHostile(game, unit.species, unit);
            if (child) { child.hp = child.maxHp = unit.hp = unit.maxHp = unit.originalHp; }
          }
        }
      }
    } else if (p.kind === 'threshold') {
      if (unit.hp * 100 < unit.maxHp * p.pct && !unit.triggeredThresholds?.includes(p.key)) {
        (unit.triggeredThresholds ??= []).push(p.key);
        summon(p.species, p.count);
      }
    } else if (p.kind === 'spawn') {
      if (rng() * 100 < p.pct) summon(p.species, p.count);
    } else if (p.kind === 'healAura') {
      for (const friend of friends) {
        if (friend.hp > 0 && distance(unit, friend) <= p.radius) friend.hp = Math.min(friend.maxHp, friend.hp + p.amount);
      }
    } else if (p.kind === 'shieldPulse') {
      if (game.turn % p.interval === 0 && unit.shields < p.max) unit.shields = Math.min(p.max, unit.shields + p.amount);
    } else if (p.kind === 'dmgAura') {
      for (const foe of foes) {
        if (foe.hp > 0 && distance(unit, foe) <= p.radius) {
          if (foe === game.player) damagePlayer(game, p.amount, p.damageType, unit);
          else if (allied) damageEnemy(game, foe, p.amount, p.damageType);
          else damageAlly(game, foe, p.amount, p.damageType, unit);
        }
      }
    }
  }

  if (unit.name === 'Starwhale') {
    for (const foe of foes.filter(e => e.hp > 0 && distance(unit, e) <= 4)) {
      const t = pick(['Arcane', 'Ice'], rng);
      if (foe === game.player) damagePlayer(game, 5, t, unit);
      else if (allied) damageEnemy(game, foe, 5, t);
      else damageAlly(game, foe, 5, t, unit);
      if (unit.iceDream) applyStatus(game, foe, 'freeze', unit.iceDream);
    }
  }
  if (unit.name === 'Jormungandr') summon('Snake', 3);
  if (unit.name === 'Yaldabaoth') {
    const ally = pick(friends.filter(e => e !== unit && e.hp > 0 && e.guardianId == null), rng);
    if (ally) ally.guardianId = unit.id;
  }
  if (unit.name === 'Snow Queen, Enthroned') for (const f of foes) addCloud(game, f.x, f.y, 'blizzard', 3);
  if (unit.name === 'Yaldabaoth' || unit.name === 'Mordred, Ascendant') {
    const props = [...game.portals, ...game.items, game.shrine].filter(Boolean);
    const radius = unit.name === 'Yaldabaoth' ? 7 : 9;
    for (const p of areaCells(unit, radius)) {
      if (rng() < 0.015 && !isTileOccupied(game, p.x, p.y) && !props.some(o => !distance(o, p))) {
        game.tiles[p.y][p.x] = pick([0, 1, 2], rng);
      }
    }
  }
  if (unit.name === 'Mordred, Ascendant') unit.vulnerable = pick(['Dark', 'Holy', 'Arcane', 'Fire', 'Ice', 'Physical', 'Poison', 'Lightning'], rng);
  if (unit.name === 'The Sparking Soul') unit.chargedAttack = pick(def.abilities, rng).name;
}

export function specialMonsterAction(game, unit, target, allied, spawnedThisTurn = null, extraTurn = false) {
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
      const n = Math.floor(target.hp * 0.3);
      target.hp -= n;
      for (const e of allies) e.hp = Math.min(e.maxHp, e.hp + Math.floor(n / allies.length));
    } else if (a.name === 'Swamp Horde' || a.name === 'Empty the Depths' || a.name === 'Void Eggs') {
      const names = a.name === 'Swamp Horde' ? ['Horned Toad', 'Swamp Queen', 'Giant Spider'] : a.name === 'Void Eggs' ? ['Void Wyrm Egg', 'Void Bomber'] : ['Chaos Fiend', 'Ash Fiend', 'Furnace Fiend'];
      const available = names.filter(n => units.has(n));
      for (let i = 0; i < 6; i++) summon(pick(available, rng), unit);
    } else if (a.name === 'Inversion') {
      const props = [...game.portals, ...game.items, game.shrine].filter(Boolean);
      for (const p of areaCells(unit, SIZE)) {
        if (!isTileOccupied(game, p.x, p.y) && !props.some(o => !distance(o, p))) {
          game.tiles[p.y][p.x] = [2, 0, 1][game.tiles[p.y][p.x]];
        }
      }
    } else if (a.name === 'Shield Tide') {
      for (const e of allies) e.shields += 3;
      for (const e of foes) e.shields = Math.max(0, e.shields - 3);
    } else if (a.name === 'Perfect Procession') {
      if (extraTurn) continue;
      unit.cooldowns[a.name] = game.turn + a.cool_down;
      for (const e of [...allies]) {
        if (e === unit || e.hp <= 0) continue;
        if (allied) allyTurn(game, e, true);
        else enemyTurn(game, e, spawnedThisTurn, true);
      }
      return true;
    } else if (a.name === 'Planar Interposition' || a.name === 'Ophan Blast') {
      for (const p of areaCells(target, 2)) {
        if (!isTileOccupied(game, p.x, p.y) && rng() < 0.25 && !game.portals.some(r => !distance(r, p)) && !game.items.some(i => !distance(i, p)) && (!game.shrine || distance(game.shrine, p))) {
          game.tiles[p.y][p.x] = rng() < 0.5 ? 0 : 2;
        }
      }
      if (a.name === 'Planar Interposition') summon(pick(['Void Bomber', 'Arcane Slime', 'Void Drake', 'Ghost'], rng), unit);
    } else if (a.name === "Nature's Fury") {
      for (const e of foes) for (const p of areaCells(e, 2)) addCloud(game, p.x, p.y, pick(['storm', 'rain', 'blizzard'], rng), 5);
    } else if (a.name === 'Invoke Chaos') {
      for (const e of [...allies, ...foes].filter(e => e !== unit)) relocateUnit(game, e, rng);
      for (const e of foes) applyStatus(game, e, 'stun', 1);
    } else if (a.name === 'Gaze of Winter') {
      for (const e of foes.filter(e => hasSight(game, unit, e))) applyStatus(game, e, 'freeze', 3);
    } else if (a.name === 'Blood Tap') {
      for (const e of foes.filter(e => hasSight(game, unit, e))) applyStatus(game, e, 'bleed', 10);
    } else continue;
    unit.cooldowns[a.name] = game.turn + a.cool_down;
    return true;
  }
  return false;
}

export function allyTurn(game, ally, extraTurn = false) {
  if (ally.hp <= 0) return;
  if (ally.statuses.stun > 0 || ally.statuses.freeze > 0) {
    if (!extraTurn) {
      for (const st of ['stun', 'freeze']) if (ally.statuses[st]) ally.statuses[st]--;
    }
    return;
  }
  if (!extraTurn && ally.statuses.ironize > 0 && --ally.statuses.ironize === 0 && ally.ironTag) {
    ally.tags = ally.tags.filter(t => t !== 'Metallic');
  }
  const hasQuickstep = ally.statuses.quickstep > 0;
  if (!extraTurn && hasQuickstep) ally.statuses.quickstep--;

  if (ally.statuses.berserk > 0) {
    if (!extraTurn) ally.statuses.berserk--;
    const target = [game.player, ...game.allies, ...game.enemies]
      .filter(u => u !== ally && u.hp > 0 && distance(u, ally) <= ally.range && hasSight(game, ally, u))
      .sort((a, b) => distance(a, ally) - distance(b, ally))[0];
    if (target) { strikeUnit(game, ally, target, readyAttack(ally, distance(ally, target), game.turn), true); return; }
  }
  if (!extraTurn) {
    if (ally.fullRegen) ally.hp = ally.maxHp;
    if (ally.regen) ally.hp = Math.min(ally.maxHp, ally.hp + ally.regen);
    if (ally.shieldRegen) ally.shields += ally.shieldRegen;
    unitPassiveTurn(game, ally, true);
  }
  if (ally.orb) { tickOrb(game, ally); return; }

  const enemies = game.enemies.filter(e => e.hp > 0).sort((a, b) => distance(ally, a) - distance(ally, b));
  const target = enemies[0];
  if (!target) return;

  // Quickstep grants 1 free movement step before taking the ally's regular action.
  if (hasQuickstep && !ally.stationary && !(distance(ally, target) <= ally.range && hasSight(game, ally, target))) {
    const qNext = shortestPath(game, ally, target, ally.flying)?.[0];
    if (qNext && canStand(game, ally, qNext)) Object.assign(ally, qNext);
  }

  if (specialMonsterAction(game, ally, target, true, null, extraTurn)) return;

  const distToTarget = distance(ally, target);
  const attack = readyAttack(ally, distToTarget, game.turn);
  if (distToTarget <= ally.range && hasSight(game, ally, target)) {
    if (ally.species && !attack) return;
    if (ally.dragonTutor && attack?.melee) {
      freeCast(game, 'Dragon Claw', target, { caster: ally });
      if (attack.cool_down) ally.cooldowns[attack.name] = game.turn + attack.cool_down;
      game.effects.push({ x: target.x, y: target.y, color: ally.color });
      return;
    }
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

export function tickAllies(game) {
  for (const ally of [...game.allies]) {
    allyTurn(game, ally);
    if (ally.hp > 0 && ally.haste) allyTurn(game, ally, true);
    if (ally.duration > 0 && --ally.duration === 0) ally.hp = 0;
  }
}

export function enemyTurn(game, enemy, spawnedThisTurn = null, extraTurn = false) {
  if (enemy.hp <= 0) return;
  if (!extraTurn) {
    if (enemy.duration > 0 && --enemy.duration === 0) { enemy.hp = 0; return; }
    unitPassiveTurn(game, enemy, false);
    if (enemy.regen) enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.regen);
    if (enemy.shieldRegen) enemy.shields += enemy.shieldRegen;
    if (enemy.statuses.sleep > 0) { enemy.statuses.sleep--; return; }

    // DoT statuses
    if (enemy.statuses.burn > 0) { damageEnemy(game, enemy, 3); enemy.statuses.burn--; }
    if (enemy.statuses.immolate > 0) {
      enemy.immolateStacks = enemy.immolateStacks || 1;
      damageEnemy(game, enemy, 3 * enemy.immolateStacks, 'Fire');
      enemy.immolateStacks++;
      enemy.statuses.immolate--;
    }
    if (enemy.statuses.poison > 0) { damageEnemy(game, enemy, 2); enemy.statuses.poison--; }
    if (enemy.statuses.bleed > 0) { damageEnemy(game, enemy, 3, 'Physical'); enemy.statuses.bleed--; }
    if (enemy.hp <= 0) return;

    // Incapacitating statuses
    if (enemy.statuses.freeze > 0) { enemy.statuses.freeze--; return; }
    if (enemy.statuses.stun > 0) { enemy.statuses.stun--; return; }
    if (enemy.statuses.petrify > 0) { enemy.statuses.petrify--; return; }
    if (enemy.statuses.shock > 0) { enemy.statuses.shock--; if (game.turn % 2 === 0) return; }
  } else {
    // On extra turns (e.g. Perfect Procession), still respect incapacitation without double-ticking statuses.
    if (enemy.statuses.sleep > 0 || enemy.statuses.freeze > 0 || enemy.statuses.stun > 0 || enemy.statuses.petrify > 0) return;
    if (enemy.statuses.shock > 0 && game.turn % 2 === 0) return;
  }

  // Spawner / Lair behavior
  if (enemy.isSpawner) {
    enemy.spawnCooldown--;
    const pendingCount = spawnedThisTurn ? spawnedThisTurn.length : 0;
    if (enemy.spawnCooldown <= 0 && game.enemies.length + pendingCount < 30) {
      enemy.spawnCooldown = enemy.maxCooldown || 5;
      const open = findOpenTileNear(game, enemy, 1, false);
      if (open) {
        const arch = ENEMY_ARCHETYPES[enemy.spawnType % 4];
        const hp = Math.round((8 + enemy.spawnType * 2 + game.realm * 2) * getModeConfig(game.mode).enemyHpMult);
        const spawned = {
          ...open, id: 500 + game.turn * 10 + pendingCount + (extraTurn ? 50000 : 0),
          type: enemy.spawnType, name: arch.name, hp, maxHp: hp,
          damage: 2 + enemy.spawnType + Math.floor(game.realm / 5),
          range: enemy.spawnType === 2 ? 5 : 1, school: enemy.school,
          boss: false, tags: [...arch.tags], resistances: { ...arch.resistances },
          shields: arch.shields, flying: arch.flying, statuses: {},
        };
        if (units.has(enemy.spawnSpecies)) {
          const def = units.get(enemy.spawnSpecies);
          if (!def.radius) Object.assign(spawned, unitStats(def));
        }
        if (spawnedThisTurn) spawnedThisTurn.push(spawned);
        else game.enemies.push(spawned);
        log(game, 'log.spawned', { enemy: spawned.name }, 'red');
      }
    }
    return;
  }

  const effectiveRange = (enemy.statuses.blind > 0 || enemy.statuses.silence > 0) ? 1 : enemy.range;

  // Berserk: attacks nearest other enemy
  if (enemy.statuses.berserk > 0) {
    const others = game.enemies.filter(other => other !== enemy && other.hp > 0);
    if (others.length) {
      others.sort((a, b) => distance(enemy, a) - distance(enemy, b));
      const victim = others[0];
      if (distance(enemy, victim) <= effectiveRange && hasSight(game, enemy, victim)) {
        damageEnemy(game, victim, enemy.damage, 'Physical');
        game.effects.push({ x: victim.x, y: victim.y, color: '#f87171' });
        return;
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
        enemy.x = moves[0].x;
        enemy.y = moves[0].y;
      }
    }
    return;
  }

  // Choose target: nearest of player or allied minions
  const targets = [game.player, ...(game.allies || []).filter(a => a.hp > 0)];
  targets.sort((a, b) => distance(enemy, a) - distance(enemy, b));
  const target = targets[0];

  if (!enemy.statuses.silence && specialMonsterAction(game, enemy, target, false, spawnedThisTurn, extraTurn)) return;

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
    const best = findBestStepToward(game, target, moves, enemy.flying);
    if (best && canStand(game, enemy, best)) {
      enemy.x = best.x;
      enemy.y = best.y;
      enemyMoved(game, enemy);
    }
  }
}

export function threateningEnemies(game, target) {
  const nextTurn = game.turn + 1;
  const result = [];
  for (const e of game.enemies) {
    if (e.hp <= 0 || e.isSpawner) continue;
    const st = e.statuses;
    if (st.sleep || st.freeze || st.stun || st.petrify) continue;
    if (st.shock > 0 && nextTurn % 2 === 0) continue;
    const gap = distance(e, target);
    const maxRange = (st.blind > 0 || st.silence > 0) ? 1 : e.range;
    if (gap > maxRange) continue;
    if (e.species && !readyAttack(e, gap, nextTurn)) continue;
    if (!hasSight(game, e, target)) continue;
    result.push(e);
  }
  return result;
}
