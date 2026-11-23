import { rw3Units, spawnBands } from './rw3-catalog.js';

export const units = new Map(rw3Units.map(unit => [unit.name, unit]));
const common = rw3Units.filter(unit => unit.is_monster && unit.difficulty);
const elites = rw3Units.filter(unit => unit.rare);
export const realmBosses = rw3Units.filter(unit => unit.boss_kind === 'final');
export const companions = rw3Units.filter(unit => unit.is_companion);
export const pick = (choices, rng) => choices[Math.floor(rng() * choices.length)];
export const covers = (unit, tile) => Math.max(Math.abs(unit.x - tile.x), Math.abs(unit.y - tile.y)) <= (unit.radius || 0);

export function encounterTable(realm, finalRealm, rng, theme) {
  const depth = Math.min(20, Math.ceil(realm * 20 / finalRealm));
  const [low, high] = spawnBands[depth];
  const candidates = common.filter(unit => unit.difficulty >= low && unit.difficulty <= high);
  const favored = candidates.filter(unit => unit.tags.some(tag => (theme ? ['Fire', 'Dark', 'Demon'] : ['Nature', 'Living', 'Ice']).includes(tag)));
  const group = [pick(favored.length ? favored : candidates, rng), pick(candidates, rng)];
  const tier = depth < 7 ? 'Easy' : depth < 14 ? 'Medium' : 'Hard';
  return { group, elite: pick(elites.filter(unit => unit.rare.class === tier), rng), boss: pick(realmBosses, rng) };
}

export function unitAttacks(def) {
  return def.abilities.filter(a => a.damage > 0 && a.damage_type.length);
}

export function unitStats(def) {
  const attacks = unitAttacks(def);
  const primary = attacks[0];
  const passive = def.passives.join('\n');
  const regen = passive.match(/(?:Heals|Regenerate) (\d+) HP each turn/i);
  const shield = passive.match(/(?:Gain|Regenerate) \[(\d+) SH:shields\] each turn/i);
  const rebirth = passive.match(/reincarnat(?:es? when killed|e after being killed) \((\d+) times?\)/i);
  const phase = passive.match(/transform(?:s)? into (?:a |an )?([^\n.]+)/i);
  return {
    name: def.name, species: def.name, tags: [...def.tags], hp: def.hp, maxHp: def.hp,
    type: def.flying ? 3 : def.tags.includes('Metallic') ? 1 : primary?.range > 2 ? 2 : 0,
    resistances: { ...def.resists }, shields: def.shields, flying: !!def.flying,
    stationary: !!def.stationary, burrowing: !!def.burrowing, radius: def.radius || 0,
    damage: primary?.damage || 0, range: Math.max(0, ...attacks.map(attackRange)),
    statuses: {}, cooldowns: {}, regen: Number(regen?.[1] || 0), shieldRegen: Number(shield?.[1] || 0),
    lives: Number(rebirth?.[1] || 0), nextForm: phase ? [...units.keys()].filter(n => phase[1] === n || phase[1].startsWith(n + ' and ')).sort((a, b) => b.length - a.length)[0] || null : null,
  };
}

export function attackRange(ability) {
  return Math.max(1, Math.floor(ability.range || ability.radius || 30));
}

export function readyAttack(unit, distance, turn) {
  const def = units.get(unit.species);
  if (!def) return null;
  return unitAttacks(def).find(a => (unit.cooldowns?.[a.name] || 0) <= turn && distance <= attackRange(a));
}

export function searchCatalogue(query, fields, summons = []) {
  const words = query.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  if (!words.length) return true;
  const text = [...fields, ...summons.flatMap(name => [name, ...(units.get(name)?.tags || [])])].join(' ').toLowerCase();
  const tokens = text.match(/[\p{L}\p{N}]+/gu) || [];
  return words.every((word, index) => index === words.length - 1 && !/\s$/.test(query)
    ? tokens.some(token => token.startsWith(word)) : tokens.includes(word));
}

const speciesForms = [...units.keys()].sort((a, b) => b.length - a.length).flatMap(name => {
  const lower = name.toLowerCase();
  return [...new Set([lower, lower + 's', lower.replace(/y$/, 'ies'), lower.replace(/f$/, 'ves')])].map(text => [text, name]);
});
export function deathSummons(passive) {
  const line = passive.match(/^On death, summon (.+)$/i)?.[1] || passive.match(/^Summon (.+) on death$/i)?.[1];
  if (!line) return [];
  return line.split(/, | and /).map(part => parseSummon('Summon ' + part)).filter(Boolean);
}
const summonRules = new Map();
export function summonedBy(action) {
  if (summonRules.has(action)) return summonRules.get(action);
  const rule = parseSummon(action.desc);
  summonRules.set(action, rule);
  return rule;
}
function parseSummon(desc) {
  const match = desc.match(/^Summon (?:(\d+|a|an) )?(?:temporary )?(.+)/i);
  const unit = match && speciesForms.find(([form]) => match[2].toLowerCase() === form || match[2].toLowerCase().startsWith(form + ' '));
  return unit ? { name: unit[1], count: Number(match[1]) || 1, temporary: desc.includes('temporary') } : null;
}
