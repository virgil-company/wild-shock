// Catalog names are existing persisted identifiers. Keep their translation-key
// conversion in one place; changing the displayed label never changes save data.
export const namedKey = (category, name) => `${category}.${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.name`;
export const textRef = (key, params = {}) => ({ key, params });
export const enemyNameKey = enemy => `enemies.${enemy.boss ? 'boss' : enemy.type}.name`;
