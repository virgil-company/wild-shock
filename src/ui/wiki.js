import { rw3Components, rw3Equipment, rw3Spells, rw3Tags, rw3Units, wardrobe } from '../data/rw3-catalog.js';
import { artifacts } from '../data/artifacts.js';
import { mutators, outfitColor, vaults } from '../data/campaign.js';
import { CLOUD_TYPES, DAMAGE_TYPES, SHRINE_TYPES, equipmentSlots } from '../data/constants.js';
import { getUnitMeta, searchCatalogue, units } from '../data/bestiary.js';
import { craftableEquipment, knownSpellIds, spellByName } from '../rules/rw3.js';
import { componentName, equipmentName } from '../i18n/game-text.js';
import { t } from '../i18n/i18n.js';
import {
  TAG_COLORS, cloudIconSvg, componentIconSvg, entityIconSvg,
  shrineIconSvg, slotIconSvg, tagIconSvg, unitIconSvg,
} from './svg-icons.js';
import { cleanRw3Desc, escapeHtml, h } from './dom.js';

const PAGE_STEP = 48;

export const WIKI_CATEGORIES = [
  'monsters', 'bosses', 'companions', 'spells', 'equipment', 'items', 'world',
];

const ALL_UNIT_TAGS = [...new Set(rw3Units.flatMap(u => u.tags || []))].sort();
const SPELLS_BY_BOOK = new Map();
for (const spell of rw3Spells) {
  if (spell.granted_by) {
    let list = SPELLS_BY_BOOK.get(spell.granted_by);
    if (!list) { list = []; SPELLS_BY_BOOK.set(spell.granted_by, list); }
    list.push(spell);
  }
}

const REALM_PICKUPS = [
  { id: 'potion', kind: 'pickup', icon: 'potion', titleKey: 'pickup.potion', descKey: 'wiki.pickup.potionDesc' },
  { id: 'shard', kind: 'pickup', icon: 'shard', titleKey: 'pickup.shard', descKey: 'wiki.pickup.shardDesc' },
  { id: 'scroll', kind: 'pickup', icon: 'scroll', titleKey: 'pickup.scroll', descKey: 'wiki.pickup.scrollDesc' },
  { id: 'tome', kind: 'pickup', icon: 'tome', titleKey: 'pickup.tome', descKey: 'wiki.pickup.tomeDesc' },
  { id: 'chest', kind: 'pickup', icon: 'chest', titleKey: 'pickup.chest', descKey: 'wiki.pickup.chestDesc' },
  { id: 'companion', kind: 'pickup', icon: 'ally', titleKey: 'pickup.companion', descKey: 'wiki.pickup.companionDesc' },
];

const DATASETS = {
  monsters: rw3Units.filter(u => !u.is_boss && !u.is_companion),
  bosses: rw3Units.filter(u => u.is_boss),
  companions: rw3Units.filter(u => u.is_companion),
  spells: rw3Spells,
  equipment: rw3Equipment,
  items: [
    ...rw3Components.map(c => ({ kind: 'component', id: `comp:${c.name}`, data: c })),
    ...REALM_PICKUPS.map(p => ({ kind: 'pickup', id: `pickup:${p.id}`, data: p })),
    ...artifacts.map(a => ({ kind: 'artifact', id: `art:${a.id}`, data: a })),
  ],
  world: [
    ...SHRINE_TYPES.map(s => ({ kind: 'shrine', id: `shrine:${s}`, data: s })),
    ...Object.entries(CLOUD_TYPES).map(([id, def]) => ({ kind: 'cloud', id: `cloud:${id}`, data: { id, ...def } })),
    ...Object.entries(vaults).map(([name, guardians]) => ({ kind: 'vault', id: `vault:${name}`, data: { name, guardians } })),
    ...mutators.map(id => ({ kind: 'mutator', id: `mutator:${id}`, data: id })),
    ...wardrobe.map(w => ({ kind: 'outfit', id: `outfit:${w.name}`, data: w })),
  ],
};

export function getWikiDatasets() {
  return DATASETS;
}

export function totalWikiEntries() {
  return WIKI_CATEGORIES.reduce((sum, cat) => sum + DATASETS[cat].length, 0);
}

export function classifyUnitRole(unit) {
  if (unit.boss_kind === 'mordred') return 'boss_mordred';
  if (unit.boss_kind === 'final') return 'boss_final';
  if (unit.is_boss) return 'boss_special';
  if (unit.is_companion) return 'companion';
  if (unit.rare?.class === 'Easy') return 'elite_easy';
  if (unit.rare?.class === 'Medium') return 'elite_medium';
  if (unit.rare?.class === 'Hard') return 'elite_hard';
  if (unit.is_monster) return 'common';
  return 'summon';
}

export function splitResistances(resists = {}) {
  const immunities = [];
  const resistances = [];
  const weaknesses = [];
  for (const dt of DAMAGE_TYPES) {
    const val = resists[dt] || 0;
    if (!val) continue;
    if (val >= 100) immunities.push([dt, val]);
    else if (val > 0) resistances.push([dt, val]);
    else weaknesses.push([dt, val]);
  }
  return { immunities, resistances, weaknesses };
}

function defaultFiltersFor(category) {
  const base = { query: '', tag: 'all', sort: 'name' };
  if (category === 'monsters') return { ...base, role: 'all', weak: 'all', resist: 'all', trait: 'all' };
  if (category === 'bosses') return { ...base, bossType: 'all', weak: 'all', resist: 'all' };
  if (category === 'companions') return { ...base, weak: 'all', resist: 'all' };
  if (category === 'spells') return { ...base, level: 'all', dmgType: 'all', special: 'all', sort: 'levelAsc' };
  if (category === 'equipment') return { ...base, slot: 'all', cost: 'all', special: 'all' };
  if (category === 'items') return { ...base, itemType: 'all', tier: 'all', trigger: 'all' };
  if (category === 'world') return { ...base, worldType: 'all' };
  return base;
}

function unitMatchesCommon(unit, filters, defeatedSet) {
  if (filters.tag && filters.tag !== 'all' && !(unit.tags || []).includes(filters.tag)) return false;
  if (filters.weak && filters.weak !== 'all' && !((unit.resists?.[filters.weak] || 0) < 0)) return false;
  if (filters.resist && filters.resist !== 'all' && !((unit.resists?.[filters.resist] || 0) > 0)) return false;
  if (filters.trait && filters.trait !== 'all') {
    if (filters.trait === 'flying' && !unit.flying) return false;
    if (filters.trait === 'stationary' && !unit.stationary) return false;
    if (filters.trait === 'burrowing' && !unit.burrowing) return false;
    if (filters.trait === 'shielded' && !(unit.shields > 0)) return false;
    if (filters.trait === 'defeated' && (!defeatedSet || !defeatedSet.has(unit.name))) return false;
  }
  if (filters.query) {
    const resTerms = Object.entries(unit.resists || {}).flatMap(([dt, v]) => v < 0 ? [dt, 'weak'] : v >= 100 ? [dt, 'immune'] : v > 0 ? [dt, 'resist'] : []);
    const fields = [
      unit.name,
      ...(unit.tags || []),
      ...resTerms,
      unit.is_boss ? 'boss' : '',
      unit.boss_kind || '',
      unit.rare?.class ? `elite ${unit.rare.class}` : '',
      unit.escorted_by || '',
      ...(unit.abilities || []).flatMap(a => [a.name, a.desc, ...(a.damage_type || [])]),
      ...(unit.passives || []),
    ];
    if (!searchCatalogue(filters.query, fields)) return false;
  }
  return true;
}

export function filterWikiEntries(category, filters = {}, context = {}) {
  const game = context.game || null;
  const profile = context.profile || null;
  const defeatedSet = new Set(profile?.defeated || []);
  const learnedSet = new Set(game ? knownSpellIds(game) : []);
  const equippedSet = new Set(game ? Object.values(game.equipment || {}).map(e => e.name) : []);
  const craftableSet = new Set(game ? craftableEquipment(game).map(e => e.name) : []);
  const f = { ...defaultFiltersFor(category), ...filters };

  if (category === 'monsters') {
    const list = DATASETS.monsters.filter(u => {
      if (f.role !== 'all' && classifyUnitRole(u) !== f.role) return false;
      return unitMatchesCommon(u, f, defeatedSet);
    });
    return list.sort((a, b) => {
      if (f.sort === 'hpDesc') return (b.hp - a.hp) || a.name.localeCompare(b.name);
      if (f.sort === 'hpAsc') return (a.hp - b.hp) || a.name.localeCompare(b.name);
      if (f.sort === 'difficulty') return ((b.difficulty || 0) - (a.difficulty || 0)) || (b.hp - a.hp) || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name);
    });
  }

  if (category === 'bosses') {
    const list = DATASETS.bosses.filter(u => {
      if (f.bossType !== 'all' && classifyUnitRole(u) !== f.bossType) return false;
      return unitMatchesCommon(u, f, defeatedSet);
    });
    return list.sort((a, b) => {
      if (f.sort === 'hpDesc') return (b.hp - a.hp) || a.name.localeCompare(b.name);
      if (f.sort === 'shieldsDesc') return ((b.shields || 0) - (a.shields || 0)) || (b.hp - a.hp);
      return a.name.localeCompare(b.name);
    });
  }

  if (category === 'companions') {
    const list = DATASETS.companions.filter(u => unitMatchesCommon(u, f, defeatedSet));
    return list.sort((a, b) => {
      if (f.sort === 'hpDesc') return (b.hp - a.hp) || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name);
    });
  }

  if (category === 'spells') {
    const list = DATASETS.spells.filter(s => {
      if (f.tag !== 'all' && !s.tags.includes(f.tag)) return false;
      if (f.level !== 'all' && String(s.level) !== String(f.level)) return false;
      if (f.dmgType !== 'all') {
        if (f.dmgType === 'utility' && (s.damage_type || []).length > 0) return false;
        if (f.dmgType !== 'utility' && !(s.damage_type || []).includes(f.dmgType)) return false;
      }
      if (f.special !== 'all') {
        if (f.special === 'standard' && s.granted_by) return false;
        if (f.special === 'book' && !s.granted_by) return false;
        if (f.special === 'melee' && !s.melee) return false;
        if (f.special === 'quickCast' && !s.quick_cast) return false;
        if (f.special === 'summon' && !(s.summons?.length || s.pool_summons?.length)) return false;
        if (f.special === 'learned' && !learnedSet.has(s.id)) return false;
      }
      if (f.query) {
        const fields = [
          s.name, ...s.tags, ...(s.damage_type || []), s.desc, s.granted_by || '',
          ...(s.upgrades || []).flatMap(u => [u.name, u.desc]),
        ];
        if (!searchCatalogue(f.query, fields, s.summons || [])) return false;
      }
      return true;
    });
    return list.sort((a, b) => {
      if (f.sort === 'levelAsc') return (a.level - b.level) || a.name.localeCompare(b.name);
      if (f.sort === 'levelDesc') return (b.level - a.level) || a.name.localeCompare(b.name);
      if (f.sort === 'damageDesc') return ((b.stats?.damage || 0) - (a.stats?.damage || 0)) || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name);
    });
  }

  if (category === 'equipment') {
    const list = DATASETS.equipment.filter(item => {
      if (f.slot !== 'all' && item.slot !== f.slot) return false;
      if (f.tag !== 'all' && !item.tags.includes(f.tag)) return false;
      if (f.cost !== 'all') {
        const n = Number(f.cost);
        if (n === 5 ? item.recipe_cost < 5 : item.recipe_cost !== n) return false;
      }
      if (f.special !== 'all') {
        if (f.special === 'grantsSpell' && !SPELLS_BY_BOOK.has(item.name)) return false;
        if (f.special === 'summon' && !(item.summons || []).length) return false;
        if (f.special === 'equipped' && !equippedSet.has(item.name)) return false;
        if (f.special === 'craftable' && !craftableSet.has(item.name)) return false;
      }
      if (f.query) {
        const granted = SPELLS_BY_BOOK.get(item.name)?.map(sp => sp.name) || [];
        const fields = [
          item.name, equipmentName(item.name), item.slot, t(`slots.${item.slot.toLowerCase()}`),
          ...item.tags, item.desc, ...(item.bonuses || []), ...(item.effects || []), ...granted,
        ];
        if (!searchCatalogue(f.query, fields, item.summons || [])) return false;
      }
      return true;
    });
    return list.sort((a, b) => {
      if (f.sort === 'costAsc') return (a.recipe_cost - b.recipe_cost) || a.name.localeCompare(b.name);
      if (f.sort === 'costDesc') return (b.recipe_cost - a.recipe_cost) || a.name.localeCompare(b.name);
      return equipmentName(a.name).localeCompare(equipmentName(b.name));
    });
  }

  if (category === 'items') {
    const list = DATASETS.items.filter(entry => {
      if (f.itemType !== 'all' && entry.kind !== f.itemType) return false;
      if (entry.kind === 'component') {
        const c = entry.data;
        if (f.tag !== 'all' && !c.tags.includes(f.tag)) return false;
        if (f.tier === '1' || f.tier === '2' || f.tier === '3') {
          if (String(c.tier) !== f.tier) return false;
        } else if (f.tier === 'common' && c.rare) return false;
        else if (f.tier === 'rare' && !c.rare) return false;
        if (f.trigger === 'pickup' && !c.on_pickup) return false;
        if (f.trigger === 'craft' && !c.on_craft) return false;
        if (f.query) {
          const fields = [c.name, componentName(c.name), ...c.tags, c.desc, ...(c.effects || []), c.rare ? 'rare' : 'common'];
          if (!searchCatalogue(f.query, fields, c.summons || [])) return false;
        }
        return true;
      }
      if (f.tag !== 'all' || f.tier !== 'all' || f.trigger !== 'all') return false;
      if (f.query) {
        if (entry.kind === 'pickup') {
          const fields = [entry.data.id, t(entry.data.titleKey), t(entry.data.descKey)];
          if (!searchCatalogue(f.query, fields)) return false;
        } else {
          const a = entry.data;
          const fields = [a.id, a.name, t(`artifacts.${a.id}.name`), a.description, t(`artifacts.${a.id}.description`), ...Object.keys(a.recipe)];
          if (!searchCatalogue(f.query, fields)) return false;
        }
      }
      return true;
    });
    return list.sort((a, b) => {
      const nameA = a.kind === 'component' ? componentName(a.data.name) : a.kind === 'pickup' ? t(a.data.titleKey) : t(`artifacts.${a.data.id}.name`);
      const nameB = b.kind === 'component' ? componentName(b.data.name) : b.kind === 'pickup' ? t(b.data.titleKey) : t(`artifacts.${b.data.id}.name`);
      const tierA = a.kind === 'component' ? a.data.tier : 0;
      const tierB = b.kind === 'component' ? b.data.tier : 0;
      if (f.sort === 'tierAsc') return (tierA - tierB) || nameA.localeCompare(nameB);
      if (f.sort === 'tierDesc') return (tierB - tierA) || nameA.localeCompare(nameB);
      return nameA.localeCompare(nameB);
    });
  }

  if (category === 'world') {
    const list = DATASETS.world.filter(entry => {
      if (f.worldType !== 'all' && entry.kind !== f.worldType) return false;
      if (!f.query) return true;
      if (entry.kind === 'shrine') {
        const desc = entry.data === 'transmutation' ? t('inspection.shrineDescription', { uses: 3 }) : t(`shrine.${entry.data}Desc`);
        return searchCatalogue(f.query, [entry.data, t(`shrine.${entry.data}`), desc]);
      }
      if (entry.kind === 'cloud') {
        const c = entry.data;
        return searchCatalogue(f.query, [c.id, c.name, c.damageType || '', c.status || '']);
      }
      if (entry.kind === 'vault') {
        return searchCatalogue(f.query, [entry.data.name, t('vault.name', { name: entry.data.name }), ...entry.data.guardians]);
      }
      if (entry.kind === 'mutator') {
        return searchCatalogue(f.query, [entry.data, t(`mutators.${entry.data}`)]);
      }
      return searchCatalogue(f.query, [entry.data.name, entry.data.unlock || '']);
    });
    return list;
  }

  return [];
}

function tagPillHtml(tag) {
  const color = TAG_COLORS[tag] || '#e5c27b';
  return `<span class="tag-pill" style="color:${color}">${tagIconSvg(tag, 12)}<span>${escapeHtml(tag)}</span></span>`;
}

function renderAffinityBadges(resists, { compact = false } = {}) {
  const { immunities, resistances, weaknesses } = splitResistances(resists);
  if (!immunities.length && !resistances.length && !weaknesses.length) {
    return compact ? '' : `<p class="muted wiki-neutral-note">${h('wiki.label.noAffinities')}</p>`;
  }
  const badge = (dt, val, cls) => `<span class="res-badge ${cls}">${tagIconSvg(dt, 11)}<span>${escapeHtml(compact ? dt.slice(0, 3) : dt)} ${val > 0 ? '+' : ''}${val}%</span></span>`;

  if (compact) {
    const groups = [];
    if (weaknesses.length) {
      groups.push(`<div class="wiki-aff-row"><span class="wiki-aff-label weak">${h('wiki.label.weaknesses')}:</span>${weaknesses.map(([dt, v]) => badge(dt, v, 'weak')).join('')}</div>`);
    }
    if (immunities.length || resistances.length) {
      groups.push(`<div class="wiki-aff-row"><span class="wiki-aff-label resist">${h('wiki.label.resistances')}:</span>${immunities.map(([dt, v]) => badge(dt, v, 'immune')).join('')}${resistances.map(([dt, v]) => badge(dt, v, 'resist')).join('')}</div>`);
    }
    return `<div class="wiki-aff-compact">${groups.join('')}</div>`;
  }

  const rows = [];
  if (weaknesses.length) {
    rows.push(`<div class="wiki-aff-block"><span class="wiki-aff-title weak">${h('wiki.label.weaknesses')}</span><div class="res-grid">${weaknesses.map(([dt, v]) => badge(dt, v, 'weak')).join('')}</div></div>`);
  }
  if (resistances.length) {
    rows.push(`<div class="wiki-aff-block"><span class="wiki-aff-title resist">${h('wiki.label.resistances')}</span><div class="res-grid">${resistances.map(([dt, v]) => badge(dt, v, 'resist')).join('')}</div></div>`);
  }
  if (immunities.length) {
    rows.push(`<div class="wiki-aff-block"><span class="wiki-aff-title immune">${h('wiki.label.immunities')}</span><div class="res-grid">${immunities.map(([dt, v]) => badge(dt, v, 'immune')).join('')}</div></div>`);
  }
  return `<div class="wiki-aff-sections">${rows.join('')}</div>`;
}

function roleLabel(unit) {
  const role = classifyUnitRole(unit);
  const map = {
    boss_mordred: 'wiki.filter.bossMordred',
    boss_final: 'wiki.filter.bossFinal',
    boss_special: 'wiki.filter.bossSpecial',
    companion: 'wiki.cat.companions',
    elite_easy: 'wiki.filter.roleEliteEasy',
    elite_medium: 'wiki.filter.roleEliteMedium',
    elite_hard: 'wiki.filter.roleEliteHard',
    common: 'wiki.filter.roleCommon',
    summon: 'wiki.filter.roleSummon',
  };
  return t(map[role] || 'wiki.filter.roleCommon');
}

function unitTraits(unit) {
  const traits = [];
  if (unit.flying) traits.push(t('wiki.filter.flying'));
  if (unit.stationary) traits.push(t('wiki.filter.stationary'));
  if (unit.burrowing) traits.push(t('wiki.filter.burrowing'));
  if (unit.radius > 0) traits.push(t('wiki.label.footprint', { n: unit.radius * 2 + 1 }));
  return traits;
}

function renderUnitCard(unit, category, defeatedSet) {
  const meta = getUnitMeta(unit);
  const primaryColor = TAG_COLORS[unit.tags?.[0]] || (unit.is_boss ? '#f87171' : '#e5c27b');
  const defeated = defeatedSet.has(unit.name);
  const roleCls = unit.is_boss ? 'wiki-badge-boss' : unit.rare ? 'wiki-badge-elite' : unit.is_companion ? 'wiki-badge-ally' : '';
  const stats = [`HP ${unit.hp}`];
  if (unit.shields) stats.push(`SH ${unit.shields}`);
  if (meta.damage) stats.push(`DMG ${meta.damage}`);
  if (meta.range) stats.push(`RNG ${meta.range}`);
  if (unit.difficulty) stats.push(`D${unit.difficulty}`);
  const traits = unitTraits(unit);
  const previewAbilities = (unit.abilities || []).slice(0, 2).map(a => a.name).join(' · ');
  const previewPassive = unit.passives?.[0] ? cleanRw3Desc(unit.passives[0]) : '';

  return `<article class="rw3-card wiki-card ${unit.is_boss ? 'wiki-card-boss' : ''} ${defeated ? 'wiki-card-discovered' : ''}" data-wiki-open="${escapeHtml(category)}:${escapeHtml(unit.name)}" tabindex="0" role="button">
    <div class="rw3-card-head">
      <div class="rw3-card-title-group">
        <span class="card-emblem wiki-emblem" style="border-color:${primaryColor}66">${unitIconSvg(unit, 26)}</span>
        <div class="wiki-title-stack">
          <h3>${escapeHtml(unit.name)}</h3>
          ${traits.length ? `<small class="wiki-submeta">${escapeHtml(traits.join(' · '))}</small>` : ''}
        </div>
      </div>
      <div class="wiki-badge-col">
        <span class="rw3-lvl ${roleCls}">${escapeHtml(roleLabel(unit))}</span>
        ${defeated ? `<span class="wiki-mini-flag">${h('wiki.label.defeatedBadge')}</span>` : ''}
      </div>
    </div>
    <div class="chip-wrap">${(unit.tags || []).map(tagPillHtml).join('')}</div>
    <div class="rw3-stats-line">${stats.map(x => `<span>${escapeHtml(x)}</span>`).join('')}</div>
    ${renderAffinityBadges(unit.resists, { compact: true })}
    ${previewAbilities ? `<p class="wiki-preview-line"><strong>${h('wiki.label.abilities')}:</strong> ${escapeHtml(previewAbilities)}${unit.abilities.length > 2 ? ` +${unit.abilities.length - 2}` : ''}</p>` : ''}
    ${previewPassive ? `<p class="rw3-desc wiki-clamp">${escapeHtml(previewPassive)}</p>` : ''}
  </article>`;
}

function renderSpellCard(spell, learnedSet) {
  const isLearned = learnedSet.has(spell.id);
  const primaryTag = spell.tags?.[0] || 'Arcane';
  const primaryColor = TAG_COLORS[primaryTag] || '#c084fc';
  const stats = [];
  if (spell.stats?.damage) stats.push(`DMG ${spell.stats.damage}${spell.damage_type?.length ? ` (${spell.damage_type.join('/')})` : ''}`);
  else stats.push(t('wiki.label.noDamage'));
  if (spell.stats?.range) stats.push(`RNG ${spell.stats.range}`);
  if (spell.stats?.radius) stats.push(`AREA ${spell.stats.radius}`);
  if (spell.stats?.max_charges) stats.push(`CHG ${spell.stats.max_charges}`);
  if (spell.stats?.hp_cost) stats.push(`HP -${spell.stats.hp_cost}`);
  if (spell.stats?.minion_health) stats.push(`MINION ${spell.stats.minion_health} HP`);

  return `<article class="rw3-card wiki-card ${isLearned ? 'learned-card' : ''}" data-wiki-open="spells:${spell.id}" tabindex="0" role="button">
    <div class="rw3-card-head">
      <div class="rw3-card-title-group">
        <span class="card-emblem wiki-emblem" style="border-color:${primaryColor}66">${tagIconSvg(primaryTag, 26)}</span>
        <div class="wiki-title-stack">
          <h3>${escapeHtml(spell.name)}</h3>
          ${spell.granted_by ? `<small class="wiki-submeta">${h('book.requires', { item: equipmentName(spell.granted_by) })}</small>` : ''}
        </div>
      </div>
      <div class="wiki-badge-col">
        <span class="rw3-lvl">LVL ${spell.level} · ${spell.level} SP</span>
        ${isLearned ? `<span class="wiki-mini-flag">${h('rw3.learnedBadge')}</span>` : ''}
      </div>
    </div>
    <div class="chip-wrap">${spell.tags.map(tagPillHtml).join('')}</div>
    <div class="rw3-stats-line">${stats.map(x => `<span>${escapeHtml(x)}</span>`).join('')}</div>
    <p class="rw3-desc wiki-clamp">${escapeHtml(cleanRw3Desc(spell.desc))}</p>
    <div class="wiki-card-foot">
      <span>${h('wiki.label.upgrades')}: ${(spell.upgrades || []).length}</span>
      ${spell.quick_cast ? `<span class="wiki-tag-note">⚡ ${h('wiki.label.quickCast')}</span>` : ''}
      ${spell.melee ? `<span class="wiki-tag-note">${h('wiki.label.melee')}</span>` : ''}
    </div>
  </article>`;
}

function renderEquipmentCard(item, equippedSet, craftableSet) {
  const locName = equipmentName(item.name);
  const primaryColor = TAG_COLORS[item.tags?.[0]] || '#e5c27b';
  const isEquipped = equippedSet.has(item.name);
  const canCraft = craftableSet.has(item.name);
  const recipeText = item.recipe.map(([tg, c]) => `${c}× ${tg}`).join(' + ');
  const summary = [...(item.bonuses || []), item.desc].filter(Boolean).map(cleanRw3Desc).join('\n');
  const granted = SPELLS_BY_BOOK.get(item.name);

  return `<article class="rw3-card wiki-card ${isEquipped ? 'learned-card' : canCraft ? 'craftable-card' : ''}" data-wiki-open="equipment:${escapeHtml(item.name)}" tabindex="0" role="button">
    <div class="rw3-card-head">
      <div class="rw3-card-title-group">
        <span class="card-emblem wiki-emblem" style="border-color:${primaryColor}66">${slotIconSvg(item.slot, 24)}</span>
        <div class="wiki-title-stack">
          <h3>${escapeHtml(locName)}</h3>
          ${locName !== item.name ? `<small class="wiki-submeta">${escapeHtml(item.name)}</small>` : ''}
        </div>
      </div>
      <div class="wiki-badge-col">
        <span class="rw3-lvl">${h(`slots.${item.slot.toLowerCase()}`)}</span>
        ${isEquipped ? `<span class="wiki-mini-flag">${h('rw3.equippedSlot')}</span>` : ''}
      </div>
    </div>
    <div class="chip-wrap">${item.tags.map(tagPillHtml).join('')}</div>
    <div class="rw3-stats-line"><span>${escapeHtml(recipeText)}</span></div>
    ${granted ? `<p class="wiki-preview-line"><strong>${h('wiki.label.grantedSpell')}:</strong> ${escapeHtml(granted.map(s => s.name).join(', '))}</p>` : ''}
    <p class="rw3-desc wiki-clamp">${escapeHtml(summary)}</p>
  </article>`;
}

function renderItemCard(entry) {
  if (entry.kind === 'component') {
    const c = entry.data;
    const locName = componentName(c.name);
    const primaryColor = TAG_COLORS[c.tags?.[0]] || '#c084fc';
    const triggerLabel = c.on_pickup ? t('wiki.label.onPickup') : t('wiki.label.onCraft');
    return `<article class="rw3-card wiki-card ${c.rare ? 'craftable-card' : ''}" data-wiki-open="items:${escapeHtml(entry.id)}" tabindex="0" role="button">
      <div class="rw3-card-head">
        <div class="rw3-card-title-group">
          <span class="card-emblem wiki-emblem" style="border-color:${c.rare ? '#ffdf9f' : primaryColor + '66'}">${componentIconSvg(c, 26)}</span>
          <div class="wiki-title-stack">
            <h3>${escapeHtml(locName)}</h3>
            ${locName !== c.name ? `<small class="wiki-submeta">${escapeHtml(c.name)}</small>` : ''}
          </div>
        </div>
        <div class="wiki-badge-col">
          <span class="rw3-lvl">${h('wiki.label.tier', { n: c.tier })}</span>
          <span class="wiki-mini-flag ${c.rare ? 'rare' : ''}">${h(c.rare ? 'wiki.label.rare' : 'wiki.label.common')}</span>
        </div>
      </div>
      <div class="chip-wrap">${c.tags.map(tagPillHtml).join('')}</div>
      <div class="rw3-stats-line"><span>${escapeHtml(triggerLabel)}</span></div>
      <p class="rw3-desc wiki-clamp">${escapeHtml(cleanRw3Desc(c.desc))}</p>
    </article>`;
  }

  if (entry.kind === 'pickup') {
    const p = entry.data;
    return `<article class="rw3-card wiki-card" data-wiki-open="items:${escapeHtml(entry.id)}" tabindex="0" role="button">
      <div class="rw3-card-head">
        <div class="rw3-card-title-group">
          <span class="card-emblem wiki-emblem">${entityIconSvg(p.icon, 26)}</span>
          <h3>${h(p.titleKey)}</h3>
        </div>
        <span class="rw3-lvl">${h('wiki.filter.itemPickup')}</span>
      </div>
      <p class="rw3-desc">${h(p.descKey)}</p>
    </article>`;
  }

  const a = entry.data;
  const recipeText = Object.entries(a.recipe).map(([k, v]) => `${v}× ${t(`materials.${k}`)}`).join(' + ');
  return `<article class="rw3-card wiki-card" data-wiki-open="items:${escapeHtml(entry.id)}" tabindex="0" role="button">
    <div class="rw3-card-head">
      <div class="rw3-card-title-group">
        <span class="card-emblem wiki-emblem" style="border-color:#ffdf9f66">${entityIconSvg('artifact', 26)}</span>
        <h3>${h(`artifacts.${a.id}.name`)}</h3>
      </div>
      <span class="rw3-lvl">${h('wiki.filter.itemArtifact')}</span>
    </div>
    <div class="rw3-stats-line"><span>${escapeHtml(recipeText)}</span></div>
    <p class="rw3-desc">${h(`artifacts.${a.id}.description`)}</p>
  </article>`;
}

function renderWorldCard(entry, unlockedOutfits) {
  if (entry.kind === 'shrine') {
    const s = entry.data;
    const desc = s === 'transmutation' ? t('inspection.shrineDescription', { uses: 3 }) : t(`shrine.${s}Desc`);
    return `<article class="rw3-card wiki-card" data-wiki-open="world:${escapeHtml(entry.id)}" tabindex="0" role="button">
      <div class="rw3-card-head">
        <div class="rw3-card-title-group">
          <span class="card-emblem wiki-emblem" style="border-color:#7bd0ff55">${shrineIconSvg(s, 26)}</span>
          <h3>${h(`shrine.${s}`)}</h3>
        </div>
        <span class="rw3-lvl">${h('wiki.filter.worldShrines')}</span>
      </div>
      <p class="rw3-desc">${escapeHtml(desc)}</p>
    </article>`;
  }

  if (entry.kind === 'cloud') {
    const c = entry.data;
    const descParts = [];
    if (c.damage && c.damageType) descParts.push(t('wiki.cloud.desc', { damage: c.damage, type: c.damageType }));
    if (c.status) descParts.push(t('wiki.cloud.statusOnly', { status: c.status, duration: c.statusDuration || 1 }));
    return `<article class="rw3-card wiki-card" data-wiki-open="world:${escapeHtml(entry.id)}" tabindex="0" role="button">
      <div class="rw3-card-head">
        <div class="rw3-card-title-group">
          <span class="card-emblem wiki-emblem" style="border-color:${c.color}66">${cloudIconSvg(c.color, 26)}</span>
          <h3>${escapeHtml(c.name)}</h3>
        </div>
        <span class="rw3-lvl">${h('wiki.filter.worldClouds')}</span>
      </div>
      <div class="rw3-stats-line">
        ${c.damageType ? `<span>${escapeHtml(c.damageType)} · ${c.damage} DMG</span>` : `<span>${h('wiki.label.noDamage')}</span>`}
        ${c.status ? `<span>${escapeHtml(c.status)} (${c.statusDuration}t)</span>` : ''}
      </div>
      <p class="rw3-desc">${escapeHtml(descParts.join(' '))}</p>
    </article>`;
  }

  if (entry.kind === 'vault') {
    const v = entry.data;
    return `<article class="rw3-card wiki-card" data-wiki-open="world:${escapeHtml(entry.id)}" tabindex="0" role="button">
      <div class="rw3-card-head">
        <div class="rw3-card-title-group">
          <span class="card-emblem wiki-emblem" style="border-color:#e5c27b66">${entityIconSvg('vault', 26)}</span>
          <h3>${h('vault.name', { name: v.name })}</h3>
        </div>
        <span class="rw3-lvl">${h('wiki.filter.worldVaults')}</span>
      </div>
      <p class="wiki-preview-line"><strong>${h('wiki.label.guardians')}:</strong> ${escapeHtml(v.guardians.join(' · '))}</p>
    </article>`;
  }

  if (entry.kind === 'mutator') {
    const m = entry.data;
    return `<article class="rw3-card wiki-card" data-wiki-open="world:${escapeHtml(entry.id)}" tabindex="0" role="button">
      <div class="rw3-card-head">
        <div class="rw3-card-title-group">
          <span class="card-emblem wiki-emblem" style="border-color:#f8717166">${entityIconSvg('mutator', 26)}</span>
          <h3>${escapeHtml(m)}</h3>
        </div>
        <span class="rw3-lvl">${h('wiki.filter.worldMutators')}</span>
      </div>
      <p class="rw3-desc">${h(`mutators.${m}`)}</p>
    </article>`;
  }

  const w = entry.data;
  const unlocked = unlockedOutfits.has(w.name);
  const colors = outfitColor(w.name);
  const swatch = colors ? `style="background:linear-gradient(135deg, ${colors.hat}, ${colors.robe});border-color:${colors.hat}"` : '';
  return `<article class="rw3-card wiki-card ${unlocked ? 'learned-card' : ''}" data-wiki-open="world:${escapeHtml(entry.id)}" tabindex="0" role="button">
    <div class="rw3-card-head">
      <div class="rw3-card-title-group">
        <span class="card-emblem wiki-emblem" ${swatch}>${entityIconSvg('outfit', 24)}</span>
        <h3>${escapeHtml(w.name)}</h3>
      </div>
      <span class="rw3-lvl">${h(unlocked ? 'wiki.label.unlockedBadge' : 'wiki.label.lockedBadge')}</span>
    </div>
    <p class="rw3-desc">${escapeHtml(w.unlock || t('wiki.label.defaultOutfit'))}</p>
  </article>`;
}

function renderUnitDetail(unit, defeatedSet) {
  const meta = getUnitMeta(unit);
  const primaryColor = TAG_COLORS[unit.tags?.[0]] || '#e5c27b';
  const traits = unitTraits(unit);
  const defeated = defeatedSet.has(unit.name);
  const abilitiesHtml = (unit.abilities || []).length
    ? `<div class="wiki-detail-list">${unit.abilities.map(a => {
      const chips = [];
      if (a.damage) chips.push(`${a.damage} ${(a.damage_type || []).join('/')}`);
      if (a.range) chips.push(t('wiki.label.range', { n: a.range }));
      if (a.radius) chips.push(t('wiki.label.radius', { n: a.radius }));
      if (a.cool_down) chips.push(t('wiki.label.cooldown', { n: a.cool_down }));
      if (a.melee) chips.push(t('wiki.label.melee'));
      return `<div class="wiki-detail-item">
        <div class="wiki-detail-item-head"><strong>${escapeHtml(a.name)}</strong><div class="wiki-inline-chips">${chips.map(c => `<span class="rw3-lvl">${escapeHtml(c)}</span>`).join('')}</div></div>
        ${a.desc ? `<p class="rw3-desc">${escapeHtml(cleanRw3Desc(a.desc))}</p>` : ''}
      </div>`;
    }).join('')}</div>`
    : '';

  const passivesHtml = (unit.passives || []).length
    ? `<h3 class="wiki-section-title">${h('wiki.label.passives')}</h3><ul class="wiki-passive-list">${unit.passives.map(p => `<li>${escapeHtml(cleanRw3Desc(p))}</li>`).join('')}</ul>`
    : '';

  const escortBtn = unit.escorted_by && units.has(unit.escorted_by)
    ? `<div class="wiki-crosslinks"><span>${h('wiki.label.escort')}:</span><button class="wiki-link-chip" data-wiki-jump-unit="${escapeHtml(unit.escorted_by)}">${unitIconSvg(units.get(unit.escorted_by), 15)}<span>${escapeHtml(unit.escorted_by)}</span></button></div>`
    : '';

  return `
    <div class="wiki-detail-hero">
      <span class="wiki-detail-emblem" style="border-color:${primaryColor}88">${unitIconSvg(unit, 46)}</span>
      <div>
        <div class="eyebrow">${escapeHtml(roleLabel(unit))}${defeated ? ` · ${h('wiki.label.defeatedBadge')}` : ''}</div>
        <h2>${escapeHtml(unit.name)}</h2>
        <div class="chip-wrap">${(unit.tags || []).map(tagPillHtml).join('')}</div>
      </div>
    </div>
    <div class="detail-stats wiki-detail-stats-4">
      <div>HP<strong>${unit.hp}</strong></div>
      <div>SH<strong>${unit.shields || 0}</strong></div>
      <div>DMG / RNG<strong>${meta.damage || '—'} / ${meta.range || '—'}</strong></div>
      <div>${h('wiki.label.difficulty')}<strong>${unit.difficulty || '—'}</strong></div>
    </div>
    ${traits.length ? `<div class="wiki-crosslinks"><span>${h('wiki.label.traits')}:</span>${traits.map(tr => `<span class="tag-pill">${escapeHtml(tr)}</span>`).join('')}</div>` : ''}
    ${escortBtn}
    ${renderAffinityBadges(unit.resists)}
    ${abilitiesHtml ? `<h3 class="wiki-section-title">${h('wiki.label.abilities')}</h3>${abilitiesHtml}` : ''}
    ${passivesHtml}
  `;
}

function renderSpellDetail(spell, learnedSet) {
  const primaryTag = spell.tags?.[0] || 'Arcane';
  const primaryColor = TAG_COLORS[primaryTag] || '#c084fc';
  const isLearned = learnedSet.has(spell.id);
  const st = spell.stats || {};
  const flags = [
    spell.requires_los === false ? t('wiki.label.ignoresLos') : t('wiki.label.requiresLos'),
    spell.melee ? t('wiki.label.melee') : null,
    spell.quick_cast ? t('wiki.label.quickCast') : null,
  ].filter(Boolean);

  const summonsLinks = (spell.summons || []).filter(n => units.has(n)).map(n =>
    `<button class="wiki-link-chip" data-wiki-jump-unit="${escapeHtml(n)}">${unitIconSvg(units.get(n), 15)}<span>${escapeHtml(n)}</span></button>`
  ).join('');

  const bookLink = spell.granted_by
    ? `<div class="wiki-crosslinks"><span>${h('book.requires', { item: '' }).trim()}</span><button class="wiki-link-chip" data-wiki-jump-eq="${escapeHtml(spell.granted_by)}">${slotIconSvg('Weapon', 14)}<span>${escapeHtml(equipmentName(spell.granted_by))}</span></button></div>`
    : '';

  const upgradesHtml = (spell.upgrades || []).length
    ? `<h3 class="wiki-section-title">${h('wiki.label.upgrades')} (${spell.upgrades.length})</h3><div class="wiki-detail-list">${spell.upgrades.map(u => `
      <div class="wiki-detail-item">
        <div class="wiki-detail-item-head"><strong>${escapeHtml(u.name)}</strong><span class="rw3-lvl">${u.level} SP</span></div>
        <p class="rw3-desc">${escapeHtml(cleanRw3Desc(u.desc))}</p>
      </div>
    `).join('')}</div>`
    : '';

  return `
    <div class="wiki-detail-hero">
      <span class="wiki-detail-emblem" style="border-color:${primaryColor}88">${tagIconSvg(primaryTag, 46)}</span>
      <div>
        <div class="eyebrow">${h('wiki.cat.spells')} · LVL ${spell.level}${isLearned ? ` · ${h('rw3.learnedBadge')}` : ''}</div>
        <h2>${escapeHtml(spell.name)}</h2>
        <div class="chip-wrap">${spell.tags.map(tagPillHtml).join('')}</div>
      </div>
    </div>
    <p class="rw3-desc wiki-detail-desc">${escapeHtml(cleanRw3Desc(spell.desc))}</p>
    <div class="detail-stats wiki-detail-stats-4">
      <div>DMG<strong>${st.damage || '—'}${spell.damage_type?.length ? ` (${spell.damage_type.join('/')})` : ''}</strong></div>
      <div>RNG / AREA<strong>${st.range ?? '—'} / ${st.radius ?? '—'}</strong></div>
      <div>CHARGES / HP<strong>${st.max_charges ?? '∞'} / ${st.hp_cost ? `-${st.hp_cost} HP` : '0'}</strong></div>
      <div>DURATION<strong>${st.duration ?? st.minion_duration ?? '—'}</strong></div>
    </div>
    <div class="wiki-crosslinks">${flags.map(fl => `<span class="tag-pill">${escapeHtml(fl)}</span>`).join('')}</div>
    ${bookLink}
    ${summonsLinks ? `<div class="wiki-crosslinks"><span>${h('wiki.label.summons')}:</span>${summonsLinks}</div>` : ''}
    ${upgradesHtml}
  `;
}

function renderEquipmentDetail(item, equippedSet) {
  const locName = equipmentName(item.name);
  const primaryColor = TAG_COLORS[item.tags?.[0]] || '#e5c27b';
  const recipePills = item.recipe.map(([tg, c]) => `<span class="tag-pill" style="color:${TAG_COLORS[tg] || '#e5c27b'}">${tg !== 'Any' ? tagIconSvg(tg, 12) : ''}<span>${c}× ${escapeHtml(tg)}</span></span>`).join('');
  const granted = SPELLS_BY_BOOK.get(item.name) || [];
  const summonsLinks = (item.summons || []).filter(n => units.has(n)).map(n =>
    `<button class="wiki-link-chip" data-wiki-jump-unit="${escapeHtml(n)}">${unitIconSvg(units.get(n), 15)}<span>${escapeHtml(n)}</span></button>`
  ).join('');

  return `
    <div class="wiki-detail-hero">
      <span class="wiki-detail-emblem" style="border-color:${primaryColor}88">${slotIconSvg(item.slot, 44)}</span>
      <div>
        <div class="eyebrow">${h(`slots.${item.slot.toLowerCase()}`)}${equippedSet.has(item.name) ? ` · ${h('rw3.equippedSlot')}` : ''}</div>
        <h2>${escapeHtml(locName)}</h2>
        ${locName !== item.name ? `<p class="muted" style="margin:0 0 6px">${escapeHtml(item.name)}</p>` : ''}
        <div class="chip-wrap">${item.tags.map(tagPillHtml).join('')}</div>
      </div>
    </div>
    <div class="wiki-crosslinks"><span>${h('wiki.label.recipe')} (${item.recipe_cost}):</span>${recipePills}</div>
    ${(item.bonuses || []).length ? `<h3 class="wiki-section-title">${h('wiki.label.bonuses')}</h3><ul class="wiki-passive-list">${item.bonuses.map(b => `<li>${escapeHtml(cleanRw3Desc(b))}</li>`).join('')}</ul>` : ''}
    ${item.desc ? `<h3 class="wiki-section-title">${h('wiki.label.effects')}</h3><p class="rw3-desc wiki-detail-desc">${escapeHtml(cleanRw3Desc(item.desc))}</p>` : ''}
    ${granted.length ? `<div class="wiki-crosslinks"><span>${h('wiki.label.grantedSpell')}:</span>${granted.map(s => `<button class="wiki-link-chip" data-wiki-jump-spell="${s.id}">${tagIconSvg(s.tags?.[0] || 'Arcane', 14)}<span>${escapeHtml(s.name)}</span></button>`).join('')}</div>` : ''}
    ${summonsLinks ? `<div class="wiki-crosslinks"><span>${h('wiki.label.summons')}:</span>${summonsLinks}</div>` : ''}
  `;
}

function renderItemDetail(entry) {
  if (entry.kind === 'component') {
    const c = entry.data;
    const locName = componentName(c.name);
    const primaryColor = TAG_COLORS[c.tags?.[0]] || '#c084fc';
    const summonsLinks = (c.summons || []).filter(n => units.has(n)).map(n =>
      `<button class="wiki-link-chip" data-wiki-jump-unit="${escapeHtml(n)}">${unitIconSvg(units.get(n), 15)}<span>${escapeHtml(n)}</span></button>`
    ).join('');
    return `
      <div class="wiki-detail-hero">
        <span class="wiki-detail-emblem" style="border-color:${c.rare ? '#ffdf9f' : primaryColor + '88'}">${componentIconSvg(c, 46)}</span>
        <div>
          <div class="eyebrow">${h('wiki.filter.itemComponent')} · ${h('wiki.label.tier', { n: c.tier })} · ${h(c.rare ? 'wiki.label.rare' : 'wiki.label.common')}</div>
          <h2>${escapeHtml(locName)}</h2>
          ${locName !== c.name ? `<p class="muted" style="margin:0 0 6px">${escapeHtml(c.name)}</p>` : ''}
          <div class="chip-wrap">${c.tags.map(tagPillHtml).join('')}</div>
        </div>
      </div>
      <div class="detail-stats">
        <div>TRIGGER<strong>${h(c.on_pickup ? 'wiki.label.onPickup' : 'wiki.label.onCraft')}</strong></div>
        <div>POOL<strong>${escapeHtml(c.pool || 'normal')}</strong></div>
      </div>
      <p class="rw3-desc wiki-detail-desc">${escapeHtml(cleanRw3Desc(c.desc))}</p>
      ${summonsLinks ? `<div class="wiki-crosslinks"><span>${h('wiki.label.summons')}:</span>${summonsLinks}</div>` : ''}
    `;
  }
  if (entry.kind === 'pickup') {
    const p = entry.data;
    return `
      <div class="wiki-detail-hero">
        <span class="wiki-detail-emblem">${entityIconSvg(p.icon, 46)}</span>
        <div>
          <div class="eyebrow">${h('wiki.filter.itemPickup')}</div>
          <h2>${h(p.titleKey)}</h2>
        </div>
      </div>
      <p class="rw3-desc wiki-detail-desc">${h(p.descKey)}</p>
    `;
  }
  const a = entry.data;
  const recipeText = Object.entries(a.recipe).map(([k, v]) => `${v}× ${t(`materials.${k}`)}`).join(' + ');
  return `
    <div class="wiki-detail-hero">
      <span class="wiki-detail-emblem" style="border-color:#ffdf9f88">${entityIconSvg('artifact', 46)}</span>
      <div>
        <div class="eyebrow">${h('wiki.filter.itemArtifact')}</div>
        <h2>${h(`artifacts.${a.id}.name`)}</h2>
      </div>
    </div>
    <div class="wiki-crosslinks"><span>${h('wiki.label.recipe')}:</span><span class="tag-pill">${escapeHtml(recipeText)}</span></div>
    <p class="rw3-desc wiki-detail-desc">${h(`artifacts.${a.id}.description`)}</p>
  `;
}

function renderWorldDetail(entry, unlockedOutfits) {
  if (entry.kind === 'shrine') {
    const s = entry.data;
    const desc = s === 'transmutation' ? t('inspection.shrineDescription', { uses: 3 }) : t(`shrine.${s}Desc`);
    return `
      <div class="wiki-detail-hero">
        <span class="wiki-detail-emblem" style="border-color:#7bd0ff88">${shrineIconSvg(s, 46)}</span>
        <div>
          <div class="eyebrow">${h('wiki.filter.worldShrines')}</div>
          <h2>${h(`shrine.${s}`)}</h2>
        </div>
      </div>
      <p class="rw3-desc wiki-detail-desc">${escapeHtml(desc)}</p>
    `;
  }
  if (entry.kind === 'cloud') {
    const c = entry.data;
    const descParts = [];
    if (c.damage && c.damageType) descParts.push(t('wiki.cloud.desc', { damage: c.damage, type: c.damageType }));
    if (c.status) descParts.push(t('wiki.cloud.statusOnly', { status: c.status, duration: c.statusDuration || 1 }));
    return `
      <div class="wiki-detail-hero">
        <span class="wiki-detail-emblem" style="border-color:${c.color}88">${cloudIconSvg(c.color, 46)}</span>
        <div>
          <div class="eyebrow">${h('wiki.filter.worldClouds')}</div>
          <h2>${escapeHtml(c.name)}</h2>
        </div>
      </div>
      <div class="detail-stats">
        <div>DMG<strong>${c.damage ? `${c.damage} ${c.damageType}` : t('wiki.label.noDamage')}</strong></div>
        <div>STATUS<strong>${c.status ? `${c.status} (${c.statusDuration}t)` : '—'}</strong></div>
      </div>
      <p class="rw3-desc wiki-detail-desc">${escapeHtml(descParts.join(' '))}</p>
    `;
  }
  if (entry.kind === 'vault') {
    const v = entry.data;
    const guardianLinks = v.guardians.map(name => {
      const u = units.get(name);
      return u
        ? `<button class="wiki-link-chip" data-wiki-jump-unit="${escapeHtml(name)}">${unitIconSvg(u, 16)}<span>${escapeHtml(name)}</span></button>`
        : `<span class="tag-pill">${escapeHtml(name)}</span>`;
    }).join('');
    return `
      <div class="wiki-detail-hero">
        <span class="wiki-detail-emblem" style="border-color:#e5c27b88">${entityIconSvg('vault', 46)}</span>
        <div>
          <div class="eyebrow">${h('wiki.filter.worldVaults')}</div>
          <h2>${h('vault.name', { name: v.name })}</h2>
        </div>
      </div>
      <div class="wiki-crosslinks"><span>${h('wiki.label.guardians')}:</span>${guardianLinks}</div>
    `;
  }
  if (entry.kind === 'mutator') {
    const m = entry.data;
    return `
      <div class="wiki-detail-hero">
        <span class="wiki-detail-emblem" style="border-color:#f8717188">${entityIconSvg('mutator', 46)}</span>
        <div>
          <div class="eyebrow">${h('wiki.filter.worldMutators')}</div>
          <h2>${escapeHtml(m)}</h2>
        </div>
      </div>
      <p class="rw3-desc wiki-detail-desc">${h(`mutators.${m}`)}</p>
    `;
  }
  const w = entry.data;
  const unlocked = unlockedOutfits.has(w.name);
  const colors = outfitColor(w.name);
  const swatch = colors ? `style="background:linear-gradient(135deg, ${colors.hat}, ${colors.robe});border-color:${colors.hat}"` : '';
  return `
    <div class="wiki-detail-hero">
      <span class="wiki-detail-emblem" ${swatch}>${entityIconSvg('outfit', 44)}</span>
      <div>
        <div class="eyebrow">${h('wiki.filter.worldOutfits')} · ${h(unlocked ? 'wiki.label.unlockedBadge' : 'wiki.label.lockedBadge')}</div>
        <h2>${escapeHtml(w.name)}</h2>
      </div>
    </div>
    <h3 class="wiki-section-title">${h('wiki.label.unlockCondition')}</h3>
    <p class="rw3-desc wiki-detail-desc">${escapeHtml(w.unlock || t('wiki.label.defaultOutfit'))}</p>
  `;
}

function categoryIcon(cat) {
  const map = {
    monsters: entityIconSvg('imp', 16),
    bosses: entityIconSvg('boss', 16),
    companions: entityIconSvg('ally', 16),
    spells: tagIconSvg('Arcane', 16),
    equipment: slotIconSvg('Weapon', 16),
    items: entityIconSvg('component', 16),
    world: shrineIconSvg('transmutation', 16),
  };
  return map[cat] || '';
}

function optionList(items, selected) {
  return items.map(([value, label]) => `<option value="${escapeHtml(value)}"${String(value) === String(selected) ? ' selected' : ''}>${escapeHtml(label)}</option>`).join('');
}

function buildFilterControlsHtml(category, f) {
  const controls = [];
  const dmgOpts = [['all', t('wiki.filter.anyElement')], ...DAMAGE_TYPES.map(d => [d, d])];

  if (category === 'monsters' || category === 'bosses' || category === 'companions') {
    controls.push(`<select data-wiki-filter="tag" aria-label="${h('wiki.filter.allTags')}">${optionList([['all', t('wiki.filter.allTags')], ...ALL_UNIT_TAGS.map(tg => [tg, tg])], f.tag)}</select>`);
    if (category === 'monsters') {
      controls.push(`<select data-wiki-filter="role" aria-label="${h('wiki.filter.role')}">${optionList([
        ['all', t('wiki.filter.roleAll')],
        ['common', t('wiki.filter.roleCommon')],
        ['elite_easy', t('wiki.filter.roleEliteEasy')],
        ['elite_medium', t('wiki.filter.roleEliteMedium')],
        ['elite_hard', t('wiki.filter.roleEliteHard')],
        ['summon', t('wiki.filter.roleSummon')],
      ], f.role)}</select>`);
    }
    if (category === 'bosses') {
      controls.push(`<select data-wiki-filter="bossType">${optionList([
        ['all', t('wiki.filter.bossAll')],
        ['boss_final', t('wiki.filter.bossFinal')],
        ['boss_mordred', t('wiki.filter.bossMordred')],
        ['boss_special', t('wiki.filter.bossSpecial')],
      ], f.bossType)}</select>`);
    }
    controls.push(`<select data-wiki-filter="weak" aria-label="${h('wiki.filter.weakTo')}">${optionList([['all', t('wiki.filter.weakTo')], ...DAMAGE_TYPES.map(d => [d, `${t('wiki.label.weaknesses')}: ${d}`])], f.weak)}</select>`);
    controls.push(`<select data-wiki-filter="resist" aria-label="${h('wiki.filter.resists')}">${optionList([['all', t('wiki.filter.resists')], ...DAMAGE_TYPES.map(d => [d, `${t('wiki.label.resistances')}: ${d}`])], f.resist)}</select>`);
    if (category === 'monsters') {
      controls.push(`<select data-wiki-filter="trait">${optionList([
        ['all', t('wiki.filter.traitAll')],
        ['flying', t('wiki.filter.flying')],
        ['stationary', t('wiki.filter.stationary')],
        ['burrowing', t('wiki.filter.burrowing')],
        ['shielded', t('wiki.filter.shielded')],
        ['defeated', t('wiki.filter.defeated')],
      ], f.trait)}</select>`);
    }
    const sortOpts = category === 'monsters'
      ? [['name', t('wiki.sort.name')], ['hpDesc', t('wiki.sort.hpDesc')], ['hpAsc', t('wiki.sort.hpAsc')], ['difficulty', t('wiki.sort.difficulty')]]
      : category === 'bosses'
        ? [['name', t('wiki.sort.name')], ['hpDesc', t('wiki.sort.hpDesc')], ['shieldsDesc', t('wiki.sort.shieldsDesc')]]
        : [['name', t('wiki.sort.name')], ['hpDesc', t('wiki.sort.hpDesc')]];
    controls.push(`<select data-wiki-filter="sort">${optionList(sortOpts, f.sort)}</select>`);
  } else if (category === 'spells') {
    controls.push(`<select data-wiki-filter="tag">${optionList([['all', t('wiki.filter.allTags')], ...rw3Tags.map(tg => [tg, tg])], f.tag)}</select>`);
    controls.push(`<select data-wiki-filter="level">${optionList([['all', t('rw3.allLevels')], ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(l => [String(l), `Lvl ${l}`])], f.level)}</select>`);
    controls.push(`<select data-wiki-filter="dmgType">${optionList([['all', t('wiki.filter.damageTypeAll')], ['utility', t('wiki.filter.utility')], ...dmgOpts.slice(1)], f.dmgType)}</select>`);
    controls.push(`<select data-wiki-filter="special">${optionList([
      ['all', t('wiki.filter.spellSpecialAll')],
      ['standard', t('wiki.filter.spellStandard')],
      ['book', t('wiki.filter.spellBook')],
      ['melee', t('wiki.filter.spellMelee')],
      ['quickCast', t('wiki.filter.spellQuickCast')],
      ['summon', t('wiki.filter.spellSummon')],
      ['learned', t('wiki.filter.spellLearned')],
    ], f.special)}</select>`);
    controls.push(`<select data-wiki-filter="sort">${optionList([
      ['levelAsc', t('wiki.sort.levelAsc')],
      ['levelDesc', t('wiki.sort.levelDesc')],
      ['name', t('wiki.sort.name')],
      ['damageDesc', t('wiki.sort.damageDesc')],
    ], f.sort)}</select>`);
  } else if (category === 'equipment') {
    controls.push(`<select data-wiki-filter="slot">${optionList([['all', t('rw3.allSlots')], ...equipmentSlots.map(s => [s, t(`slots.${s.toLowerCase()}`)])], f.slot)}</select>`);
    controls.push(`<select data-wiki-filter="tag">${optionList([['all', t('wiki.filter.allTags')], ...rw3Tags.map(tg => [tg, tg])], f.tag)}</select>`);
    controls.push(`<select data-wiki-filter="cost">${optionList([
      ['all', t('wiki.filter.costAll')],
      ['2', t('wiki.filter.costN', { n: 2 })],
      ['3', t('wiki.filter.costN', { n: 3 })],
      ['4', t('wiki.filter.costN', { n: 4 })],
      ['5', t('wiki.filter.costN', { n: '5+' })],
    ], f.cost)}</select>`);
    controls.push(`<select data-wiki-filter="special">${optionList([
      ['all', t('wiki.filter.eqSpecialAll')],
      ['grantsSpell', t('wiki.filter.eqGrantsSpell')],
      ['summon', t('wiki.filter.eqSummon')],
      ['equipped', t('wiki.filter.eqEquipped')],
      ['craftable', t('wiki.filter.eqCraftable')],
    ], f.special)}</select>`);
    controls.push(`<select data-wiki-filter="sort">${optionList([
      ['name', t('wiki.sort.name')],
      ['costAsc', t('wiki.sort.costAsc')],
      ['costDesc', t('wiki.sort.costDesc')],
    ], f.sort)}</select>`);
  } else if (category === 'items') {
    controls.push(`<select data-wiki-filter="itemType">${optionList([
      ['all', t('wiki.filter.itemTypeAll')],
      ['component', t('wiki.filter.itemComponent')],
      ['pickup', t('wiki.filter.itemPickup')],
      ['artifact', t('wiki.filter.itemArtifact')],
    ], f.itemType)}</select>`);
    controls.push(`<select data-wiki-filter="tag">${optionList([['all', t('wiki.filter.allTags')], ...rw3Tags.map(tg => [tg, tg])], f.tag)}</select>`);
    controls.push(`<select data-wiki-filter="tier">${optionList([
      ['all', t('wiki.filter.tierAll')],
      ['1', t('wiki.filter.tierN', { n: 1 })],
      ['2', t('wiki.filter.tierN', { n: 2 })],
      ['3', t('wiki.filter.tierN', { n: 3 })],
      ['common', t('wiki.filter.rarityCommon')],
      ['rare', t('wiki.filter.rarityRare')],
    ], f.tier)}</select>`);
    controls.push(`<select data-wiki-filter="trigger">${optionList([
      ['all', t('wiki.filter.triggerAll')],
      ['pickup', t('wiki.filter.onPickup')],
      ['craft', t('wiki.filter.onCraft')],
    ], f.trigger)}</select>`);
    controls.push(`<select data-wiki-filter="sort">${optionList([
      ['name', t('wiki.sort.name')],
      ['tierAsc', t('wiki.sort.tierAsc')],
      ['tierDesc', t('wiki.sort.tierDesc')],
    ], f.sort)}</select>`);
  } else if (category === 'world') {
    controls.push(`<select data-wiki-filter="worldType">${optionList([
      ['all', t('wiki.filter.worldAll')],
      ['shrine', t('wiki.filter.worldShrines')],
      ['cloud', t('wiki.filter.worldClouds')],
      ['vault', t('wiki.filter.worldVaults')],
      ['mutator', t('wiki.filter.worldMutators')],
      ['outfit', t('wiki.filter.worldOutfits')],
    ], f.worldType)}</select>`);
  }

  return controls.join('');
}

export function createWikiController(root, { getState, standalone = false } = {}) {
  const wikiState = {
    category: 'monsters',
    filters: defaultFiltersFor('monsters'),
    limit: PAGE_STEP,
    history: [],
    currentEntry: null,
  };

  let initialized = false;
  let dialogEl = null;

  function ensureShell() {
    if (initialized) return;
    initialized = true;
    root.innerHTML = `
      <div class="atlas-toolbar panel wiki-hero">
        <div>
          <span class="eyebrow">${h('nav.wiki')} · ${h('wiki.totalEntries', { count: totalWikiEntries() })}</span>
          <h2 id="wiki-hero-title">${h('wiki.title')}</h2>
          <p class="muted" id="wiki-hero-subtitle">${h('wiki.subtitle')}</p>
        </div>
        <div class="wiki-hero-actions">
          <div class="atlas-summary">
            <b id="wiki-match-count">0</b>
            <span id="wiki-match-label"></span>
          </div>
          ${standalone
            ? `<a class="small-button primary-outline" href="./index.html">← <span data-wiki-i18n="wiki.backToGame">${h('wiki.backToGame')}</span></a>`
            : `<a class="small-button primary-outline" href="./wiki.html"><span data-wiki-i18n="wiki.openStandalone">${h('wiki.openStandalone')}</span> ↗</a>`}
        </div>
      </div>

      <div class="wiki-tabs" id="wiki-tabs" role="tablist"></div>

      <div class="wiki-filter-bar panel">
        <div class="wiki-search-row">
          <input type="search" id="wiki-search" placeholder="${h('wiki.searchPlaceholder')}" aria-label="${h('wiki.searchPlaceholder')}">
          <button type="button" id="wiki-reset-btn" class="small-button">${h('wiki.resetFilters')}</button>
        </div>
        <div class="wiki-select-row" id="wiki-filter-selects"></div>
      </div>

      <div id="wiki-grid" class="rw3-grid wiki-grid"></div>
      <div id="wiki-pagination" class="wiki-pagination"></div>
    `;

    dialogEl = document.getElementById('wiki-detail-dialog');
    if (!dialogEl) {
      dialogEl = document.createElement('dialog');
      dialogEl.id = 'wiki-detail-dialog';
      dialogEl.className = 'wiki-detail-dialog';
      dialogEl.innerHTML = `
        <div class="wiki-dialog-bar">
          <button type="button" id="wiki-detail-back" class="small-button" hidden>←</button>
          <button type="button" class="close-dialog" id="wiki-detail-close" aria-label="${h('common.close')}">×</button>
        </div>
        <div id="wiki-detail-body"></div>
      `;
      document.body.appendChild(dialogEl);
    }

    dialogEl.querySelector('#wiki-detail-close').onclick = () => {
      wikiState.history = [];
      wikiState.currentEntry = null;
      dialogEl.close();
    };
    dialogEl.querySelector('#wiki-detail-back').onclick = () => {
      const prev = wikiState.history.pop();
      if (prev) openEntry(prev.category, prev.id, false);
    };
    dialogEl.querySelector('#wiki-detail-body').onclick = event => {
      const unitBtn = event.target.closest('[data-wiki-jump-unit]');
      if (unitBtn) {
        const name = unitBtn.dataset.wikiJumpUnit;
        const u = units.get(name);
        if (u) openEntry(u.is_boss ? 'bosses' : u.is_companion ? 'companions' : 'monsters', name, true);
        return;
      }
      const spellBtn = event.target.closest('[data-wiki-jump-spell]');
      if (spellBtn) {
        openEntry('spells', Number(spellBtn.dataset.wikiJumpSpell), true);
        return;
      }
      const eqBtn = event.target.closest('[data-wiki-jump-eq]');
      if (eqBtn) {
        openEntry('equipment', eqBtn.dataset.wikiJumpEq, true);
      }
    };

    root.querySelector('#wiki-tabs').onclick = event => {
      const btn = event.target.closest('[data-wiki-cat]');
      if (!btn) return;
      setCategory(btn.dataset.wikiCat);
    };

    root.querySelector('#wiki-search').oninput = event => {
      wikiState.filters.query = event.target.value;
      wikiState.limit = PAGE_STEP;
      renderGrid();
    };

    root.querySelector('#wiki-filter-selects').onchange = event => {
      const sel = event.target.closest('[data-wiki-filter]');
      if (!sel) return;
      wikiState.filters[sel.dataset.wikiFilter] = sel.value;
      wikiState.limit = PAGE_STEP;
      renderGrid();
    };

    root.querySelector('#wiki-reset-btn').onclick = () => {
      wikiState.filters = defaultFiltersFor(wikiState.category);
      wikiState.limit = PAGE_STEP;
      root.querySelector('#wiki-search').value = '';
      renderFilters();
      renderGrid();
    };

    const openFromCard = event => {
      const card = event.target.closest('[data-wiki-open]');
      if (!card) return;
      const raw = card.dataset.wikiOpen;
      const sep = raw.indexOf(':');
      const cat = raw.slice(0, sep);
      const id = cat === 'spells' ? Number(raw.slice(sep + 1)) : raw.slice(sep + 1);
      wikiState.history = [];
      openEntry(cat, id, false);
    };
    root.querySelector('#wiki-grid').onclick = openFromCard;
    root.querySelector('#wiki-grid').onkeydown = event => {
      if (event.key === 'Enter' || event.key === ' ') {
        const card = event.target.closest('[data-wiki-open]');
        if (card) { event.preventDefault(); openFromCard(event); }
      }
    };

    root.querySelector('#wiki-pagination').onclick = event => {
      if (event.target.closest('[data-wiki-more]')) {
        wikiState.limit += PAGE_STEP;
        renderGrid();
      } else if (event.target.closest('[data-wiki-all]')) {
        wikiState.limit = Infinity;
        renderGrid();
      }
    };
  }

  function currentContext() {
    const s = getState ? getState() : null;
    return { game: s?.game || null, profile: s?.profile || null };
  }

  function renderChrome() {
    root.querySelector('#wiki-hero-title').textContent = t('wiki.title');
    root.querySelector('#wiki-hero-subtitle').textContent = t('wiki.subtitle');
    root.querySelector('.wiki-hero .eyebrow').textContent = `${t('nav.wiki')} · ${t('wiki.totalEntries', { count: totalWikiEntries() })}`;
    const navLink = root.querySelector('[data-wiki-i18n]');
    if (navLink) navLink.textContent = t(navLink.dataset.wikiI18n);
    const search = root.querySelector('#wiki-search');
    search.placeholder = t('wiki.searchPlaceholder');
    search.setAttribute('aria-label', t('wiki.searchPlaceholder'));
    root.querySelector('#wiki-reset-btn').textContent = t('wiki.resetFilters');
    dialogEl.querySelector('#wiki-detail-close').setAttribute('aria-label', t('common.close'));
  }

  function renderTabs() {
    root.querySelector('#wiki-tabs').innerHTML = WIKI_CATEGORIES.map(cat => `
      <button type="button" class="wiki-tab-btn ${wikiState.category === cat ? 'active' : ''}" data-wiki-cat="${cat}" role="tab" aria-selected="${wikiState.category === cat}">
        ${categoryIcon(cat)}
        <span>${h(`wiki.cat.${cat}`)}</span>
        <span class="nav-badge">${DATASETS[cat].length}</span>
      </button>
    `).join('');
  }

  function renderFilters() {
    root.querySelector('#wiki-filter-selects').innerHTML = buildFilterControlsHtml(wikiState.category, wikiState.filters);
  }

  function renderGrid() {
    const ctx = currentContext();
    const defeatedSet = new Set(ctx.profile?.defeated || []);
    const unlockedOutfits = new Set(ctx.profile?.outfits || ['Wizard']);
    const learnedSet = new Set(ctx.game ? knownSpellIds(ctx.game) : []);
    const equippedSet = new Set(ctx.game ? Object.values(ctx.game.equipment || {}).map(e => e.name) : []);
    const craftableSet = new Set(ctx.game ? craftableEquipment(ctx.game).map(e => e.name) : []);

    const matches = filterWikiEntries(wikiState.category, wikiState.filters, ctx);
    const visible = matches.slice(0, wikiState.limit);

    root.querySelector('#wiki-match-count').textContent = matches.length;
    root.querySelector('#wiki-match-label').textContent = t('wiki.showing', { shown: visible.length, total: matches.length });

    const grid = root.querySelector('#wiki-grid');
    if (!visible.length) {
      grid.innerHTML = `<div class="wiki-empty panel"><p>${h('wiki.empty')}</p></div>`;
    } else if (wikiState.category === 'monsters' || wikiState.category === 'bosses' || wikiState.category === 'companions') {
      grid.innerHTML = visible.map(u => renderUnitCard(u, wikiState.category, defeatedSet)).join('');
    } else if (wikiState.category === 'spells') {
      grid.innerHTML = visible.map(s => renderSpellCard(s, learnedSet)).join('');
    } else if (wikiState.category === 'equipment') {
      grid.innerHTML = visible.map(item => renderEquipmentCard(item, equippedSet, craftableSet)).join('');
    } else if (wikiState.category === 'items') {
      grid.innerHTML = visible.map(renderItemCard).join('');
    } else {
      grid.innerHTML = visible.map(entry => renderWorldCard(entry, unlockedOutfits)).join('');
    }

    const remaining = matches.length - visible.length;
    const pag = root.querySelector('#wiki-pagination');
    pag.innerHTML = remaining > 0
      ? `<button type="button" class="small-button primary-outline" data-wiki-more="1">${h('wiki.loadMore', { count: remaining })}</button>
         <button type="button" class="small-button" data-wiki-all="1">${h('wiki.showAll', { count: matches.length })}</button>`
      : '';
  }

  function openEntry(category, id, pushHistory = false) {
    if (pushHistory && wikiState.currentEntry) wikiState.history.push(wikiState.currentEntry);
    wikiState.currentEntry = { category, id };
    const ctx = currentContext();
    const defeatedSet = new Set(ctx.profile?.defeated || []);
    const unlockedOutfits = new Set(ctx.profile?.outfits || ['Wizard']);
    const learnedSet = new Set(ctx.game ? knownSpellIds(ctx.game) : []);
    const equippedSet = new Set(ctx.game ? Object.values(ctx.game.equipment || {}).map(e => e.name) : []);

    let html = '';
    if (category === 'monsters' || category === 'bosses' || category === 'companions') {
      const u = units.get(id);
      if (u) html = renderUnitDetail(u, defeatedSet);
    } else if (category === 'spells') {
      const sp = DATASETS.spells.find(s => s.id === Number(id)) || spellByName.get(id);
      if (sp) html = renderSpellDetail(sp, learnedSet);
    } else if (category === 'equipment') {
      const eq = DATASETS.equipment.find(e => e.name === id);
      if (eq) html = renderEquipmentDetail(eq, equippedSet);
    } else if (category === 'items') {
      const it = DATASETS.items.find(x => x.id === id);
      if (it) html = renderItemDetail(it);
    } else if (category === 'world') {
      const w = DATASETS.world.find(x => x.id === id);
      if (w) html = renderWorldDetail(w, unlockedOutfits);
    }

    if (!html) return;
    const backBtn = dialogEl.querySelector('#wiki-detail-back');
    backBtn.hidden = wikiState.history.length === 0;
    dialogEl.querySelector('#wiki-detail-body').innerHTML = html;
    if (!dialogEl.open) dialogEl.showModal();
  }

  function setCategory(cat, query = '') {
    if (!WIKI_CATEGORIES.includes(cat)) cat = 'monsters';
    wikiState.category = cat;
    wikiState.filters = { ...defaultFiltersFor(cat), query };
    wikiState.limit = PAGE_STEP;
    ensureShell();
    root.querySelector('#wiki-search').value = query;
    renderChrome();
    renderTabs();
    renderFilters();
    renderGrid();
  }

  function render() {
    ensureShell();
    renderChrome();
    renderTabs();
    renderFilters();
    renderGrid();
    if (dialogEl?.open && wikiState.currentEntry) {
      openEntry(wikiState.currentEntry.category, wikiState.currentEntry.id, false);
    }
  }

  return { render, setCategory, openEntry };
}
