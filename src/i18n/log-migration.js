import en from './locales/en.js';
import { components, equipment, nodes, paths, schools } from '../data/catalog.js';
import { artifacts } from '../data/artifacts.js';
import { namedKey, textRef } from './text-keys.js';

// One-time conversion for journeys saved before logs stored translation keys.
// Lazily initialized so modern saves incur zero startup regex/map overhead.
const escapePattern = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
let legacyPatterns = null;
let refs = null;

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
  for (const node of nodes) refs.set(node.name, textRef('atlas.nodeName', { spell: textRef(`spells.${node.school}-${node.path}.name`), rank: node.rank }));
  for (const school of schools) for (const path of paths) refs.set(`${school.name} ${path.name}`, textRef(`spells.${school.id}-${path.id}.name`));
  for (const item of components) refs.set(item.name, textRef(namedKey('components', item.name)));
  for (const item of equipment) refs.set(item.name, textRef(namedKey('equipment', item.name)));
  for (const item of artifacts) refs.set(item.name, textRef(`artifacts.${item.id}.name`));
  for (const [key, value] of Object.entries(en)) if (/^(materials|slots|enemies)\./.test(key)) refs.set(value, textRef(key));
}

export function migrateLogEntry(entry) {
  if (entry.params?.spell?.key === 'spells.dev-big-bang.name') {
    return { ...entry, params: { ...entry.params, spell: 'Big Bang' } };
  }
  if (entry.key || typeof entry.message !== 'string') return entry;
  ensureMigrationTables();
  for (const { key, names, pattern } of legacyPatterns) {
    const match = entry.message.match(pattern);
    if (!match) continue;
    const params = Object.fromEntries(names.map((name, index) => [name, refs.get(match[index + 1]) || match[index + 1]]));
    return { key, params, tone: entry.tone, turn: entry.turn };
  }
  return entry;
}
