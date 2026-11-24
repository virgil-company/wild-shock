import { hasKey, t } from './i18n.js';
import { paths, spells as catalogSpells } from '../data/catalog.js';
import {
  cleanCatalogText, descKey, enemyNameKey, hashedTextKey,
  namedKey, slugKey, spellDescKey, spellNameKey, upgradeDescKey, upgradeNameKey,
} from './text-keys.js';

const spellIdByName = new Map(catalogSpells.map(s => [s.name, s.id]));

export const schoolName = id => t(`schools.${id}.name`);
export const pathName = id => t(`paths.${id}.name`);
export const spellName = spell => t(`spells.${spell.id}.name`);
export const enemyName = enemy => t(enemyNameKey(enemy));
export const componentName = name => t(namedKey('components', name));
export const equipmentName = name => t(namedKey('equipment', name));
export const nodeName = node => t('atlas.nodeName', { spell: spellName({ id: `${node.school}-${node.path}` }), rank: node.rank });

export function resolveSpellNumericId(spellOrId) {
  if (typeof spellOrId === 'number') return spellOrId;
  if (typeof spellOrId === 'string') {
    const match = spellOrId.match(/^(?:spell-)?(\d+)$/);
    return match ? Number(match[1]) : (spellIdByName.get(spellOrId) ?? null);
  }
  if (spellOrId && typeof spellOrId === 'object') {
    if (Number.isInteger(spellOrId.spellId)) return spellOrId.spellId;
    return resolveSpellNumericId(spellOrId.id);
  }
  return null;
}

export function grimoireSpellName(spellOrId) {
  const id = resolveSpellNumericId(spellOrId);
  if (id != null) {
    const key = spellNameKey(id);
    if (hasKey(key)) return t(key);
  }
  return typeof spellOrId === 'object' ? (spellOrId?.name || '') : String(spellOrId || '');
}

export function grimoireSpellDesc(spellOrId) {
  const id = resolveSpellNumericId(spellOrId);
  if (id != null) {
    const key = spellDescKey(id);
    if (hasKey(key)) return t(key);
  }
  return typeof spellOrId === 'object' ? cleanCatalogText(spellOrId?.desc) : '';
}

export function upgradeName(upgrade) {
  if (!upgrade) return '';
  const key = upgradeNameKey(upgrade.sp_id);
  return hasKey(key) ? t(key) : upgrade.name;
}

export function upgradeDesc(upgrade) {
  if (!upgrade) return '';
  const key = upgradeDescKey(upgrade.sp_id);
  return hasKey(key) ? t(key) : cleanCatalogText(upgrade.desc);
}

export function componentDesc(comp) {
  if (!comp?.desc) return '';
  const key = descKey('components', comp.name);
  return hasKey(key) ? t(key) : cleanCatalogText(comp.desc);
}

export function equipmentDesc(item) {
  if (!item?.desc) return '';
  const key = descKey('equipment', item.name);
  return hasKey(key) ? t(key) : cleanCatalogText(item.desc);
}

export function equipmentBonusText(bonus) {
  const key = hashedTextKey('equipmentBonuses', bonus);
  return key && hasKey(key) ? t(key) : cleanCatalogText(bonus);
}

export function unitName(name) {
  if (!name) return '';
  const unitKey = namedKey('units', name);
  if (hasKey(unitKey)) return t(unitKey);
  const allyKey = `allies.${slugKey(name)}`;
  if (hasKey(allyKey)) return t(allyKey);
  const spellId = spellIdByName.get(name);
  if (spellId != null && hasKey(spellNameKey(spellId))) return t(spellNameKey(spellId));
  return name;
}

export function abilityName(name) {
  if (!name) return '';
  const key = namedKey('abilities', name);
  return hasKey(key) ? t(key) : name;
}

export function abilityDesc(desc) {
  if (!desc) return '';
  const key = hashedTextKey('abilityDescs', desc);
  return key && hasKey(key) ? t(key) : cleanCatalogText(desc);
}

export function passiveText(passive) {
  if (!passive) return '';
  const key = hashedTextKey('passives', passive);
  return key && hasKey(key) ? t(key) : cleanCatalogText(passive);
}

export function tagName(tag) {
  if (!tag) return '';
  const key = `tags.${slugKey(tag)}`;
  return hasKey(key) ? t(key) : tag;
}

export function damageTypeName(damageType) {
  if (!damageType) return '';
  const key = `damageTypes.${slugKey(damageType)}`;
  return hasKey(key) ? t(key) : damageType;
}

export function damageTypeShort(damageType) {
  if (!damageType) return '';
  const key = `damageTypes.${slugKey(damageType)}.short`;
  return hasKey(key) ? t(key) : String(damageType).slice(0, 3);
}

export function statusName(status) {
  if (!status) return '';
  const key = `statuses.${status}`;
  return hasKey(key) ? t(key) : status;
}

export function behaviorName(behavior) {
  if (!behavior) return '';
  const key = `behaviors.${behavior}`;
  return hasKey(key) ? t(key) : String(behavior).toUpperCase();
}

export function cloudName(cloudId, fallback = '') {
  const key = `clouds.${cloudId}.name`;
  return hasKey(key) ? t(key) : fallback;
}

export function vaultName(name) {
  if (!name) return '';
  const key = `vaults.${slugKey(name)}`;
  return hasKey(key) ? t(key) : name;
}

export function mutatorName(id) {
  const key = `mutators.${id}.name`;
  return hasKey(key) ? t(key) : id;
}

export function poolName(pool) {
  const id = pool || 'normal';
  const key = `pools.${id}`;
  return hasKey(key) ? t(key) : id;
}

export function outfitName(name) {
  if (!name) return '';
  const key = namedKey('wardrobe', name);
  return hasKey(key) ? t(key) : name;
}

export function outfitUnlock(outfit) {
  if (!outfit?.unlock) return t('wiki.label.defaultOutfit');
  const key = `wardrobe.${slugKey(outfit.name)}.unlock`;
  return hasKey(key) ? t(key) : outfit.unlock;
}

export function buffName(name) {
  if (!name) return '';
  const slug = slugKey(name);
  const buffKey = `buffs.${slug}`;
  if (hasKey(buffKey)) return t(buffKey);
  const compKey = namedKey('components', name);
  if (hasKey(compKey)) return t(compKey);
  const eqKey = namedKey('equipment', name);
  if (hasKey(eqKey)) return t(eqKey);
  const spellId = spellIdByName.get(name);
  if (spellId != null && hasKey(spellNameKey(spellId))) return t(spellNameKey(spellId));
  return name;
}

export function nodeDescription(node) {
  const spell = spellName({ id: `${node.school}-${node.path}` });
  return t('atlas.nodeDescription', {
    amount: paths[node.path].amount, bonus: t(`paths.${node.path}.bonus`), school: schoolName(node.school),
    unlock: node.rank === 1 ? t('atlas.unlock', { spell }) : '',
  });
}

export const buildName = (school, advanced) => t(`schools.${school}.${advanced ? 'archmage' : 'initiate'}`);
export const logText = entry => entry.key ? t(entry.key, entry.params) : entry.message || '';
