import { components, equipment, spells, tags } from '../data/catalog.js';
import {
  equipmentSlots, DAMAGE_TYPES, TAG_META, SHRINE_TYPES, GAME_MODES,
  mancerTrials, STATUS_LIST, CLOUD_TYPES, getModeConfig,
} from '../data/constants.js';

export {
  equipmentSlots, DAMAGE_TYPES, TAG_META, SHRINE_TYPES, GAME_MODES,
  mancerTrials, STATUS_LIST, CLOUD_TYPES, getModeConfig,
  components, equipment, spells, tags,
};

export const componentByName = new Map(components.map(component => [component.name, component]));
export const equipmentByName = new Map(equipment.map(item => [item.name, item]));
export const spellById = new Map(spells.map(spell => [spell.id, spell]));
export const spellByName = new Map(spells.map(spell => [spell.name, spell]));

// Pre-index spellbooks (granted_by -> spell ids) to avoid scanning all 198 spells on every knownSpellIds() call.
const spellsByBook = new Map();
for (const spell of spells) {
  if (spell.granted_by) {
    let list = spellsByBook.get(spell.granted_by);
    if (!list) { list = []; spellsByBook.set(spell.granted_by, list); }
    list.push(spell.id);
  }
}

// Pre-index upgrades per spell for O(1) lookups by sp_id or name.
const upgradesByIdCache = new WeakMap();
const upgradeIdByNameCache = new WeakMap();
function getUpgradeMap(spell) {
  let map = upgradesByIdCache.get(spell);
  if (!map) {
    map = new Map();
    const byName = new Map();
    for (const u of spell.upgrades || []) {
      map.set(u.sp_id, u);
      byName.set(u.name, u.sp_id);
    }
    upgradesByIdCache.set(spell, map);
    upgradeIdByNameCache.set(spell, byName);
  }
  return map;
}

export function getSpellUpgradeId(spell, upgradeName) {
  if (!spell) return null;
  getUpgradeMap(spell);
  return upgradeIdByNameCache.get(spell)?.get(upgradeName) ?? null;
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
  const needed = new Map();
  for (const [tag, count] of item.recipe) {
    if (tag !== 'Any') needed.set(tag, count);
  }
  const pool = new Map();
  for (const name of inventory) {
    if (componentByName.has(name)) pool.set(name, (pool.get(name) || 0) + 1);
  }
  const chosen = [];
  let essences = 0;
  while (needed.size || essences < item.recipe_cost) {
    let best = null;
    let bestScore = 0;
    const remaining = Math.max(0, item.recipe_cost - essences);
    for (const name of pool.keys()) {
      const { tags } = componentByName.get(name);
      let matching = 0;
      for (let i = 0; i < tags.length; i++) if (needed.has(tags[i])) matching++;
      if (needed.size && !matching) continue;
      const score = matching * 100 + Math.min(tags.length, remaining);
      if (score > bestScore) { best = name; bestScore = score; }
    }
    if (!best) return null;
    chosen.push(best);
    const left = pool.get(best);
    if (left === 1) pool.delete(best);
    else pool.set(best, left - 1);
    for (const tag of componentByName.get(best).tags) {
      essences++;
      const req = needed.get(tag);
      if (req === 1) needed.delete(tag);
      else if (req > 1) needed.set(tag, req - 1);
    }
  }
  return chosen;
}

export function canForge(game, name, componentNames) {
  const item = equipmentByName.get(name);
  if (!item || game.status !== 'playing') return false;
  if (game.allowedEquipment && !game.allowedEquipment.includes(name)) return false;
  const inv = game.components || [];
  const chosen = componentNames || findMatchingComponents(inv, item);
  if (!chosen || !recipeMatches(item, chosen)) return false;

  const invCounts = new Map();
  for (const c of inv) invCounts.set(c, (invCounts.get(c) || 0) + 1);
  for (const c of chosen) {
    const count = invCounts.get(c) || 0;
    if (count <= 0) return false;
    invCounts.set(c, count - 1);
  }
  return true;
}

export function forge(game, name, componentNames) {
  const item = equipmentByName.get(name);
  const chosen = componentNames || findMatchingComponents(game.components || [], item);
  if (!chosen || !canForge(game, name, chosen)) return false;
  for (const c of chosen) game.components.splice(game.components.indexOf(c), 1);
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
    const returned = (name === "Enchanter's Awl" && item.tags.includes('Enchantment'))
      || (name === "Polymath's Palimpsest" && item.recipe.some(([tag]) => tag === 'Word'));
    if (returned) {
      game.components.push(name);
      events.push({ type: 'returned', component: name });
    }
    const knownSpells = knownSpellIds(game).map(id => spellById.get(id));
    if (name === 'Primordial Ooze' && item.tags.includes('Slime')) {
      const spell = choose(knownSpells.filter(s => !effectiveSpell(game, s.id).tags.includes('Slime')));
      if (spell) ((game.spellBoosts['spell-' + spell.id] ??= {}).tags ??= []).push('Slime');
    }
    if (name === 'Charred Relic' && item.tags.includes('Holy')) {
      const spell = choose(knownSpells.filter(s => effectiveSpell(game, s.id).tags.includes('Holy')));
      if (spell) (copy.relicSpells ??= []).push(spell.id);
    }
    if (name === 'Chimera Eyes' && item.tags.some(t => t === 'Chaos' || t === 'Eye')) {
      let granted = false;
      for (const spell of knownSpells.filter(s => effectiveSpell(game, s.id).tags.includes('Eye'))) {
        const known = game.spellUpgrades[spell.id] ??= [];
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

export function addComponent(game, name) {
  if (!componentByName.has(name)) return false;
  game.components ??= [];
  game.components.push(name);
  return true;
}

export function catalogueCounts() {
  return { spells: spells.length, equipment: equipment.length, components: components.length };
}

// Parse equipment bonus lines like:
// "[Arcane:arcane] spells and equipment gain [6 Damage:damage]"
// "All spells gain [1 Range:range]"
export function parseBonusLine(line) {
  const tagMatch = line.match(/\[(\w+):\w+\]\s+spells/i);
  const statMatch = line.match(/gain\s+\[(-?\d+)(%?)\s+[^:\]]+:(\w+)\]/i);
  if (!statMatch) return null;
  return {
    tag: tagMatch ? tagMatch[1] : null,
    stat: statMatch[3],
    percent: !!statMatch[2],
    amount: Number(statMatch[1]),
  };
}

// Memoized static metadata per equipment item (regexes run once per catalog entry).
const equipmentStaticMetaCache = new WeakMap();
function getEquipmentStaticMeta(item) {
  let meta = equipmentStaticMetaCache.get(item);
  if (meta) return meta;
  const bonuses = [];
  const resistances = [];
  for (const line of item.bonuses || []) {
    const parsed = parseBonusLine(line);
    if (parsed) bonuses.push(parsed);
    const res = line.match(/^(-?\d+)% Resist (\w+)$/);
    if (res) resistances.push([res[2], Number(res[1])]);
  }
  const desc = item.desc || '';
  const quickcastTags = [];
  const qcMatch = desc.match(/cast (?:an? )?\[(\w+)\] spell without ending/i);
  if (qcMatch) quickcastTags.push(qcMatch[1]);
  if (/Talking Hat/i.test(item.name)) quickcastTags.push('Enchantment');

  const shieldCastMatch = desc.match(/When you manually cast an? \[(\w+)\] spell, gain \[(\d+) SH:shields\]/i);
  const onCastShield = shieldCastMatch ? { tag: shieldCastMatch[1], amount: Number(shieldCastMatch[2]) } : null;

  const resMatch = desc.match(/(\d+)% \[(\w+)\] resist/i);
  if (resMatch) resistances.push([resMatch[2], Number(resMatch[1])]);

  meta = {
    bonuses,
    resistances,
    quickstep: item.name === 'Quickstep Boots',
    channelMove: /move while channeling|Channel Boots/i.test(desc) || /Channel Boots/i.test(item.name),
    flying: /flying|Winged/i.test(item.name) || /gain flying/i.test(desc),
    quickcastTags,
    onCastShield,
    acidifyTurn: /Each turn, a random enemy is acidified/i.test(desc),
  };
  equipmentStaticMetaCache.set(item, meta);
  return meta;
}

export function getEquippedItems(game) {
  const eq = game.equipment || {};
  const result = [];
  for (const copy of Object.values(eq)) {
    const item = equipmentByName.get(copy.name);
    if (item) result.push(item);
  }
  return result;
}

const WARLORD_STAT_MAP = { damage: 'minion_damage', range: 'minion_range', duration: 'minion_duration', num_targets: 'num_summons' };

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
  const eqValues = Object.values(game.equipment || {});
  let dragonSpellCount = -1;

  for (const copy of eqValues) {
    const item = equipmentByName.get(copy.name);
    if (!item) continue;
    const staticMeta = getEquipmentStaticMeta(item);
    const ingredients = copy.components || [];
    const hasWarlord = ingredients.includes("Warlord's Skull");
    const hasChaosSeed = ingredients.includes('Chaos Seed') && item.tags.includes('Nature');
    const modifiers = hasWarlord ? staticMeta.bonuses.map(b => ({ ...b })) : [...staticMeta.bonuses];

    for (const [resType, amount] of staticMeta.resistances) {
      mods.resistances[resType] = (mods.resistances[resType] || 0) + amount;
    }
    for (const spellId of copy.relicSpells || []) {
      const sp = spellById.get(spellId);
      if (sp) {
        for (const stat of Object.keys(sp.stats)) modifiers.push({ spellId, stat, amount: 1 });
      }
    }
    for (const c of ingredients) {
      if (c === 'Journeystone' && item.tags.includes('Translocation')) {
        modifiers.push({ tag: 'Translocation', stat: 'range', amount: 6 }, { tag: 'Translocation', stat: 'max_charges', amount: 6 });
      } else if (c === 'Flame Blade Fragment' || c === 'Amaranthine Petal') {
        const stat = c === 'Flame Blade Fragment' ? 'damage' : 'duration';
        const amount = c === 'Flame Blade Fragment' ? 3 : 1;
        for (const tag of item.tags) modifiers.push({ tag, stat, amount });
      } else if (c === 'Ironbark Plate' && item.tags.some(tag => tag === 'Nature' || tag === 'Metallic')) {
        mods.resistances.Physical = (mods.resistances.Physical || 0) + 25;
        mods.resistances.Poison = (mods.resistances.Poison || 0) + 25;
      } else if (c === 'Dragon Ambrosia' && item.tags.includes('Dragon')) {
        if (dragonSpellCount < 0) {
          dragonSpellCount = knownSpellIds(game).filter(id => spellById.get(id)?.tags.includes('Dragon')).length;
        }
        modifiers.push({ tag: 'Dragon', stat: 'max_charges', amount: dragonSpellCount });
      }
    }
    if (hasChaosSeed) {
      const extra = [];
      for (const m of modifiers) if (m.tag === 'Nature') extra.push({ ...m, tag: 'Chaos' });
      modifiers.push(...extra);
    }
    if (hasWarlord) {
      for (const m of modifiers) m.stat = WARLORD_STAT_MAP[m.stat] || m.stat;
    }
    mods.bonuses.push(...modifiers);

    if (staticMeta.quickstep) mods.quickstep = true;
    if (staticMeta.channelMove) mods.channelMove = true;
    if (staticMeta.flying) mods.flying = true;
    for (const qt of staticMeta.quickcastTags) mods.quickcastTags.add(qt);
    if (staticMeta.onCastShield) mods.onCastShieldTags.add(staticMeta.onCastShield);
    if (staticMeta.acidifyTurn) mods.turnEffects.push({ type: 'acidify_random' });
  }

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
  if (st.twilight && (damageType === 'Dark' || damageType === 'Holy')) res -= 50;
  if (st.pyrostatic && (damageType === 'Fire' || damageType === 'Lightning')) res -= 50;
  if (st.ironize && (damageType === 'Fire' || damageType === 'Lightning' || damageType === 'Physical')) res += 50;
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

// Parse spell upgrade modifications from its description (cached per upgrade object).
const upgradeEffectsCache = new WeakMap();
export function parseUpgradeEffects(upgrade) {
  let cached = upgradeEffectsCache.get(upgrade);
  if (cached) return cached;
  const desc = upgrade.desc || '';
  const stats = {};
  const addTags = [];
  const addDamageTypes = [];
  let quickCast = false;
  let noLos = false;
  let status = null;

  for (const m of desc.matchAll(/gains \[(-?\d+)\s+[^:\]]+:(\w+)\]/gi)) {
    const val = Number(m[1]);
    const stat = m[2];
    if (stat === 'requires_los' && val < 0) noLos = true;
    else stats[stat] = (stats[stat] || 0) + val;
  }
  for (const m of desc.matchAll(/Adds (?:the )?\[(\w+)(?::\w+)?\] tag/gi)) addTags.push(m[1]);
  for (const m of desc.matchAll(/also deals \[(\w+)\](?: and \[(\w+)\])? damage/gi)) {
    addDamageTypes.push(m[1]);
    if (m[2]) addDamageTypes.push(m[2]);
  }
  if (/quickcast/i.test(desc)) quickCast = true;
  if (/\[bleed\]/i.test(desc)) status = 'bleed';
  else if (/\[stunned?\]|\[stun\]/i.test(desc)) status = 'stun';
  else if (/\[freezes?\]|\[frozen\]/i.test(desc)) status = 'freeze';
  else if (/\[poisons?\]|\[poisoned\]/i.test(desc)) status = 'poison';
  else if (/\[blinds?\]/i.test(desc)) status = 'blind';
  else if (/\[feared?\]|\[fear\]/i.test(desc)) status = 'fear';
  else if (/\[silence\]/i.test(desc)) status = 'silence';
  else if (/\[glassed\]/i.test(desc)) status = 'glassed';
  else if (/\[Acidified/i.test(desc)) status = 'acidified';

  cached = { stats, addTags, addDamageTypes, quickCast, noLos, status, statusDuration: 0 };
  upgradeEffectsCache.set(upgrade, cached);
  return cached;
}

export function knownSpellIds(game) {
  const seen = new Set();
  const result = [];
  for (const id of game.spells || []) {
    if (!seen.has(id) && !spellById.get(id)?.granted_by) {
      seen.add(id);
      result.push(id);
    }
  }
  for (const copy of Object.values(game.equipment || {})) {
    const granted = spellsByBook.get(copy.name);
    if (!granted) continue;
    for (const id of granted) {
      if (!seen.has(id)) {
        seen.add(id);
        result.push(id);
      }
    }
  }
  return result;
}

export function tagMastery(game, tag) {
  const mods = getEquipmentModifiers(game);
  let total = 0;
  for (const id of knownSpellIds(game)) {
    const spell = effectiveSpell(game, id, mods);
    if (spell && spell.tags.includes(tag)) total += spell.level;
  }
  return total;
}

const transmutationCache = new Map();
export function transmutationChoices(name) {
  if (transmutationCache.has(name)) return transmutationCache.get(name);
  const source = componentByName.get(name);
  const result = source ? components.filter(c => c.name !== name && c.tags.some(tag => source.tags.includes(tag))) : [];
  transmutationCache.set(name, result);
  return result;
}

export function canLearnSpell(game, spellId) {
  const spell = spellById.get(spellId);
  if (!spell || game.status !== 'playing') return false;
  if (game.allowedSpells && !game.allowedSpells.includes(spellId)) return false;
  if (spell.granted_by || game.mode === 'trial-scavenger') return false;
  if ((game.spells || []).includes(spellId)) return false;
  const mode = getModeConfig(game.mode);
  if (mode.allowedTags && !spell.tags.some(t => mode.allowedTags.includes(t))) return false;
  return game.points >= spell.level;
}

export function canLearnUpgrade(game, spellId, spId) {
  const spell = spellById.get(spellId);
  if (!spell || game.status !== 'playing') return false;
  if (!knownSpellIds(game).includes(spellId)) return false;
  const upgrade = getUpgradeMap(spell).get(spId);
  if (!upgrade) return false;
  if ((game.spellUpgrades?.[spellId] || []).includes(spId)) return false;
  return game.points >= upgrade.level;
}

const SPECIAL_SPELLS = new Set([
  'Black Hole', 'Dispersion Field', 'Lightning Form', 'Flame Gate', 'Slime Form', 'Ride Drake',
  'Magic Missile', 'Dominate', 'Death Bolt', 'Lifedrain', 'Shatter', 'Death Clock',
  'Word of Beauty', 'Word of Ice', 'Word of Madness', 'Word of Chaos', 'Word of Undeath',
  'Death Shock', 'Lumbriogenesis',
]);

const behaviorCache = new WeakMap();
export function classifySpellBehavior(spell, spellTags = spell.tags) {
  if (spellTags === spell.tags && behaviorCache.has(spell)) return behaviorCache.get(spell);
  const desc = (spell.desc || '').toLowerCase();
  let result;
  if (SPECIAL_SPELLS.has(spell.name)) result = 'special';
  else if (spell.tags.includes('Orb') && desc.startsWith('summon an orb')) result = 'orb';
  else if (spell.name === 'Healing Light') result = 'heal_allies';
  else if (spellTags.includes('Translocation') && /teleport|swap|blink|ride drake|mounted/i.test(desc)) {
    result = /mount|ride drake/i.test(desc) ? 'self_buff' : /teleport all units/i.test(desc) ? 'disperse' : 'teleport';
  } else if (spellTags.includes('Conjuration') && (spell.stats?.minion_health || /summon/i.test(desc))) result = 'summon';
  else if (/create \[.*clouds?:/i.test(desc) || /blizzard|rain clouds|storm clouds|fire clouds/i.test(desc)) result = 'cloud';
  else if (/in a beam|in a line/i.test(desc)) result = 'beam';
  else if (/in a cone|in an arc/i.test(desc)) result = 'cone';
  else if (/bounces? up to|chain/i.test(desc)) result = 'chain';
  else if (spellTags.includes('Enchantment') && !spell.stats?.range) result = 'self_buff';
  else if (/heal allies/i.test(desc) && !spell.stats?.range) result = 'heal_allies';
  else if (spell.stats?.radius > 0) result = 'burst';
  else result = 'single';

  if (spellTags === spell.tags) behaviorCache.set(spell, result);
  return result;
}

export function effectiveSpell(game, spellId, precomputedMods = null) {
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
  const boost = game.spellBoosts?.[`spell-${spellId}`];
  const spellTags = boost?.tags?.length ? [...new Set([...base.tags, ...boost.tags])] : [...base.tags];
  const damageTypes = [...(base.damage_type || [])];
  let quickCast = !!base.quick_cast;
  let requiresLos = base.requires_los !== false;
  if (game.buffs?.some(b => b.noLos)) requiresLos = false;
  const extraStatuses = [];
  const learnedUpgrades = game.spellUpgrades?.[spellId] || [];
  const upgradeMap = getUpgradeMap(base);
  const upgradeNames = [];

  for (const spId of learnedUpgrades) {
    const up = upgradeMap.get(spId);
    if (!up) continue;
    upgradeNames.push(up.name);
    const parsed = parseUpgradeEffects(up);
    for (const [k, v] of Object.entries(parsed.stats)) {
      if (k in stats) stats[k] = Math.max(0, stats[k] + v);
    }
    for (const t of parsed.addTags) if (!spellTags.includes(t)) spellTags.push(t);
    for (const dt of parsed.addDamageTypes) if (!damageTypes.includes(dt)) damageTypes.push(dt);
    if (parsed.quickCast) quickCast = true;
    if (parsed.noLos) requiresLos = false;
    if (parsed.status) extraStatuses.push(parsed.status);
  }

  // Apply equipment bonuses matching any of this spell's tags
  const mods = precomputedMods || getEquipmentModifiers(game);
  const percentages = {};
  for (const bonus of mods.bonuses) {
    if ((bonus.tag && !spellTags.includes(bonus.tag)) || (bonus.spellId && bonus.spellId !== spellId)) continue;
    if (!stats[bonus.stat] && !Object.hasOwn(base.stats, bonus.stat)) continue;
    if (bonus.percent) percentages[bonus.stat] = (percentages[bonus.stat] || 0) + bonus.amount;
    else stats[bonus.stat] += bonus.amount;
  }
  for (const [stat, percent] of Object.entries(percentages)) {
    stats[stat] = Math.max(0, Math.floor(stats[stat] * (1 + percent / 100)));
  }
  if (game.buffs?.some(b => b.quickcastAll)) quickCast = true;
  for (const tag of spellTags) if (mods.quickcastTags.has(tag)) quickCast = true;

  // Apply Shrine of Empowerment permanent spell boosts
  if (boost) {
    if (boost.quickCast) quickCast = true;
    if (boost.voidMutations) {
      for (const k of ['minion_health', 'minion_damage', 'minion_range']) {
        stats[k] = Math.floor(stats[k] * (1 + boost.voidMutations / 100));
      }
    }
    if (boost.range && stats.range) stats.range += boost.range;
    if (boost.damage && stats.damage > 0) stats.damage += boost.damage;
    if (boost.minion_damage && stats.minion_damage > 0) stats.minion_damage += boost.minion_damage;
    if (boost.max_charges && stats.max_charges > 0) stats.max_charges += boost.max_charges;
  }

  if (stats.damage > 0 && game.mutators?.includes('damageDebuff')) {
    stats.damage = Math.max(1, Math.floor(stats.damage * 0.75));
  }
  if (base.name === 'Blood Bullet') {
    const sniper = game.buffs?.find(b => b.type === 'sniper' && b.stacks > 0);
    if (sniper && upgradeNames.includes("Sniper's Trance")) {
      stats.range += sniper.stacks;
      stats.damage += 10 * sniper.stacks;
      requiresLos = false;
    }
  }
  if (base.name === 'Lumbriogenesis' && upgradeNames.includes('Worm Host')) {
    stats.max_charges = 0;
  }

  const primaryTag = spellTags[0] || 'Arcane';
  const meta = TAG_META[primaryTag] || TAG_META.Arcane;
  const behavior = classifySpellBehavior(base, base.tags);

  return {
    id: `spell-${base.id}`,
    spellId: base.id,
    name: base.name,
    level: base.level,
    tags: spellTags,
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
    upgradeNames,
    summons: base.summons || [],
    color: meta.color,
    icon: meta.icon,
  };
}

export function craftableEquipment(game) {
  const inv = game.components || [];
  if (!inv.length) return [];
  const allowed = game.allowedEquipment ? new Set(game.allowedEquipment) : null;
  return equipment.filter(item => (!allowed || allowed.has(item.name)) && !!findMatchingComponents(inv, item));
}
