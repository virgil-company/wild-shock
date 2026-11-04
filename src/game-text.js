import { t } from './i18n.js';
import { paths } from './catalog.js';
import { namedKey, enemyNameKey } from './text-keys.js';

export const schoolName = id => t(`schools.${id}.name`);
export const pathName = id => t(`paths.${id}.name`);
export const spellName = spell => t(`spells.${spell.id}.name`);
export const enemyName = enemy => t(enemyNameKey(enemy));
export const componentName = name => t(namedKey('components', name));
export const equipmentName = name => t(namedKey('equipment', name));
export const nodeName = node => t('atlas.nodeName', { spell: spellName({ id: `${node.school}-${node.path}` }), rank: node.rank });
export function nodeDescription(node) {
  const spell = spellName({ id: `${node.school}-${node.path}` });
  return t('atlas.nodeDescription', {
    amount: paths[node.path].amount, bonus: t(`paths.${node.path}.bonus`), school: schoolName(node.school),
    unlock: node.rank === 1 ? t('atlas.unlock', { spell }) : '',
  });
}
export const buildName = (school, advanced) => t(`schools.${school}.${advanced ? 'archmage' : 'initiate'}`);
export const logText = entry => entry.key ? t(entry.key, entry.params) : entry.message || '';
