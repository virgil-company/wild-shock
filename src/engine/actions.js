import { SIZE, TICK_DECAY_STATUSES } from '../data/constants.js';
import { pick } from '../data/bestiary.js';
import { nodeMap, spellInfo } from '../data/catalog.js';
import { enhanceSpell } from '../data/artifacts.js';
import { namedKey, spellNameKey, textRef, upgradeNameKey } from '../i18n/text-keys.js';
import {
  addComponent, canLearnSpell, canLearnUpgrade, componentByName,
  effectiveSpell, equipItem, equipmentByName, forge as forgeEquipment,
  getEquipmentModifiers, getSpellUpgradeId, knownSpellIds, tags,
  spellById, spellByName, tagMastery, transmutationChoices,
} from '../rules/core.js';
import { equipmentEvent } from '../rules/equipment-effects.js';
import { resolvePickup } from '../rules/component-effects.js';
import { canStand, covers, distance, findOpenTileNear, hasSight, isPassable, isTileOccupied, onSegment, random } from './grid.js';
import {
  addCloud, availableSpells, awardPoints, beginEndTurn, clearSniperTrance,
  currentTurnId, equipped, finalRealmOf, finishEndTurn, log, maxHealth,
  syncCharges, withActionContext,
} from './context.js';
import { applyStatus, cleanup, damageEnemy, damagePlayer } from './combat.js';
import { allyTurn, convertEnemy, enemyTurn, recruitCompanion, spawnAlly, summonCreature, tickAllies } from './units.js';
import { cancelChannel, freeCast, releaseChannel, resolveSpellCast } from './spells.js';
import { addEquipmentRift, generateRealm } from './world.js';

const activeItemEvents = new WeakMap();

export function equipmentAction(game, event, extra = {}) {
  const copies = Object.entries(game.equipment);
  if (!copies.length) return;
  const seq = (game.equipmentEventCount || 0) + 1;
  game.equipmentEventCount = seq;
  const rng = random(game.seed + game.turn * 313 + game.progress.spellsCast + game.realm + seq * 19);
  const spells = () => availableSpells(game);
  let active = activeItemEvents.get(game);
  if (!active) { active = new Set(); activeItemEvents.set(game, active); }

  for (const [slot, copy] of copies) {
    const item = equipmentByName.get(copy.name);
    if (!item) continue;
    const key = slot + '/' + event;
    if (active.has(key)) continue;
    active.add(key);
    const enemies = game.enemies.filter(e => e.hp > 0);
    const eqAction = {
      caster: game.player, sourceKind: 'equipment', sourceName: item.name,
      sourceTags: item.tags || [], sourceEquipment: item.name, manual: false,
    };
    const context = {
      ...extra,
      turnId: currentTurnId(game),
      enemies,
      visible: enemies.filter(e => hasSight(game, game.player, e)),
      rng,
      roll: a => pick(a, rng),
      spells,
      mastery: tag => tagMastery(game, tag),
      spellInfo: name => effectiveSpell(game, spellByName.get(name)?.id),
      dist: distance,
      see: (a, b) => hasSight(game, a, b),
      act: a => allyTurn(game, a),
      cast: (n, p, opts = {}) => freeCast(game, n, p, { sourceEquipment: item.name, ...opts }),
      summon: (n, p, spec) => summonCreature(game, n, p, Object.fromEntries(Object.entries(spec).filter(([, v]) => v != null))),
      hurt: (e, n, t) => withActionContext(game, eqAction, () => damageEnemy(game, e, n, t)),
      heal: n => { game.player.hp = Math.min(maxHealth(game), game.player.hp + n); },
      pickupEligible: n => componentByName.get(n)?.on_pickup,
      pickup: n => applyComponentPickupEffects(game, n),
      afflict: (e, st, n) => applyStatus(game, e, st, n),
      weather: type => addCloud(game, 1 + Math.floor(rng() * (SIZE - 2)), 1 + Math.floor(rng() * (SIZE - 2)), type, 5),
      giveUpgrade: s => {
        if (!s) return;
        const u = pick(s.upgrades.filter(u => !s.learnedUpgrades.includes(u.sp_id)), rng);
        if (u) (game.spellUpgrades[s.spellId] ??= []).push(u.sp_id);
      },
    };
    try { equipmentEvent(event, game, item, copy, context); }
    finally { active.delete(key); }
  }
}

export function collectItem(game, item) {
  game.items = game.items.filter(i => i !== item);
  if (item.type === 'tome') {
    const spell = availableSpells(game).find(s => s.id === item.spellId);
    if (spell) {
      const boost = game.spellBoosts[spell.id] ??= {};
      boost.max_charges = (boost.max_charges || 0) + spell.maxCharges;
      game.charges[spell.id] += spell.maxCharges;
      log(game, 'log.tome', { spell: textRef(spellNameKey(spell.spellId)) }, 'gold');
    }
  } else if (item.type === 'companion') {
    recruitCompanion(game, item.name, item.name);
  } else if (item.type === 'scroll' || item.type === 'chest') {
    game.pendingReward = { type: item.type, options: [...item.options] };
  } else if (item.type === 'component') {
    addComponent(game, item.name);
    log(game, 'log.collected', { item: textRef(namedKey('components', item.name)) }, 'gold');
    applyComponentPickupEffects(game, item.name);
    equipmentAction(game, 'pickup');
  } else if (item.type === 'shard') {
    awardPoints(game, 3);
    equipmentAction(game, 'shard');
    log(game, 'log.shard', {}, 'gold');
  } else if (item.type === 'potion') {
    game.potions++;
    log(game, 'log.potion', {}, 'green');
  }
}

export function applyComponentPickupEffects(game, name, repeat) {
  const rng = random(game.seed + game.turn * 97 + game.items.length);
  const nearby = game.enemies.filter(e => e.hp > 0).sort((a, b) => distance(a, game.player) - distance(b, game.player));
  const spells = availableSpells(game);
  resolvePickup(game, name, {
    rng, nearby, spells, pulses: repeat?.pulses,
    visible: nearby.filter(e => hasSight(game, e, game.player)),
    mastery: tag => spells.filter(s => s.tags.includes(tag)).reduce((n, s) => n + s.level, 0),
    distance: e => distance(e, game.player),
    heal: n => { game.player.hp = Math.min(maxHealth(game), game.player.hp + n); },
    hurt: (e, n, type) => damageEnemy(game, e, n, type),
    afflict: (e, st, dur) => applyStatus(game, e, st, dur),
    summon: (n, p, spec) => summonCreature(game, n, p, spec),
    act: a => allyTurn(game, a),
    cast: (n, p) => freeCast(game, n, p),
    convert: e => convertEnemy(game, e),
    cloud: (e, type, dur, n) => addCloud(game, e.x, e.y, type, dur, n),
    relocate: () => {
      const item = pick(game.items.filter(i => i.type === 'shard' || i.type === 'component'), rng);
      if (item) collectItem(game, item);
    },
  }, !!repeat);
}

export function tickCloudsAndBuffs(game) {
  if (game.mutators?.includes('weather') && game.realmTurn % 3 === 0 && game.enemies.length) {
    const rng = random(game.seed + game.turn);
    const e = pick(game.enemies, rng);
    addCloud(game, e.x, e.y, pick(['storm', 'rain', 'blizzard'], rng), 4);
  }

  for (const cloud of game.clouds || []) {
    for (const enemy of game.enemies) {
      if (enemy.hp > 0 && enemy.x === cloud.x && enemy.y === cloud.y) {
        if (cloud.damage > 0) damageEnemy(game, enemy, cloud.damage, cloud.damageType);
        if (cloud.status) applyStatus(game, enemy, cloud.status, cloud.statusDuration);
      }
    }
    cloud.duration--;
  }
  game.clouds = (game.clouds || []).filter(c => c.duration > 0);

  for (const buff of game.buffs || []) {
    const nearby = game.enemies.filter(e => e.hp > 0).sort((a, b) => distance(game.player, a) - distance(game.player, b));
    if (buff.type === 'returnBeam' && buff.duration === 1) {
      for (const e of nearby.filter(e => onSegment(buff.from, buff.to, e))) for (const t of buff.types) damageEnemy(game, e, buff.damage, t);
    } else if (buff.type === 'tentacles') {
      const count = buff.base + Math.min(buff.duration - 1, buff.total - buff.duration);
      for (const e of nearby.slice(0, count)) damageEnemy(game, e, buff.damage, game.turn % 2 ? 'Arcane' : 'Lightning');
    } else if (buff.type === 'magnet') {
      const anchor = [...game.enemies, ...game.allies].find(e => e.hp > 0 && e.id === buff.targetId);
      if (anchor) {
        for (const e of nearby.filter(e => e !== anchor && distance(e, anchor) <= buff.radius)) {
          const pos = { x: e.x + Math.sign(anchor.x - e.x), y: e.y + Math.sign(anchor.y - e.y) };
          if (canStand(game, e, pos)) Object.assign(e, pos);
          if (distance(e, anchor) <= 1) damageEnemy(game, e, buff.damage, 'Lightning');
        }
      }
    } else if (buff.type === 'watcher') {
      const e = nearby.filter(e => hasSight(game, game.player, e)).at(-1);
      if (e) freeCast(game, 'Lightning Bolt', e);
    } else if (buff.type === 'demon') {
      for (const s of availableSpells(game).filter(s => s.tags.includes('Chaos') && s.name !== 'Demon Form')) {
        game.charges[s.id] = Math.min(s.maxCharges, game.charges[s.id] + 1);
      }
    } else if (buff.type === 'produce') {
      const rng = random(game.turn + game.seed);
      for (let i = 0; i < buff.count; i++) {
        summonCreature(game, buff.species === 'Imp' ? pick(['Fire Imp', 'Spark Imp', 'Iron Imp'], rng) : buff.species, game.player);
      }
    } else if (buff.type === 'petrification') {
      for (const e of nearby.filter(e => distance(game.player, e) <= buff.radius).slice(0, buff.targets)) applyStatus(game, e, 'petrify', buff.turns);
    } else if (buff.type === 'darkness') {
      for (const e of nearby) applyStatus(game, e, 'blind', 2);
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
      buff.next += buff.interval; buff.pulses++;
      applyComponentPickupEffects(game, buff.name, buff);
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
          if (buff.status) applyStatus(game, target, buff.status, 2);
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
      const strongest = game.enemies.reduce((a, b) => (a.hp >= b.hp ? a : b));
      applyStatus(game, strongest, 'sleep', 3);
    }
    if (equipped(game, 'Death Fob') && game.realmTurn >= 12 && game.realmTurn < 24) freeCast(game, 'Death Clock', game.player);
    if (equipped(game, 'Constellation Cloak')) {
      for (const orb of game.allies.filter(a => a.orb)) {
        const tiles = [];
        for (let dy = -3; dy <= 3; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            const pos = { x: orb.x + dx, y: orb.y + dy };
            if (isPassable(game, pos.x, pos.y, true) && !isTileOccupied(game, pos.x, pos.y)) tiles.push(pos);
          }
        }
        if (tiles.length) Object.assign(orb, pick(tiles, rng));
      }
    }
  }

  equipmentAction(game, 'turn');
  const mods = getEquipmentModifiers(game);
  for (const trig of mods.turnEffects) {
    const alive = game.enemies.filter(e => e.hp > 0);
    if (!alive.length) continue;
    const target = alive[game.turn % alive.length];
    if (trig.type === 'acidify_random') applyStatus(game, target, 'acidified', 3);
    else if (trig.type === 'damage_random') damageEnemy(game, target, trig.amount, trig.damageType);
  }
}

export function endTurn(game) {
  for (const [status, turns] of Object.entries(game.player.statuses)) {
    if (status === 'bleed' || status === 'poison') {
      damagePlayer(game, status === 'bleed' ? 3 : 1, status === 'bleed' ? 'Physical' : 'Poison');
    }
    if (turns > 0 && --game.player.statuses[status] <= 0) delete game.player.statuses[status];
  }
  game.turn++;
  game.realmTurn = (game.realmTurn || 0) + 1;
  game.quickstepUsed = false;

  beginEndTurn(game);
  try {
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
      const frostbiteId = getSpellUpgradeId(freeze, 'Frostbite');
      const damage = frostbiteId != null && game.spellUpgrades[freeze.id]?.includes(frostbiteId) ? effectiveSpell(game, freeze.id).damage : 0;
      for (const e of game.enemies) {
        if (e.statuses.refreezing > 0) e.statuses.freeze = Math.max(e.statuses.freeze || 0, e.statuses.refreezing--);
        if (damage && e.statuses.freeze) { damageEnemy(game, e, damage, 'Ice'); damageEnemy(game, e, damage, 'Dark'); }
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
      enemyTurn(game, enemy, spawnedThisTurn, false);
      if (game.player.hp <= 0) break;
    }

    // 4. Always-active Poison Sting -> Stinging Rebuke retaliation against visible enemies that hurt the wizard this turn
    if (game.player.hp > 0 && game.damagedPlayerBy?.turn === currentTurnId(game) && game.damagedPlayerBy.ids.length) {
      const psBase = spellByName.get('Poison Sting');
      const rebukeId = getSpellUpgradeId(psBase, 'Stinging Rebuke');
      if (rebukeId != null && knownSpellIds(game).includes(psBase.id) && game.spellUpgrades[psBase.id]?.includes(rebukeId)) {
        const ps = effectiveSpell(game, psBase.id);
        const cap = Math.max(1, ps.stats.num_targets || 2);
        const attackerIds = new Set(game.damagedPlayerBy.ids);
        const targets = game.enemies.filter(e => e.hp > 0 && attackerIds.has(e.id) && hasSight(game, game.player, e)).slice(0, cap);
        for (const e of targets) freeCast(game, 'Poison Sting', e);
      }
    }
    game.damagedPlayerBy = null;

    for (const enemy of game.enemies) {
      if (enemy.conductivity) enemy.conductivity = enemy.conductivity.map(n => n - 1).filter(n => n > 0);
      for (let i = 0; i < TICK_DECAY_STATUSES.length; i++) {
        const s = TICK_DECAY_STATUSES[i];
        if (enemy.statuses[s] > 0) enemy.statuses[s]--;
      }
    }
    if (spawnedThisTurn.length) game.enemies.push(...spawnedThisTurn);
    cleanup(game);
    if (game.player.hp <= 0) { game.status = 'dead'; log(game, 'log.dead', {}, 'red'); }
  } finally {
    finishEndTurn(game);
  }
}

export function move(game, dx, dy, extraStep = false) {
  if (!Number.isInteger(dx) || !Number.isInteger(dy) || Math.max(Math.abs(dx), Math.abs(dy)) !== 1 || (game.mode === 'standard' && dx && dy)) return false;
  if (game.status !== 'playing' || game.deploying || game.pendingReward
    || ['freeze', 'stun', 'petrify', 'immobilized'].some(st => game.player.statuses[st] > 0)
    || game.buffs.some(b => b.type === 'watcher')) return false;
  const mods = getEquipmentModifiers(game);
  const p = { x: game.player.x + dx, y: game.player.y + dy };
  if (!isPassable(game, p.x, p.y, mods.flying)) return false;

  // Moving cancels channeling unless wearing Channel Boots
  if (game.channel && !mods.channelMove) cancelChannel(game);

  const enemy = game.enemies.find(e => covers(e, p));
  if (enemy) {
    withActionContext(game, { caster: game.player, sourceKind: 'staff', sourceName: 'Staff Strike', sourceTags: ['Physical'], manual: true }, () => {
      damageEnemy(game, enemy, 5 + Math.floor(game.realm / 3));
    });
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
  clearSniperTrance(game);
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
    game.riftAffinity = portal.affinity || null;
    game.riftVariant = portal.variant || 0;
    game.realm++;
    game.deploying = game.mode !== 'standard';
    game.theme = portal.theme;
    game.player.hp = maxHealth(game);
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

export function wait(game) {
  if (game.status !== 'playing' || game.deploying || game.pendingReward) return false;
  if (game.channel) {
    const spell = availableSpells(game).find(s => s.id === game.channel.spellId);
    if (spell) {
      game.effects = [];
      const allyTarget = spell.name === 'Temporal Transfusion' ? game.allies.find(a => a.id === game.channel.targetId) : null;
      if (spell.name === 'Temporal Transfusion' && !allyTarget) { cancelChannel(game); endTurn(game); return true; }
      resolveSpellCast(game, spell, allyTarget || game.channel.target, false);
      if (!game.channel) { cleanup(game); endTurn(game); return true; }
      game.channel.turnsLeft--;
      if (game.channel.turnsLeft <= 0) {
        releaseChannel(game, spell, true);
        if (game.channel.isRitual) {
          if (spell.upgradeNames.includes('Ritual of Acceleration')) for (const a of game.allies) a.haste = true;
          if (spell.name === 'Temporal Transfusion' && spell.upgradeNames.includes('Ritual of Haste')) {
            const target = game.allies.find(a => a.id === game.channel.targetId);
            if (target) target.haste = true;
          }
          if (spell.name === 'Ritual of Revelation') {
            for (let i = 0; i < spell.stats.num_summons; i++) {
              summonCreature(game, spell.upgradeNames.includes("Arbiter's Revelation") ? 'Arbiter' : 'False Prophet', game.player);
            }
          }
          if (spell.name === 'Ritual of the Opening Eye') {
            for (let i = 0; i < spell.stats.num_summons; i++) freeCast(game, 'Floating Eye', game.player);
          }
          if (Object.values(game.equipment).some(e => e.components.includes('Cursed Rosary') && equipmentByName.get(e.name)?.tags.some(tag => tag === 'Dark' || tag === 'Ritual'))) {
            game.player.hp = maxHealth(game);
          }
          log(game, 'log.ritualComplete', { spell: textRef(spellNameKey(spell.spellId)) }, 'gold');
        }
        game.channel = null;
      } else {
        log(game, 'log.channeling', { spell: textRef(spellNameKey(spell.spellId)), turns: game.channel.turnsLeft }, 'gold');
      }
      cleanup(game);
      endTurn(game);
      return true;
    }
    game.channel = null;
  }

  // Blood Bullet -> Sniper's Trance stacks when passing the turn.
  const bulletBase = spellByName.get('Blood Bullet');
  const tranceId = getSpellUpgradeId(bulletBase, "Sniper's Trance");
  if (tranceId != null && knownSpellIds(game).includes(bulletBase.id) && game.spellUpgrades[bulletBase.id]?.includes(tranceId)) {
    const existing = game.buffs.find(b => b.type === 'sniper');
    if (existing) existing.stacks = (existing.stacks || 0) + 1;
    else game.buffs.push({ name: "Sniper's Trance", type: 'sniper', stacks: 1, duration: -1 });
  }

  log(game, 'log.wait');
  endTurn(game);
  return true;
}

export function drink(game) {
  if (game.status !== 'playing' || game.deploying || game.pendingReward || !game.potions) return false;
  game.potions--;
  game.progress.potionsUsed++;
  game.player.hp = maxHealth(game);
  for (const spell of availableSpells(game)) game.charges[spell.id] = spell.maxCharges;
  log(game, 'log.restored', {}, 'green');
  endTurn(game);
  return true;
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
  game.points -= plan.cost;
  game.progress.pointsSpent += plan.cost;
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

export function learnSpell(game, spellId) {
  if (!canLearnSpell(game, spellId)) return false;
  const base = spellById.get(spellId);
  game.points -= base.level;
  game.progress.pointsSpent += base.level;
  game.spells ??= [];
  game.spells.push(spellId);
  const eff = effectiveSpell(game, spellId);
  game.charges[eff.id] = eff.maxCharges;
  log(game, 'log.learnedSpell', { spell: textRef(spellNameKey(base.id)) }, 'gold');
  return true;
}

export function learnUpgrade(game, spellId, spId) {
  if (!canLearnUpgrade(game, spellId, spId)) return false;
  const base = spellById.get(spellId);
  const upgrade = base.upgrades.find(u => u.sp_id === spId);
  const previousCapacity = effectiveSpell(game, spellId).maxCharges;
  game.points -= upgrade.level;
  game.progress.pointsSpent += upgrade.level;
  game.spellUpgrades ??= {};
  game.spellUpgrades[spellId] ??= [];
  game.spellUpgrades[spellId].push(spId);
  const eff = effectiveSpell(game, spellId);
  game.charges[eff.id] = Math.max(0, Math.min(eff.maxCharges, (game.charges[eff.id] || 0) + eff.maxCharges - previousCapacity));
  log(game, 'log.upgradedSpell', { spell: textRef(spellNameKey(base.id)), upgrade: textRef(upgradeNameKey(upgrade.sp_id)) }, 'gold');
  return true;
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
    const source = options.component || game.components?.[0];
    if (!source || !game.components.includes(source)) return false;
    const pool = transmutationChoices(source).map(c => c.name);
    if (!pool.length || (options.result && !pool.includes(options.result))) return false;
    const rng = random(game.seed + game.realm * 313 + game.turn * 97 + game.shrine.uses * 17);
    const result = options.result || pick(pool, rng);
    game.components.splice(game.components.indexOf(source), 1);
    game.components.push(result);
    game.shrine.uses--;
    log(game, 'log.transmuted', { from: textRef(namedKey('components', source)), to: textRef(namedKey('components', result)) }, 'gold');
    endTurn(game);
    return true;
  }
  if (type === 'offering' || type === 'knowledge') {
    const name = options.component;
    const comp = componentByName.get(name);
    if (!comp || !game.components.includes(name)) return false;
    if (type === 'offering') {
      if (!comp.tags.includes(options.tag)) return false;
      game.offeringTags.push(options.tag);
    } else {
      const rng = random(game.seed + game.turn * 17 + game.realm);
      const pool = availableSpells(game).flatMap(s => s.upgrades.filter(u => !s.learnedUpgrades.includes(u.sp_id)).map(u => [s.spellId, u.sp_id]));
      if (!pool.length) return false;
      for (let i = 0; i < (comp.rare && comp.on_craft ? 4 : 1) && pool.length; i++) {
        const [[id, upgrade]] = pool.splice(Math.floor(rng() * pool.length), 1);
        (game.spellUpgrades[id] ??= []).push(upgrade);
      }
    }
    game.components.splice(game.components.indexOf(name), 1);
    game.shrine.uses--;
    endTurn(game);
    return true;
  }
  if (type === 'reformation') {
    const slot = options.slot;
    const item = game.equipment[slot];
    if (!item?.components?.length) return false;
    const prev = availableSpells(game);
    game.components.push(...item.components);
    delete game.equipment[slot];
    syncCharges(game, prev);
    game.shrine.uses--;
    endTurn(game);
    return true;
  }
  if (type === 'spellgraft') {
    const s = availableSpells(game).find(s => s.id === options.spellId);
    if (!s || !tags.includes(options.tag) || s.tags.includes(options.tag)) return false;
    const previous = availableSpells(game);
    ((game.spellBoosts[s.id] ??= {}).tags ??= []).push(options.tag);
    syncCharges(game, previous);
    game.shrine.uses--;
    endTurn(game);
    return true;
  }
  if (type === 'haste') {
    const spell = availableSpells(game).find(s => s.id === options.spellId && !s.quickCast);
    if (!spell) return false;
    (game.spellBoosts[spell.id] ??= {}).quickCast = true;
    game.shrine.uses--;
    endTurn(game);
    return true;
  }
  if (type === 'duplication') {
    const targetComp = options.component || game.components?.[0];
    if (!targetComp || !game.components.includes(targetComp)) return false;
    game.components.push(targetComp);
    game.shrine.uses--;
    log(game, 'log.shrineDuplicated', { item: textRef(namedKey('components', targetComp)) }, 'gold');
    endTurn(game);
    return true;
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
    log(game, 'log.shrineEmpowered', { spell: textRef(spellNameKey(chosen.spellId)) }, 'gold');
    endTurn(game);
    return true;
  }
  if (type === 'chronomancy') {
    for (const spell of availableSpells(game)) game.charges[spell.id] = spell.maxCharges;
    game.player.shields = (game.player.shields || 0) + 4;
    game.shrine.uses--;
    log(game, 'log.shrineChronomancy', {}, 'gold');
    endTurn(game);
    return true;
  }
  if (type === 'calling') {
    const pos = findOpenTileNear(game, game.player, 2, false);
    if (!pos) return false;
    spawnAlly(game, pos, { name: 'Arcane Sentinel', hp: 45, damage: 9, range: 3, shields: 3, duration: 0, tags: ['Arcane', 'Conjuration'], color: '#c084fc', icon: '✧' });
    game.shrine.uses--;
    log(game, 'log.shrineCalling', {}, 'gold');
    endTurn(game);
    return true;
  }
  return false;
}

export function claimReward(game, choice) {
  const reward = game.pendingReward;
  if (game.status !== 'playing' || !reward?.options.includes(choice)) return false;
  if (reward.type === 'scroll') {
    if (!game.spells.includes(choice)) game.spells.push(choice);
    const spell = effectiveSpell(game, choice);
    game.charges[spell.id] = spell.maxCharges;
    log(game, 'log.learnedSpell', { spell: textRef(spellNameKey(spell.spellId)) }, 'gold');
  } else {
    const item = equipmentByName.get(choice);
    if (!item) return false;
    const previous = availableSpells(game);
    equipItem(game, item);
    syncCharges(game, previous);
    log(game, 'log.forged', { item: textRef(namedKey('equipment', item.name)), slot: textRef('slots.' + item.slot.toLowerCase()) }, 'gold');
  }
  game.pendingReward = null;
  return true;
}
