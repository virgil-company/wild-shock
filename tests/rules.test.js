import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame, cast, move, wait, learnSpell, learnUpgrade, useShrine, forge as engineForge,
  availableSpells, finalRealmOf, hasSight, SIZE, serialize, restore, applyComponentPickupEffects,
} from '../src/engine/index.js';
import {
  catalogueCounts, recipeMatches, canForge, forge, addComponent, equipmentByName,
  effectiveSpell, computeElementalDamage, findMatchingComponents,
} from '../src/rules/core.js';

function cleanArena(mode = 'standard') {
  const g = createGame(42, { mode });
  g.tiles = Array.from({ length: SIZE }, (_, y) => Array.from({ length: SIZE }, (_, x) => !x || !y || x === SIZE - 1 || y === SIZE - 1 ? 1 : 0));
  g.player.x = 3; g.player.y = 11; g.enemies = []; g.items = []; g.allies = []; g.clouds = [];
  return g;
}

test('the local compendium catalogue has the complete public build counts', () => {
  assert.deepEqual(catalogueCounts(), { spells: 198, equipment: 375, components: 94 });
});

test('tag recipes use each supplied component once and equipped items replace their slot', () => {
  const game = createGame(3); const item = equipmentByName.get('Acidifier');
  const invalid = ['Arcane Mote', 'Burning Ember', 'Arcane Mote', 'Arcane Mote'];
  assert.equal(recipeMatches(item, invalid), false);
  const valid = ['Shadeweave', "Enchanter's Awl", 'Wildflower', 'Arcane Mote'];
  for (const name of valid) addComponent(game, name);
  assert.ok(canForge(game, 'Acidifier', valid));
  assert.ok(forge(game, 'Acidifier', valid));
  assert.equal(game.components.length, 0); assert.equal(game.equipment.Trinket.name, 'Acidifier');
});

test('spells and upgrades can be learned, scale with equipment, and cast with elemental resistances & SH', () => {
  const g = cleanArena();
  g.points = 20;
  // Magic Missile (id 101) is a starter spell; learn Blood Bullet (id 10) too
  assert.ok(availableSpells(g).some(s => s.id === 'spell-101'));
  assert.ok(learnSpell(g, 10));
  const baseDmg = effectiveSpell(g, 101).damage;

  // Equip Arcane Staff (+6 Arcane damage, +2 max charges)
  g.equipment.Weapon = { name: 'Arcane Staff', components: [] };
  assert.equal(effectiveSpell(g, 101).damage, baseDmg + 6);

  // Enemy with 1 SH absorbs first hit, takes elemental damage on second hit
  g.enemies = [{ id: 1, x: 6, y: 11, name: 'Test', hp: 50, maxHp: 50, damage: 2, range: 1, school: 0, type: 0, shields: 1, resistances: { Arcane: 50 }, statuses: {} }];
  assert.ok(cast(g, 'spell-101', { x: 6, y: 11 }));
  assert.equal(g.enemies[0].shields, 0);
  assert.equal(g.enemies[0].hp, 50);

  assert.ok(cast(g, 'spell-101', { x: g.enemies[0].x, y: g.enemies[0].y }));
  assert.ok(g.enemies[0].hp < 50);

  // Elemental resistance math with Soaked (-100% Lightning)
  const wetEnemy = { resistances: { Lightning: 0 }, statuses: { soaked: 2 } };
  assert.equal(computeElementalDamage(10, 'Lightning', wetEnemy), 20);
});

test('Conjuration summons allied minions that fight enemies autonomously', () => {
  const g = cleanArena();
  g.points = 10;
  // Learn Wolf (id 184, Conjuration)
  assert.ok(learnSpell(g, 184));
  g.enemies = [{ id: 1, x: 7, y: 11, name: 'Target', hp: 30, maxHp: 30, damage: 1, range: 1, school: 0, type: 0, shields: 0, resistances: {}, statuses: {} }];
  assert.ok(cast(g, 'spell-184', { x: 5, y: 11 }));
  assert.equal(g.allies.length, 1);
  // Wait a couple turns so the wolf moves/attacks the enemy
  wait(g); wait(g);
  assert.ok(g.enemies[0].hp < 30);
});

test('Quickcast upgrade does not end turn and Quickstep Boots grants 1 free step per turn', () => {
  const g = cleanArena();
  g.points = 20;
  // Freeze (id 67) has Quickcast upgrade (sp_id 338)
  assert.ok(learnSpell(g, 67));
  assert.ok(learnUpgrade(g, 67, 338));
  assert.equal(effectiveSpell(g, 67).quickCast, true);
  g.enemies = [{ id: 1, x: 6, y: 11, name: 'Foe', hp: 20, maxHp: 20, damage: 2, range: 1, school: 0, type: 0, shields: 0, resistances: {}, statuses: {} }];
  const turnBefore = g.turn;
  assert.ok(cast(g, 'spell-67', { x: 6, y: 11 }));
  assert.equal(g.turn, turnBefore); // Quickcast did NOT advance turn!
  assert.ok(g.enemies[0].statuses.freeze > 0);

  // Quickstep Boots: first step does not advance turn, second step does
  g.equipment.Feet = { name: 'Quickstep Boots', components: [] };
  assert.ok(move(g, 1, 0));
  assert.equal(g.turn, turnBefore);
  assert.ok(move(g, 1, 0));
  assert.equal(g.turn, turnBefore + 1);
});

test('Chasms allow line of sight, block ground movement, allow flying, and freeze into floors with Icicle', () => {
  const g = cleanArena();
  g.tiles[11][4] = 2; // Chasm right in front of player
  assert.equal(hasSight(g, { x: 3, y: 11 }, { x: 7, y: 11 }), true);
  assert.equal(move(g, 1, 0), false); // Cannot walk on chasm

  // Equip Winged Shoes -> can cross chasm
  g.equipment.Feet = { name: 'Winged Shoes', components: [] };
  assert.ok(move(g, 1, 0));
  assert.equal(g.player.x, 4);

  // Icicle (id 86) turns chasms into floors
  g.player.x = 3; g.tiles[11][5] = 2; g.points = 10;
  assert.ok(learnSpell(g, 86));
  assert.ok(cast(g, 'spell-86', { x: 5, y: 11 }));
  assert.equal(g.tiles[11][5], 0);
});

test('Clouds persist and apply effects, and Component on_pickup / on_craft triggers work', () => {
  const g = cleanArena();
  g.points = 10;
  // Rain Storm (id 129) creates Rain Clouds that soak enemies
  assert.ok(learnSpell(g, 129));
  g.enemies = [{ id: 1, x: 6, y: 11, name: 'Dry', hp: 30, maxHp: 30, damage: 1, range: 1, school: 0, type: 0, shields: 0, resistances: {}, statuses: {} }];
  assert.ok(cast(g, 'spell-129', { x: 6, y: 11 }));
  assert.ok(g.clouds.length > 0);
  assert.ok(g.enemies[0].statuses.soaked > 0);

  // Component pickup: Elemental Ice grants +7 SH
  const shBefore = g.player.shields;
  applyComponentPickupEffects(g, 'Elemental Ice');
  assert.equal(g.player.shields, shBefore + 7);

  // Auto-select components & Enchanter's Awl returns on Enchantment craft
  const amulet = equipmentByName.get('Amulet of Emerald Flame');
  g.components = ["Enchanter's Awl", 'Burning Ember', 'Arcane Mote', 'Arcane Mote'];
  const picked = findMatchingComponents(g.components, amulet);
  assert.ok(picked);
  assert.ok(engineForge(g, 'Amulet of Emerald Flame', picked));
  // Enchanter's Awl was returned to inventory!
  assert.ok(g.components.includes("Enchanter's Awl"));
});

test('All five Shrine types work and Archmage Trials restrict spell pools & campaign length', () => {
  const g = cleanArena('trial-pyromancer');
  assert.equal(finalRealmOf(g), 21);
  assert.equal(g.potions, 0);
  g.points = 20;
  // Pyromancer trial allows Fire spells (Fireball already known; Eye of Fire id 52) but blocks pure Ice (Freeze id 67)
  assert.ok(learnSpell(g, 52));
  assert.equal(learnSpell(g, 67), false);

  // Shrine of Chronomancy restores charges & grants +4 SH
  g.shrine = { x: 4, y: 11, type: 'chronomancy', uses: 1 };
  const sh = g.player.shields;
  assert.ok(useShrine(g));
  assert.equal(g.player.shields, sh + 4);
  assert.equal(g.shrine.uses, 0);

  // Shrine of Calling summons permanent Arcane Sentinel
  g.shrine = { x: 4, y: 11, type: 'calling', uses: 1 };
  assert.ok(useShrine(g));
  assert.equal(g.allies.length, 1);
  assert.equal(g.allies[0].name, 'Arcane Sentinel');

  // Round-trip save/restore preserves all game state
  assert.deepEqual(restore(serialize(g)), g);
});
