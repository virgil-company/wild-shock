import en from './locales/en.js';
import { nodes, schools, paths } from './catalog.js';
import { artifacts } from './artifacts.js';
import { rw3Components, rw3Equipment } from './rw3-catalog.js';
import { namedKey, textRef } from './text-keys.js';

// One-time conversion for journeys saved before logs stored translation keys.
// This matches complete English event templates, never text in the interface.
const escapePattern = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const legacyPatterns = Object.entries(en).filter(([key]) => key.startsWith('log.')).map(([key, template]) => {
  const names = [];
  const parts = template.split(/\{(\w+)\}/g);
  const pattern = parts.map((part, index) => index % 2 ? (names.push(part), '(.+?)') : escapePattern(part)).join('');
  return { key, names, pattern: new RegExp(`^${pattern}$`) };
});
const refs = new Map();
for (const node of nodes) refs.set(node.name, textRef('atlas.nodeName', { spell: textRef(`spells.${node.school}-${node.path}.name`), rank: node.rank }));
for (const school of schools) for (const path of paths) refs.set(`${school.name} ${path.name}`, textRef(`spells.${school.id}-${path.id}.name`));
for (const item of rw3Components) refs.set(item.name, textRef(namedKey('components', item.name)));
for (const item of rw3Equipment) refs.set(item.name, textRef(namedKey('equipment', item.name)));
for (const item of artifacts) refs.set(item.name, textRef(`artifacts.${item.id}.name`));
for (const [key, value] of Object.entries(en)) if (/^(materials|slots|enemies)\./.test(key)) refs.set(value, textRef(key));
refs.set('Big Bang', textRef('spells.dev-big-bang.name'));
export function migrateLogEntry(entry) {
  if (entry.key || typeof entry.message !== 'string') return entry;
  for (const { key, names, pattern } of legacyPatterns) {
    const match = entry.message.match(pattern);
    if (!match) continue;
    const params = Object.fromEntries(names.map((name, index) => [name, refs.get(match[index + 1]) || match[index + 1]]));
    return { key, params, tone: entry.tone, turn: entry.turn };
  }
  return entry;
}
