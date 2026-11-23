import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, generateRealm, useShrine, move, serialize, restore, previewPortal, threateningEnemies, FINAL_REALM, SIZE } from '../src/engine.js';

function arena() {
  const g = createGame(42);
  g.tiles = Array.from({ length: SIZE }, (_, y) => Array.from({ length: SIZE }, (_, x) => !x || !y || x === SIZE - 1 || y === SIZE - 1 ? 1 : 0));
  g.enemies = []; g.items = [];
  return g;
}
const enemy = (extra = {}) => ({ id: 1, x: 6, y: 11, hp: 100, maxHp: 100, damage: 1, range: 1, school: 5, name: 'Dummy', shields: 0, resistances: {}, statuses: {}, ...extra });

test('RW3 transmutation shrine requires proximity and component, consumes turns and stops after three uses', () => {
  const g = arena();
  g.shrine = { x: 4, y: 11, type: 'transmutation', uses: 3 };
  g.rw3Components = ['Arcane Mote', 'Burning Ember'];
  for (let i = 0; i < 3; i++) assert.ok(useShrine(g, { component: g.rw3Components[0] }));
  assert.equal(g.turn, 3);
  assert.equal(g.rw3Components.length, 2);
  assert.equal(useShrine(g, { component: g.rw3Components[0] }), false);
  g.shrine = { x: 10, y: 11, type: 'transmutation', uses: 3 };
  assert.equal(useShrine(g, { component: g.rw3Components[0] }), false);
  g.shrine.x = 4; g.rw3Components = [];
  assert.equal(useShrine(g, {}), false);
});

test('RW3 components can be collected and all realm props spawn on unique reachable tiles', () => {
  const g = arena(); g.items = [{ x: 4, y: 11, type: 'rw3-component', name: 'Elemental Ice' }];
  move(g, 1, 0);
  assert.ok(g.rw3Components.includes('Elemental Ice'));
  assert.equal(g.items.length, 0);
  for (let seed = 0; seed < 40; seed++) {
    const realm = createGame(seed), props = [...realm.items, ...realm.enemies, ...realm.portals, realm.shrine];
    assert.equal(new Set(props.map(p => `${p.x},${p.y}`)).size, props.length);
    assert.ok(realm.items.every(i => i.type !== 'component')); // Old spark/ember/crystal removed
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
    assert.deepEqual(preview.rw3Components, next.items.filter(i => i.type === 'rw3-component').map(i => i.name));
  }
  g.realm = 24; assert.ok(previewPortal(g, 0));
  g.realm = FINAL_REALM - 1; assert.ok(previewPortal(g, 1));
  g.realm = FINAL_REALM; assert.equal(previewPortal(g, 0), null);
});

test('attack zones respect walls, range and next-turn incapacitation', () => {
  const g = arena(); g.enemies = [enemy({ range: 5 })];
  assert.equal(threateningEnemies(g, g.player).length, 1);
  g.tiles[11][5] = 1; assert.equal(threateningEnemies(g, g.player).length, 0); g.tiles[11][5] = 0;
  g.enemies[0].statuses.freeze = 1; assert.equal(threateningEnemies(g, g.player).length, 0);
  g.enemies[0].statuses = { shock: 1 }; g.turn = 1; assert.equal(threateningEnemies(g, g.player).length, 0);
  g.turn = 0; assert.equal(threateningEnemies(g, g.player).length, 1);
});

test('legacy saves migrate cleanly and invalid shrine/component data is rejected', () => {
  const legacy = createGame(12); delete legacy.shrine;
  const loaded = restore(JSON.stringify(legacy)); assert.ok(loaded); assert.equal(loaded.shrine, null);
  for (const patch of [{ rw3Components: ['Nonexistent'] }, { shrine: { x: 999, y: 0, uses: 3 } }]) {
    assert.equal(restore(JSON.stringify({ ...loaded, ...patch })), null);
  }
});
