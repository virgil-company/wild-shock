import en from './locales/en.js';
import { components, equipment, nodes, paths, schools, spells, units } from '../data/catalog.js';
import { artifacts } from '../data/artifacts.js';
import { namedKey, slugKey, spellNameKey, textRef, upgradeNameKey } from './text-keys.js';

// One-time conversion for journeys saved before logs stored translation keys.
// Lazily initialized so modern saves incur zero startup regex/map overhead.
const escapePattern = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
let legacyPatterns = null;
let refs = null;
let spellRefs = null;
let upgradeRefs = null;
let unitRefs = null;
let equipmentRefs = null;

function ensureMigrationTables() {
  if (legacyPatterns) return;
  legacyPatterns = Object.entries(en)
    .filter(([key]) => key.startsWith('log.'))
    .map(([key, template]) => {
      const names = [];
      const parts = template.split(/\{(\w+)\}/g);
      const pattern = parts.map((part, index) => (index % 2 ? (names.push(part), '(.+?)') : escapePattern(part))).join('');
      return { key, names, pattern: new RegExp(`^${pattern}$`) };
    });
  refs = new Map();
  spellRefs = new Map();
  upgradeRefs = new Map();
  unitRefs = new Map();
  equipmentRefs = new Map();
  for (const node of nodes) refs.set(node.name, textRef('atlas.nodeName', { spell: textRef(`spells.${node.school}-${node.path}.name`), rank: node.rank }));
  for (const school of schools) for (const path of paths) refs.set(`${school.name} ${path.name}`, textRef(`spells.${school.id}-${path.id}.name`));
  for (const spell of spells) {
    const ref = textRef(spellNameKey(spell.id));
    spellRefs.set(spell.name, ref);
    for (const upgrade of spell.upgrades || []) {
      upgradeRefs.set(`${spell.id}:${upgrade.name}`, textRef(upgradeNameKey(upgrade.sp_id)));
      if (!upgradeRefs.has(upgrade.name)) upgradeRefs.set(upgrade.name, textRef(upgradeNameKey(upgrade.sp_id)));
    }
  }
  for (const unit of units) {
    unitRefs.set(unit.name, textRef(namedKey('units', unit.name)));
  }
  unitRefs.set('Rift Lair', textRef('allies.rift-lair'));
  unitRefs.set('Great Faery', textRef('allies.great-faery'));
  unitRefs.set('Arcane Sentinel', textRef('allies.arcane-sentinel'));
  for (const item of components) refs.set(item.name, textRef(namedKey('components', item.name)));
  for (const item of equipment) {
    const ref = textRef(namedKey('equipment', item.name));
    refs.set(item.name, ref);
    equipmentRefs.set(item.name, ref);
  }
  for (const item of artifacts) refs.set(item.name, textRef(`artifacts.${item.id}.name`));
  for (const [key, value] of Object.entries(en)) if (/^(materials|slots|enemies)\./.test(key)) refs.set(value, textRef(key));
}

function migrateParams(entry) {
  const params = entry.params;
  if (!params || typeof params !== 'object') return entry;
  let updated = null;
  const setParam = (field, value) => {
    if (!updated) updated = { ...params };
    updated[field] = value;
  };
  if (typeof params.spell === 'string') {
    ensureMigrationTables();
    const ref = spellRefs.get(params.spell);
    if (ref) setParam('spell', ref);
  }
  if (typeof params.upgrade === 'string') {
    ensureMigrationTables();
    const spellKey = (updated?.spell || params.spell)?.key;
    const match = typeof spellKey === 'string' && spellKey.match(/^grimoire\.spells\.(\d+)\.name$/);
    const ref = (match && upgradeRefs.get(`${match[1]}:${params.upgrade}`)) || upgradeRefs.get(params.upgrade);
    if (ref) setParam('upgrade', ref);
  }
  if (typeof params.enemy === 'string') {
    ensureMigrationTables();
    const ref = unitRefs.get(params.enemy) || refs.get(params.enemy);
    if (ref) setParam('enemy', ref);
  }
  if (typeof params.name === 'string' && entry.key === 'log.companion') {
    ensureMigrationTables();
    const ref = unitRefs.get(params.name) || textRef(`allies.${slugKey(params.name)}`);
    if (ref) setParam('name', ref);
  }
  if (typeof params.item === 'string' && entry.key === 'log.forged') {
    ensureMigrationTables();
    const ref = equipmentRefs.get(params.item);
    if (ref) setParam('item', ref);
  }
  return updated ? { ...entry, params: updated } : entry;
}

export function migrateLogEntry(entry) {
  if (entry.params?.spell?.key === 'spells.dev-big-bang.name') {
    return { ...entry, params: { ...entry.params, spell: 'Big Bang' } };
  }
  if (entry.key) return migrateParams(entry);
  if (typeof entry.message !== 'string') return entry;
  ensureMigrationTables();
  for (const { key, names, pattern } of legacyPatterns) {
    const match = entry.message.match(pattern);
    if (!match) continue;
    const params = Object.fromEntries(names.map((name, index) => [name, refs.get(match[index + 1]) || match[index + 1]]));
    return migrateParams({ key, params, tone: entry.tone, turn: entry.turn });
  }
  return entry;
}
