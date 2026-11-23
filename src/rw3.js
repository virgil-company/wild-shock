import { rw3Components, rw3Equipment, rw3Spells, rw3Tags } from './rw3-catalog.js';

export const equipmentSlots = ['Weapon', 'Head', 'Body', 'Feet', 'Trinket'];
export const componentByName = new Map(rw3Components.map(component => [component.name, component]));
export const equipmentByName = new Map(rw3Equipment.map(item => [item.name, item]));
export const spellById = new Map(rw3Spells.map(spell => [spell.id, spell]));
export const spellByName = new Map(rw3Spells.map(spell => [spell.name, spell]));

export const DAMAGE_TYPES = ['Physical', 'Fire', 'Ice', 'Lightning', 'Dark', 'Holy', 'Arcane', 'Poison'];

export const TAG_META = {
  Fire: { color: '#f28b5e', icon: '♨' },
  Ice: { color: '#7dd3fc', icon: '❄' },
  Lightning: { color: '#facc15', icon: 'ϟ' },
  Dark: { color: '#a78bfa', icon: '◈' },
  Holy: { color: '#fde68a', icon: '☼' },
  Arcane: { color: '#c084fc', icon: '✧' },
  Nature: { color: '#86efac', icon: '♧' },
  Blood: { color: '#f87171', icon: '♦' },
  Metallic: { color: '#cbd5e1', icon: '⬡' },
  Chaos: { color: '#fb7185', icon: '✹' },
  Dragon: { color: '#fb923c', icon: '🐉' },
  Slime: { color: '#a3e635', icon: '●' },
  Eye: { color: '#38bdf8', icon: '◉' },
  Orb: { color: '#818cf8', icon: '◎' },
  Sorcery: { color: '#e2e8f0', icon: '⚡' },
  Conjuration: { color: '#4ade80', icon: '♙' },
  Enchantment: { color: '#f0abfc', icon: '✦' },
  Translocation: { color: '#67e8f9', icon: '⇄' },
  Ritual: { color: '#fcd34d', icon: '❂' },
  Word: { color: '#fda4af', icon: '❖' },
};

export const SHRINE_TYPES = ['transmutation', 'duplication', 'empowerment', 'chronomancy', 'calling', 'haste', 'offering', 'knowledge', 'reformation', 'spellgraft'];

export const GAME_MODES = {
  standard: { id: 'standard', finalRealm: 100, potions: true, allowedTags: null, enemyHpMult: 1, startPoints: 12, starterRw3: [101, 61, 95] },
  rw3: { id: 'rw3', finalRealm: 21, potions: false, allowedTags: null, enemyHpMult: 1, startPoints: 14, starterRw3: [101, 61] },
  'trial-pyromancer': { id: 'trial-pyromancer', finalRealm: 21, potions: false, allowedTags: ['Fire'], enemyHpMult: 1, startPoints: 14, starterRw3: [61] },
  'trial-necromancer': { id: 'trial-necromancer', finalRealm: 21, potions: false, allowedTags: ['Dark', 'Blood'], enemyHpMult: 1, startPoints: 14, starterRw3: [29] },
  'trial-stormcaller': { id: 'trial-stormcaller', finalRealm: 21, potions: false, allowedTags: ['Lightning', 'Ice'], enemyHpMult: 1, startPoints: 14, starterRw3: [95] },
  'trial-conjurer': { id: 'trial-conjurer', finalRealm: 21, potions: false, allowedTags: ['Conjuration'], enemyHpMult: 1, startPoints: 14, starterRw3: [184] },
  'trial-ironman': { id: 'trial-ironman', finalRealm: 21, potions: false, allowedTags: null, enemyHpMult: 1.5, startPoints: 16, starterRw3: [101] },
};

export const mancerTrials = {
  electromancer: ['Lightning', 95], cryomancer: ['Ice', 86], phytomancer: ['Nature', 122],
  manamancer: ['Arcane', 101], sanctumancer: ['Holy', 77], ferromancer: ['Metallic', 160],
  hemomancer: ['Blood', 10], chronomancer: ['Translocation', 8],
};
for (const [name, [tag, id]] of Object.entries(mancerTrials)) {
  const mode = 'trial-' + name;
  GAME_MODES[mode] = { ...GAME_MODES.rw3, id: mode, allowedTags: [tag], starterRw3: [id] };
}
for (const mode of ['weekly', 'custom', 'mutated', 'trial-scavenger', 'trial-improviser']) GAME_MODES[mode] = { ...GAME_MODES.rw3, id: mode };

export const STATUS_LIST = [
  'burn', 'immolate', 'poison', 'bleed', 'freeze', 'stun', 'petrify', 'glassed',
  'blind', 'fear', 'berserk', 'silence', 'soaked', 'acidified', 'immobilized', 'regeneration', 'shock',
];

export const CLOUD_TYPES = {
  fire: { name: 'Fire Cloud', color: '#f97316', damageType: 'Fire', damage: 5 },
  storm: { name: 'Storm Cloud', color: '#facc15', damageType: 'Lightning', damage: 6 },
  blizzard: { name: 'Blizzard', color: '#7dd3fc', damageType: 'Ice', damage: 4, status: 'freeze', statusDuration: 1 },
  rain: { name: 'Rain Cloud', color: '#60a5fa', damageType: null, damage: 0, status: 'soaked', statusDuration: 2 },
  poison: { name: 'Poison Cloud', color: '#84cc16', damageType: 'Poison', damage: 4, status: 'poison', statusDuration: 3 },
  web: { name: 'Web', color: '#cbd5e1', damageType: null, damage: 0, status: 'immobilized', statusDuration: 1 },
};

export function getModeConfig(mode) {
  return Object.hasOwn(GAME_MODES, mode) ? GAME_MODES[mode] : GAME_MODES.standard;
}

// Each tag on a component supplies one essence. Specific recipe slots have
// priority, then unused essences of any type can fill the wildcard slots.
export function recipeMatches(item, componentNames) {
  if (!item || !Array.isArray(componentNames) || componentNames.length > item.recipe_cost) return false;
  const counts = new Map();
  let total = 0;
  for (const name of componentNames) {
    const component = componentByName.get(name);
    if (!component) return false;
    for (const tag of component.tags) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
      total++;
    }
  }
  return total >= item.recipe_cost && item.recipe.every(([tag, n]) => tag === 'Any' || (counts.get(tag) || 0) >= n);
}

export function findMatchingComponents(inventory, item) {
  if (!item || !Array.isArray(inventory)) return null;
  const needed = new Map(item.recipe.filter(([tag]) => tag !== 'Any'));
  const pool = new Map();
  for (const name of inventory) if (componentByName.has(name)) pool.set(name, (pool.get(name) || 0) + 1);
  const chosen = [];
  let essences = 0;
  while (needed.size || essences < item.recipe_cost) {
    let best, bestScore = 0;
    for (const name of pool.keys()) {
      const { tags } = componentByName.get(name);
      const matching = tags.filter(tag => needed.has(tag)).length;
      if (needed.size && !matching) continue;
      const score = matching * 100 + Math.min(tags.length, Math.max(0, item.recipe_cost - essences));
      if (score > bestScore) { best = name; bestScore = score; }
    }
    if (!best) return null;
    chosen.push(best);
    if (pool.get(best) === 1) pool.delete(best);
    else pool.set(best, pool.get(best) - 1);
    for (const tag of componentByName.get(best).tags) {
      essences++;
      if (needed.get(tag) === 1) needed.delete(tag);
      else if (needed.has(tag)) needed.set(tag, needed.get(tag) - 1);
    }
  }
  return chosen;
}

export function canForge(game, name, componentNames) {
  const item = equipmentByName.get(name);
  if (game.allowedEquipment && !game.allowedEquipment.includes(name)) return false;
  const chosen = componentNames || findMatchingComponents(game.rw3Components || [], item);
  if (!chosen) return false;
  return game.status === 'playing' && !!item && recipeMatches(item, chosen)
    && chosen.every(c => (game.rw3Components || []).filter(value => value === c).length >= chosen.filter(value => value === c).length);
}

export function forge(game, name, componentNames) {
  const item = equipmentByName.get(name);
  const chosen = componentNames || findMatchingComponents(game.rw3Components || [], item);
  if (!chosen || !canForge(game, name, chosen)) return false;
  for (const c of chosen) game.rw3Components.splice(game.rw3Components.indexOf(c), 1);
  const copy = equipItem(game, item, chosen);
  applyComponentCraftEffects(game, item, chosen, copy);
  return item;
}

export function equipItem(game, item, components = []) {
  const gear = game.equipment ??= {};
  let key = item.slot;
  if (game.mode !== 'standard') {
    let i = 1;
    while (Object.hasOwn(gear, key)) key = item.slot + '-' + (++i);
  }
  return gear[key] = { name: item.name, components: [...components] };
}

export function applyComponentCraftEffects(game, item, componentNames, copy = game.equipment[item.slot]) {
  const events = [];
  let offset = 0;
  function choose(list) {
    if (!list.length) return null;
    return list[Math.abs(game.seed + game.turn * 97 + game.realm * 13 + offset++) % list.length];
  }
  for (const name of componentNames) {
    const returned = name === "Enchanter's Awl" && item.tags.includes('Enchantment')
      || name === "Polymath's Palimpsest" && item.recipe.some(([tag]) => tag === 'Word');
    if (returned) {
      game.rw3Components.push(name);
      events.push({ type: 'returned', component: name });
    }
    const spells = knownSpellIds(game).map(id => spellById.get(id));
    if (name === 'Primordial Ooze' && item.tags.includes('Slime')) {
      const spell = choose(spells.filter(s => !effectiveRw3Spell(game, s.id).tags.includes('Slime')));
      if (spell) ((game.spellBoosts['rw3-' + spell.id] ??= {}).tags ??= []).push('Slime');
    }
    if (name === 'Charred Relic' && item.tags.includes('Holy')) {
      const spell = choose(spells.filter(s => effectiveRw3Spell(game, s.id).tags.includes('Holy')));
      if (spell) (copy.relicSpells ??= []).push(spell.id);
    }
    if (name === 'Chimera Eyes' && item.tags.some(t => ['Chaos', 'Eye'].includes(t))) {
      let granted = false;
      for (const spell of spells.filter(s => effectiveRw3Spell(game, s.id).tags.includes('Eye'))) {
        const known = game.rw3Upgrades[spell.id] ??= [];
        const u = choose(spell.upgrades.filter(u => !known.includes(u.sp_id)));
        if (u) { known.push(u.sp_id); granted = true; }
      }
      if (granted) {
        const stored = copy.components;
        stored.splice(stored.indexOf(name), 1);
      }
    }
  }
  return events;
}

export { applyComponentPickupEffects } from './engine.js';

export function addComponent(game, name) {
  if (!componentByName.has(name)) return false;
  game.rw3Components ??= []; game.rw3Components.push(name); return true;
}

export function catalogueCounts() { return { spells: rw3Spells.length, equipment: rw3Equipment.length, components: rw3Components.length }; }

// Parse equipment bonus lines like:
// "[Arcane:arcane] spells and equipment gain [6 Damage:damage]"
// "All spells gain [1 Range:range]"
export function parseBonusLine(line) {
  const tagMatch = line.match(/\[(\w+):\w+\]\s+spells/i);
  const statMatch = line.match(/gain\s+\[(-?\d+)(%?)\s+[^:\]]+:(\w+)\]/i);
  if (!statMatch) return null;
  return {
    tag: tagMatch ? tagMatch[1] : null,
    stat: statMatch[3], percent: !!statMatch[2],
    amount: Number(statMatch[1]),
  };
}

export function getEquippedItems(game) {
  const eq = game.equipment || {};
  return Object.values(eq).map(copy => equipmentByName.get(copy.name)).filter(Boolean);
}

export function getEquipmentModifiers(game) {
  const mods = {
    bonuses: [],
    quickstep: false,
    channelMove: false,
    flying: false,
    quickcastTags: new Set(),
    onCastShieldTags: new Set(),
    resistances: {},
    turnEffects: [],
    onCastEffects: [],
  };
  for (const copy of Object.values(game.equipment || {})) {
    const item = equipmentByName.get(copy.name);
    if (!item) continue;
    const ingredients = copy.components;
    const modifiers = [];
    for (const spellId of copy.relicSpells || []) {
      for (const stat of Object.keys(spellById.get(spellId).stats)) modifiers.push({ spellId, stat, amount: 1 });
    }
    for (const line of item.bonuses || []) {
      const parsed = parseBonusLine(line);
      if (parsed) modifiers.push(parsed);
      const res = line.match(/^(-?\d+)% Resist (\w+)$/);
      if (res) mods.resistances[res[2]] = (mods.resistances[res[2]] || 0) + Number(res[1]);
    }
    for (const c of ingredients) {
      if (c === 'Journeystone' && item.tags.includes('Translocation')) for (const stat of ['range', 'max_charges']) modifiers.push({ tag: 'Translocation', stat, amount: 6 });
      if (c === 'Flame Blade Fragment' || c === 'Amaranthine Petal') for (const tag of item.tags) modifiers.push({ tag, stat: c === 'Flame Blade Fragment' ? 'damage' : 'duration', amount: c === 'Flame Blade Fragment' ? 3 : 1 });
      if (c === 'Ironbark Plate' && item.tags.some(tag => ['Nature', 'Metallic'].includes(tag))) for (const t of ['Physical', 'Poison']) mods.resistances[t] = (mods.resistances[t] || 0) + 25;
      if (c === 'Dragon Ambrosia' && item.tags.includes('Dragon')) modifiers.push({ tag: 'Dragon', stat: 'max_charges', amount: knownSpellIds(game).filter(id => spellById.get(id).tags.includes('Dragon')).length });
    }
    if (ingredients.includes('Chaos Seed') && item.tags.includes('Nature')) modifiers.push(...modifiers.filter(m => m.tag === 'Nature').map(m => ({ ...m, tag: 'Chaos' })));
    if (ingredients.includes("Warlord's Skull")) for (const m of modifiers) m.stat = ({ damage: 'minion_damage', range: 'minion_range', duration: 'minion_duration', num_targets: 'num_summons' })[m.stat] || m.stat;
    mods.bonuses.push(...modifiers);
    const desc = item.desc || '';
    if (item.name === 'Quickstep Boots') mods.quickstep = true;
    if (/move while channeling|Channel Boots/i.test(desc) || /Channel Boots/i.test(item.name)) mods.channelMove = true;
    if (/flying|Winged/i.test(item.name) || /gain flying/i.test(desc)) mods.flying = true;
    const qcMatch = desc.match(/cast (?:an? )?\[(\w+)\] spell without ending/i);
    if (qcMatch) mods.quickcastTags.add(qcMatch[1]);
    if (/Talking Hat/i.test(item.name)) mods.quickcastTags.add('Enchantment');
    const shieldCastMatch = desc.match(/When you manually cast an? \[(\w+)\] spell, gain \[(\d+) SH:shields\]/i);
    if (shieldCastMatch) mods.onCastShieldTags.add({ tag: shieldCastMatch[1], amount: Number(shieldCastMatch[2]) });
    const resMatch = desc.match(/(\d+)% \[(\w+)\] resist/i);
    if (resMatch) mods.resistances[resMatch[2]] = (mods.resistances[resMatch[2]] || 0) + Number(resMatch[1]);
    if (/Each turn, a random enemy is acidified/i.test(desc)) mods.turnEffects.push({ type: 'acidify_random' });

  }
  // Check active buffs for flying/quickstep/resistances
  for (const buff of game.buffs || []) {
    if (buff.type === 'bonus') mods.bonuses.push(buff);
    if (buff.flying) mods.flying = true;
    if (buff.quickstep) mods.quickstep = true;
    if (buff.type === 'resist' && buff.damageType) {
      mods.resistances[buff.damageType] = (mods.resistances[buff.damageType] || 0) + buff.amount;
    }
  }
  return mods;
}

export function getUnitResistance(unit, damageType, game = null) {
  let res = unit?.resistances?.[damageType] || 0;
  if (game && unit === game.player) {
    const mods = getEquipmentModifiers(game);
    res += mods.resistances[damageType] || 0;
    if (game.mutators?.includes('vulnerability') && damageType === 'Physical') res -= 50;
  }
  if (unit?.temporaryResistance?.tag === damageType) res += unit.temporaryResistance.amount;
  if (unit?.vulnerable === damageType) res -= 100;
  const st = unit?.statuses || {};
  res -= unit?.slimeRust || 0;
  if (damageType === 'Arcane') res -= 100 * (unit?.conductivity?.length || 0);
  if (st.soaked > 0) {
    if (damageType === 'Lightning' || damageType === 'Ice') res -= 100;
    if (damageType === 'Fire') res += 50;
  }
  if (st.twilight && ['Dark', 'Holy'].includes(damageType)) res -= 50;
  if (st.pyrostatic && ['Fire', 'Lightning'].includes(damageType)) res -= 50;
  if (st.ironize && ['Fire', 'Lightning', 'Physical'].includes(damageType)) res += 50;
  if (st.acidified > 0 && damageType === 'Poison') res -= 100;
  if (st.glassed > 0) res -= 100;
  if (st.petrify > 0 && damageType === 'Physical') res += 50;
  if (st.armor_melted > 0 && damageType === 'Physical') res -= 100;
  if (unit?.name === 'Bafflement, Demon King') res = Math.abs(res);
  return Math.max(-100, Math.min(100, res));
}

export function computeElementalDamage(baseAmount, damageType, target, pierce = 0, game = null) {
  if (baseAmount <= 0) return 0;
  const rawRes = getUnitResistance(target, damageType, game);
  const effectiveRes = rawRes > 0 ? Math.max(0, rawRes - pierce * 15) : rawRes;
  if (effectiveRes >= 100) return 0;
  const scaled = Math.round(baseAmount * (1 - effectiveRes / 100));
  return Math.max(1, scaled);
}

// Parse spell upgrade modifications from its description.
export function parseUpgradeEffects(upgrade) {
  const desc = upgrade.desc || '';
  const mods = { stats: {}, addTags: [], addDamageTypes: [], quickCast: false, noLos: false, status: null, statusDuration: 0 };
  for (const m of desc.matchAll(/gains \[(-?\d+)\s+[^:\]]+:(\w+)\]/gi)) {
    const val = Number(m[1]), stat = m[2];
    if (stat === 'requires_los' && val < 0) mods.noLos = true;
    else mods.stats[stat] = (mods.stats[stat] || 0) + val;
  }
  for (const m of desc.matchAll(/Adds (?:the )?\[(\w+)(?::\w+)?\] tag/gi)) mods.addTags.push(m[1]);
  for (const m of desc.matchAll(/also deals \[(\w+)\](?: and \[(\w+)\])? damage/gi)) {
    mods.addDamageTypes.push(m[1]);
    if (m[2]) mods.addDamageTypes.push(m[2]);
  }
  if (/quickcast/i.test(desc)) mods.quickCast = true;
  if (/\[bleed\]/i.test(desc)) mods.status = 'bleed';
  else if (/\[stunned?\]|\[stun\]/i.test(desc)) mods.status = 'stun';
  else if (/\[freezes?\]|\[frozen\]/i.test(desc)) mods.status = 'freeze';
  else if (/\[poisons?\]|\[poisoned\]/i.test(desc)) mods.status = 'poison';
  else if (/\[blinds?\]/i.test(desc)) mods.status = 'blind';
  else if (/\[feared?\]|\[fear\]/i.test(desc)) mods.status = 'fear';
  else if (/\[silence\]/i.test(desc)) mods.status = 'silence';
  else if (/\[glassed\]/i.test(desc)) mods.status = 'glassed';
  else if (/\[Acidified/i.test(desc)) mods.status = 'acidified';
  return mods;
}

export function knownSpellIds(game) {
  const items = new Set(getEquippedItems(game).map(item => item.name));
  return [...new Set([...(game.rw3Spells || []).filter(id => !spellById.get(id)?.granted_by),
    ...rw3Spells.filter(spell => items.has(spell.granted_by)).map(spell => spell.id)])];
}

export function transmutationChoices(name) {
  const source = componentByName.get(name);
  return source ? rw3Components.filter(c => c.name !== name && c.tags.some(tag => source.tags.includes(tag))) : [];
}

export function canLearnRw3Spell(game, spellId) {
  const spell = spellById.get(spellId);
  if (!spell || game.status !== 'playing') return false;
  if (game.allowedSpells && !game.allowedSpells.includes(spellId)) return false;
  if (spell.granted_by || game.mode === 'trial-scavenger') return false;
  if ((game.rw3Spells || []).includes(spellId)) return false;
  const mode = getModeConfig(game.mode);
  if (mode.allowedTags && !spell.tags.some(t => mode.allowedTags.includes(t))) return false;
  return game.points >= spell.level;
}

export function canLearnRw3Upgrade(game, spellId, spId) {
  const spell = spellById.get(spellId);
  if (!spell || game.status !== 'playing') return false;
  if (!knownSpellIds(game).includes(spellId)) return false;
  const upgrade = (spell.upgrades || []).find(u => u.sp_id === spId);
  if (!upgrade) return false;
  if ((game.rw3Upgrades?.[spellId] || []).includes(spId)) return false;
  return game.points >= upgrade.level;
}

export function classifyRw3SpellBehavior(spell, tags) {
  const desc = (spell.desc || '').toLowerCase();
  if (['Black Hole', 'Dispersion Field', 'Lightning Form', 'Flame Gate', 'Slime Form', 'Ride Drake'].includes(spell.name)) return 'special';
  if (spell.tags.includes('Orb') && desc.startsWith('summon an orb')) return 'orb';
  if (spell.name === 'Healing Light') return 'heal_allies';
  if (['Magic Missile', 'Dominate', 'Death Bolt', 'Lifedrain', 'Shatter', 'Death Clock', 'Word of Beauty', 'Word of Ice', 'Word of Madness', 'Word of Chaos', 'Word of Undeath', 'Death Shock', 'Lumbriogenesis'].includes(spell.name)) return 'special';
  if (tags.includes('Translocation') && /teleport|swap|blink|ride drake|mounted/i.test(desc)) {
    if (/mount|ride drake/i.test(desc)) return 'self_buff';
    if (/teleport all units/i.test(desc)) return 'disperse';
    return 'teleport';
  }
  if (tags.includes('Conjuration') && (spell.stats?.minion_health || /summon/i.test(desc))) return 'summon';
  if (/create \[.*clouds?:/i.test(desc) || /blizzard|rain clouds|storm clouds|fire clouds/i.test(desc)) return 'cloud';
  if (/in a beam|in a line/i.test(desc)) return 'beam';
  if (/in a cone|in an arc/i.test(desc)) return 'cone';
  if (/bounces? up to|chain/i.test(desc)) return 'chain';
  if (tags.includes('Enchantment') && !spell.stats?.range) return 'self_buff';
  if (/heal allies/i.test(desc) && !spell.stats?.range) return 'heal_allies';
  if (spell.stats?.radius > 0) return 'burst';
  return 'single';
}

export function effectiveRw3Spell(game, spellId) {
  const base = spellById.get(spellId);
  if (!base) return null;
  const stats = {
    ...base.stats,
    range: base.stats?.range ?? 0,
    max_charges: base.stats?.max_charges ?? 0,
    hp_cost: base.stats?.hp_cost ?? 0,
    damage: base.stats?.damage ?? 0,
    radius: base.stats?.radius ?? 0,
    duration: base.stats?.duration ?? 0,
    shields: base.stats?.shields ?? 0,
    num_targets: base.stats?.num_targets ?? 0,
    num_summons: base.stats?.num_summons ?? 0,
    minion_health: base.stats?.minion_health ?? 0,
    minion_damage: base.stats?.minion_damage ?? 0,
    minion_duration: base.stats?.minion_duration ?? 0,
    minion_range: base.stats?.minion_range ?? 1,
    max_channel: base.stats?.max_channel ?? 0,
    shot_cooldown: base.stats?.shot_cooldown ?? 0,
  };
  const tags = [...new Set([...base.tags, ...(game.spellBoosts?.[`rw3-${spellId}`]?.tags || [])])];
  const damageTypes = [...(base.damage_type || [])];
  let quickCast = !!base.quick_cast;
  let requiresLos = base.requires_los !== false;
  if (game.buffs?.some(b => b.noLos)) requiresLos = false;
  const extraStatuses = [];
  const learnedUpgrades = game.rw3Upgrades?.[spellId] || [];

  for (const spId of learnedUpgrades) {
    const up = (base.upgrades || []).find(u => u.sp_id === spId);
    if (!up) continue;
    const parsed = parseUpgradeEffects(up);
    for (const [k, v] of Object.entries(parsed.stats)) {
      if (k in stats) stats[k] = Math.max(0, stats[k] + v);
    }
    for (const t of parsed.addTags) if (!tags.includes(t)) tags.push(t);
    for (const dt of parsed.addDamageTypes) if (!damageTypes.includes(dt)) damageTypes.push(dt);
    if (parsed.quickCast) quickCast = true;
    if (parsed.noLos) requiresLos = false;
    if (parsed.status) extraStatuses.push(parsed.status);
  }

  // Apply RW3 equipment bonuses matching any of this spell's tags
  const mods = getEquipmentModifiers(game);
  const percentages = {};
  for (const bonus of mods.bonuses) {
    if ((bonus.tag && !tags.includes(bonus.tag)) || (bonus.spellId && bonus.spellId !== spellId)) continue;
    if (!stats[bonus.stat] && !Object.hasOwn(base.stats, bonus.stat)) continue;
    if (bonus.percent) percentages[bonus.stat] = (percentages[bonus.stat] || 0) + bonus.amount;
    else stats[bonus.stat] += bonus.amount;
  }
  for (const [stat, percent] of Object.entries(percentages)) stats[stat] = Math.max(0, Math.floor(stats[stat] * (1 + percent / 100)));
  if (game.buffs?.some(b => b.quickcastAll)) quickCast = true;
  for (const tag of tags) if (mods.quickcastTags.has(tag)) quickCast = true;

  // Apply Shrine of Empowerment permanent spell boosts
  const boost = game.spellBoosts?.[`rw3-${spellId}`];
  if (boost) {
    if (boost.quickCast) quickCast = true;
    if (boost.voidMutations) for (const k of ['minion_health', 'minion_damage', 'minion_range']) stats[k] = Math.floor(stats[k] * (1 + boost.voidMutations / 100));
    if (boost.range && stats.range) stats.range += boost.range;
    if (boost.damage && stats.damage > 0) stats.damage += boost.damage;
    if (boost.minion_damage && stats.minion_damage > 0) stats.minion_damage += boost.minion_damage;
    if (boost.max_charges && stats.max_charges > 0) stats.max_charges += boost.max_charges;
  }

  if (stats.damage > 0 && game.mutators?.includes('damageDebuff')) stats.damage = Math.max(1, Math.floor(stats.damage * 0.75));
  if (base.name === 'Lumbriogenesis' && base.upgrades.some(up => up.name === 'Worm Host' && learnedUpgrades.includes(up.sp_id))) stats.max_charges = 0;
  const primaryTag = tags[0] || 'Arcane';
  const meta = TAG_META[primaryTag] || TAG_META.Arcane;
  const behavior = classifyRw3SpellBehavior(base, base.tags);

  return {
    id: `rw3-${base.id}`,
    rw3Id: base.id,
    isRw3: true,
    name: base.name,
    level: base.level,
    tags,
    damageTypes: damageTypes.length ? damageTypes : ['Arcane'],
    stats,
    damage: stats.damage,
    range: stats.range,
    radius: stats.radius,
    maxCharges: stats.max_charges,
    hpCost: stats.hp_cost,
    duration: stats.duration,
    maxChannel: stats.max_channel,
    quickCast,
    requiresLos,
    melee: !!base.melee,
    behavior,
    extraStatuses,
    desc: base.desc,
    upgrades: base.upgrades || [],
    learnedUpgrades,
    upgradeNames: base.upgrades.filter(up => learnedUpgrades.includes(up.sp_id)).map(up => up.name),
    summons: base.summons || [],
    color: meta.color,
    icon: meta.icon,
  };
}

export function craftableEquipment(game) {
  const inv = game.rw3Components || [];
  return rw3Equipment.filter(item => (!game.allowedEquipment || game.allowedEquipment.includes(item.name)) && !!findMatchingComponents(inv, item));
}

export { rw3Components, rw3Equipment, rw3Spells, rw3Tags };
