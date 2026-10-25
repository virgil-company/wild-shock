import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/engine.js';
import { catalogueCounts, recipeMatches, canForge, forge, addComponent, equipmentByName } from '../src/rw3.js';

test('the local compendium catalogue has the complete public build counts', () => {
  assert.deepEqual(catalogueCounts(), { spells: 196, equipment: 365, components: 93 });
});
test('tag recipes use each supplied component once and equipped items replace their slot', () => {
  const game = createGame(3); const item = equipmentByName.get('Acidifier');
  const invalid = ['Arcane Mote', 'Burning Ember', 'Arcane Mote', 'Arcane Mote'];
  assert.equal(recipeMatches(item, invalid), false);
  // Acidifier requires Dark + Enchantment + Nature + Any.
  const valid = ['Shadeweave', "Enchanter's Awl", 'Wildflower', 'Arcane Mote'];
  for (const name of valid) addComponent(game, name);
  assert.ok(canForge(game, 'Acidifier', valid));
  assert.ok(forge(game, 'Acidifier', valid));
  assert.equal(game.rw3Components.length, 0); assert.equal(game.equipment.Trinket.name, 'Acidifier');
});
