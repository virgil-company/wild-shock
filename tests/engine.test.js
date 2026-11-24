import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, generateRealm, move, cast, wait, drink, learnRw3Spell, learnRw3Upgrade, restore, serialize, availableSpells, maxHealth, FINAL_REALM, SIZE, hasSight, shortestPath } from '../src/engine/index.js';

function arena() {
  const game = createGame(42);
  game.tiles = Array.from({ length: SIZE }, (_, y) => Array.from({ length: SIZE }, (_, x) => !x || !y || x === SIZE - 1 || y === SIZE - 1 ? 1 : 0));
  game.player.x = 3; game.player.y = 11; game.items = []; game.enemies = [];
  return game;
}
function enemy(x, y, extra = {}) { return { id: 1, x, y, name: 'Test enemy', hp: 30, maxHp: 30, damage: 3, range: 1, school: 5, type: 0, shields: 0, resistances: {}, statuses: {}, ...extra }; }

test('only RW3 spells are available in the grimoire (old Skill Atlas removed)', () => {
  const game = arena();
  const spells = availableSpells(game);
  assert.equal(spells.length, 3);
  assert.ok(spells.every(s => s.isRw3));
  assert.deepEqual(spells.map(s => s.id), ['rw3-101', 'rw3-61', 'rw3-95']);
});

test('seed 666 uses the standard grimoire even when restoring an old development save', () => {
  const game = createGame(666);
  const starterSpells = availableSpells(createGame(42));
  assert.deepEqual(availableSpells(game), starterSpells);

  game.bigBangEnabled = true;
  game.charges['dev-big-bang'] = 1;
  game.spellBoosts['dev-big-bang'] = { damage: 3 };
  game.log.unshift({ key: 'log.cast.one', params: { spell: { key: 'spells.dev-big-bang.name' }, count: 1 }, turn: 1 });
  const restored = restore(serialize(game));
  assert.deepEqual(availableSpells(restored), starterSpells);
  assert.equal(cast(restored, 'dev-big-bang', restored.player), false);
  assert.equal(restored.turn, game.turn);
  assert.equal(restored.log[0].params.spell, 'Big Bang');
  assert.ok(!Object.hasOwn(restored, 'bigBangEnabled'));
  assert.ok(!Object.hasOwn(restored.charges, 'dev-big-bang'));
  assert.ok(!Object.hasOwn(restored.spellBoosts, 'dev-big-bang'));
});

test('world generation is deterministic and all pickups, enemies and rifts reachable', () => {
  assert.deepEqual(createGame(123).tiles, createGame(123).tiles);
  for (let seed = 0; seed < 100; seed++) {
    const game = createGame(seed); game.realm = 1 + seed % FINAL_REALM; generateRealm(game);
    const queue = [{ x: game.player.x, y: game.player.y }], seen = new Set([`${game.player.x},${game.player.y}`]);
    for (let i = 0; i < queue.length; i++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = queue[i].x + dx, y = queue[i].y + dy; if (game.tiles[y]?.[x] === 0 && !seen.has(`${x},${y}`)) { seen.add(`${x},${y}`); queue.push({ x, y }); } }
    for (const entity of [...game.items, ...game.enemies, ...game.portals]) assert.ok(seen.has(`${entity.x},${entity.y}`));
  }
});

test('invalid actions do not consume turns or resources', () => {
  const game = arena(); game.tiles[11][4] = 1;
  assert.equal(move(game, 1, 0), false); assert.equal(move(game, 1, 1), false);
  assert.equal(cast(game, 'rw3-101', { x: 4, y: 11 }), false); assert.equal(cast(game, 'rw3-101', { x: 20, y: 11 }), false);
  assert.equal(game.turn, 0); assert.equal(game.charges['rw3-101'], 20);
});

test('learning RW3 spells and upgrades enforces SP cost without consuming a turn', () => {
  const game = arena();
  assert.ok(learnRw3Spell(game, 67)); // Freeze (level 2)
  assert.equal(game.points, 10);
  assert.ok(learnRw3Upgrade(game, 67, 338)); // Quickcast (level 2)
  assert.equal(game.points, 8);
  assert.equal(learnRw3Spell(game, 67), false); // Already learned
  assert.equal(game.turn, 0);
});

test('line of sight blocks casting through walls', () => {
  const game = arena(); game.tiles[11][5] = 1; assert.equal(hasSight(game, game.player, { x: 7, y: 11 }), false); assert.equal(cast(game, 'rw3-101', { x: 7, y: 11 }), false);
});

test('shortestPath finds the minimum cardinal route around walls', () => {
  const game = arena();
  game.tiles[11][4] = 1; game.tiles[11][5] = 1;
  const path = shortestPath(game, game.player, { x: 6, y: 11 });
  assert.equal(path.length, 5);
  assert.deepEqual(path.at(-1), { x: 6, y: 11 });
  assert.equal(shortestPath(game, game.player, { x: 4, y: 11 }), null);
});

test('casting consumes charges, harms enemies and advances their turn', () => {
  const game = arena(); game.enemies = [enemy(6, 11)];
  assert.ok(cast(game, 'rw3-101', { x: 6, y: 11 }));
  assert.equal(game.charges['rw3-101'], 19);
  assert.equal(game.enemies[0].hp, 19);
  assert.equal(game.turn, 1);
  assert.equal(game.enemies[0].x, 5);
  assert.equal(game.progress.damageDealt, 11);
  assert.equal(game.progress.spellsCast, 1);
});

test('Fireball hits multiple enemies and Freeze prevents retaliation', () => {
  const game = arena(); game.enemies = [enemy(6, 11), enemy(7, 12, { id: 2 })];
  cast(game, 'rw3-61', { x: 6, y: 11 });
  assert.ok(game.enemies.every(e => e.hp < 30));

  assert.ok(learnRw3Spell(game, 67));
  game.enemies = [enemy(4, 11)]; const hp = game.player.hp;
  cast(game, 'rw3-67', { x: 4, y: 11 });
  assert.equal(game.player.hp, hp);
  assert.equal(game.enemies[0].x, 4);
});

test('potions restore reserves and still allow enemy retaliation', () => {
  const game = arena(); game.player.hp = 1; game.charges['rw3-101'] = 0; game.enemies = [enemy(4, 11)];
  drink(game);
  assert.equal(game.player.hp, maxHealth(game) - 3);
  assert.equal(game.charges['rw3-101'], 20);
  assert.equal(game.potions, 2);
  assert.equal(game.turn, 1);
  assert.equal(game.progress.potionsUsed, 1);
});

test('clearing rewards points once and rifts advance the campaign', () => {
  const game = arena(); game.enemies = [enemy(4, 11, { hp: 1 })]; move(game, 1, 0); assert.equal(game.points, 18); wait(game); assert.equal(game.points, 18);
  assert.equal(game.progress.damageDealt, 1); assert.equal(game.progress.staffStrikes, 1); assert.equal(game.progress.pointsEarned, 6);
  game.player.x = 18; game.player.y = 7; move(game, 1, 0); assert.equal(game.realm, 2); assert.equal(game.player.hp, maxHealth(game)); assert.ok(game.enemies.length > 0); assert.equal(game.progress.realmsCleared, 1);
});

test('progress records skill point spending and migrates older saves', () => {
  const game = arena(); assert.ok(learnRw3Spell(game, 86)); // Icicle (level 1)
  assert.equal(game.progress.pointsSpent, 1);
  const oldSave = JSON.parse(serialize(game)); delete oldSave.progress;
  assert.deepEqual(restore(JSON.stringify(oldSave)).progress, { damageDealt: 0, pointsEarned: 0, pointsSpent: 0, spellsCast: 0, staffStrikes: 0, potionsUsed: 0, realmsCleared: 0 });
});

test('final rift wins and death prevents further actions', () => {
  const game = arena(); game.realm = FINAL_REALM; game.player.x = 18; game.player.y = 7; move(game, 1, 0); assert.equal(game.status, 'won'); assert.equal(wait(game), false);
  const dead = arena(); dead.player.hp = 1; dead.enemies = [enemy(4, 11)]; wait(dead); assert.equal(dead.status, 'dead'); assert.equal(move(dead, 0, 1), false); assert.equal(drink(dead), false);
});

test('saves round-trip and malformed data is rejected', () => {
  const game = createGame(99); assert.deepEqual(restore(serialize(game)), game); assert.equal(restore('invalid'), null); assert.equal(restore('{}'), null); assert.equal(restore(JSON.stringify({ ...game, learned: ['unknown'] })), null);
});

test('Lightning Bolt beam hits along the aimed forward ray only', () => {
  const game = arena(); game.enemies = [enemy(5, 11), enemy(1, 11, { id: 2 }), enemy(3, 13, { id: 3 })];
  cast(game, 'rw3-95', { x: 7, y: 11 });
  assert.equal(game.enemies[0].hp, 18); assert.equal(game.enemies[1].hp, 30); assert.equal(game.enemies[2].hp, 30);
});

test('campaign continues through every new realm and wins only at realm 100', () => {
  assert.equal(FINAL_REALM, 100);
  const game = arena(); game.realm = 24;
  for (let realm = 24; realm <= FINAL_REALM; realm++) {
    assert.equal(game.realm, realm);
    assert.ok(restore(serialize(game)));
    game.enemies = []; game.player.x = 18; game.player.y = 7;
    assert.ok(move(game, 1, 0));
    assert.equal(game.status, realm === FINAL_REALM ? 'won' : 'playing');
  }
  assert.equal(restore(serialize(game)).status, 'won');
  assert.equal(restore(JSON.stringify({ ...game, realm: 101 })), null);
});

test('completed legacy campaigns can continue beyond realm 24', () => {
  const game = arena(); game.realm = 24; game.status = 'won'; game.progress.realmsCleared = 24;
  const resumed = restore(serialize(game));
  assert.equal(resumed.status, 'playing');
  resumed.player.x = 18; resumed.player.y = 7;
  assert.ok(move(resumed, 1, 0));
  assert.equal(resumed.realm, 25);
  assert.equal(resumed.progress.realmsCleared, 24);
});
