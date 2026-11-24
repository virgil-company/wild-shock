import { CLOUD_TYPES, getModeConfig } from '../data/constants.js';
import { effectiveRw3Spell, getEquipmentModifiers, knownSpellIds } from '../rules/rw3.js';
import { isPassable } from './grid.js';

const endTurnState = new WeakSet();
const actionStack = new WeakMap();
export const retaliatingUnits = new WeakMap();

export function beginEndTurn(game) {
  endTurnState.add(game);
}

export function finishEndTurn(game) {
  endTurnState.delete(game);
}

export function currentTurnId(game) {
  return endTurnState.has(game) ? Math.max(0, game.turn - 1) : game.turn;
}

export function currentAction(game) {
  const stack = actionStack.get(game);
  return stack?.length ? stack[stack.length - 1] : null;
}

export function withActionContext(game, ctx, fn) {
  let stack = actionStack.get(game);
  if (!stack) { stack = []; actionStack.set(game, stack); }
  stack.push(ctx);
  try { return fn(); }
  finally { stack.pop(); }
}

function unitDescriptor(game, unit) {
  if (!unit) return { id: null, kind: null, name: null };
  if (unit === game.player) return { id: 'player', kind: 'player', name: 'Wizard' };
  if (game.allies?.includes(unit)) return { id: unit.id, kind: 'ally', name: unit.name || unit.species || 'Ally' };
  if (game.enemies?.includes(unit)) return { id: unit.id, kind: 'enemy', name: unit.name || unit.species || 'Enemy' };
  return { id: unit.id ?? null, kind: unit.species ? 'unit' : null, name: unit.name || unit.species || null };
}

export function buildEffectRecord(game, target, damageType, dealt, ctx = null) {
  const active = ctx || currentAction(game) || {};
  const casterDesc = unitDescriptor(game, active.caster);
  const targetDesc = unitDescriptor(game, target);
  return {
    turn: currentTurnId(game),
    casterId: casterDesc.id,
    casterKind: casterDesc.kind,
    casterName: casterDesc.name,
    targetId: targetDesc.id,
    targetKind: targetDesc.kind,
    targetName: targetDesc.name,
    sourceKind: active.sourceKind || null,
    sourceName: active.sourceName || null,
    sourceTags: [...(active.sourceTags || [])],
    sourceEquipment: active.sourceEquipment || null,
    damageType: damageType || null,
    dealt,
    manual: !!active.manual,
  };
}

export function log(game, key, params = {}, tone = '') {
  game.log.unshift({ key, params, tone, turn: game.turn });
  if (game.log.length > 60) game.log.length = 60;
}

export function finalRealmOf(game) {
  return getModeConfig(game.mode).finalRealm;
}

export function maxHealth(game) {
  return 55 + (game.bonusMaxHp || 0);
}

export function awardPoints(game, amount) {
  game.points += amount;
  game.progress.pointsEarned += amount;
}

export function equipped(game, name) {
  for (const item of Object.values(game.equipment || {})) {
    if (item.name === name) return true;
  }
  return false;
}

export function availableSpells(game) {
  const mods = getEquipmentModifiers(game);
  const result = [];
  for (const id of knownSpellIds(game)) {
    const eff = effectiveRw3Spell(game, id, mods);
    if (eff) result.push(eff);
  }
  return result;
}

export function syncCharges(game, oldSpells) {
  const previous = new Map(oldSpells.map(s => [s.id, s.maxCharges]));
  for (const spell of availableSpells(game)) {
    const used = Math.max(0, (previous.get(spell.id) || 0) - (game.charges[spell.id] || 0));
    game.charges[spell.id] = Math.max(0, spell.maxCharges - used);
    previous.delete(spell.id);
  }
  for (const id of previous.keys()) delete game.charges[id];
}

export function clearSniperTrance(game) {
  if (game.buffs?.some(b => b.type === 'sniper')) {
    game.buffs = game.buffs.filter(b => b.type !== 'sniper');
  }
}

export function addCloud(game, x, y, type, duration = 6, customDamage = null) {
  if (!isPassable(game, x, y, true)) return;
  game.clouds ??= [];
  const def = CLOUD_TYPES[type] || CLOUD_TYPES.fire;
  game.clouds = game.clouds.filter(c => !(c.x === x && c.y === y));
  const cloud = {
    x, y, type, duration: Math.max(1, duration),
    damage: customDamage ?? def.damage,
    damageType: def.damageType,
    status: def.status || null,
    statusDuration: def.statusDuration || 0,
    color: def.color,
  };
  game.clouds.push(cloud);
  return cloud;
}
