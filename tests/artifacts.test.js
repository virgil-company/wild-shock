import test from 'node:test';
import assert from 'node:assert/strict';
import { artifacts } from '../src/artifacts.js';
import { createGame, generateRealm, craft, transmute, availableSpells, cast, move, serialize, restore, previewPortal, threateningEnemies, SIZE } from '../src/engine.js';
function arena() {
  const g = createGame(42);
  g.tiles = Array.from({ length: SIZE }, (_, y) => Array.from({ length: SIZE }, (_, x) => !x || !y || x === SIZE - 1 || y === SIZE - 1 ? 1 : 0));
  g.enemies = []; g.items = []; g.components = { spark: 20, ember: 20, crystal: 20 };
  return g;
}
const enemy = (extra = {}) => ({ id: 1, x: 6, y: 11, hp: 100, maxHp: 100, damage: 1, range: 1, school: 5, name: 'Dummy', statuses: {}, ...extra });
test('crafting spends exact recipes once, with no turn cost, and rejects invalid actions', () => {
  for (const item of artifacts) {
    const g = arena(); assert.ok(craft(g, item.id)); assert.equal(g.turn, 0);
    for (const key of ['spark', 'ember', 'crystal']) assert.equal(g.components[key], 20 - (item.recipe[key] || 0));
    const before = serialize(g); assert.equal(craft(g, item.id), false); assert.equal(serialize(g), before);
  }
  for (const status of ['playing', 'dead', 'won']) {
    const g = arena(); g.status = status; g.components = { spark: 0, ember: 0, crystal: 0 };
    const before = serialize(g); assert.equal(craft(g, 'stormglass'), false); assert.equal(craft(g, 'unknown'), false); assert.equal(serialize(g), before);
  }
});
test('artifact bonuses affect actual casts, new realms and restored games', () => {
  const g = arena(); craft(g, 'stormglass'); craft(g, 'prism'); craft(g, 'rime-mantle');
  assert.equal(availableSpells(g)[0].damage, 13); assert.equal(g.charges['0-0'], 9);
  g.enemies = [enemy()]; assert.ok(cast(g, '0-0', { x: 6, y: 11 })); assert.equal(g.enemies[0].hp, 87);
  generateRealm(g); assert.equal(g.player.shield, 8); assert.equal(g.charges['0-0'], 9);
  assert.deepEqual(restore(serialize(g)), g);
  assert.equal(availableSpells(restore(serialize(g)))[0].range, 6);
});
test('thorn poison, cinder healing and storm bell triggers resolve in combat', () => {
  const g = arena(); craft(g, 'thorn-ring'); craft(g, 'cinderheart'); g.player.hp = 30;
  g.enemies = [enemy({ hp: 1 })]; cast(g, '0-0', { x: 6, y: 11 }); assert.equal(g.player.hp, 32);
  g.enemies = [enemy()]; cast(g, '0-0', { x: 6, y: 11 }); assert.equal(g.enemies[0].statuses.poison, 2);
  const bell = arena(); craft(bell, 'storm-bell');
  for (let i = 0; i < 2; i++) cast(bell, '0-0', { x: 3, y: 11 });
  bell.enemies = [enemy()]; cast(bell, '0-0', { x: 3, y: 11 }); assert.equal(bell.enemies[0].hp, 95);
  assert.equal(bell.progress.damageDealt, 5);
});
test('shrines require proximity and material, consume turns and stop after three uses', () => {
  const g = arena(); g.shrine = { x: 4, y: 11, uses: 3 };
  const initial = serialize(g); assert.equal(transmute(g, 'spark', 'spark'), false); assert.equal(transmute(g, 'fake', 'ember'), false); assert.equal(serialize(g), initial);
  for (let i = 0; i < 3; i++) assert.ok(transmute(g, 'spark', 'crystal'));
  assert.equal(g.turn, 3); assert.equal(g.components.spark, 17); assert.equal(g.components.crystal, 23);
  assert.equal(transmute(g, 'spark', 'crystal'), false);
  g.shrine = { x: 10, y: 11, uses: 3 }; assert.equal(transmute(g, 'spark', 'crystal'), false);
  g.shrine.x = 4; g.components.spark = 0; assert.equal(transmute(g, 'spark', 'crystal'), false);
  g.components.spark = 1; g.enemies = [enemy({ x: 4 })]; const hp = g.player.hp;
  assert.ok(transmute(g, 'spark', 'crystal')); assert.equal(g.player.hp, hp - 1);
});
test('components can be collected and all new props spawn on unique reachable tiles', () => {
  const g = arena(); g.items = [{ x: 4, y: 11, type: 'component', material: 'ember' }];
  move(g, 1, 0); assert.equal(g.components.ember, 21); assert.equal(g.items.length, 0);
  for (let seed = 0; seed < 40; seed++) {
    const realm = createGame(seed), props = [...realm.items, ...realm.enemies, ...realm.portals, realm.shrine];
    assert.equal(new Set(props.map(p => `${p.x},${p.y}`)).size, props.length);
    const queue = [realm.player], seen = new Set([`${realm.player.x},${realm.player.y}`]);
    for (let i = 0; i < queue.length; i++) for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const x = queue[i].x + dx, y = queue[i].y + dy, key = `${x},${y}`;
      if (realm.tiles[y]?.[x] === 0 && !seen.has(key)) { seen.add(key); queue.push({ x, y }); }
    }
    assert.ok(props.every(p => seen.has(`${p.x},${p.y}`)));
  }
});
test('portal previews match generated destinations and never mutate the active game', () => {
  const g = createGame(72); g.realm = 5;
  for (const theme of [0, 1]) {
    const before = serialize(g), preview = previewPortal(g, theme); assert.equal(serialize(g), before);
    const next = restore(before); next.realm++; next.theme = theme; generateRealm(next);
    assert.equal(preview.enemies, next.enemies.length); assert.equal(preview.boss, true);
    assert.deepEqual(preview.components, next.items.filter(i => i.type === 'component').map(i => i.material));
  }
  assert.notDeepEqual(previewPortal(g, 0).components, previewPortal(g, 1).components);
  g.realm = 24; assert.equal(previewPortal(g, 0), null);
});
test('attack zones respect walls, range and next-turn incapacitation', () => {
  const g = arena(); g.enemies = [enemy({ range: 5 })];
  assert.equal(threateningEnemies(g, g.player).length, 1);
  g.tiles[11][5] = 1; assert.equal(threateningEnemies(g, g.player).length, 0); g.tiles[11][5] = 0;
  g.enemies[0].statuses.freeze = 1; assert.equal(threateningEnemies(g, g.player).length, 0);
  g.enemies[0].statuses = { shock: 1 }; g.turn = 1; assert.equal(threateningEnemies(g, g.player).length, 0);
  g.turn = 0; assert.equal(threateningEnemies(g, g.player).length, 1);
});
test('legacy saves migrate without free materials and invalid artifact data is rejected', () => {
  const legacy = createGame(12); for (const key of ['components', 'artifacts', 'artifactCasts', 'shrine']) delete legacy[key];
  const loaded = restore(JSON.stringify(legacy)); assert.ok(loaded); assert.deepEqual(loaded.components, { spark: 0, ember: 0, crystal: 0 });
  assert.deepEqual(loaded.artifacts, []); assert.equal(loaded.shrine, null);
  for (const patch of [{ components: { spark: -1, ember: 0, crystal: 0 } }, { artifacts: ['fake'] }, { artifacts: ['prism', 'prism'] }, { artifactCasts: -1 }, { shrine: { x: 999, y: 0, uses: 3 } }]) assert.equal(restore(JSON.stringify({ ...loaded, ...patch })), null);
});
