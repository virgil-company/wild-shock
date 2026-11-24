// Catalog names are existing persisted identifiers. Keep their translation-key
// conversion in one place; changing the displayed label never changes save data.
export const slugKey = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const namedKey = (category, name) => `${category}.${slugKey(name)}.name`;
export const descKey = (category, name) => `${category}.${slugKey(name)}.desc`;
export const textRef = (key, params = {}) => ({ key, params });
export const enemyNameKey = enemy => `enemies.${enemy.boss ? 'boss' : enemy.type}.name`;
export const spellNameKey = spellId => `grimoire.spells.${spellId}.name`;
export const spellDescKey = spellId => `grimoire.spells.${spellId}.desc`;
export const upgradeNameKey = spId => `grimoire.upgrades.${spId}.name`;
export const upgradeDescKey = spId => `grimoire.upgrades.${spId}.desc`;

export function cleanCatalogText(text) {
  return String(text || '').replace(/\[([^:\]]+)(?::[^\]]+)?\]/g, '$1').trim();
}

export function textHash(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function hashedTextKey(prefix, rawText) {
  const cleaned = cleanCatalogText(rawText);
  return cleaned ? `${prefix}.${textHash(cleaned)}` : '';
}
