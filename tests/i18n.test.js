import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { t, setLocale, getLocale, locales, localeOptions } from '../src/i18n.js';
import { nodes, schools, paths } from '../src/catalog.js';
import { rw3Components, rw3Equipment } from '../src/rw3-catalog.js';
import { artifacts } from '../src/artifacts.js';
import { namedKey } from '../src/text-keys.js';
import { nodeName, nodeDescription, logText } from '../src/game-text.js';
import { createGame, wait, serialize, restore } from '../src/engine.js';

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
  const keys = [...html.matchAll(/data-i18n(?:-[\w-]+)?="([^"]+)"/g)].map(match => match[1]);
  for (const item of rw3Components) keys.push(namedKey('components', item.name));
  for (const item of rw3Equipment) keys.push(namedKey('equipment', item.name));
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
