import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame, generateRealm, availableSpells, cast, move, wait, learnRw3Spell, learnRw3Upgrade,
  applyComponentPickupEffects, deploy, claimReward, rerollRifts, previewPortal, forge, useShrine, restore, serialize, SIZE,
} from '../src/engine.js';
import { spellByName, findMatchingComponents, recipeMatches, rw3Equipment, rw3Components, effectiveRw3Spell, getUnitResistance } from '../src/rw3.js';
import { rw3Spells, rw3Units, wardrobe } from '../src/rw3-catalog.js';
import { units, searchCatalogue, covers, unitStats } from '../src/bestiary.js';
import { vaults, outfitUnlocks } from '../src/campaign.js';

function arena(mode = 'standard') {
  const game = createGame(31, { mode });
  game.tiles = Array.from({ length: SIZE }, (_, y) => Array.from({ length: SIZE }, (_, x) => Number(!x || !y || x === SIZE - 1 || y === SIZE - 1)));
  game.enemies = []; game.items = []; game.points = 20000; game.player.shields = 0;
  game.player.hp = 500; game.bonusMaxHp = 445;
  return game;
}
function enemy(game, x, y, opts = {}) {
  const e = { ...unitStats(units.get('Goblin')), id: game.enemies.length, x, y, school: 1, hp: 600, maxHp: 600, stationary: true, ...opts };
  game.enemies.push(e); return e;
}
function learn(game, name, upgrades = []) {
  const s = spellByName.get(name);
  if (!availableSpells(game).some(e => e.rw3Id === s.id)) assert.ok(learnRw3Spell(game, s.id), name);
  for (const up of upgrades) assert.ok(learnRw3Upgrade(game, s.id, s.upgrades.find(u => u.name === up).sp_id));
  return 'rw3-' + s.id;
}

test('all spells and upgrades have unique purchase keys and all recipes match real ingredients', () => {
  assert.equal(new Set(rw3Spells.map(s => s.id)).size, 198);
  assert.ok(rw3Spells.every(s => Number.isInteger(s.id)));
  assert.equal(new Set(rw3Spells.flatMap(s => s.upgrades.map(u => u.sp_id))).size, 797);
  assert.equal(units.size, 496); assert.equal(wardrobe.length, 81);
  const pantry = rw3Components.flatMap(c => Array(16).fill(c.name));
  for (const item of rw3Equipment) {
    const result = findMatchingComponents(pantry, item);
    assert.ok(result && recipeMatches(item, result), item.name);
    assert.ok(result.length <= item.recipe_cost);
  }
  assert.ok(Object.values(vaults).flat().every(n => units.has(n)));
  assert.ok(searchCatalogue('liv', ['Wolf'], ['Wolf']));
  assert.equal(searchCatalogue('liv ', ['Wolf'], ['Wolf']), false);
});

test('all 198 spells enter through the grimoire or their book, accept their upgrades and survive saving', () => {
  const g = arena();
  for (const s of rw3Spells) {
    if (s.granted_by) {
      const book = rw3Equipment.find(e => e.name === s.granted_by);
      assert.equal(learnRw3Spell(g, s.id), false);
      g.equipment[book.slot] = { name: book.name, components: [] };
    } else if (!g.rw3Spells.includes(s.id)) assert.ok(learnRw3Spell(g, s.id), s.name);
    for (const u of s.upgrades) assert.ok(learnRw3Upgrade(g, s.id, u.sp_id), u.name);
    const eff = effectiveRw3Spell(g, s.id);
    assert.ok(eff.upgradeNames.length === s.upgrades.length && Object.values(eff.stats).every(Number.isFinite));
  }
  assert.deepEqual(restore(serialize(g)), g);
});

test('forged books grant forbidden spells, initialize charges and remove access when replaced', () => {
  const g = arena();
  for (const name of ['Book of Life', 'Book of Ice']) {
    const item = rw3Equipment.find(e => e.name === name);
    g.rw3Components = rw3Components.flatMap(c => Array(8).fill(c.name));
    assert.ok(forge(g, name, findMatchingComponents(g.rw3Components, item)));
    const s = availableSpells(g).find(s => spellByName.get(s.name).granted_by === name);
    assert.ok(s && g.charges[s.id] === s.maxCharges);
  }
  assert.ok(!availableSpells(g).some(s => s.name === 'Word of Beauty'));
  assert.deepEqual(restore(serialize(g)), g);
});

test('both beta orbs use their actual trigger, preserve identity on relocation and respect walls', () => {
  const g = arena(), aligned = enemy(g, 8, 11), diagonal = enemy(g, 7, 13), blocked = enemy(g, 4, 16);
  g.tiles[14][4] = 1;
  const explosions = learn(g, 'Orb of Explosions');
  assert.ok(cast(g, explosions, { x: 4, y: 11 }));
  assert.equal(aligned.hp, 580); assert.equal(diagonal.hp, 600); assert.equal(blocked.hp, 600);
  const orb = g.allies[0];
  assert.ok(cast(g, explosions, { x: 4, y: 12 }));
  assert.equal(g.allies.length, 1); assert.equal(g.allies[0], orb);
  const reflection = learn(g, 'Orb of Reflection', ['Inverted Mirror']);
  const attacker = enemy(g, 6, 13);
  assert.ok(cast(g, reflection, { x: 6, y: 12 }));
  assert.ok(attacker.hp < 600 && g.allies.find(a => a.orb === 'Orb of Reflection').hp < 100);
  assert.deepEqual(restore(serialize(g)), g);
});

test('Blink rejects occupied targets before payment and Aether Swap exchanges positions once', () => {
  const g = arena(), e = enemy(g, 6, 11);
  const id = learn(g, 'Blink'), before = serialize(g);
  assert.equal(cast(g, id, e), false); assert.equal(serialize(g), before);
  learn(g, 'Blink', ['Aether Swap']);
  assert.ok(cast(g, id, { x: e.x, y: e.y }));
  assert.equal(g.player.x, 6); assert.equal(e.x, 3); assert.equal(e.hp, 584);
});

test('weekly seeds use the same UTC week and vault previews, including rerolls, match the destination', () => {
  const monday = createGame(1, { mode: 'weekly', now: Date.UTC(2026, 10, 23) });
  const sunday = createGame(999, { mode: 'weekly', now: Date.UTC(2026, 10, 29) });
  assert.deepEqual(monday, sunday);
  assert.notEqual(monday.seed, createGame(1, { mode: 'weekly', now: Date.UTC(2026, 10, 30) }).seed);
  const g = arena(); g.realm = 3; g.equipment.Weapon = { name: 'Glaive of Gorias', components: [] };
  const before = serialize(g), preview = previewPortal(g, 1);
  assert.ok(preview.vault); assert.equal(serialize(g), before);
  assert.ok(rerollRifts(g)); assert.equal(rerollRifts(g), false);
  const rerolled = previewPortal(g, 1);
  g.player.x = 18; g.player.y = 15;
  assert.ok(move(g, 1, 0)); assert.equal(g.vault, rerolled.vault);
  assert.deepEqual([...new Set(g.enemies.map(e => e.name))], rerolled.species);
  assert.equal(g.items.find(i => i.type === 'chest').options.length, 3);
});

test('Scavenger presents four distinct choices that survive reloading and can be claimed once', () => {
  const g = createGame(6, { mode: 'trial-scavenger' });
  const item = g.items.find(i => i.type === 'scroll');
  assert.equal(new Set(item.options).size, 4);
  g.enemies = []; g.player.x = item.x - 1; g.player.y = item.y;
  assert.ok(move(g, 1, 0));
  const loaded = restore(serialize(g)); assert.deepEqual(loaded.pendingReward.options, item.options);
  assert.equal(wait(loaded), false); assert.equal(claimReward(loaded, -1), false);
  assert.ok(claimReward(loaded, item.options[0])); assert.ok(loaded.rw3Spells.includes(item.options[0]));
  assert.equal(claimReward(loaded, item.options[0]), false);
});

test('haste, offering, knowledge and shared-tag transmutation enforce valid choices', () => {
  const g = arena(); const shrine = type => { g.shrine = { x: 4, y: 11, type, uses: 1 }; };
  shrine('haste'); assert.ok(useShrine(g, { spellId: 'rw3-101' })); assert.ok(effectiveRw3Spell(g, 101).quickCast);
  g.rw3Components = ['Burning Ember', 'Chimera Eyes', 'Arcane Mote'];
  shrine('offering'); assert.equal(useShrine(g, { component: 'Burning Ember', tag: 'Ice' }), false);
  assert.ok(useShrine(g, { component: 'Burning Ember', tag: 'Fire' })); assert.deepEqual(g.offeringTags, ['Fire']);
  shrine('knowledge'); assert.ok(useShrine(g, { component: 'Chimera Eyes' })); assert.equal(Object.values(g.rw3Upgrades).flat().length, 4);
  shrine('transmutation'); assert.equal(useShrine(g, { component: 'Arcane Mote', result: 'Burning Ember' }), false);
});

test('components summon, restore limited charges, and apply timed effects according to their rules', () => {
  const g = arena(), e = enemy(g, 6, 11);
  applyComponentPickupEffects(g, 'Ball Lightning');
  assert.equal(g.allies[0].name, 'Spark Spirit'); assert.ok(e.hp < 600);
  applyComponentPickupEffects(g, 'Arcane Mote'); assert.equal(g.charges['rw3-101'], 20);
  applyComponentPickupEffects(g, 'Frostpetal'); g.player.hp -= 20;
  assert.equal(getUnitResistance(g.player, 'Ice', g), 75); wait(g); assert.equal(g.player.hp, 483);
  applyComponentPickupEffects(g, 'Lightning Jar'); const turn = g.turn;
  assert.ok(move(g, 0, -1)); assert.equal(g.turn, turn);
});

test('all encounter footprints spawn inside the board with no overlapping units or props', () => {
  for (let seed = 1; seed <= 80; seed++) {
    const g = createGame(seed, { mode: 'rw3' }); g.realm = seed % 20 + 1; generateRealm(g);
    for (const e of g.enemies) {
      const r = e.radius || 0;
      assert.ok(e.x - r > 0 && e.y - r > 0 && e.x + r < SIZE - 1 && e.y + r < SIZE - 1);
      for (const p of [...g.items, ...g.portals, g.shrine, g.player]) assert.equal(covers(e, p), false, e.name);
      for (const other of g.enemies.filter(o => o !== e)) assert.ok(Math.max(Math.abs(other.x - e.x), Math.abs(other.y - e.y)) > r + (other.radius || 0));
    }
  }
  const g = arena(); g.defeatedSpecies = ['Mothgod']; g.clearedVaults = ['Goblins'];
  assert.ok(outfitUnlocks(g).includes('Moth')); assert.ok(outfitUnlocks(g).includes('Goblin'));
  assert.equal(rw3Units.filter(u => u.boss_kind === 'final').length, 12);
});

test('all beta spells can resolve through cast and channel processing on a saved board', () => {
  for (const base of rw3Spells) {
    const g = arena();
    const foe = enemy(g, 4, 11, { tags: ['Metallic', 'Living', 'Fire'], statuses: { freeze: 8 }, hp: 20, maxHp: 20 });
    enemy(g, 7, 11);
    g.allies.push({ ...unitStats(units.get('Wolf')), x: 3, y: 12, id: 'ally-test', tags: ['Metallic', 'Slime', 'Living'], duration: 0 });
    if (base.granted_by) {
      const book = rw3Equipment.find(e => e.name === base.granted_by);
      g.equipment[book.slot] = { name: book.name, components: [] };
    } else if (!g.rw3Spells.includes(base.id)) g.rw3Spells.push(base.id);
    g.rw3Upgrades[base.id] = base.upgrades.map(up => up.sp_id);
    const spell = effectiveRw3Spell(g, base.id); g.charges[spell.id] = spell.maxCharges;
    const candidates = [foe, g.allies[0], { x: 4, y: 12 }, { x: 4, y: 10 }, g.player];
    if (base.name === 'Volcanic Eruption') g.tiles[12][4] = 2;
    if (base.name === 'Shrapnel Blast') g.tiles[12][4] = 1;
    if (base.name === 'Storm Walk') g.clouds.push({ x: 4, y: 12, type: 'rain', duration: 4 });
    if (base.name === 'Underworld Passage') g.tiles[10][3] = 2;
    if (base.name === 'Earthen Passage') g.tiles[10][3] = 1;
    assert.ok(candidates.some(p => cast(g, spell.id, p)), base.name);
    if (g.channel) wait(g);
    const saved = serialize(g);
    assert.ok(restore(saved), base.name);
    assert.ok(Number.isFinite(g.player.hp) && g.enemies.every(e => Number.isFinite(e.hp)) && g.allies.every(a => Number.isFinite(a.hp)), base.name);
  }
});

test('all equipment definitions can enter a realm, receive a manual cast and take a turn', () => {
  for (const item of rw3Equipment) {
    const g = arena();
    g.equipment[item.slot] = { name: item.name, components: [] };
    generateRealm(g);
    const s = availableSpells(g)[0];
    cast(g, s.id, g.player); wait(g);
    assert.ok(restore(serialize(g)), item.name);
  }
});

test('realm 20 offers distinct bosses and Mordred retains the encounter through all three forms', () => {
  const g = arena('rw3'); g.realm = 19;
  const first = previewPortal(g, 0).species[0], second = previewPortal(g, 1).species[0];
  assert.notEqual(first, second);
  assert.equal(units.get(first).boss_kind, 'final'); assert.equal(units.get(second).boss_kind, 'final');
  g.realm = 21; generateRealm(g);
  let boss = g.enemies[0]; assert.equal(boss.name, 'Mordred');
  g.enemies = [boss];
  for (const phase of ['Mordred, Unbound', 'Mordred, Ascendant']) {
    boss.hp = 0; wait(g);
    assert.equal(boss.name, phase); assert.ok(boss.hp > 0);
    assert.equal(g.kills, 0);
  }
  boss.hp = 0; wait(g);
  assert.ok(g.defeatedSpecies.includes('Mordred')); assert.equal(g.kills, 1);
});

test('Ophan redirects a hit, and a surviving Great Faery returns on deployment', () => {
  const g = arena('rw3');
  const guard = enemy(g, 10, 12, { statuses: { stun: 5 } });
  const ophan = enemy(g, 7, 11, { ...unitStats(units.get('Ophan')), statuses: { stun: 5 } });
  const before = ophan.hp;
  assert.ok(cast(g, 'rw3-101', ophan));
  assert.equal(ophan.hp, before); assert.ok(guard.hp < 600);
  const arriving = arena('rw3'); arriving.vault = 'the Fettered Fae';
  arriving.allies.push({ ...unitStats(units.get('Fae Queen')), id: 'fae', x: 4, y: 13, name: 'Great Faery', rescue: true });
  enemy(arriving, 4, 11, { hp: 1 }); assert.ok(move(arriving, 1, 0));
  assert.deepEqual(arriving.companions, [{ name: 'Great Faery', species: 'Fae Queen' }]);
  arriving.player.x = 18; arriving.player.y = 7; assert.ok(move(arriving, 1, 0));
  assert.equal(arriving.allies.length, 0);
  assert.ok(deploy(arriving, { x: 3, y: 11 }));
  assert.ok(arriving.allies.some(a => a.companion && a.name === 'Great Faery'));
});

test('multi-affinity components fill several slots and two pairs of boots can be worn and dismantled separately', () => {
  const g = arena('rw3');
  assert.deepEqual(findMatchingComponents(['Ball Lightning'], { recipe_cost: 2, recipe: [['Orb', 1], ['Lightning', 1]] }), ['Ball Lightning']);
  assert.equal(recipeMatches({ recipe_cost: 2, recipe: [['Orb', 2]] }, ['Ball Lightning']), false);
  for (const name of ['Bishop Boots', 'Castellan Clogs']) {
    g.rw3Components = rw3Components.map(c => c.name);
    assert.ok(forge(g, name, findMatchingComponents(g.rw3Components, rw3Equipment.find(e => e.name === name))));
  }
  assert.equal(Object.values(g.equipment).length, 2);
  assert.ok(move(g, 1, 1)); assert.deepEqual([g.player.x, g.player.y, g.turn], [5, 13, 1]);
  assert.ok(move(g, 1, 0)); assert.deepEqual([g.player.x, g.player.y, g.turn], [7, 13, 2]);
  g.shrine = { x: 7, y: 14, type: 'reformation', uses: 1 };
  assert.ok(useShrine(g, { slot: 'Feet' }));
  assert.deepEqual(Object.values(g.equipment).map(e => e.name), ['Castellan Clogs']);
});

test('Improviser restricts purchases and crafting reproducibly, and upgrades preserve spent charges', () => {
  const g = createGame(47, { mode: 'trial-improviser' });
  assert.deepEqual(g.allowedSpells, createGame(47, { mode: 'trial-improviser' }).allowedSpells);
  assert.equal(g.allowedEquipment.length, 94); g.points = 50;
  const excluded = rw3Spells.find(s => !s.granted_by && !g.allowedSpells.includes(s.id));
  assert.equal(learnRw3Spell(g, excluded.id), false);
  const item = rw3Equipment.find(e => !g.allowedEquipment.includes(e.name)); g.rw3Components = rw3Components.map(c => c.name);
  assert.equal(forge(g, item.name, findMatchingComponents(g.rw3Components, item)), false);
  const up = spellByName.get('Magic Missile').upgrades.find(u => u.name === 'Arcane Crossfire');
  g.charges['rw3-101'] = 4; assert.ok(learnRw3Upgrade(g, 101, up.sp_id)); assert.equal(g.charges['rw3-101'], 4);
});

test('every bestiary species can take hostile and allied actions, then resolve its death rules', () => {
  for (const def of rw3Units) {
    const game = arena();
    const foe = enemy(game, 13, 11, { ...unitStats(def) });
    game.allies.push({ ...unitStats(def), id: 'ally-species', x: 7, y: 11, duration: 0 });
    wait(game);
    if (game.status === 'playing') { foe.hp = 0; if (game.allies[0]) game.allies[0].hp = 0; wait(game); }
    assert.ok(Number.isFinite(game.player.hp), def.name);
    assert.ok([...game.enemies, ...game.allies].every(u => Number.isFinite(u.hp)), def.name);
    assert.ok(restore(serialize(game)), def.name);
  }
});

test('all component pickup effects resolve from the board and survive a turn', () => {
  for (const component of rw3Components) {
    const g = arena(); enemy(g, 9, 11); enemy(g, 12, 11);
    g.items.push({ x: 4, y: 11, type: 'rw3-component', name: component.name });
    assert.ok(move(g, 1, 0), component.name);
    assert.ok(g.rw3Components.includes(component.name), component.name);
    wait(g); assert.ok(restore(serialize(g)), component.name);
  }
});

test('Petrify stacks Arcane Conductivity and an egg hatches on death before realm clear', () => {
  const g = arena(); const target = enemy(g, 6, 11, { resistances: { Arcane: 100 } });
  const id = learn(g, 'Petrify', ['Arcane Conductivity']);
  assert.ok(cast(g, id, target)); assert.equal(getUnitResistance(target, 'Arcane'), 0);
  assert.ok(cast(g, id, target)); assert.equal(getUnitResistance(target, 'Arcane'), -100);
  const eggGame = arena();
  enemy(eggGame, 4, 11, { ...unitStats(units.get('Fire Wyrm Egg')), hp: 1 });
  assert.ok(move(eggGame, 1, 0));
  assert.ok(eggGame.enemies.some(e => e.species === 'Fire Wyrm'));
  assert.equal(eggGame.progress.pointsEarned, 0);
});
