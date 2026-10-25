import { materials, artifacts, hasArtifact, enhanceSpell, canCraft } from './artifacts.js';
import { schools, nodeMap, getStats, spellInfo } from './catalog.js';
export const SIZE = 23;
export const FINAL_REALM = 24;
export const distance = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
export function random(seed) { let state = seed >>> 0; return () => { state += 0x6D2B79F5; let n = state; n = Math.imul(n ^ n >>> 15, n | 1); n ^= n + Math.imul(n ^ n >>> 7, n | 61); return ((n ^ n >>> 14) >>> 0) / 4294967296; }; }
export function log(game, message, tone = '') { game.log.unshift({ message, tone, turn: game.turn }); game.log = game.log.slice(0, 60); }
export function maxHealth(game) { return 55 + schools.reduce((total, school) => total + getStats(game.learned, school.id).vitality, 0); }
export function createGame(seed = Date.now() % 2147483647) {
  const game = { version: 1, seed, realm: 1, turn: 0, points: 12, learned: ['0-0-1', '1-1-1', '2-2-1'],
    components: { spark: 1, ember: 1, crystal: 1 }, artifacts: [], artifactCasts: 0,
    player: { x: 3, y: 11, hp: 55, shield: 0 }, charges: {}, potions: 3, kills: 0, status: 'playing', log: [], effects: [], theme: 0,
    progress: { damageDealt: 0, pointsEarned: 0, pointsSpent: 0, spellsCast: 0, staffStrikes: 0, potionsUsed: 0, realmsCleared: 0 } };
  generateRealm(game); log(game, 'The rift opens. Your next move is yours.', 'gold'); return game;
}
export function availableSpells(game) { return game.learned.filter(id => nodeMap.get(id)?.rank === 1).map(id => { const node = nodeMap.get(id); return enhanceSpell(game, spellInfo(node.school, node.path, game.learned)); }); }
export function generateRealm(game) {
  const rng = random(game.seed + game.realm * 7919 + game.theme * 101);
  game.tiles = Array.from({ length: SIZE }, (_, y) => Array.from({ length: SIZE }, (_, x) => x === 0 || y === 0 || x === SIZE - 1 || y === SIZE - 1 ? 1 : rng() < .13 ? 1 : 0));
  // Carve a connected backbone, then keep only the component reachable from spawn.
  for (let i = 1; i < SIZE - 1; i++) { game.tiles[11][i] = 0; game.tiles[i][3] = 0; game.tiles[i][19] = 0; }
  const reachable = new Set(['3,11']), queue = [{ x: 3, y: 11 }];
  for (let i = 0; i < queue.length; i++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const x = queue[i].x + dx, y = queue[i].y + dy, key = `${x},${y}`;
    if (game.tiles[y]?.[x] === 0 && !reachable.has(key)) { reachable.add(key); queue.push({ x, y }); }
  }
  for (let y = 1; y < SIZE - 1; y++) for (let x = 1; x < SIZE - 1; x++) if (!reachable.has(`${x},${y}`)) game.tiles[y][x] = 1;
  game.player.x = 3; game.player.y = 11; game.player.shield = hasArtifact(game, 'rime-mantle') ? 8 : 0;
  game.enemies = []; game.items = []; game.portals = [{ x: 19, y: 7, theme: 0 }, { x: 19, y: 15, theme: 1 }];
  const occupied = new Set(['3,11', '19,7', '19,15']);
  function position() { const choices = queue.filter(p => p.x > 6 && !occupied.has(`${p.x},${p.y}`)); const p = choices[Math.floor(rng() * choices.length)]; occupied.add(`${p.x},${p.y}`); return { ...p }; }
  const types = ['Cinder imp', 'Hollow knight', 'Thorn eye', 'Rift moth'];
  for (let i = 0; i < Math.min(7 + game.realm, 27); i++) {
    const type = (i + game.theme) % 4, boss = game.realm % 6 === 0 && i === 0;
    const hp = (boss ? 35 : 9 + type * 3) + game.realm * 2;
    game.enemies.push({ ...position(), id: i, type, name: boss ? 'The Rift Sovereign' : types[type], hp, maxHp: hp, damage: (boss ? 7 : 2 + type) + Math.floor(game.realm / 5), range: type === 2 ? 5 : 1, school: (type + game.theme) % 12, boss, statuses: {} });
  }
  for (let i = 0; i < 3; i++) game.items.push({ ...position(), type: i === 2 ? 'potion' : 'shard' });
  for (let i = 0; i < 3; i++) game.items.push({ ...position(), type: 'component', material: materials[i === 2 ? 2 : game.theme ? 1 : 0] });
  game.shrine = { ...position(), uses: 3 };
  game.charges = Object.fromEntries(availableSpells(game).map(s => [s.id, s.maxCharges])); game.effects = [];
}
export function hasSight(game, from, to) {
  let x = from.x, y = from.y; const dx = Math.abs(to.x - x), sx = x < to.x ? 1 : -1, dy = -Math.abs(to.y - y), sy = y < to.y ? 1 : -1; let error = dx + dy;
  while (x !== to.x || y !== to.y) { const e = 2 * error; if (e >= dy) { error += dy; x += sx; } if (e <= dx) { error += dx; y += sy; } if (game.tiles[y]?.[x] !== 0) return false; }
  return true;
}
export function learningPlan(game, id) {
  const pending = [];
  let node = nodeMap.get(id);
  while (node && !game.learned.includes(node.id)) {
    pending.unshift(node);
    node = nodeMap.get(node.parent);
  }
  const cost = pending.reduce((total, skill) => total + skill.cost, 0);
  return { nodes: pending, cost, canLearn: game.status === 'playing' && pending.length > 0 && game.points >= cost };
}
export function learn(game, id) {
  const plan = learningPlan(game, id);
  if (!plan.canLearn) return false;
  const oldMax = maxHealth(game);
  game.points -= plan.cost; game.progress.pointsSpent += plan.cost;
  game.learned.push(...plan.nodes.map(node => node.id));
  game.player.hp += maxHealth(game) - oldMax;
  for (const node of plan.nodes) {
    if (node.rank === 1) {
      const spell = enhanceSpell(game, spellInfo(node.school, node.path, game.learned));
      game.charges[spell.id] = spell.maxCharges;
    }
    log(game, `Learned ${node.name}.`, 'gold');
  }
  return true;
}
function awardPoints(game, amount) { game.points += amount; game.progress.pointsEarned += amount; }
function damageEnemy(game, enemy, amount) {
  const dealt = Math.min(enemy.hp, Math.max(0, amount));
  enemy.hp -= dealt; game.progress.damageDealt += dealt;
  return dealt;
}
function damagePlayer(game, amount) {
  const armor = Math.floor(schools.reduce((n, s) => n + getStats(game.learned, s.id).armor, 0) / 3);
  const incoming = Math.max(1, amount - armor), absorbed = Math.min(game.player.shield, incoming);
  game.player.shield -= absorbed; game.player.hp = Math.max(0, game.player.hp - incoming + absorbed);
}
function cleanup(game) {
  const dead = game.enemies.filter(e => e.hp <= 0); game.kills += dead.length;
  if (game.player.hp > 0 && hasArtifact(game, 'cinderheart')) game.player.hp = Math.min(maxHealth(game), game.player.hp + dead.length * 2);
  for (const enemy of dead) { log(game, `${enemy.name} falls.`, 'green'); if (enemy.boss) awardPoints(game, 5); }
  game.enemies = game.enemies.filter(e => e.hp > 0);
  if (dead.length && !game.enemies.length) { awardPoints(game, 6 + Math.floor(game.realm / 3)); log(game, 'Realm cleared. Both rifts are now open. Skill points awarded.', 'gold'); }
}
export function endTurn(game) {
  game.turn++;
  for (const enemy of game.enemies) {
    for (const status of ['burn', 'poison']) if (enemy.statuses[status] > 0) { damageEnemy(game, enemy, status === 'burn' ? 3 : 2); enemy.statuses[status]--; }
    if (enemy.hp <= 0) continue;
    if (enemy.statuses.freeze > 0) { enemy.statuses.freeze--; continue; }
    if (enemy.statuses.shock > 0) { enemy.statuses.shock--; if (game.turn % 2 === 0) continue; }
    if (distance(enemy, game.player) <= enemy.range && hasSight(game, enemy, game.player)) { damagePlayer(game, enemy.damage); log(game, `${enemy.name} hits for ${enemy.damage}.`, 'red'); }
    else {
      const moves = [[0, 1], [1, 0], [0, -1], [-1, 0]].map(([dx, dy]) => ({ x: enemy.x + dx, y: enemy.y + dy })).filter(p => game.tiles[p.y]?.[p.x] === 0 && distance(p, game.player) > 0 && !game.enemies.some(other => other !== enemy && other.hp > 0 && distance(other, p) === 0));
      // Breadth-first pathfinding avoids enemies getting stuck behind corners.
      const queue = [{ ...game.player, steps: 0 }], seen = new Set([`${game.player.x},${game.player.y}`]); let best;
      for (let i = 0; i < queue.length && !best; i++) {
        const p = queue[i]; best = moves.find(move => move.x === p.x && move.y === p.y);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = p.x + dx, y = p.y + dy, key = `${x},${y}`; if (game.tiles[y]?.[x] === 0 && !seen.has(key)) { seen.add(key); queue.push({ x, y }); } }
      }
      if (best) { enemy.x = best.x; enemy.y = best.y; }
    }
    if (game.player.hp <= 0) break;
  }
  cleanup(game);
  if (game.player.hp <= 0) { game.status = 'dead'; log(game, 'Your light fades. A new journey awaits.', 'red'); }
}
export function move(game, dx, dy) {
  if (game.status !== 'playing' || Math.abs(dx) + Math.abs(dy) !== 1) return false;
  const p = { x: game.player.x + dx, y: game.player.y + dy };
  if (game.tiles[p.y]?.[p.x] !== 0) return false;
  const enemy = game.enemies.find(e => distance(e, p) === 0);
  if (enemy) { damageEnemy(game, enemy, 5 + Math.floor(game.realm / 3)); game.progress.staffStrikes++; game.effects = [{ ...p, color: '#ded6b7' }]; log(game, 'Your staff strikes.'); cleanup(game); }
  else {
    Object.assign(game.player, p);
    const item = game.items.find(i => distance(i, p) === 0);
    if (item) { if (item.type === 'component') { game.components[item.material]++; log(game, `Collected ${item.material}.`, 'gold'); } else if (item.type === 'shard') { awardPoints(game, 3); log(game, 'Memory shard: +3 skill points.', 'gold'); } else { game.potions++; log(game, 'Restoration draught collected.', 'green'); } game.items = game.items.filter(i => i !== item); }
    const portal = game.portals.find(r => distance(r, p) === 0);
    if (portal && !game.enemies.length) { game.progress.realmsCleared++; if (game.realm === FINAL_REALM) { game.status = 'won'; log(game, 'The final rift is sealed. You are the Wild Sovereign.', 'gold'); return true; } game.realm++; game.theme = portal.theme; game.player.hp = maxHealth(game); generateRealm(game); log(game, `Entered realm ${game.realm}. Health and spell charges restored.`, 'gold'); return true; }
  }
  endTurn(game); return true;
}
export function cast(game, spellId, target) {
  if (game.status !== 'playing') return false;
  const spell = availableSpells(game).find(s => s.id === spellId);
  if (!spell || !game.charges[spellId] || !Number.isInteger(target.x) || !Number.isInteger(target.y) || game.tiles[target.y]?.[target.x] !== 0 || distance(game.player, target) > spell.range || !hasSight(game, game.player, target)) return false;
  game.charges[spellId]--; game.progress.spellsCast++; game.effects = [];
  let targets = game.enemies.filter(e => distance(e, target) <= spell.radius);
  if (spell.path === 2) {
    const dx = target.x - game.player.x, dy = target.y - game.player.y;
    const length = Math.hypot(dx, dy);
    targets = game.enemies.filter(e => length > 0 && distance(e, game.player) <= spell.range && hasSight(game, game.player, e)
      && (e.x - game.player.x) * dx + (e.y - game.player.y) * dy > 0
      && Math.abs((e.x - game.player.x) * dy - (e.y - game.player.y) * dx) / length <= 0.45);
  }
  for (let i = 0; i < spell.chains; i++) { const next = game.enemies.find(e => !targets.includes(e) && targets.some(t => distance(t, e) <= 3)); if (next) targets.push(next); }
  for (const enemy of targets) {
    const resist = enemy.school === spell.school ? Math.max(0, 3 - spell.stats.pierce) : 0;
    const damage = Math.max(1, spell.damage - resist) + spell.stats.echo;
    damageEnemy(game, enemy, damage); game.effects.push({ x: enemy.x, y: enemy.y, color: spell.color });
    if (hasArtifact(game, 'thorn-ring')) enemy.statuses.poison = Math.max(enemy.statuses.poison || 0, 3);
    if (['burn', 'freeze', 'poison', 'shock'].includes(spell.effect)) enemy.statuses[spell.effect] = Math.max(enemy.statuses[spell.effect] || 0, spell.duration);
    game.player.hp = Math.min(maxHealth(game), game.player.hp + spell.stats.leech + (spell.effect === 'drain' ? 3 : 0));
  }
  game.artifactCasts++;
  if (hasArtifact(game, 'storm-bell') && game.artifactCasts % 3 === 0) {
    for (const enemy of game.enemies) if (enemy.hp > 0 && distance(game.player, enemy) <= 4 && hasSight(game, game.player, enemy)) { damageEnemy(game, enemy, 5); game.effects.push({ x: enemy.x, y: enemy.y, color: '#d4cc79' }); }
    log(game, 'The Storm Bell rings.', 'gold');
  }
  if (spell.effect === 'heal' || spell.path === 8) game.player.hp = Math.min(maxHealth(game), game.player.hp + 5 + spell.stats.vitality);
  if (spell.effect === 'shield' || spell.path === 4) game.player.shield += 4 + spell.stats.armor;
  game.effects.push({ ...target, color: spell.color }); log(game, `${spell.name} strikes ${targets.length} target${targets.length === 1 ? '' : 's'}.`);
  cleanup(game); endTurn(game); return true;
}
export function wait(game) { if (game.status !== 'playing') return false; log(game, 'You wait.'); endTurn(game); return true; }
export function drink(game) { if (game.status !== 'playing' || !game.potions) return false; game.potions--; game.progress.potionsUsed++; game.player.hp = maxHealth(game); for (const spell of availableSpells(game)) game.charges[spell.id] = spell.maxCharges; log(game, 'Restored health and all spell charges.', 'green'); endTurn(game); return true; }
export function serialize(game) { return JSON.stringify(game); }
export function restore(value) {
  try { const game = JSON.parse(value); if (game.version !== 1 || !Number.isInteger(game.seed) || !Number.isInteger(game.realm) || game.realm < 1 || game.realm > FINAL_REALM || !Array.isArray(game.learned) || !game.learned.every(id => nodeMap.has(id)) || new Set(game.learned).size !== game.learned.length || !['playing', 'dead', 'won'].includes(game.status) || !Array.isArray(game.tiles) || game.tiles.length !== SIZE || !game.tiles.every(row => Array.isArray(row) && row.length === SIZE && row.every(t => t === 0 || t === 1)) || !Number.isFinite(game.player?.hp) || !Number.isInteger(game.player.x) || !Number.isInteger(game.player.y) || game.tiles[game.player.y]?.[game.player.x] !== 0 || !Array.isArray(game.enemies) || !Array.isArray(game.items) || !Array.isArray(game.portals) || !Array.isArray(game.log) || !game.charges || !Number.isFinite(game.points)) return null;
    const defaults = { damageDealt: 0, pointsEarned: 0, pointsSpent: 0, spellsCast: 0, staffStrikes: 0, potionsUsed: 0, realmsCleared: 0 };
    game.progress = { ...defaults, ...game.progress };
    if (!Object.values(game.progress).every(value => Number.isInteger(value) && value >= 0)) return null;
    game.components ??= { spark: 0, ember: 0, crystal: 0 };
    game.artifacts ??= []; game.artifactCasts ??= 0; game.shrine ??= null;
    if (!materials.every(key => Number.isInteger(game.components[key]) && game.components[key] >= 0)
      || !Array.isArray(game.artifacts) || new Set(game.artifacts).size !== game.artifacts.length
      || !game.artifacts.every(id => artifacts.some(a => a.id === id))
      || !Number.isInteger(game.artifactCasts) || game.artifactCasts < 0
      || game.items.some(item => item.type === 'component' && !materials.includes(item.material))
      || (game.shrine && (!Number.isInteger(game.shrine.x) || !Number.isInteger(game.shrine.y)
        || game.tiles[game.shrine.y]?.[game.shrine.x] !== 0 || !Number.isInteger(game.shrine.uses) || game.shrine.uses < 0 || game.shrine.uses > 3))) return null;
    return game;
  } catch { return null; }
}

// Crafting is a planning action, like learning; it never advances enemies.
export function craft(game, id) {
  if (!canCraft(game, id)) return false;
  const item = artifacts.find(a => a.id === id);
  for (const [key, count] of Object.entries(item.recipe)) game.components[key] -= count;
  game.artifacts.push(id);
  if (id === 'prism') for (const spell of availableSpells(game)) game.charges[spell.id] += 2;
  if (id === 'storm-bell') game.artifactCasts = 0;
  log(game, `Crafted ${item.name}.`, 'gold'); return true;
}
export function transmute(game, from, to) {
  if (game.status !== 'playing' || !game.shrine?.uses || distance(game.player, game.shrine) > 1
    || !materials.includes(from) || !materials.includes(to) || from === to || !game.components[from]) return false;
  game.components[from]--; game.components[to]++; game.shrine.uses--;
  log(game, `Transmuted ${from} into ${to}.`, 'gold'); endTurn(game); return true;
}
export function threateningEnemies(game, target) {
  return game.enemies.filter(e => e.hp > 0 && !e.statuses.freeze && !(e.statuses.shock > 0 && (game.turn + 1) % 2 === 0)
    && distance(e, target) <= e.range && hasSight(game, e, target));
}
export function previewPortal(game, theme) {
  if (game.realm === FINAL_REALM) return null;
  const preview = { ...game, realm: game.realm + 1, theme, player: { ...game.player } };
  generateRealm(preview);
  return { enemies: preview.enemies.length, boss: preview.enemies.some(e => e.boss),
    schools: [...new Set(preview.enemies.map(e => e.school))],
    components: preview.items.filter(i => i.type === 'component').map(i => i.material), shrine: 'Transmutation' };
}
