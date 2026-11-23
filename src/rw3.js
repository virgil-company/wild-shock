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

export const SHRINE_TYPES = ['transmutation', 'duplication', 'empowerment', 'chronomancy', 'calling'];

export const GAME_MODES = {
  standard: { id: 'standard', finalRealm: 100, potions: true, allowedTags: null, enemyHpMult: 1, startPoints: 12, starterRw3: [101, 61, 95] },
  rw3: { id: 'rw3', finalRealm: 20, potions: false, allowedTags: null, enemyHpMult: 1, startPoints: 14, starterRw3: [101, 61] },
  'trial-pyromancer': { id: 'trial-pyromancer', finalRealm: 20, potions: false, allowedTags: ['Fire'], enemyHpMult: 1, startPoints: 14, starterRw3: [61] },
  'trial-necromancer': { id: 'trial-necromancer', finalRealm: 20, potions: false, allowedTags: ['Dark', 'Blood'], enemyHpMult: 1, startPoints: 14, starterRw3: [29] },
  'trial-stormcaller': { id: 'trial-stormcaller', finalRealm: 20, potions: false, allowedTags: ['Lightning', 'Ice'], enemyHpMult: 1, startPoints: 14, starterRw3: [95] },
  'trial-conjurer': { id: 'trial-conjurer', finalRealm: 20, potions: false, allowedTags: ['Conjuration'], enemyHpMult: 1, startPoints: 14, starterRw3: [184] },
  'trial-ironman': { id: 'trial-ironman', finalRealm: 20, potions: false, allowedTags: null, enemyHpMult: 1.5, startPoints: 16, starterRw3: [101] },
};

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
  return GAME_MODES[mode] || GAME_MODES.standard;
}

// The compendium's recipes are tag requirements. A component may satisfy one
// listed tag and a wildcard accepts any remaining component.
export function recipeMatches(item, componentNames) {
  if (!item || componentNames.length !== item.recipe_cost) return false;
  const pool = componentNames.map(name => componentByName.get(name)).filter(Boolean);
  if (pool.length !== componentNames.length) return false;
  const requirements = item.recipe.flatMap(([tag, count]) => Array(count).fill(tag));
  const used = new Set();
  function assign(index) {
    if (index === requirements.length) return true;
    const tag = requirements[index];
    for (let i = 0; i < pool.length; i++) if (!used.has(i) && (tag === 'Any' || pool[i].tags.includes(tag))) {
      used.add(i); if (assign(index + 1)) return true; used.delete(i);
    }
    return false;
  }
  return assign(0);
}

// Finds a valid subset of components in the player's inventory for a recipe.
export function findMatchingComponents(inventory, item) {
  if (!item || !Array.isArray(inventory) || inventory.length < item.recipe_cost) return null;
  const requirements = item.recipe
    .flatMap(([tag, count]) => Array(count).fill(tag))
    .sort((a, b) => (a === 'Any' ? 1 : 0) - (b === 'Any' ? 1 : 0));
  const pool = inventory.map(name => componentByName.get(name)).filter(Boolean);
  const used = new Set();
  const chosen = [];
  function assign(index) {
    if (index === requirements.length) return true;
    const tag = requirements[index];
    for (let i = 0; i < pool.length; i++) {
      if (!used.has(i) && (tag === 'Any' || pool[i].tags.includes(tag))) {
        used.add(i);
        chosen.push(pool[i].name);
        if (assign(index + 1)) return true;
        chosen.pop();
        used.delete(i);
      }
    }
    return false;
  }
  return assign(0) ? chosen : null;
}

export function canForge(game, name, componentNames) {
  const item = equipmentByName.get(name);
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
  game.equipment ??= {};
  game.equipment[item.slot] = { name: item.name, components: [...chosen] };
  applyComponentCraftEffects(game, item, chosen);
  return item;
}

export function applyComponentCraftEffects(game, item, componentNames) {
  const events = [];
  for (const name of componentNames) {
    const comp = componentByName.get(name);
    if (!comp?.on_craft || !comp.desc) continue;
    const desc = comp.desc;
    // Rare components that return to inventory when crafting a matching-tag item
    const returnMatch = desc.match(/If the crafted equipment has the \[(\w+)\] tag, this is returned/i);
    if (returnMatch && item.tags.includes(returnMatch[1])) {
      game.rw3Components.push(name);
      events.push({ type: 'returned', component: name });
    }
    const spMatch = desc.match(/Gain (\d+) SP/i);
    if (spMatch) {
      const sp = Number(spMatch[1]);
      game.points = (game.points || 0) + sp;
      events.push({ type: 'sp', amount: sp });
    }
    const shMatch = desc.match(/Gain (\d+) \[SH:shields\]/i);
    if (shMatch && game.player) {
      game.player.shields = (game.player.shields || 0) + Number(shMatch[1]);
      events.push({ type: 'shields', amount: Number(shMatch[1]) });
    }
  }
  return events;
}

export function applyComponentPickupEffects(game, name) {
  const comp = componentByName.get(name);
  if (!comp?.on_pickup || !comp.desc) return null;
  const desc = comp.desc;
  if (/Regain a charge of each of your spells/i.test(desc)) {
    for (const key of Object.keys(game.charges || {})) game.charges[key]++;
    return { type: 'recharge', amount: 1 };
  }
  const shMatch = desc.match(/Gain (\d+) \[SH:shields\]/i);
  if (shMatch && game.player) {
    const amount = Number(shMatch[1]);
    game.player.shields = (game.player.shields || 0) + amount;
    return { type: 'shields', amount };
  }
  const hpMatch = desc.match(/Gain (\d+) max HP/i);
  if (hpMatch && game.player) {
    const amount = Number(hpMatch[1]);
    game.bonusMaxHp = (game.bonusMaxHp || 0) + amount;
    game.player.hp += amount;
    return { type: 'maxHp', amount };
  }
  const spMatch = desc.match(/Gain (\d+) SP/i);
  if (spMatch) {
    const amount = Number(spMatch[1]);
    game.points = (game.points || 0) + amount;
    return { type: 'sp', amount };
  }
  const healMatch = desc.match(/Heal (?:for )?(\d+)/i);
  if (healMatch && game.player) {
    const amount = Number(healMatch[1]);
    game.player.hp += amount;
    return { type: 'heal', amount };
  }
  const auraMatch = desc.match(/damage aura that deals (\d+) \[(\w+)\] damage to enemies within (\d+) tiles for (\d+) turns/i);
  if (auraMatch) {
    game.buffs ??= [];
    game.buffs.push({
      id: `aura-${name}`,
      name,
      type: 'aura',
      damage: Number(auraMatch[1]),
      damageType: auraMatch[2],
      radius: Number(auraMatch[3]),
      duration: Number(auraMatch[4]),
    });
    return { type: 'aura', damage: Number(auraMatch[1]), damageType: auraMatch[2] };
  }
  const resistMatch = desc.match(/(\d+)% \[(\w+)\] resist/i);
  if (resistMatch) {
    game.buffs ??= [];
    game.buffs.push({
      id: `resist-${name}`,
      name,
      type: 'resist',
      damageType: resistMatch[2],
      amount: Number(resistMatch[1]),
      duration: 15,
    });
    return { type: 'resist', damageType: resistMatch[2], amount: Number(resistMatch[1]) };
  }
  // Fallback helpful pickup boon for other on_pickup components
  if (game.player) {
    game.player.shields = (game.player.shields || 0) + 1;
    return { type: 'shields', amount: 1 };
  }
  return null;
}

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
  const statMatch = line.match(/gain\s+\[(-?\d+)\s+[^:\]]+:(\w+)\]/i);
  if (!statMatch) return null;
  return {
    tag: tagMatch ? tagMatch[1] : null,
    stat: statMatch[2],
    amount: Number(statMatch[1]),
  };
}

export function getEquippedItems(game) {
  const eq = game.equipment || {};
  return equipmentSlots.map(slot => eq[slot]?.name ? equipmentByName.get(eq[slot].name) : null).filter(Boolean);
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
  for (const item of getEquippedItems(game)) {
    for (const line of item.bonuses || []) {
      const parsed = parseBonusLine(line);
      if (parsed) mods.bonuses.push(parsed);
    }
    const desc = item.desc || '';
    if (/quickstep|without ending your turn|step without/i.test(desc) || /Quickstep/i.test(item.name)) mods.quickstep = true;
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
    const eachTurnDmg = desc.match(/Each turn.*deals? \[(\d+):damage\] \[(\w+)\] damage/i);
    if (eachTurnDmg) mods.turnEffects.push({ type: 'damage_random', amount: Number(eachTurnDmg[1]), damageType: eachTurnDmg[2] });
  }
  // Check active buffs for flying/quickstep/resistances
  for (const buff of game.buffs || []) {
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
  }
  const st = unit?.statuses || {};
  if (st.soaked > 0) {
    if (damageType === 'Lightning' || damageType === 'Ice') res -= 100;
    if (damageType === 'Fire') res += 50;
  }
  if (st.acidified > 0 && damageType === 'Poison') res -= 100;
  if (st.glassed > 0) res -= 100;
  if (st.petrify > 0 && damageType === 'Physical') res += 50;
  if (st.armor_melted > 0 && damageType === 'Physical') res -= 100;
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

export function canLearnRw3Spell(game, spellId) {
  const spell = spellById.get(spellId);
  if (!spell || game.status !== 'playing') return false;
  if ((game.rw3Spells || []).includes(spellId)) return false;
  const mode = getModeConfig(game.mode);
  if (mode.allowedTags && !spell.tags.some(t => mode.allowedTags.includes(t))) return false;
  return game.points >= spell.level;
}

export function canLearnRw3Upgrade(game, spellId, spId) {
  const spell = spellById.get(spellId);
  if (!spell || game.status !== 'playing') return false;
  if (!(game.rw3Spells || []).includes(spellId)) return false;
  const upgrade = (spell.upgrades || []).find(u => u.sp_id === spId);
  if (!upgrade) return false;
  if ((game.rw3Upgrades?.[spellId] || []).includes(spId)) return false;
  return game.points >= upgrade.level;
}

export function classifyRw3SpellBehavior(spell, tags) {
  const desc = (spell.desc || '').toLowerCase();
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
    range: base.stats?.range ?? 0,
    max_charges: base.stats?.max_charges ?? 0,
    hp_cost: base.stats?.hp_cost ?? 0,
    damage: base.stats?.damage ?? 0,
    radius: base.stats?.radius ?? 0,
    duration: base.stats?.duration ?? 0,
    shields: base.stats?.shields ?? 0,
    num_targets: base.stats?.num_targets ?? 1,
    num_summons: base.stats?.num_summons ?? 1,
    minion_health: base.stats?.minion_health ?? 0,
    minion_damage: base.stats?.minion_damage ?? 0,
    minion_duration: base.stats?.minion_duration ?? 0,
    minion_range: base.stats?.minion_range ?? 1,
    max_channel: base.stats?.max_channel ?? 0,
    shot_cooldown: base.stats?.shot_cooldown ?? 0,
  };
  const tags = [...base.tags];
  const damageTypes = [...(base.damage_type || [])];
  let quickCast = !!base.quick_cast;
  let requiresLos = base.requires_los !== false;
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
  for (const bonus of mods.bonuses) {
    if (!bonus.tag || tags.includes(bonus.tag)) {
      if (bonus.stat in stats && (stats[bonus.stat] > 0 || ['damage', 'max_charges', 'range', 'shields'].includes(bonus.stat))) {
        stats[bonus.stat] = Math.max(0, stats[bonus.stat] + bonus.amount);
      }
    }
  }
  for (const tag of tags) if (mods.quickcastTags.has(tag)) quickCast = true;

  // Apply Shrine of Empowerment permanent spell boosts
  const boost = game.spellBoosts?.[`rw3-${spellId}`];
  if (boost) {
    if (boost.damage && stats.damage > 0) stats.damage += boost.damage;
    if (boost.minion_damage && stats.minion_damage > 0) stats.minion_damage += boost.minion_damage;
    if (boost.max_charges && stats.max_charges > 0) stats.max_charges += boost.max_charges;
  }

  const primaryTag = tags[0] || 'Arcane';
  const meta = TAG_META[primaryTag] || TAG_META.Arcane;
  const behavior = classifyRw3SpellBehavior(base, tags);

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
    color: meta.color,
    icon: meta.icon,
  };
}

export function craftableEquipment(game) {
  const inv = game.rw3Components || [];
  return rw3Equipment.filter(item => !!findMatchingComponents(inv, item));
}

export { rw3Components, rw3Equipment, rw3Spells, rw3Tags };
