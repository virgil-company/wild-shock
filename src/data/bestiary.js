import { units as unitCatalog, spawnBands } from './catalog.js';

export const units = new Map(unitCatalog.map(unit => [unit.name, unit]));
const sortedUnitNames = [...units.keys()].sort((a, b) => b.length - a.length);
const common = unitCatalog.filter(unit => unit.is_monster && unit.difficulty);
const elitesByTier = {
  Easy: unitCatalog.filter(unit => unit.rare?.class === 'Easy'),
  Medium: unitCatalog.filter(unit => unit.rare?.class === 'Medium'),
  Hard: unitCatalog.filter(unit => unit.rare?.class === 'Hard'),
};
export const realmBosses = unitCatalog.filter(unit => unit.boss_kind === 'final');
export const companions = unitCatalog.filter(unit => unit.is_companion);

export const pick = (choices, rng) => choices[Math.floor(rng() * choices.length)];
export const covers = (unit, tile) => Math.max(Math.abs(unit.x - tile.x), Math.abs(unit.y - tile.y)) <= (unit.radius || 0);

const EMBER_TAGS = new Set(['Fire', 'Dark', 'Demon']);
const MOSS_TAGS = new Set(['Nature', 'Living', 'Ice']);

export function encounterTable(realm, finalRealm, rng, theme) {
  const depth = Math.min(20, Math.ceil(realm * 20 / finalRealm));
  const [low, high] = spawnBands[depth];
  const candidates = common.filter(unit => unit.difficulty >= low && unit.difficulty <= high);
  const favoredTags = theme ? EMBER_TAGS : MOSS_TAGS;
  const favored = candidates.filter(unit => unit.tags.some(tag => favoredTags.has(tag)));
  const group = [pick(favored.length ? favored : candidates, rng), pick(candidates, rng)];
  const tier = depth < 7 ? 'Easy' : depth < 14 ? 'Medium' : 'Hard';
  return { group, elite: pick(elitesByTier[tier], rng), boss: pick(realmBosses, rng) };
}

export function attackRange(ability) {
  return Math.max(1, Math.floor(ability.range || ability.radius || 30));
}

const attacksCache = new WeakMap();
export function unitAttacks(def) {
  let attacks = attacksCache.get(def);
  if (!attacks) {
    attacks = def.abilities.filter(a => a.damage > 0 && a.damage_type.length);
    attacksCache.set(def, attacks);
  }
  return attacks;
}

const speciesForms = sortedUnitNames.flatMap(name => {
  const lower = name.toLowerCase();
  return [...new Set([lower, lower + 's', lower.replace(/y$/, 'ies'), lower.replace(/f$/, 'ves')])].map(text => [text, name]);
});

function parseSummon(desc) {
  const match = desc.match(/^Summon (?:(\d+|a|an) )?(?:temporary )?(.+)/i);
  const unit = match && speciesForms.find(([form]) => match[2].toLowerCase() === form || match[2].toLowerCase().startsWith(form + ' '));
  return unit ? { name: unit[1], count: Number(match[1]) || 1, temporary: desc.includes('temporary') } : null;
}

const deathSummonCache = new Map();
export function deathSummons(passive) {
  if (deathSummonCache.has(passive)) return deathSummonCache.get(passive);
  const line = passive.match(/^On death, summon (.+)$/i)?.[1] || passive.match(/^Summon (.+) on death$/i)?.[1];
  const result = line ? line.split(/, | and /).map(part => parseSummon('Summon ' + part)).filter(Boolean) : [];
  deathSummonCache.set(passive, result);
  return result;
}

const summonRules = new WeakMap();
export function summonedBy(action) {
  if (summonRules.has(action)) return summonRules.get(action);
  const rule = parseSummon(action.desc);
  summonRules.set(action, rule);
  return rule;
}

// Pre-parsed passive & stat metadata per unit definition (computed once per species).
const unitMetaCache = new WeakMap();
export function getUnitMeta(def) {
  let meta = unitMetaCache.get(def);
  if (meta) return meta;

  const attacks = unitAttacks(def);
  const primary = attacks[0];
  const passiveText = def.passives.join('\n');
  const regen = passiveText.match(/(?:Heals|Regenerate) (\d+) HP each turn/i);
  const shield = passiveText.match(/(?:Gain|Regenerate) \[(\d+) SH:shields\] each turn/i);
  const rebirth = passiveText.match(/reincarnat(?:es? when killed|e after being killed) \((\d+) times?\)/i);
  const phase = passiveText.match(/transform(?:s)? into (?:a |an )?([^\n.]+)/i);
  const nextForm = phase
    ? sortedUnitNames.find(n => phase[1] === n || phase[1].startsWith(n + ' and ')) || null
    : null;

  const turnPassives = [];
  const deathPassives = [];
  for (const p of def.passives) {
    const chance = p.match(/^Each turn, (\d+)% chance to (.+)/);
    if (chance) {
      const rule = chance[2];
      turnPassives.push({
        kind: 'chance',
        pct: Number(chance[1]),
        rule,
        blinkDist: rule.startsWith('blink to') ? Number(rule.match(/(\d+) tiles/)?.[1] || 4) : 0,
        becomeSpecies: rule.startsWith('become a ') ? rule.slice(9) : null,
      });
    }
    const threshold = p.match(/^Summon (\d+) (.+) when HP falls below (\d+)%/i);
    if (threshold) {
      turnPassives.push({ kind: 'threshold', key: p, count: Number(threshold[1]), species: threshold[2], pct: Number(threshold[3]) });
    }
    const spawn = p.match(/^Has a (\d+)% chance each turn to spawn (?:a |(\d+) )(.+)/i);
    if (spawn) {
      turnPassives.push({ kind: 'spawn', pct: Number(spawn[1]), count: Number(spawn[2]) || 1, species: spawn[3] });
    }
    const healAura = p.match(/^Heal allies within (\d+) tiles for (\d+) each turn/i);
    if (healAura) {
      turnPassives.push({ kind: 'healAura', radius: Number(healAura[1]), amount: Number(healAura[2]) });
    }
    const shieldPulse = p.match(/^Gain (\d+) \[SH:shields\] every (\d+) turns up to a max of (\d+)/i);
    if (shieldPulse) {
      turnPassives.push({ kind: 'shieldPulse', amount: Number(shieldPulse[1]), interval: Number(shieldPulse[2]), max: Number(shieldPulse[3]) });
    }
    const dmgAura = p.match(/^Each turn, deal (\d+) (\w+) damage to enemies within (\d+) tiles/i);
    if (dmgAura) {
      turnPassives.push({ kind: 'dmgAura', amount: Number(dmgAura[1]), damageType: dmgAura[2], radius: Number(dmgAura[3]) });
    }

    const summons = deathSummons(p);
    if (summons.length) deathPassives.push({ kind: 'summons', rules: summons });
    const blast = p.match(/^On death, deal (\d+) \[(\w+)(?::\w+)?\] damage to units within (\d+)/);
    if (blast) deathPassives.push({ kind: 'blast', amount: Number(blast[1]), damageType: blast[2], radius: Number(blast[3]) });
    const affliction = p.match(/^On death, apply (\w+) to adjacent units for (\d+) turns/);
    if (affliction) {
      const status = ({ Stunned: 'stun', Hemorrhage: 'bleed' })[affliction[1]] || affliction[1].toLowerCase();
      deathPassives.push({ kind: 'affliction', status, duration: Number(affliction[2]) });
    }
  }

  meta = {
    type: def.flying ? 3 : def.tags.includes('Metallic') ? 1 : primary?.range > 2 ? 2 : 0,
    damage: primary?.damage || 0,
    range: Math.max(0, ...attacks.map(attackRange)),
    regen: Number(regen?.[1] || 0),
    shieldRegen: Number(shield?.[1] || 0),
    lives: Number(rebirth?.[1] || 0),
    nextForm,
    hasMelee: def.abilities.some(a => a.melee),
    turnPassives,
    deathPassives,
  };
  unitMetaCache.set(def, meta);
  return meta;
}

export function unitStats(def) {
  const meta = getUnitMeta(def);
  return {
    name: def.name, species: def.name, tags: [...def.tags], hp: def.hp, maxHp: def.hp,
    type: meta.type,
    resistances: { ...def.resists }, shields: def.shields, flying: !!def.flying,
    stationary: !!def.stationary, burrowing: !!def.burrowing, radius: def.radius || 0,
    damage: meta.damage, range: meta.range,
    statuses: {}, cooldowns: {}, regen: meta.regen, shieldRegen: meta.shieldRegen,
    lives: meta.lives, nextForm: meta.nextForm,
  };
}

export function readyAttack(unit, distance, turn) {
  const def = units.get(unit.species);
  if (!def) return null;
  const attacks = unitAttacks(def);
  for (let i = 0; i < attacks.length; i++) {
    const a = attacks[i];
    if ((unit.cooldowns?.[a.name] || 0) <= turn && distance <= attackRange(a)) return a;
  }
  return null;
}

const WORD_RE = /[\p{L}\p{N}]+/gu;
export function searchCatalogue(query, fields, summons = []) {
  const words = query.toLowerCase().match(WORD_RE) || [];
  if (!words.length) return true;
  const parts = [...fields];
  for (const name of summons) {
    parts.push(name);
    const u = units.get(name);
    if (u?.tags) parts.push(...u.tags);
  }
  const tokens = parts.join(' ').toLowerCase().match(WORD_RE) || [];
  const trailingSpace = /\s$/.test(query);
  const lastIdx = words.length - 1;
  return words.every((word, index) => (index === lastIdx && !trailingSpace)
    ? tokens.some(token => token.startsWith(word))
    : tokens.includes(word));
}
