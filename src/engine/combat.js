import { DEBUFF_STATUSES, SIZE } from '../data/constants.js';
import { getUnitMeta, unitStats, units } from '../data/bestiary.js';
import { computeElementalDamage, equipmentByName } from '../rules/core.js';
import { enemyNameKey, textRef } from '../i18n/text-keys.js';
import { areaCells, canStand, distance, findOpenTileNear, hasSight } from './grid.js';
import {
  awardPoints, buildEffectRecord, currentAction, currentTurnId,
  equipped, log, maxHealth, retaliatingUnits, withActionContext,
} from './context.js';
import { equipmentAction } from './actions.js';
import { orbDamage, spawnHostile, summonCreature } from './units.js';
import { freeCast } from './spells.js';
import { finishRealm } from './world.js';

const TEMP_RES_AMOUNTS = { Jormungandr: 10, 'Insanity Queen': 25, Maweth: 20 };
const OPPOSITE_ELEMENT = {
  Fire: 'Ice', Ice: 'Fire', Lightning: 'Physical', Physical: 'Lightning',
  Dark: 'Holy', Holy: 'Dark', Poison: 'Arcane', Arcane: 'Poison',
};

export function applyStatus(game, unit, status, duration) {
  if (!unit || !status || !(duration > 0)) return false;
  unit.statuses ??= {};
  const isDebuff = DEBUFF_STATUSES.has(status);
  if (isDebuff) {
    if (unit === game.player) {
      if (game.buffs?.some(b => b.type === 'purity')) return false;
      if (status === 'freeze' && equipped(game, 'Molten Carapace')) return false;
      if (status === 'fear' && equipped(game, 'Cold Iron Heart')) return false;
      if (status === 'silence' && equipped(game, "Runespeaker's Gorget")) return false;
      if (status === 'blind' && equipped(game, 'Sunforged Iris')) return false;
    }
    if (unit.species === 'Snow Queen, Dethroned' && unit.shields > 0) return false;
    if (unit.species === 'Gelid Mirror') {
      unit.reflectedDebuffs ??= {};
      unit.reflectedDebuffs[status] = Math.max(unit.reflectedDebuffs[status] || 0, duration);
      return false;
    }
  }
  unit.statuses[status] = Math.max(unit.statuses[status] || 0, duration);
  return true;
}

export function damageEnemy(game, enemy, amount, damageType = null, pierce = 0, secondary = false, meta = null) {
  if (enemy.hp <= 0) return 0;
  const active = currentAction(game);
  const ctx = meta
    ? { ...(active || {}), ...meta }
    : (active || { caster: game.player, sourceKind: game.castingTags ? 'spell' : null, sourceTags: game.castingTags || [], manual: false });
  const tags = ctx.sourceTags || game.castingTags || [];

  if (enemy.name === 'Amaru' && tags.some(t => t === 'Sorcery' || t === 'Enchantment')) return 0;
  if (enemy.name === 'Ophan') {
    const guard = game.enemies.find(e => e.name !== 'Ophan' && e.hp > 0);
    if (guard) return damageEnemy(game, guard, amount, damageType, pierce, true, ctx);
  }

  let finalAmount = damageType ? computeElementalDamage(amount, damageType, enemy, pierce) : Math.max(0, amount);
  if (finalAmount <= 0) return 0;
  if (enemy.shields > 0 && damageType) {
    enemy.shields--;
    game.lastEffect = buildEffectRecord(game, enemy, damageType, 0, ctx);
    game.effects.push({ x: enemy.x, y: enemy.y, color: '#7dd3fc' });
    return 0;
  }
  if (enemy.guardianId != null && game.enemies.some(e => e.id === enemy.guardianId && e.hp > 0)) {
    finalAmount = Math.min(finalAmount, enemy.hp - 1);
  }
  if (enemy.name === 'Pope the Frog') {
    if (enemy.damageTurn !== game.turn) { enemy.damageTurn = game.turn; enemy.damageThisTurn = 0; }
    finalAmount = Math.min(finalAmount, 700 - enemy.damageThisTurn);
    enemy.damageThisTurn += Math.min(enemy.hp, finalAmount);
  }

  const dealt = Math.min(enemy.hp, finalAmount);
  if (damageType === 'Arcane') {
    for (const whale of game.allies) {
      if (whale.hp > 0 && whale.starbask) {
        const healAmt = Math.floor(dealt / 2);
        whale.hp = Math.min(whale.maxHp, whale.hp + healAmt);
        game.player.hp = Math.min(maxHealth(game), game.player.hp + healAmt);
      }
    }
  }
  if (dealt && damageType && TEMP_RES_AMOUNTS[enemy.name]) {
    enemy.temporaryResistance = { tag: damageType, amount: TEMP_RES_AMOUNTS[enemy.name], expires: game.turn + 1 };
  }

  enemy.hp -= dealt;
  game.progress.damageDealt += dealt;
  if (dealt > 0) {
    delete enemy.statuses.sleep;
    enemy.lastDamageType = damageType;
    const record = buildEffectRecord(game, enemy, damageType, dealt, ctx);
    game.lastEffect = record;
    enemy.lastHit = record;
    if (enemy.hp <= 0) {
      enemy.killedBy = record;
      if (ctx.caster && game.allies.includes(ctx.caster)) ctx.caster.kills = (ctx.caster.kills || 0) + 1;
    }
  }

  // Fire or Physical hit breaks freeze (shatter interaction)
  if ((damageType === 'Fire' || damageType === 'Physical') && enemy.statuses?.freeze > 0) {
    enemy.statuses.freeze = 0;
  }

  if (!secondary && dealt) {
    equipmentAction(game, 'damage', {
      victim: enemy, amount: dealt, type: damageType, tags,
      sourceKind: ctx.sourceKind || (game.castingTags ? 'spell' : null),
      sourceName: ctx.sourceName || null,
      sourceEquipment: ctx.sourceEquipment || null,
      caster: ctx.caster || null,
      manual: !!ctx.manual,
      effect: enemy.lastHit,
    });
    const others = game.enemies.filter(e => e !== enemy && e.hp > 0);
    if (enemy.sharedPain || enemy.statuses.sharedPain) {
      for (const e of others.filter(e => e.sharedPain || e.statuses.sharedPain)) {
        damageEnemy(game, e, dealt, damageType, 0, true, ctx);
      }
    }
    const carnival = game.buffs.find(b => b.type === 'carnival');
    if (carnival && (damageType === 'Physical' || damageType === 'Fire' || damageType === 'Lightning')) {
      for (const e of others.filter(e => hasSight(game, enemy, e)).sort((a, b) => distance(enemy, a) - distance(enemy, b)).slice(0, carnival.targets)) {
        damageEnemy(game, e, Math.floor(dealt / 2), 'Dark', 0, true, ctx);
      }
    }
    if (damageType === 'Arcane' || damageType === 'Lightning') {
      for (const b of game.buffs.filter(b => b.type === 'garden')) {
        b.stored += dealt;
        while (b.stored >= b.threshold) {
          b.stored -= b.threshold;
          summonCreature(game, 'Butterfly Demon', enemy, { duration: b.minionDuration });
        }
      }
    }
    if (damageType === 'Fire') {
      for (const b of game.buffs.filter(b => b.type === 'searing')) b.stored += dealt;
      const curse = enemy.curses?.['Pyrostatic Curse'];
      if (curse) {
        for (const e of others.filter(e => hasSight(game, enemy, e)).slice(0, curse.targets)) {
          damageEnemy(game, e, dealt, 'Lightning', 0, true, ctx);
        }
      }
    }
    if (damageType === 'Holy' && enemy.curses?.Sanction) {
      damageEnemy(game, enemy, enemy.curses.Sanction.damage, 'Holy', 0, true, ctx);
      game.player.hp = Math.min(maxHealth(game), game.player.hp + 1);
    }
  }
  return dealt;
}

export function damageAlly(game, ally, amount, damageType = 'Physical', source = null, meta = null) {
  amount = computeElementalDamage(amount, damageType, ally);
  if (!amount || ally.hp <= 0) return 0;
  const active = currentAction(game);
  const ctx = meta
    ? { ...(active || {}), ...meta }
    : (active || (source ? { caster: source, sourceKind: 'unit', sourceName: source.name || source.species, sourceTags: source.tags || [], manual: false } : {}));
  if (ally.shields > 0) {
    ally.shields--;
    game.lastEffect = buildEffectRecord(game, ally, damageType, 0, ctx);
    return 0;
  }
  const dealt = Math.min(Math.max(0, ally.hp - (ally.soulbound && game.player.hp > 0 ? 1 : 0)), amount);
  ally.hp -= dealt;
  if (dealt > 0) {
    const record = buildEffectRecord(game, ally, damageType, dealt, ctx);
    game.lastEffect = record;
    ally.lastHit = record;
    if (ally.hp <= 0) ally.killedBy = record;
  }
  if (ally.orb === 'Orb of Reflection') {
    for (const e of game.enemies.filter(e => e.hp > 0 && hasSight(game, ally, e))) {
      orbDamage(game, ally, e, dealt, damageType);
      if (ally.upgrades.includes('Inverted Mirror')) orbDamage(game, ally, e, dealt, OPPOSITE_ELEMENT[damageType]);
      if (ally.hp <= 0 && ally.upgrades.includes('Shattered Orb')) applyStatus(game, e, 'bleed', Number.MAX_SAFE_INTEGER);
    }
  }
  if (!ally.hp && ally.upgrades?.includes('Supercritical')) {
    for (const e of game.enemies) {
      orbDamage(game, ally, e, ally.maxHp, 'Fire');
      orbDamage(game, ally, e, ally.maxHp, 'Poison');
    }
  }
  return dealt;
}

export function damagePlayer(game, amount, damageType = 'Physical', source = null, meta = null) {
  const scaled = damageType ? computeElementalDamage(amount, damageType, game.player, 0, game) : amount;
  if (scaled <= 0) return 0;
  if (game.channel && game.channel.invulnerable) return 0;
  const active = currentAction(game);
  const ctx = meta
    ? { ...(active || {}), ...meta }
    : (active || (source ? { caster: source, sourceKind: 'unit', sourceName: source.name || source.species, sourceTags: source.tags || [], manual: false } : {}));
  if (game.player.shields > 0) {
    game.player.shields--;
    game.lastEffect = buildEffectRecord(game, game.player, damageType, 0, ctx);
    if (source && game.buffs.some(b => b.reflect)) {
      damageEnemy(game, source, amount, damageType, 0, false, { caster: game.player, sourceKind: 'spell', sourceName: 'Arcane Warding', sourceTags: ['Arcane', 'Enchantment'], manual: false });
    }
    if (source && equipped(game, 'Boreal Armor')) {
      const boreal = equipmentByName.get('Boreal Armor');
      damageEnemy(game, source, 12, 'Ice', 0, false, { caster: game.player, sourceKind: 'equipment', sourceName: boreal.name, sourceTags: boreal.tags, sourceEquipment: boreal.name, manual: false });
    }
    log(game, 'log.shieldBlock', {}, 'gold');
    return 0;
  }
  const incoming = Math.max(1, scaled);
  const absorbed = Math.min(game.player.shield, incoming);
  game.player.shield -= absorbed;
  game.player.hp = Math.max(0, game.player.hp - incoming + absorbed);
  const dealt = incoming - absorbed;
  if (dealt) {
    const record = buildEffectRecord(game, game.player, damageType, dealt, ctx);
    game.lastEffect = record;
    game.player.lastHit = record;
    if (source && game.enemies.includes(source)) {
      const tid = currentTurnId(game);
      if (game.damagedPlayerBy?.turn !== tid) game.damagedPlayerBy = { turn: tid, ids: [] };
      if (!game.damagedPlayerBy.ids.includes(source.id)) game.damagedPlayerBy.ids.push(source.id);
    }
    if (equipped(game, 'Mask of Nihilo')) game.player.resistances[damageType] = (game.player.resistances[damageType] || 0) - dealt;
    for (const copy of Object.values(game.equipment)) {
      if (equipmentByName.get(copy.name)?.tags.includes('Blood') && copy.components.includes('Bloodrage Serum')) {
        game.buffs.push({ name: 'Bloodrage', type: 'bonus', stat: 'damage', amount: 1, duration: 3 });
      }
    }
    if (game.buffs.some(b => b.type === 'Pain Mirror')) {
      for (const e of game.enemies.filter(e => hasSight(game, game.player, e))) {
        damageEnemy(game, e, dealt, 'Dark', 0, false, { caster: game.player, sourceKind: 'spell', sourceName: 'Pain Mirror', sourceTags: ['Blood', 'Dark', 'Enchantment'], manual: false });
      }
    }
    if (source && game.buffs.some(b => b.name === 'Golden Dragonscale')) {
      damageEnemy(game, source, 10, 'Holy', 0, false, { caster: game.player, sourceKind: 'component', sourceName: 'Golden Dragonscale', sourceTags: ['Holy', 'Dragon'], manual: false });
    }
    const shard = game.buffs.find(b => b.name === 'Fulminite Shard' && b.last !== game.turn);
    if (source && shard) { shard.last = game.turn; freeCast(game, 'Chain Lightning', source); }
  }
  return dealt;
}

export function retaliateBodyElectric(game, boss, initialTarget) {
  if (!boss || !initialTarget || boss.hp <= 0 || initialTarget === boss) return;
  let active = retaliatingUnits.get(game);
  if (!active) { active = new Set(); retaliatingUnits.set(game, active); }
  if (active.has(boss)) return;
  active.add(boss);
  try {
    const isFriendlyTarget = initialTarget === game.player || game.allies.includes(initialTarget);
    const pool = isFriendlyTarget ? [game.player, ...game.allies] : game.enemies;
    const visited = new Set();
    let curr = initialTarget;
    const ctx = { caster: boss, sourceKind: 'unit', sourceName: 'Chain Lightning', sourceTags: ['Lightning'], manual: false };
    withActionContext(game, ctx, () => {
      while (curr && curr.hp > 0 && !visited.has(curr)) {
        visited.add(curr);
        if (curr === game.player) damagePlayer(game, 10, 'Lightning', boss, ctx);
        else if (game.allies.includes(curr)) damageAlly(game, curr, 10, 'Lightning', boss, ctx);
        else damageEnemy(game, curr, 10, 'Lightning', 0, false, ctx);
        game.effects.push({ x: curr.x, y: curr.y, color: '#facc15' });
        curr = pool
          .filter(u => u.hp > 0 && !visited.has(u) && distance(curr, u) <= 3 && hasSight(game, curr, u))
          .sort((a, b) => distance(curr, a) - distance(curr, b))[0] || null;
      }
    });
  } finally {
    active.delete(boss);
  }
}

export function onUnitDeath(game, unit, allied) {
  const nearby = [game.player, ...game.allies, ...game.enemies].filter(u => u !== unit && u.hp > 0);
  const foes = allied ? game.enemies.filter(u => u !== unit && u.hp > 0) : [game.player, ...game.allies].filter(u => u !== unit && u.hp > 0);
  const friends = allied ? [game.player, ...game.allies].filter(u => u !== unit && u.hp > 0) : game.enemies.filter(u => u !== unit && u.hp > 0);
  const deal = (u, amount, type) => {
    if (u === game.player) return damagePlayer(game, amount, type, unit);
    return game.enemies.includes(u) ? damageEnemy(game, u, amount, type) : damageAlly(game, u, amount, type, unit);
  };

  withActionContext(game, {
    caster: unit, sourceKind: 'unit', sourceName: unit.species || unit.name, sourceTags: unit.tags || [], manual: false,
  }, () => {
    if (unit.species === 'Ice Phoenix') {
      for (const u of foes.filter(u => distance(u, unit) <= 4)) {
        deal(u, 25, 'Ice');
        if (u.hp > 0) applyStatus(game, u, 'freeze', 4);
      }
      for (const u of friends.filter(u => distance(u, unit) <= 4)) u.shields = (u.shields || 0) + 2;
    } else if (unit.species === 'Phoenix') {
      for (const u of foes.filter(u => distance(u, unit) <= 4)) deal(u, 25, 'Fire');
      for (const u of friends.filter(u => distance(u, unit) <= 4)) {
        const cap = u === game.player ? maxHealth(game) : u.maxHp;
        u.hp = Math.min(cap, u.hp + 25);
      }
    } else if (unit.species === 'Void Phoenix' || unit.species === 'Rotting Phoenix') {
      for (const p of areaCells(unit, 5)) if (game.tiles[p.y]?.[p.x] === 1) game.tiles[p.y][p.x] = 0;
      const types = unit.species === 'Void Phoenix' ? ['Arcane'] : ['Dark', 'Fire'];
      for (const u of foes.filter(u => distance(u, unit) <= 5)) for (const t of types) deal(u, 25, t);
      for (const u of friends.filter(u => distance(u, unit) <= 5)) {
        if (unit.species === 'Void Phoenix') u.shields = (u.shields || 0) + 2;
        else if (u.tags?.includes('Undead')) { u.maxHp += 25; u.hp += 25; }
      }
    }

    const def = units.get(unit.species);
    if (!def) return;
    for (const dp of getUnitMeta(def).deathPassives) {
      if (dp.kind === 'summons') {
        for (const rule of dp.rules) {
          for (let i = 0; i < rule.count; i++) (allied ? summonCreature : spawnHostile)(game, rule.name, unit);
        }
      } else if (dp.kind === 'blast') {
        for (const u of nearby.filter(u => distance(u, unit) <= dp.radius)) deal(u, dp.amount, dp.damageType);
      } else if (dp.kind === 'affliction') {
        for (const u of nearby.filter(u => distance(u, unit) <= 1)) applyStatus(game, u, dp.status, dp.duration);
      }
    }
  });
}

export function cleanup(game) {
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
        e.shields += allies.length;
        for (const other of allies) other.hp = 0;
      }
    } else if (e.lives > 0) {
      onUnitDeath(game, e, false);
      if (e.name === 'Insanity Queen') {
        for (const a of game.allies.filter(a => a.hp > 0 && a.tags.includes('Living') && hasSight(game, e, a))) {
          applyStatus(game, a, 'berserk', 12);
        }
      }
      e.lives--; e.hp = e.maxHp; e.statuses = {}; delete e.curses; delete e.killedBy;
    }
  }
  const dead = game.enemies.filter(e => e.hp <= 0);
  game.kills += dead.length;
  for (const enemy of dead) {
    if (game.enemies.some(e => e.hp > 0 && e.name === 'Gaia')) {
      for (const e of game.enemies.filter(e => e.hp > 0)) e.gaiaBlessing = (e.gaiaBlessing || 0) + 10;
    }
    for (const name of [...(enemy.previousForms || []), enemy.species]) {
      if (name && !game.defeatedSpecies.includes(name)) game.defeatedSpecies.push(name);
    }
    log(game, 'log.fall', { enemy: enemy.species || (enemy.isSpawner ? enemy.name : textRef(enemyNameKey(enemy))) }, 'green');
    onUnitDeath(game, enemy, false);
    equipmentAction(game, 'kill', { victim: enemy, cause: enemy.killedBy || null });
    if (game.buffs.some(b => b.type === 'The Restless Dead') && enemy.tags?.includes('Living')) {
      summonCreature(game, 'Skeleton', enemy, { hp: enemy.maxHp, flying: enemy.flying });
    }
    if (enemy.curses?.Mercurize) summonCreature(game, 'Mercurial Geist', enemy, { hp: enemy.maxHp, duration: 10 });
    if (enemy.curses?.['Death Chill']) {
      const curse = enemy.curses['Death Chill'];
      for (const e of game.enemies.filter(e => e.hp > 0 && distance(e, enemy) <= curse.radius)) {
        damageEnemy(game, e, curse.damage, 'Ice');
        applyStatus(game, e, 'freeze', 5);
      }
    }
    if (enemy.species?.startsWith('Mordred') && game.player.hp <= 0) game.mutualDestruction = true;
    if (game.allies.some(a => a.hp > 0 && a.dream && a.hungeringDepths) && areaCells(enemy, 1).some(p => game.tiles[p.y][p.x] === 2)) {
      freeCast(game, 'Hungry Maw', enemy);
    }
    if (enemy.golemDamage && (enemy.statuses.petrify || enemy.statuses.glassed)) {
      summonCreature(game, 'Golem', enemy, { hp: enemy.maxHp, damage: enemy.golemDamage });
    }
    if (enemy.boss) awardPoints(game, 5);
    if (enemy.isSpawner) awardPoints(game, 2);
  }
  if (dead.length) {
    const deadSet = new Set(dead);
    game.enemies = game.enemies.filter(e => !deadSet.has(e));
  }
  if (game.enemies.some(e => e.hp <= 0)) { cleanup(game); return; }

  for (const a of game.allies.filter(a => a.hp <= 0)) {
    onUnitDeath(game, a, true);
    if (a.lives > 0) { a.lives--; a.hp = a.maxHp; a.statuses = {}; delete a.killedBy; continue; }
    equipmentAction(game, 'allyDeath', { victim: a, cause: a.killedBy || null });
    if (a.deathSummons) for (let i = 0; i < a.deathSummons[1]; i++) summonCreature(game, a.deathSummons[0], a);
  }
  game.allies = game.allies.filter(a => a.hp > 0);
  if (game.enemies.some(e => e.hp <= 0) || game.allies.some(a => a.hp <= 0)) { cleanup(game); return; }
  if (dead.length && !game.enemies.length) {
    finishRealm(game);
  }
}

const STATUS_ALIASES = { frozen: 'freeze', feared: 'fear', stunned: 'stun' };

export function strikeUnit(game, source, target, attack, allied, bonus = 0) {
  const element = attack?.damage_type[game.turn % attack.damage_type.length] || 'Physical';
  const amount = ((allied ? source.damage : attack?.damage ?? source.damage) + bonus) * (attack && source.chargedAttack === attack.name ? 2 : 1);
  const strikeCtx = {
    caster: source, sourceKind: 'unit', sourceName: attack?.name || source.species || source.name,
    sourceTags: source.tags || [], manual: false,
  };
  const hit = u => withActionContext(game, strikeCtx, () => (
    u === game.player ? damagePlayer(game, amount, element, source, strikeCtx)
      : game.enemies.includes(u) ? damageEnemy(game, u, amount, element, 0, false, strikeCtx)
      : damageAlly(game, u, amount, element, source, strikeCtx)
  ));

  let dealt = hit(target);
  const count = Number(attack?.desc.match(/Attacks (\d+) times/i)?.[1] || 1);
  for (let i = 1; i < count && target.hp > 0; i++) dealt += hit(target);

  // Deliver intercepted debuffs (Gelid Mirror) once on attack, then clear.
  if (source.reflectedDebuffs) {
    const reflected = source.reflectedDebuffs;
    delete source.reflectedDebuffs;
    for (const [st, dur] of Object.entries(reflected)) applyStatus(game, target, st, dur);
  }

  if (attack?.desc.includes('permanent bleed')) applyStatus(game, target, 'bleed', Number.MAX_SAFE_INTEGER);
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
  if (match) {
    const raw = match[1].toLowerCase();
    applyStatus(game, target, STATUS_ALIASES[raw] || raw, Number(match[2]));
  }
  if (dealt && source.tags?.some(tag => tag === 'Dark' || tag === 'Demon' || tag === 'Undead')) {
    for (const boss of game.enemies.filter(e => e.name === 'Bafflement, Demon King' && e.hp > 0)) {
      boss.hp = Math.min(boss.maxHp, boss.hp + dealt);
    }
  }
  if (source.name === 'Amaru' && target.hp <= 0) {
    const gain = target.maxHp || maxHealth(game);
    source.maxHp += gain;
    source.hp += gain;
  }
  if (source.name === 'The Gardener' && attack?.name === 'Prune') {
    if (target === game.player) game.bonusMaxHp = target.hp - 55;
    else target.maxHp = Math.max(1, target.hp);
  }
  if (attack?.name === 'Necrotic Breath') target.statuses.necrosis = (target.statuses.necrosis || 0) + 1;
  return dealt;
}
