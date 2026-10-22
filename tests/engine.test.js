import test from 'node:test';
import assert from 'node:assert/strict';
import { nodes, nodeMap, schools, paths, spellInfo } from '../src/catalog.js';
import { createGame, generateRealm, move, cast, wait, drink, learn, restore, serialize, availableSpells, maxHealth, SIZE, hasSight } from '../src/engine.js';
function arena() {
  const game = createGame(42);
  game.tiles = Array.from({ length: SIZE }, (_, y) => Array.from({ length: SIZE }, (_, x) => !x || !y || x === SIZE - 1 || y === SIZE - 1 ? 1 : 0));
  game.player.x = 3; game.player.y = 11; game.items = []; game.enemies = [];
  return game;
}
function enemy(x, y, extra = {}) { return { id: 1, x, y, name: 'Test enemy', hp: 30, maxHp: 30, damage: 3, range: 1, school: 5, type: 0, statuses: {}, ...extra }; }
test('catalog contains 2304 unique connected skills and 144 spell roots', () => {
  assert.equal(nodes.length, 2304); assert.equal(nodeMap.size, 2304); assert.equal(nodes.filter(n => !n.parent).length, 144);
  for (const node of nodes) { if (node.parent) { const parent = nodeMap.get(node.parent); assert.ok(parent); assert.equal(parent.rank, node.rank - 1); } }
});
test('each skill applies a real stat increase and all roots unlock spells', () => {
  for (const school of schools) for (const path of paths) {
    const game = arena(); game.points = 1000; game.learned = [];
    assert.ok(learn(game, `${school.id}-${path.id}-1`)); assert.equal(availableSpells(game).length, 1);
    const before = spellInfo(school.id, path.id, game.learned).stats[path.stat];
    assert.ok(learn(game, `${school.id}-${path.id}-2`));
    assert.equal(spellInfo(school.id, path.id, game.learned).stats[path.stat], before + path.amount);
  }
});
test('world generation is deterministic and all pickups, enemies and rifts reachable', () => {
  assert.deepEqual(createGame(123).tiles, createGame(123).tiles);
  for (let seed = 0; seed < 40; seed++) {
    const game = createGame(seed); game.realm = 1 + seed % 24; generateRealm(game);
    const queue = [{ x: game.player.x, y: game.player.y }], seen = new Set([`${game.player.x},${game.player.y}`]);
    for (let i = 0; i < queue.length; i++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = queue[i].x + dx, y = queue[i].y + dy; if (game.tiles[y]?.[x] === 0 && !seen.has(`${x},${y}`)) { seen.add(`${x},${y}`); queue.push({ x, y }); } }
    for (const entity of [...game.items, ...game.enemies, ...game.portals]) assert.ok(seen.has(`${entity.x},${entity.y}`));
  }
});
test('invalid actions do not consume turns or resources', () => {
  const game = arena(); game.tiles[11][4] = 1;
  assert.equal(move(game, 1, 0), false); assert.equal(move(game, 1, 1), false);
  assert.equal(cast(game, '0-0', { x: 4, y: 11 }), false); assert.equal(cast(game, '0-0', { x: 20, y: 11 }), false);
  assert.equal(game.turn, 0); assert.equal(game.charges['0-0'], 7);
});
test('skills enforce prerequisites, costs and uniqueness without consuming a turn', () => {
  const game = arena(); assert.equal(learn(game, '0-0-3'), false); assert.ok(learn(game, '0-0-2')); assert.equal(learn(game, '0-0-2'), false);
  assert.equal(game.points, 11); game.points = 0; assert.equal(learn(game, '0-0-3'), false); assert.equal(game.turn, 0);
});
test('line of sight blocks casting through walls', () => {
  const game = arena(); game.tiles[11][5] = 1; assert.equal(hasSight(game, game.player, { x: 7, y: 11 }), false); assert.equal(cast(game, '0-0', { x: 7, y: 11 }), false);
});
test('casting consumes charges, harms enemies and advances their turn', () => {
  const game = arena(); game.enemies = [enemy(6, 11)]; assert.ok(cast(game, '0-0', { x: 6, y: 11 })); assert.equal(game.charges['0-0'], 6); assert.equal(game.enemies[0].hp, 21); assert.equal(game.turn, 1); assert.equal(game.enemies[0].x, 5);
  assert.equal(game.progress.damageDealt, 9); assert.equal(game.progress.spellsCast, 1);
});
test('nova hits multiple enemies and frost prevents retaliation', () => {
  const game = arena(); game.enemies = [enemy(6, 11), enemy(7, 12, { id: 2 })]; cast(game, '1-1', { x: 6, y: 11 }); assert.ok(game.enemies.every(e => e.hp < 30));
  game.enemies = [enemy(4, 11)]; const hp = game.player.hp; cast(game, '2-2', { x: 4, y: 11 }); assert.equal(game.player.hp, hp); assert.equal(game.enemies[0].x, 4);
});
test('potions restore reserves and still allow enemy retaliation', () => {
  const game = arena(); game.player.hp = 1; game.charges['0-0'] = 0; game.enemies = [enemy(4, 11)]; drink(game); assert.equal(game.player.hp, maxHealth(game) - 3); assert.equal(game.charges['0-0'], 7); assert.equal(game.potions, 2); assert.equal(game.turn, 1); assert.equal(game.progress.potionsUsed, 1);
});
test('clearing rewards points once and rifts advance the campaign', () => {
  const game = arena(); game.enemies = [enemy(4, 11, { hp: 1 })]; move(game, 1, 0); assert.equal(game.points, 18); wait(game); assert.equal(game.points, 18);
  assert.equal(game.progress.damageDealt, 1); assert.equal(game.progress.staffStrikes, 1); assert.equal(game.progress.pointsEarned, 6);
  game.player.x = 18; game.player.y = 7; move(game, 1, 0); assert.equal(game.realm, 2); assert.equal(game.player.hp, maxHealth(game)); assert.ok(game.enemies.length > 0); assert.equal(game.progress.realmsCleared, 1);
});
test('progress records skill point spending and migrates older saves', () => {
  const game = arena(); assert.ok(learn(game, '0-0-2')); assert.equal(game.progress.pointsSpent, 1);
  const oldSave = JSON.parse(serialize(game)); delete oldSave.progress;
  assert.deepEqual(restore(JSON.stringify(oldSave)).progress, { damageDealt: 0, pointsEarned: 0, pointsSpent: 0, spellsCast: 0, staffStrikes: 0, potionsUsed: 0, realmsCleared: 0 });
});
test('final rift wins and death prevents further actions', () => {
  const game = arena(); game.realm = 24; game.player.x = 18; game.player.y = 7; move(game, 1, 0); assert.equal(game.status, 'won'); assert.equal(wait(game), false);
  const dead = arena(); dead.player.hp = 1; dead.enemies = [enemy(4, 11)]; wait(dead); assert.equal(dead.status, 'dead'); assert.equal(move(dead, 0, 1), false); assert.equal(drink(dead), false);
});
test('saves round-trip and malformed data is rejected', () => {
  const game = createGame(99); assert.deepEqual(restore(serialize(game)), game); assert.equal(restore('invalid'), null); assert.equal(restore('{}'), null); assert.equal(restore(JSON.stringify({ ...game, learned: ['unknown'] })), null);
});
test('lances only hit along the aimed forward ray, including safe self-targeting', () => {
  const game = arena(); game.enemies = [enemy(5, 11), enemy(1, 11, { id: 2 }), enemy(3, 13, { id: 3 })];
  cast(game, '2-2', { x: 7, y: 11 });
  assert.equal(game.enemies[0].hp, 19); assert.equal(game.enemies[1].hp, 30); assert.equal(game.enemies[2].hp, 30);
  const second = arena(); second.enemies = [enemy(6, 11), enemy(3, 14, { id: 2 })]; cast(second, '2-2', { x: 3, y: 11 }); assert.ok(second.enemies.every(e => e.hp === 30));
});
