import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { locales } from '../src/i18n/i18n.js';
import { rw3Components, rw3Equipment, rw3Spells, rw3Units } from '../src/data/rw3-catalog.js';
import { SHRINE_TYPES, CLOUD_TYPES } from '../src/data/constants.js';
import {
  WIKI_CATEGORIES, classifyUnitRole, filterWikiEntries,
  getWikiDatasets, splitResistances, totalWikiEntries,
} from '../src/ui/wiki.js';
import { cloudIconSvg, componentIconSvg, shrineIconSvg, tagIconSvg, unitIconSvg } from '../src/ui/svg-icons.js';

test('wiki datasets cover every unit, spell, equipment, component, and world resource', () => {
  const ds = getWikiDatasets();
  assert.deepEqual(Object.keys(ds), WIKI_CATEGORIES);
  assert.equal(ds.monsters.length + ds.bosses.length + ds.companions.length, rw3Units.length);
  assert.equal(ds.spells.length, rw3Spells.length);
  assert.equal(ds.equipment.length, rw3Equipment.length);
  assert.ok(ds.items.length >= rw3Components.length + 12);
  assert.ok(ds.world.length >= SHRINE_TYPES.length + Object.keys(CLOUD_TYPES).length);
  assert.equal(totalWikiEntries(), WIKI_CATEGORIES.reduce((s, c) => s + ds[c].length, 0));
});

test('splitResistances separates weaknesses, resistances, and immunities cleanly', () => {
  const { immunities, resistances, weaknesses } = splitResistances({
    Fire: 100, Dark: 75, Ice: -50, Holy: -100, Poison: 0,
  });
  assert.deepEqual(immunities, [['Fire', 100]]);
  assert.deepEqual(resistances, [['Dark', 75]]);
  assert.deepEqual(weaknesses, [['Ice', -50], ['Holy', -100]]);
});

test('wiki filters accurately filter by weakness, resistance, role, tags, and search query', () => {
  const weakToHoly = filterWikiEntries('monsters', { weak: 'Holy' });
  assert.ok(weakToHoly.length > 0);
  assert.ok(weakToHoly.every(u => (u.resists?.Holy || 0) < 0));

  const resistsFire = filterWikiEntries('bosses', { resist: 'Fire' });
  assert.ok(resistsFire.length > 0);
  assert.ok(resistsFire.every(u => (u.resists?.Fire || 0) > 0));

  const mordreds = filterWikiEntries('bosses', { bossType: 'boss_mordred' });
  assert.equal(mordreds.length, 3);
  assert.ok(mordreds.every(u => classifyUnitRole(u) === 'boss_mordred'));

  const bookSpells = filterWikiEntries('spells', { special: 'book' });
  assert.ok(bookSpells.length > 0);
  assert.ok(bookSpells.every(s => Boolean(s.granted_by)));

  const rareCraftComps = filterWikiEntries('items', { itemType: 'component', tier: 'rare', trigger: 'craft' });
  assert.ok(rareCraftComps.length > 0);
  assert.ok(rareCraftComps.every(e => e.kind === 'component' && e.data.rare && e.data.on_craft));

  const shrines = filterWikiEntries('world', { worldType: 'shrine' });
  assert.equal(shrines.length, SHRINE_TYPES.length);
});

test('wiki.html i18n attributes exist in all locales and SVG icon builders succeed for all catalog entries', () => {
  const html = readFileSync(new URL('../wiki.html', import.meta.url), 'utf8');
  const keys = [...html.matchAll(/data-i18n(?:-[\w-]+)?="([^"]+)"/g)].map(m => m[1]);
  for (const [locale, messages] of Object.entries(locales)) {
    for (const key of keys) assert.ok(Object.hasOwn(messages, key), `${locale}: ${key}`);
  }
  for (const u of rw3Units) assert.match(unitIconSvg(u, 24), /^<svg /);
  for (const c of rw3Components) assert.match(componentIconSvg(c, 24), /^<svg /);
  for (const s of SHRINE_TYPES) assert.match(shrineIconSvg(s, 24), /^<svg /);
  for (const c of Object.values(CLOUD_TYPES)) assert.match(cloudIconSvg(c.color, 24), /^<svg /);
  for (const tg of ['Construct', 'Demon', 'Glass', 'Living', 'Spider', 'Undead', 'Physical', 'Poison']) {
    assert.match(tagIconSvg(tg, 16), /^<svg /);
  }
});
