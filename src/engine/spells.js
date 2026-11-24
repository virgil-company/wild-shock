import { SIZE } from '../data/constants.js';
import { pick, unitStats, units } from '../data/bestiary.js';
import { effectiveSpell, getEquipmentModifiers, spellByName } from '../rules/core.js';
import { resolveSpellEffect } from '../rules/spell-effects.js';
import { areaCells, canStand, covers, distance, findOpenTileNear, hasSight, isPassable, isTileOccupied, onSegment, random } from './grid.js';
import { addCloud, availableSpells, equipped, log, maxHealth, withActionContext } from './context.js';
import { applyStatus, cleanup, damageAlly, damageEnemy, damagePlayer, retaliateBodyElectric } from './combat.js';
import { allyTurn, convertEnemy, spawnAlly, summonCreature, tickOrb } from './units.js';
import { endTurn, equipmentAction } from './actions.js';

export function freeCast(game, name, target, options = {}) {
  const spell = effectiveSpell(game, spellByName.get(name)?.id);
  if (!spell || !target) return 0;
  return resolveSpellCast(game, spell, { x: target.x, y: target.y }, false, options);
}

export function resolveSpellCast(game, spell, target, manual = true, options = {}) {
  if (game.castCounterTurn !== game.turn) {
    game.castCounterTurn = game.turn;
    game.castCount = 0;
  }
  if (game.castCount >= 2048 || (game.castDepth || 0) >= 64) {
    game.castChainCapped = true;
    return 0;
  }
  const caster = options.caster || game.player;
  if (options.enforceLos && spell.requiresLos && !hasSight(game, caster, target)) return 0;

  game.castCount++;
  game.castDepth = (game.castDepth || 0) + 1;
  const previous = game.castingTags;
  game.castingTags = spell.tags;
  const actionCtx = {
    caster,
    sourceKind: 'spell',
    sourceName: spell.name,
    sourceTags: spell.tags || [],
    sourceEquipment: options.sourceEquipment || null,
    manual: !!manual,
  };
  try {
    return withActionContext(game, actionCtx, () => applySpell(game, spell, target, manual, options));
  } finally {
    if (!--game.castDepth) delete game.castDepth;
    if (previous) game.castingTags = previous;
    else delete game.castingTags;
  }
}

function applySpell(game, spell, target, manual, options = {}) {
  const caster = options.caster || game.player;
  const mods = getEquipmentModifiers(game);
  const desc = (spell.desc || '').toLowerCase();
  const primaryDmgType = spell.damageTypes[0] || 'Arcane';
  let hitCount = 0;

  // Apply on-cast equipment triggers (e.g. Arcane Shield)
  if (manual) {
    for (const trig of mods.onCastShieldTags) {
      if (spell.tags.includes(trig.tag)) game.player.shields = (game.player.shields || 0) + trig.amount;
    }
  }
  if (spell.stats.shields > 0 && (spell.behavior === 'self_buff' || spell.behavior === 'teleport' || spell.behavior === 'heal_allies')) {
    game.player.shields = (game.player.shields || 0) + spell.stats.shields;
  }

  const upgrades = spell.upgradeNames;
  const unit = game.enemies.find(e => e.hp > 0 && covers(e, target));
  const ally = game.allies.find(a => a.hp > 0 && covers(a, target));
  if (manual && game.enemies.some(e => e.hp > 0 && e.name === 'Sanguine Hierophant')) applyStatus(game, game.player, 'bleed', 10);
  if (unit && (unit.name === 'The Body Electric' || unit.name === 'The Sparking Soul') && caster !== unit) {
    retaliateBodyElectric(game, unit, caster);
  }
  if (manual && ally?.orb === 'Orb of Assimilation' && spell.tags.includes('Sorcery')) {
    const cooldown = Math.max(1, 10 - (game.charges[spell.id] || 0));
    game.charges[spell.id] = 0;
    ally.granted = [
      ...(ally.granted || []).filter(s => s.id !== spell.id),
      { id: spell.id, types: spell.damageTypes, damage: spell.damage, range: spell.range, next: game.turn, cooldown },
    ];
    return 1;
  }

  const rng = random(game.seed + game.turn * 313 + target.x * SIZE + target.y + game.effects.length);
  const result = resolveSpellEffect(game, spell, target, {
    manual, caster, enemy: unit, ally, rng,
    dist: distance, see: (a, b) => hasSight(game, a, b), roll: choices => pick(choices, rng),
    hurt: (e, n, t) => damageEnemy(game, e, n, t),
    hurtAlly: (a, n, t) => damageAlly(game, a, n, t, caster),
    heal: n => { game.player.hp = Math.min(maxHealth(game), game.player.hp + n); },
    maxHp: () => maxHealth(game),
    afflict: (e, st, dur) => applyStatus(game, e, st, dur),
    convert: e => convertEnemy(game, e),
    summon: (n, p, spec) => summonCreature(game, n, p, spec),
    act: a => allyTurn(game, a),
    cast: (name, p, opts) => freeCast(game, name, p, opts),
    openNear: (p, r, fly) => findOpenTileNear(game, p, r, fly),
    free: p => isPassable(game, p.x, p.y) && !isTileOccupied(game, p.x, p.y),
    cells: areaCells,
    spells: () => availableSpells(game),
    cloud: (p, t, dur, dmg) => addCloud(game, p.x, p.y, t, dur, dmg),
    floor: p => { game.tiles[p.y][p.x] = 0; },
    moveUnit: (e, p) => { if (canStand(game, e, p)) Object.assign(e, p); },
    onSegment,
  });
  if (result !== null) return result;

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
    if (equipped(game, 'Acanthine Armillary')) {
      for (let y = target.y - 2; y <= target.y + 2; y++) {
        for (let x = target.x - 2; x <= target.x + 2; x++) {
          if (isPassable(game, x, y) && !isTileOccupied(game, x, y)) summonCreature(game, 'Vine', { x, y });
        }
      }
    }
    return 1;
  }

  if (spell.behavior === 'teleport') {
    const before = { x: game.player.x, y: game.player.y };
    if ((unit || ally) && upgrades.includes('Aether Swap')) {
      Object.assign(unit || ally, before);
      if (unit) damageEnemy(game, unit, spell.damage, 'Arcane');
      else damageAlly(game, ally, spell.damage, 'Arcane', caster);
    }
    if (isPassable(game, target.x, target.y, mods.flying) && !isTileOccupied(game, target.x, target.y)) {
      game.player.x = target.x; game.player.y = target.y;
      game.effects.push({ x: target.x, y: target.y, color: spell.color });
    }
    if (upgrades.includes('Group Teleport')) {
      for (const friend of game.allies.slice(0, spell.stats.num_targets)) {
        const pos = findOpenTileNear(game, target, 3, friend.flying);
        if (pos) Object.assign(friend, pos);
      }
    }
    let refund = false;
    for (const e of game.enemies.filter(e => e.hp > 0)) {
      if (upgrades.includes('Assassinate') && distance(e, target) <= 1 && !hasSight(game, before, e)) {
        damageEnemy(game, e, spell.damage, 'Arcane');
        applyStatus(game, e, 'silence', spell.duration);
      }
      if (upgrades.includes('Void Teleport') && hasSight(game, target, e)) damageEnemy(game, e, spell.maxCharges, 'Arcane');
      if (e.hp <= 0) refund = true;
    }
    if (manual && refund && upgrades.includes('Assassinate')) game.charges[spell.id] = Math.min(spell.maxCharges, game.charges[spell.id] + 1);
    if (upgrades.includes('Dissolution')) freeCast(game, 'Disperse', target);
    if (upgrades.includes('Thunderblink')) {
      for (const e of game.enemies.filter(e => e.hp > 0 && hasSight(game, target, e)).sort((a, b) => distance(target, a) - distance(target, b)).slice(0, spell.stats.num_targets)) {
        freeCast(game, 'Thunder Strike', e);
      }
    }
    if (upgrades.includes('Guarded Entrance')) freeCast(game, 'Earthen Sentinel', before);
    if (upgrades.includes('Make Entrance') && ![...game.portals, ...game.items, game.shrine].filter(Boolean).some(p => !distance(before, p))) {
      game.tiles[before.y][before.x] = 2;
    }
    if (upgrades.includes('Return to Hell')) {
      for (const e of game.enemies.filter(e => e.tags?.includes('Demon') && !e.radius && distance(e, before) <= 1)) e.hp = 0;
    }
    if (upgrades.includes('Tremorsensitivity')) {
      for (const p of [before, target]) {
        for (let i = 0; i < spell.stats.num_summons; i++) {
          summonCreature(game, 'Rock Worm', p, { hp: spell.stats.minion_health, damage: spell.stats.minion_damage });
        }
      }
    }
  } else if (spell.behavior === 'disperse') {
    const affected = game.enemies.filter(e => !e.isSpawner && distance(e, target) <= (spell.radius || 3));
    for (const enemy of affected) {
      const dest = findOpenTileNear(game, { x: SIZE - 1 - enemy.x, y: SIZE - 1 - enemy.y }, 6, enemy.flying);
      if (dest) {
        enemy.x = dest.x; enemy.y = dest.y;
        hitCount++;
        game.effects.push({ x: dest.x, y: dest.y, color: spell.color });
      }
    }
  } else if (spell.behavior === 'summon') {
    if (spell.name === 'Dream the Starwhale' && game.channel?.spellId === spell.id && !manual) return 0;
    if (spell.name === 'Demonic Ritual' && !manual && game.channel?.spellId === spell.id) {
      if (upgrades.includes("Solomon's Binding")) {
        for (const e of game.enemies.filter(e => e.tags.includes('Demon'))) applyStatus(game, e, 'stun', spell.duration);
      }
      return 0;
    }
    const optionsList = spell.name === 'Summon Wizard' && !upgrades.includes('Dragon Wizard')
      ? [...units.values()].filter(u => u.pools.includes('Wizard')).map(u => u.name)
      : spell.summons;
    const replacements = optionsList.filter(name => upgrades.some(up => up === name || up.endsWith(' ' + name)));
    const multiple = upgrades.includes('Four Horsemen') || upgrades.includes('Grand Ritual');
    const count = multiple ? optionsList.length : Math.max(1, spell.stats.num_summons);
    const consumed = upgrades.includes('Ravenous Wolf') ? Math.max(1, game.charges[spell.id]) : 1;
    if (upgrades.includes('Ravenous Wolf')) game.charges[spell.id] = 0;
    for (let i = 0; i < count; i++) {
      const pos = findOpenTileNear(game, target, 2, false);
      if (!pos) break;
      const variable = ['Summon Wizard', 'Summon Rider', 'Horde of Halfmen', 'Demonic Ritual'].includes(spell.name);
      let species = multiple ? optionsList[i] : replacements[0] || (variable ? pick(optionsList, rng) : optionsList[0]) || spell.name;
      if (spell.name === 'Wyrm Eggs') species = pick(['Fire Wyrm Egg', 'Ice Wyrm Egg'], rng);
      if (species === 'Orochi' && !canStand(game, { radius: 1 }, pos)) species = 'Frostfire Hydra';
      const def = units.get(species);
      const spec = {
        hp: (spell.stats.minion_health || def?.hp || 14) * consumed,
        damage: (spell.stats.minion_damage || def?.abilities.find(a => a.damage)?.damage || 5) * consumed,
        range: spell.stats.minion_range > 1 ? spell.stats.minion_range : def ? unitStats(def).range : 1,
        shields: spell.stats.shields || def?.shields || 0,
        duration: spell.stats.minion_duration,
        tags: def?.tags || spell.tags,
        color: spell.color,
        icon: spell.icon,
      };
      const summoned = summonCreature(game, species, pos, spec);
      if (summoned) {
        if (spell.name === 'Demonic Ritual') summoned.boundRitual = true;
        if (spell.name === 'Dream the Starwhale') {
          summoned.dream = true;
          summoned.hungeringDepths = upgrades.includes('Hungering Depths');
          summoned.starbask = upgrades.includes('Starbask');
          summoned.iceDream = upgrades.includes('Ice Dream') ? spell.duration : 0;
          for (const damageType of ['Ice', 'Arcane']) game.buffs.push({ name: spell.name, type: 'resist', damageType, amount: 100, duration: -1 });
        }
        if (upgrades.includes('Hydra Regrowth')) summoned.fullRegen = true;
        if (upgrades.includes('Crystalline Hydra')) summoned.crystal = true;
        if (upgrades.includes('Double Dragon')) {
          const opposite = { x: 2 * game.player.x - pos.x, y: 2 * game.player.y - pos.y };
          if (isPassable(game, opposite.x, opposite.y) && !isTileOccupied(game, opposite.x, opposite.y)) {
            summonCreature(game, species, opposite, spec);
          }
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
        id: `eye-${spell.spellId}`, name: spell.name, type: 'eye',
        damage: spell.damage || 12, damageType: primaryDmgType,
        shotCooldown: spell.stats.shot_cooldown || 3, timer: 1,
        duration: spell.duration || 20, healOnHit: spell.tags.includes('Blood'),
        status: /berserk/i.test(desc) ? 'berserk' : null, color: spell.color,
      });
    } else if (/ride drake|mounted/i.test(desc)) {
      game.buffs.push({ id: `mount-${spell.spellId}`, name: spell.name, type: 'mount', flying: true, quickstep: true, duration: spell.duration || 10 });
    } else if (/regeneration/i.test(spell.name)) {
      game.buffs.push({ id: `regen-${spell.spellId}`, name: spell.name, type: 'regen', amount: 4, radius: spell.radius || 8, selfHeal: true, duration: spell.duration || 8 });
    } else {
      for (const a of game.allies || []) a.damage += 4;
      game.buffs.push({ id: `buff-${spell.spellId}`, name: spell.name, type: 'aura', damage: Math.max(3, spell.damage), damageType: primaryDmgType, radius: spell.radius || 3, duration: spell.duration || 8 });
    }
    game.effects.push({ x: game.player.x, y: game.player.y, color: spell.color });
  } else if (spell.behavior === 'heal_allies') {
    for (const a of game.allies || []) {
      if (hasSight(game, caster, a)) {
        if (upgrades.includes('Purifying Light')) a.statuses = {};
        const healed = Math.min(50, a.maxHp - a.hp);
        a.hp += healed;
        if (upgrades.includes('Heartflame') && healed > 0) {
          const e = game.enemies.filter(e => e.hp > 0 && hasSight(game, a, e)).sort((a1, b1) => distance(a, a1) - distance(a, b1))[0];
          if (e) { damageEnemy(game, e, healed, 'Fire'); damageEnemy(game, e, healed, 'Holy'); }
        }
        if (a.upgrades?.includes('Prismatic Reflection')) {
          for (const friend of [game.player, ...game.allies].filter(u => u !== a && hasSight(game, a, u))) {
            friend.hp = Math.min(friend.maxHp || maxHealth(game), friend.hp + healed);
            friend.shields += spell.stats.shields;
          }
        }
        if (spell.stats.shields > 0) a.shields += spell.stats.shields;
        game.effects.push({ x: a.x, y: a.y, color: spell.color });
      }
    }
  } else {
    // Offensive targeting: single, burst, beam, cone, chain
    let targets = [];
    if (spell.behavior === 'beam') {
      const dx = target.x - caster.x, dy = target.y - caster.y, len = Math.hypot(dx, dy);
      if (/destroy a wall/i.test(desc) && game.tiles[target.y]?.[target.x] === 1 && target.x > 0 && target.y > 0 && target.x < SIZE - 1 && target.y < SIZE - 1) {
        game.tiles[target.y][target.x] = 0;
      }
      targets = game.enemies.filter(e => len > 0 && distance(e, caster) <= spell.range && (!spell.requiresLos || hasSight(game, caster, e))
        && (e.x - caster.x) * dx + (e.y - caster.y) * dy > 0
        && Math.abs((e.x - caster.x) * dy - (e.y - caster.y) * dx) / len <= 0.55);
    } else if (spell.behavior === 'cone') {
      const dx = target.x - caster.x, dy = target.y - caster.y, len = Math.hypot(dx, dy);
      targets = game.enemies.filter(e => {
        if (distance(e, caster) > spell.range || (spell.requiresLos && !hasSight(game, caster, e))) return false;
        if (len === 0) return distance(e, caster) <= 1;
        const ex = e.x - caster.x, ey = e.y - caster.y, elen = Math.hypot(ex, ey);
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
          if (spell.tags.includes('Blood') && /heals the caster/i.test(desc) && dealt > 0) {
            game.player.hp = Math.min(maxHealth(game), game.player.hp + dealt);
          }
        }
      }
      const dur = Math.max(2, spell.duration || 3);
      if (/\[frozen\]|\[freeze\]/i.test(desc)) applyStatus(game, enemy, 'freeze', dur);
      if (/\[poison\]/i.test(desc)) applyStatus(game, enemy, 'poison', dur);
      if (/\[fear\]/i.test(desc)) applyStatus(game, enemy, 'fear', dur);
      if (/\[petrify\]/i.test(desc)) applyStatus(game, enemy, 'petrify', dur);
      if (/\[stun\]/i.test(desc)) applyStatus(game, enemy, 'stun', dur);
      if (/\[blind\]/i.test(desc)) applyStatus(game, enemy, 'blind', dur);
      if (/\[bleed\]/i.test(desc)) applyStatus(game, enemy, 'bleed', dur);
      if (/\[berserk\]/i.test(desc)) applyStatus(game, enemy, 'berserk', dur);
      if (/immolate/i.test(spell.name)) {
        if (applyStatus(game, enemy, 'immolate', dur)) enemy.immolateStacks = 1;
      }
      if (/loses \[100 physical/i.test(desc)) applyStatus(game, enemy, 'armor_melted', dur);
      if (/pull the target/i.test(desc) && !enemy.isSpawner) {
        const stepX = Math.sign(caster.x - enemy.x), stepY = Math.sign(caster.y - enemy.y);
        const pulled = { x: enemy.x + stepX, y: enemy.y + stepY };
        if (isPassable(game, pulled.x, pulled.y, enemy.flying) && !isTileOccupied(game, pulled.x, pulled.y)) {
          enemy.x = pulled.x; enemy.y = pulled.y;
        }
      }
      for (const st of spell.extraStatuses || []) applyStatus(game, enemy, st, dur);
      if (enemy.hp <= 0 && /raised as skeletons/i.test(desc)) {
        spawnAlly(game, { x: enemy.x, y: enemy.y }, { name: 'Skeleton', hp: enemy.maxHp, damage: spell.stats.minion_damage || 5, range: 1, tags: ['Undead'], color: '#a78bfa', icon: '☠' });
      }
      game.effects.push({ x: enemy.x, y: enemy.y, color: spell.color });
    }
  }
  return hitCount;
}

export function cast(game, spellId, target) {
  if (game.status !== 'playing' || game.deploying || game.pendingReward
    || ['freeze', 'stun', 'petrify', 'fear', 'silence'].some(st => game.player.statuses[st] > 0)
    || game.buffs.some(b => b.type === 'watcher')) return false;

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
  if (['Devour Flesh', 'Temporal Transfusion', 'Vampiricism', 'Suspend Mortality', 'Armageddon Blade'].includes(spell.name)
    && (!occupant || unit || (spell.name === 'Devour Flesh' && !occupant.tags.includes('Living')))) return false;
  if (spell.name === 'Devour Mind' && !unit?.tags?.some(t => t === 'Living' || t === 'Demon' || t === 'Arcane')) return false;
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
      for (const p of areaCells(walls[i], 1)) {
        if (game.tiles[p.y][p.x] === 1 && !seen.has(p.x + ',' + p.y)) { walls.push(p); seen.add(p.x + ',' + p.y); }
      }
    }
    if (!exit) return false;
  }
  if (spell.name === 'Storm Walk' && !game.clouds.some(c => !distance(c, effectiveTarget) && (c.type === 'storm' || c.type === 'rain' || c.type === 'blizzard'))) return false;
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
    if (game.buffs.some(b => b.type === 'Pain Mirror')) {
      for (const e of game.enemies.filter(e => hasSight(game, game.player, e))) {
        damageEnemy(game, e, spell.hpCost, 'Dark', 0, false, { caster: game.player, sourceKind: 'spell', sourceName: 'Pain Mirror', sourceTags: ['Blood', 'Dark', 'Enchantment'], manual: false });
      }
    }
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
    for (const other of availableSpells(game)) {
      if (other.id !== spellId) game.charges[other.id] = Math.min(other.maxCharges, game.charges[other.id] + 1);
    }
  }
  const origin = { x: game.player.x, y: game.player.y };
  const hits = resolveSpellCast(game, spell, effectiveTarget, true);
  equipmentAction(game, 'cast', { spell, target: effectiveTarget, victim: unit, origin });
  if (spell.tags.includes('Sorcery') && game.buffs.some(b => b.type === 'Multicast')) resolveSpellCast(game, spell, effectiveTarget, false);
  if (game.buffs.some(b => b.type === 'Death Cleave') && unit?.hp === 0) {
    const next = game.enemies.find(e => e.hp > 0 && distance(game.player, e) <= spell.range && hasSight(game, game.player, e));
    if (next) resolveSpellCast(game, spell, next, false);
  }
  if (game.buffs.some(b => b.type === 'Flame Gate') && spell.name !== 'Flame Gate') {
    if (spell.tags.includes('Fire')) summonCreature(game, 'Fire Elemental', effectiveTarget, { duration: 8 });
    else game.buffs = game.buffs.filter(b => b.type !== 'Flame Gate');
  }
  if (game.buffs.some(b => b.type === 'lightningForm') && spell.name !== 'Lightning Form') {
    if (spell.tags.includes('Lightning') && !isTileOccupied(game, effectiveTarget.x, effectiveTarget.y) && isPassable(game, effectiveTarget.x, effectiveTarget.y)) {
      Object.assign(game.player, effectiveTarget);
    }
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

export function releaseChannel(game, spell, completed) {
  if (spell.name === 'Dream the Starwhale') {
    const keep = completed && spell.upgradeNames.includes('Ritual of Stars');
    for (const a of game.allies.filter(a => a.dream)) {
      delete a.dream; delete a.starbask;
      if (!keep) game.allies = game.allies.filter(u => u !== a);
    }
    game.buffs = game.buffs.filter(b => b.name !== spell.name);
    if (!keep) applyStatus(game, game.player, 'freeze', 3);
  }
  if (spell.name === 'Ritual of Flying Daggers') {
    const count = ((game.daggers || 0) + (game.soulDaggers || 0)) * (completed ? spell.stats.num_targets : 1);
    const rng = random(game.seed + game.turn);
    for (let i = 0; i < count; i++) {
      const e = pick(game.enemies.filter(e => e.hp > 0 && hasSight(game, game.player, e)), rng);
      if (!e) break;
      damageEnemy(game, e, spell.damage, 'Physical');
      if (spell.upgradeNames.includes('Weighted Knives')) applyStatus(game, e, 'stun', 1);
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
  if (spell.name === 'Hatebolts') {
    const count = game.enemies.filter(e => e.hp > 0).length;
    for (const t of ['Fire', 'Dark']) damagePlayer(game, count, t);
  }
  if (completed && spell.name === 'Litany of Curses') {
    for (const e of game.enemies) {
      for (const st of Object.keys(e.statuses).filter(st => e.statuses[st] > 0).slice(0, spell.stats.num_targets)) {
        e.statuses[st] = Number.MAX_SAFE_INTEGER;
      }
    }
  }
}

export function cancelChannel(game) {
  if (!game.channel) return false;
  const spell = availableSpells(game).find(s => s.id === game.channel.spellId);
  if (spell) releaseChannel(game, spell, false);
  game.channel = null;
  return true;
}
