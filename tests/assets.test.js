import { test } from 'node:test';
import assert from 'node:assert/strict';
import { components, equipment, spells, units, wardrobe } from '../src/data/catalog.js';
import { artifacts, materials } from '../src/data/artifacts.js';
import { mutators, vaults } from '../src/data/campaign.js';
import { CLOUD_TYPES, SHRINE_TYPES } from '../src/data/constants.js';
import {
  artifactIconSvg, cloudIconSvg, componentIconSvg, entityIconSvg,
  equipmentIconSvg, mutatorIconSvg, outfitIconSvg, pickupIconSvg,
  shrineIconSvg, spellIconSvg, unitIconSvg, vaultIconSvg, wizardPortraitSvg,
} from '../src/ui/svg-icons.js';

function assertValidSvg(svg, label) {
  assert.equal(typeof svg, 'string', `${label}: expected string`);
  assert.match(svg, /^<svg\b[^>]*viewBox="0 0 \d+ \d+"[^>]*>[\s\S]+<\/svg>$/, `${label}: invalid svg wrapper`);
  assert.ok(!svg.includes('undefined'), `${label}: contains undefined`);
  assert.ok(!svg.includes('NaN'), `${label}: contains NaN`);
}

function assertCategoryUnique(entries, renderFn, categoryName) {
  const seen = new Map();
  for (const [label, item] of entries) {
    const svg = renderFn(item);
    assertValidSvg(svg, `${categoryName}:${label}`);
    // Strip aria-label so uniqueness is guaranteed visually in the actual SVG paths/shapes/colors, not merely by the aria-label attribute!
    const visualBody = svg.replace(/\s+aria-label="[^"]*"/, '');
    if (seen.has(visualBody)) {
      assert.fail(`${categoryName}: duplicate visual SVG between "${seen.get(visualBody)}" and "${label}"`);
    }
    seen.set(visualBody, label);
  }
  return seen.size;
}

test('every monster, boss, and companion has a valid, visually unique SVG asset', () => {
  const monsters = units.filter(u => !u.is_boss && !u.is_companion);
  const bosses = units.filter(u => u.is_boss);
  const companions = units.filter(u => u.is_companion);

  assert.equal(assertCategoryUnique(monsters.map(u => [u.name, u]), u => unitIconSvg(u, 48), 'monster'), monsters.length);
  assert.equal(assertCategoryUnique(bosses.map(u => [u.name, u]), u => unitIconSvg(u, 48), 'boss'), bosses.length);
  assert.equal(assertCategoryUnique(companions.map(u => [u.name, u]), u => unitIconSvg(u, 48), 'companion'), companions.length);
  // Also ensure zero collisions across all 496 units combined
  assert.equal(assertCategoryUnique(units.map(u => [u.name, u]), u => unitIconSvg(u, 48), 'all-units'), units.length);
});

test('every spell and equipment item has a valid, visually unique SVG asset', () => {
  assert.equal(assertCategoryUnique(spells.map(s => [s.name, s]), s => spellIconSvg(s, 48), 'spell'), spells.length);
  assert.equal(assertCategoryUnique(equipment.map(e => [e.name, e]), e => equipmentIconSvg(e, 48), 'equipment'), equipment.length);
});

test('every component, artifact, pickup, and material has a valid, visually unique SVG asset', () => {
  assert.equal(assertCategoryUnique(components.map(c => [c.name, c]), c => componentIconSvg(c, 48), 'component'), components.length);
  assert.equal(assertCategoryUnique(artifacts.map(a => [a.id, a]), a => artifactIconSvg(a, 48), 'artifact'), artifacts.length);
  const pickups = ['potion', 'shard', 'scroll', 'tome', 'chest', 'companion', ...materials];
  assert.equal(assertCategoryUnique(pickups.map(p => [p, p]), p => pickupIconSvg(p, 48), 'pickup'), pickups.length);
});

test('every shrine, cloud, vault, mutator, outfit, and world entity has a valid, visually unique SVG asset', () => {
  assert.equal(assertCategoryUnique(SHRINE_TYPES.map(s => [s, s]), s => shrineIconSvg(s, 48), 'shrine'), SHRINE_TYPES.length);
  assert.equal(assertCategoryUnique(Object.keys(CLOUD_TYPES).map(id => [id, id]), id => cloudIconSvg(id, 48), 'cloud'), Object.keys(CLOUD_TYPES).length);
  assert.equal(assertCategoryUnique(Object.keys(vaults).map(v => [v, v]), v => vaultIconSvg(v, 48), 'vault'), Object.keys(vaults).length);
  assert.equal(assertCategoryUnique(mutators.map(m => [m, m]), m => mutatorIconSvg(m, 48), 'mutator'), mutators.length);
  assert.equal(assertCategoryUnique(wardrobe.map(w => [w.name, w.name]), n => outfitIconSvg(n, 48), 'outfit'), wardrobe.length);

  for (const w of ['portal-moss', 'portal-ember', 'chasm', 'lair', 'empty']) {
    assertValidSvg(entityIconSvg(w, 48), `world:${w}`);
  }
  assertValidSvg(wizardPortraitSvg('Wizard'), 'portrait:Wizard');
  assertValidSvg(wizardPortraitSvg('Pyromancer'), 'portrait:Pyromancer');
});
