import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { t, setLocale, getLocale, locales, localeOptions } from '../src/i18n/i18n.js';
import { components, equipment, nodes, paths, schools, spells, tags, units, wardrobe } from '../src/data/catalog.js';
import { artifacts } from '../src/data/artifacts.js';
import { CLOUD_TYPES, DAMAGE_TYPES, DEBUFF_STATUSES, STATUS_LIST, TICK_DECAY_STATUSES } from '../src/data/constants.js';
import { mutators, vaults } from '../src/data/campaign.js';
import { descKey, hashedTextKey, namedKey, slugKey, spellDescKey, spellNameKey, upgradeDescKey, upgradeNameKey } from '../src/i18n/text-keys.js';
import {
  abilityDesc, abilityName, componentDesc, damageTypeName, damageTypeShort,
  equipmentBonusText, equipmentDesc, equipmentName, grimoireSpellDesc,
  grimoireSpellName, logText, mutatorName, nodeDescription, nodeName,
  outfitName, outfitUnlock, passiveText, statusName, tagName, unitName,
  upgradeDesc, upgradeName, vaultName,
} from '../src/i18n/game-text.js';
import { createGame, learnSpell, learnUpgrade, wait, serialize, restore } from '../src/engine/index.js';

const placeholders = value => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();

test('every locale has the same keys and interpolation parameters', () => {
  const keys = Object.keys(locales.en).sort();
  assert.deepEqual(localeOptions.map(option => option.value).sort(), Object.keys(locales).sort());
  for (const [locale, messages] of Object.entries(locales)) {
    assert.deepEqual(Object.keys(messages).sort(), keys, locale);
    for (const key of keys) {
      assert.equal(typeof messages[key], 'string', `${locale}: ${key}`);
      assert.ok(messages[key].trim(), `${locale}: ${key} is empty`);
      assert.deepEqual(placeholders(messages[key]), placeholders(locales.en[key]), `${locale}: ${key}`);
    }
  }
});

test('markup and game catalogs reference keys available in every locale', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const wikiHtml = readFileSync(new URL('../wiki.html', import.meta.url), 'utf8');
  const keys = [
    ...[...html.matchAll(/data-i18n(?:-[\w-]+)?="([^"]+)"/g)].map(match => match[1]),
    ...[...wikiHtml.matchAll(/data-i18n(?:-[\w-]+)?="([^"]+)"/g)].map(match => match[1]),
  ];
  for (const item of components) {
    keys.push(namedKey('components', item.name));
    if (item.desc) keys.push(descKey('components', item.name));
  }
  for (const item of equipment) {
    keys.push(namedKey('equipment', item.name));
    if (item.desc) keys.push(descKey('equipment', item.name));
    for (const bonus of item.bonuses || []) keys.push(hashedTextKey('equipmentBonuses', bonus));
  }
  for (const spell of spells) {
    keys.push(spellNameKey(spell.id), spellDescKey(spell.id));
    for (const upgrade of spell.upgrades || []) keys.push(upgradeNameKey(upgrade.sp_id), upgradeDescKey(upgrade.sp_id));
  }
  for (const unit of units) {
    keys.push(namedKey('units', unit.name));
    for (const ability of unit.abilities || []) {
      keys.push(namedKey('abilities', ability.name));
      if (ability.desc) keys.push(hashedTextKey('abilityDescs', ability.desc));
    }
    for (const passive of unit.passives || []) keys.push(hashedTextKey('passives', passive));
  }
  for (const outfit of wardrobe) {
    keys.push(namedKey('wardrobe', outfit.name));
    if (outfit.unlock) keys.push(`wardrobe.${slugKey(outfit.name)}.unlock`);
  }
  for (const tag of [...new Set([...tags, ...units.flatMap(u => u.tags || []), 'Any'])]) keys.push(`tags.${slugKey(tag)}`);
  for (const dt of DAMAGE_TYPES) keys.push(`damageTypes.${slugKey(dt)}`, `damageTypes.${slugKey(dt)}.short`);
  for (const status of new Set([...STATUS_LIST, ...DEBUFF_STATUSES, ...TICK_DECAY_STATUSES, 'quickstep', 'ironize'])) keys.push(`statuses.${status}`);
  for (const cloudId of Object.keys(CLOUD_TYPES)) keys.push(`clouds.${cloudId}.name`);
  for (const vault of Object.keys(vaults)) keys.push(`vaults.${slugKey(vault)}`);
  for (const mutator of mutators) keys.push(`mutators.${mutator}`, `mutators.${mutator}.name`);
  for (const item of artifacts) keys.push(`artifacts.${item.id}.name`, `artifacts.${item.id}.description`);
  for (const school of schools) {
    keys.push(`schools.${school.id}.name`, `schools.${school.id}.initiate`, `schools.${school.id}.archmage`);
    for (const path of paths) keys.push(`spells.${school.id}-${path.id}.name`);
  }
  for (const [locale, messages] of Object.entries(locales)) for (const key of keys) {
    assert.ok(Object.hasOwn(messages, key), `${locale}: ${key}`);
  }
  // Adding an English phrase to a component must not silently recreate source-text lookup.
  setLocale('pt-BR');
  assert.equal(t('Saved locally'), 'Saved locally');
});

test('catalog helpers return localized labels in PT-BR and ES', () => {
  const fireball = spells.find(s => s.name === 'Fireball');
  const acidifier = equipment.find(e => e.name === 'Acidifier');
  const mote = components.find(c => c.name === 'Arcane Mote');
  const goblin = units.find(u => u.name === 'Goblin');
  const describedAbility = units.flatMap(u => u.abilities || []).find(a => a.desc);
  const pyromancer = wardrobe.find(w => w.name === 'Pyromancer');

  for (const lang of ['pt-BR', 'es']) {
    setLocale(lang);
    assert.notEqual(grimoireSpellName(fireball), fireball.name, `${lang}: spell name`);
    assert.notEqual(grimoireSpellDesc(fireball), fireball.desc, `${lang}: spell desc`);
    assert.notEqual(upgradeName(fireball.upgrades[0]), fireball.upgrades[0].name, `${lang}: upgrade name`);
    assert.notEqual(upgradeDesc(fireball.upgrades[0]), fireball.upgrades[0].desc, `${lang}: upgrade desc`);
    assert.notEqual(equipmentName(acidifier.name), acidifier.name, `${lang}: equipment name`);
    assert.notEqual(equipmentDesc(acidifier), acidifier.desc, `${lang}: equipment desc`);
    assert.notEqual(componentDesc(mote), mote.desc, `${lang}: component desc`);
    assert.ok(unitName(goblin.name));
    assert.ok(abilityName(describedAbility.name));
    assert.notEqual(abilityDesc(describedAbility.desc), describedAbility.desc, `${lang}: ability desc`);
    assert.ok(passiveText(units.find(u => u.passives.length).passives[0]));
    assert.ok(equipmentBonusText(equipment.find(e => e.bonuses.length).bonuses[0]));
    assert.notEqual(tagName('Fire'), 'Fire', `${lang}: tag`);
    assert.notEqual(damageTypeName('Lightning'), 'Lightning', `${lang}: damageType`);
    assert.notEqual(damageTypeShort('Lightning'), 'Lig', `${lang}: damageTypeShort`);
    assert.notEqual(statusName('freeze'), 'freeze', `${lang}: status`);
    assert.notEqual(vaultName('Flame'), 'Flame', `${lang}: vault`);
    assert.notEqual(mutatorName('weather'), 'weather', `${lang}: mutator`);
    assert.notEqual(outfitName(pyromancer.name), pyromancer.name, `${lang}: outfit`);
    assert.notEqual(outfitUnlock(pyromancer), pyromancer.unlock, `${lang}: outfit unlock`);
  }

  const game = createGame(42);
  assert.ok(learnSpell(game, 67));
  assert.ok(learnUpgrade(game, 67, 338));
  const saved = serialize(game);
  setLocale('pt-BR');
  assert.match(logText(game.log[0]), /aprimorada com/);
  setLocale('es');
  assert.match(logText(game.log[0]), /mejorado con|Hechizo/);
  assert.equal(serialize(game), saved);
  setLocale('en');
});

test('key lookup interpolates once and supports language-neutral references', () => {
  setLocale('pt-BR');
  assert.equal(t('realm.turn', { turn: '012' }), 'TURNO 012');
  assert.equal(t('log.cast.other', { spell: { key: 'spells.0-0.name' }, count: 3 }), 'Raio da Tempestade atinge 3 alvos.');
  assert.equal(t('inspection.affinities', { schools: '{count} $& <b>Storm</b>' }), 'Afinidades: {count} $& <b>Storm</b>');
  assert.equal(t('missing.key'), 'missing.key');
  assert.equal(nodeName(nodes[0]), 'Raio da Tempestade 1');
  assert.match(nodeDescription(nodes[0]), /Desbloqueia Raio da Tempestade/);
  setLocale('es');
  assert.equal(nodeName(nodes[0]), 'Rayo de Tormenta 1');
  assert.equal(t('realm.open'), '✧ Grietas abiertas. Entra en cualquier portal.');
  setLocale('unsupported');
  assert.equal(getLocale(), 'en');
  assert.equal(t('save.available'), 'Saved locally');
});

test('new and restored logs render in the selected locale without changing saved events', () => {
  const game = createGame(42);
  wait(game);
  const saved = serialize(game);
  assert.equal(game.log[0].key, 'log.wait');
  assert.equal(game.log[0].message, undefined);
  setLocale('pt-BR');
  assert.equal(logText(game.log[0]), 'Você espera.');
  setLocale('es');
  assert.equal(logText(game.log[0]), 'Esperas.');
  assert.equal(serialize(game), saved);

  game.log = [
    { message: 'Learned Storm Bolt 1.', turn: 1, tone: 'gold' },
    { message: 'Collected Arcane Mote.', turn: 1, tone: 'gold' },
    { message: 'Storm Bolt strikes 3 targets.', turn: 1, tone: '' },
    { message: 'Cinder imp hits for 2.', turn: 1, tone: 'red' },
  ];
  const restored = restore(serialize(game));
  assert.ok(restored);
  assert.equal(restored.log[0].key, 'log.learned');
  assert.equal(logText(restored.log[0]), 'Habilidad aprendida: Rayo de Tormenta 1.');
  assert.equal(logText(restored.log[1]), 'Recogido: Partícula arcana.');
  assert.equal(logText(restored.log[2]), 'Rayo de Tormenta alcanza 3 objetivos.');
  setLocale('en');
  assert.equal(logText(restored.log[3]), 'Cinder imp hits for 2.');
  assert.deepEqual(restore(serialize(restored)).log, restored.log);
});
