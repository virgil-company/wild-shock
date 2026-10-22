import { schools, paths, nodes, nodeMap, spellInfo } from './catalog.js';
import { getLocale, setLocale, translatePage } from './i18n.js';
import { SIZE, createGame, availableSpells, maxHealth, distance, hasSight, learn, move, cast, wait, drink, serialize, restore } from './engine.js';
const $ = id => document.getElementById(id);
const SAVE_KEY = 'wild-shock-v1';
let storageAvailable = true, saved;
try { saved = localStorage.getItem(SAVE_KEY); } catch { storageAvailable = false; }
let game = restore(saved) || createGame();
let selected = null, hover = null, view = 'realm', schoolId = 0;
const canvas = $('board'), ctx = canvas.getContext('2d'), tile = canvas.width / SIZE;
const language = $('language-select'); language.value = getLocale(); language.onchange = () => setLocale(language.value);
const sprites = {
  wizard: ['....aa....','...aaaa...','..aaaaaa..','...bbbb...','...bccb...','...bbbb...','..aaaaaa..','.aaaaaaaa.','.aa.aa.aa.','...a..a...'],
  imp: ['.a....a.','.aa..aa.','..aaaa..','.abc cba.'.replaceAll(' ', ''),'..aaaa..','...aa...','..aaaa..','.aa..aa.'],
  knight: ['..aaaa..','.aaaaaa.','.abbbba.','.abccba.','..aaaa..','.aaaaaa.','a.aaaa.a','..a..a..','.aa..aa.'],
  eye: ['...aa...','..aaaa..','.abbbba.','abbcc bba'.replaceAll(' ', ''),'.abbbba.','..aaaa..','..a..a..','.a....a.'],
  moth: ['aa....aa','aaa..aaa','.aaaaaa.','..bccb..','.aaaaaa.','aaa..aaa','aa....aa'],
};
function sprite(pattern, x, y, colors, scale = 2) {
  const width = Math.max(...pattern.map(row => row.length));
  const ox = x * tile + (tile - width * scale) / 2, oy = y * tile + (tile - pattern.length * scale) / 2;
  pattern.forEach((row, py) => [...row].forEach((pixel, px) => { if (colors[pixel]) { ctx.fillStyle = colors[pixel]; ctx.fillRect(ox + px * scale, oy + py * scale, scale, scale); } }));
}
function draw() {
  ctx.fillStyle = '#101b16'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const spell = availableSpells(game).find(s => s.id === selected);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const n = ((x * 73 + y * 137 + game.seed) % 97) / 97, wall = game.tiles[y][x] === 1;
    ctx.fillStyle = wall ? ['#263529', '#2b392b', '#303e2d'][Math.floor(n * 3)] : ['#17261e', '#19281f', '#1b2a20'][Math.floor(n * 3)];
    ctx.fillRect(x * tile + 1, y * tile + 1, tile - 2, tile - 2);
    if (wall) {
      ctx.fillStyle = '#42503a'; ctx.fillRect(x * tile + 2, y * tile + 2, tile - 4, 2);
      ctx.fillStyle = '#17241c'; ctx.fillRect(x * tile + 3, y * tile + tile - 5, tile - 4, 4);
      ctx.fillStyle = n > .5 ? '#576342' : '#394e34'; ctx.fillRect(x * tile + 5 + Math.floor(n * 12), y * tile + 8, 4, 3);
      ctx.strokeStyle = '#1c2a20'; ctx.beginPath(); ctx.moveTo(x * tile, y * tile + 17); ctx.lineTo((x + 1) * tile, y * tile + 17); ctx.stroke();
    } else {
      if (n > .65) { ctx.fillStyle = '#30432b'; ctx.fillRect(x * tile + 8, y * tile + 22, 2, 4); ctx.fillRect(x * tile + 11, y * tile + 20, 2, 5); }
      if (n < .2) { ctx.fillStyle = '#2b392a'; ctx.fillRect(x * tile + 19, y * tile + 12, 3, 2); }
      if (spell && distance(game.player, { x, y }) <= spell.range && hasSight(game, game.player, { x, y })) { ctx.fillStyle = '#c7c38110'; ctx.fillRect(x * tile, y * tile, tile, tile); }
    }
  }
  for (const portal of game.portals) {
    const cx = portal.x * tile + tile / 2, cy = portal.y * tile + tile / 2;
    ctx.strokeStyle = game.enemies.length ? '#657452' : portal.theme ? '#e7a378' : '#bbaddb'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(cx, cy, 10, 13, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = game.enemies.length ? '#394832' : '#8b81ac'; ctx.fillRect(cx - 3, cy - 6, 6, 12);
    ctx.fillStyle = '#b3c99b'; ctx.fillRect(cx - 1, cy - 3, 2, 6);
  }
  for (const item of game.items) {
    const cx = item.x * tile + 16, cy = item.y * tile + 16;
    ctx.fillStyle = item.type === 'shard' ? '#dad29c' : '#ad9bbd';
    if (item.type === 'shard') { ctx.beginPath(); ctx.moveTo(cx, cy - 7); ctx.lineTo(cx + 5, cy); ctx.lineTo(cx, cy + 7); ctx.lineTo(cx - 5, cy); ctx.closePath(); ctx.fill(); }
    else { ctx.fillRect(cx - 4, cy - 3, 8, 10); ctx.fillRect(cx - 2, cy - 7, 4, 4); }
  }
  for (const enemy of game.enemies) {
    const colors = ['#c48b69', '#a9ae8b', '#ba9dbd', '#a6bb83'];
    sprite(sprites[['imp', 'knight', 'eye', 'moth'][enemy.type]], enemy.x, enemy.y, { a: enemy.boss ? '#dcba76' : colors[enemy.type], b: '#4b493c', c: '#f4dca5' }, enemy.boss ? 3 : 2);
    if (enemy.hp < enemy.maxHp) { ctx.fillStyle = '#42332b'; ctx.fillRect(enemy.x * tile + 5, enemy.y * tile + 28, 22, 2); ctx.fillStyle = '#d79f82'; ctx.fillRect(enemy.x * tile + 5, enemy.y * tile + 28, 22 * enemy.hp / enemy.maxHp, 2); }
    if (Object.values(enemy.statuses).some(n => n > 0)) { ctx.fillStyle = enemy.statuses.freeze ? '#9dcde0' : '#e5b77e'; ctx.fillRect(enemy.x * tile + 26, enemy.y * tile + 4, 3, 3); }
    if (distance(enemy, game.player) <= enemy.range && hasSight(game, enemy, game.player)) { ctx.fillStyle = '#e2ad7e'; ctx.font = 'bold 10px monospace'; ctx.fillText('!', enemy.x * tile + 26, enemy.y * tile + 14); }
  }
  ctx.fillStyle = '#d7d5a315'; ctx.fillRect(game.player.x * tile, game.player.y * tile, tile, tile);
  sprite(sprites.wizard, game.player.x, game.player.y, { a: '#b7c5a0', b: '#e6d8b7', c: '#334734' });
  ctx.fillStyle = '#c9b47f'; ctx.fillRect(game.player.x * tile + 27, game.player.y * tile + 12, 2, 16); ctx.fillStyle = '#eee1a1'; ctx.fillRect(game.player.x * tile + 25, game.player.y * tile + 9, 6, 5);
  for (const effect of game.effects || []) { ctx.strokeStyle = effect.color; ctx.lineWidth = 2; ctx.strokeRect(effect.x * tile + 3, effect.y * tile + 3, tile - 6, tile - 6); }
  if (hover) {
    if (spell) for (let y = Math.max(0, hover.y - spell.radius); y <= Math.min(SIZE - 1, hover.y + spell.radius); y++) for (let x = Math.max(0, hover.x - spell.radius); x <= Math.min(SIZE - 1, hover.x + spell.radius); x++) { ctx.fillStyle = `${spell.color}25`; ctx.fillRect(x * tile, y * tile, tile, tile); }
    ctx.strokeStyle = spell ? spell.color : '#cbd4b1'; ctx.lineWidth = 1; ctx.strokeRect(hover.x * tile + 1, hover.y * tile + 1, tile - 2, tile - 2);
  }
}
function save() { try { localStorage.setItem(SAVE_KEY, serialize(game)); } catch { storageAvailable = false; } $('save-state').textContent = storageAvailable ? 'Saved locally' : 'Save unavailable'; }
function render() {
  $('seed-label').textContent = String(game.seed).slice(-6).padStart(6, '0');
  $('health-label').textContent = `${game.player.hp} / ${maxHealth(game)}`; $('health-bar').style.width = `${game.player.hp / maxHealth(game) * 100}%`;
  $('shield-label').textContent = game.player.shield; $('points-label').textContent = game.points; $('potions-label').textContent = game.potions;
  $('realm-number').textContent = String(game.realm).padStart(2, '0'); $('turn-label').textContent = `TURN ${String(game.turn + 1).padStart(3, '0')}`;
  $('realm-name').textContent = game.theme ? 'THE EMBERFALL SANCTUM' : 'THE MOSSBOUND RUINS'; $('enemy-count').textContent = game.enemies.length;
  $('rift-status').textContent = game.enemies.length ? '◇ Rifts sealed until the realm is clear' : '✧ Rifts open. Walk into either portal.';
  $('potion-button').disabled = !game.potions || game.status !== 'playing'; $('wait-button').disabled = game.status !== 'playing';
  const spells = availableSpells(game); $('spell-count').textContent = String(spells.length).padStart(2, '0');
  $('spell-list').innerHTML = spells.map((s, i) => `<button class="spell ${selected === s.id ? 'selected' : ''}" data-spell="${s.id}" aria-pressed="${selected === s.id}" ${!game.charges[s.id] || game.status !== 'playing' ? 'disabled' : ''}><span class="spell-icon" style="color:${s.color}">${s.icon}</span><span class="spell-text"><strong>${s.name}</strong><small>${s.damage} DMG · ${s.range} RANGE${s.radius ? ` · ${s.radius} AOE` : ''}</small></span><small>${game.charges[s.id]}/${s.maxCharges}<br>${i < 9 ? `[${i + 1}]` : ''}</small></button>`).join('');
  $('log').replaceChildren(...game.log.slice(0, 12).map(entry => { const row = document.createElement('div'); row.className = ['gold', 'red', 'green'].includes(entry.tone) ? entry.tone : ''; const time = document.createElement('time'); time.textContent = String(entry.turn).padStart(3, '0'); row.append(time, document.createTextNode(entry.message)); return row; }));
  const counts = schools.map(s => game.learned.filter(id => nodeMap.get(id).school === s.id).length); const strongest = schools[counts.indexOf(Math.max(...counts))]; $('build-label').textContent = `${strongest.name} ${game.learned.length > 20 ? 'archmage' : 'initiate'}`;
  $('outcome').hidden = game.status === 'playing';
  if (game.status !== 'playing') { $('outcome').innerHTML = `<div class="eyebrow">${game.status === 'won' ? 'THE EXPANSE IS MENDED' : 'THE EXPANSE REMEMBERS'}</div><h2>${game.status === 'won' ? 'A sovereign awakens.' : 'Even stars go dark.'}</h2><p>Realm ${game.realm} · ${game.kills} enemies defeated<br>${game.learned.length} skills learned · ${game.turn} turns</p><button id="restart-outcome">Begin another journey ↗</button>`; $('restart-outcome').onclick = () => $('new-dialog').showModal(); }
  if (view === 'tree') renderTree();
  updateHint(); draw(); save(); translatePage();
}
function updateHint(message) { const spell = availableSpells(game).find(s => s.id === selected); $('target-hint').textContent = message || (spell ? `${spell.name} · Click a target · Esc to cancel` : 'WASD / arrows to move · 1–9 to select a spell'); }
function action(fn) { const done = fn(); if (done) { render(); setTimeout(() => { game.effects = []; draw(); }, 350); } else updateHint('That action is unavailable. Check range, walls and charges.'); }
function inspect(p) {
  const enemy = game.enemies.find(e => distance(e, p) === 0);
  if (enemy) { $('inspection').innerHTML = `<div class="inspect-symbol" style="color:${schools[enemy.school].color}">${schools[enemy.school].icon}</div><h3>${enemy.name}</h3><p>${enemy.hp} / ${enemy.maxHp} HP · ${enemy.damage} damage<br>Resists ${schools[enemy.school].name} by 3<br><span style="color:var(--gold)">${enemy.statuses.freeze ? 'Frozen: skips its next turn' : distance(enemy, game.player) <= enemy.range && hasSight(game, enemy, game.player) ? 'Next: attack the Riftwalker' : 'Next: move toward you'}</span></p>`; }
  else if (game.portals.some(r => distance(r, p) === 0)) { const portal = game.portals.find(r => distance(r, p) === 0); $('inspection').innerHTML = `<div class="inspect-symbol">◈</div><h3>${portal.theme ? 'Emberfall' : 'Mossbound'} rift</h3><p>${game.enemies.length ? 'Defeat all hostiles to unlock.' : 'Step inside to advance. Health and spell charges will be restored.'}</p>`; }
  else if (distance(game.player, p) === 0) $('inspection').innerHTML = `<div class="inspect-symbol">✧</div><h3>The Riftwalker</h3><p>${game.player.hp} / ${maxHealth(game)} health · ${game.player.shield} ward<br>${game.points} skill points · ${game.potions} draughts</p>`;
  else $('inspection').innerHTML = '<div class="inspect-symbol">⌖</div><h3>Know your enemy.</h3><p>Hover over a creature to reveal its health, resistance and next action.</p>';
}
function setView(next) { view = next; $('realm-view').hidden = next !== 'realm'; $('tree-view').hidden = next !== 'tree'; $('realm-tab').classList.toggle('active', next === 'realm'); $('tree-tab').classList.toggle('active', next === 'tree'); $('page-title').innerHTML = next === 'tree' ? 'Power has many branches<span>.</span>' : 'Beyond the first rift<span>.</span>'; $('page-subtitle').textContent = next === 'tree' ? 'Twelve schools. Interwoven paths. A spellbook that is entirely yours.' : 'A thousand paths to power. One life to find yours.'; if (next === 'tree') renderTree(); else draw(); }
function renderTree() {
  $('learned-count').textContent = game.learned.length; $('atlas-points').textContent = `${game.points} skill points available`;
  $('school-tabs').innerHTML = schools.map(s => `<button class="school-tab ${s.id === schoolId ? 'active' : ''}" data-school="${s.id}" aria-pressed="${s.id === schoolId}"><span style="color:${s.color}">${s.icon}</span>${s.name}</button>`).join('');
  const query = $('skill-search').value.trim().toLowerCase(), filter = $('skill-filter').value;
  const matches = nodes.filter(n => `${n.name} ${n.description}`.toLowerCase().includes(query));
  if (query && !matches.some(n => n.school === schoolId) && matches.length) { schoolId = matches[0].school; renderTree(); return; }
  let count = 0;
  let html = paths.map(p => `<div class="path-label">${p.name}<br><small>${p.description}</small></div>`).join('');
  for (let rank = 1; rank <= 16; rank++) for (const path of paths) {
    const node = nodeMap.get(`${schoolId}-${path.id}-${rank}`), learned = game.learned.includes(node.id), available = !learned && (!node.parent || game.learned.includes(node.parent)) && game.points >= node.cost;
    const visible = matches.includes(node) && (filter === 'all' || filter === 'learned' && learned || filter === 'available' && available); if (visible) count++;
    html += `<button class="skill-node ${learned ? 'learned' : available ? 'available' : ''} ${visible ? '' : 'filtered'}" data-node="${node.id}" aria-label="${node.name}, ${learned ? 'learned' : `${node.cost} skill points`}"><span>${learned ? '✓' : rank === 1 ? schools[schoolId].icon : '◇'} ${path.name} ${rank}</span><small>${learned ? 'LEARNED' : `${node.cost} SP · ${available ? 'AVAILABLE' : 'LOCKED'}`}</small></button>`;
  }
  $('skill-grid').innerHTML = html; $('search-results').textContent = `${count} matching nodes in ${schools[schoolId].name}. ${query ? `${matches.length} text matches across all schools; select a school to explore them.` : '192 nodes per school · 12 paths · 16 ranks. Bonuses accumulate across the entire school.'}`;
}
function showNode(id) {
  const node = nodeMap.get(id), learned = game.learned.includes(id), parent = nodeMap.get(node.parent), canLearn = !learned && (!parent || game.learned.includes(parent.id)) && game.points >= node.cost && game.status === 'playing';
  const spell = spellInfo(node.school, node.path, game.learned);
  $('detail-content').innerHTML = `<div class="eyebrow" style="color:${schools[node.school].color}">${schools[node.school].name.toUpperCase()} SCHOOL · RANK ${node.rank} / 16</div><h2>${node.name}</h2><p>${node.description}</p><div class="detail-stats"><div>Skill point cost<strong>${node.cost} SP / ${game.points} available</strong></div><div>Prerequisite<strong>${parent ? parent.name : 'None — root skill'}</strong></div><div>Current spell damage<strong>${spell.damage} · ${spell.effect}</strong></div><div>Current spell reach<strong>${spell.range} tiles · ${spell.radius} area radius</strong></div></div><p class="muted">${paths[node.path].stat === 'radius' ? 'Every 4 area points expands Novas; every 6 expands other spells.' : paths[node.path].stat === 'chain' ? 'Every 3 chain points adds a chained target within 3 tiles.' : paths[node.path].stat === 'armor' ? 'Every 3 protection points across all schools reduces incoming damage by 1 (minimum 1). Also improves wards.' : paths[node.path].stat === 'duration' ? 'Every 3 duration points adds one status turn.' : 'Bonuses apply to every spell of this school. Health and protection bonuses also strengthen the caster.'}</p><button class="primary" id="learn-node" ${canLearn ? '' : 'disabled'}>${learned ? 'Already learned' : canLearn ? `Learn skill · ${node.cost} SP` : parent && !game.learned.includes(parent.id) ? 'Learn the prerequisite first' : 'Not enough skill points or journey ended'}</button>`;
  $('learn-node').onclick = () => { if (learn(game, id)) { render(); showNode(id); } };
  if (!$('detail-dialog').open) $('detail-dialog').showModal();
}
$('realm-tab').onclick = () => setView('realm'); $('tree-tab').onclick = $('atlas-cta').onclick = () => setView('tree');
$('guide-button').onclick = () => $('guide-dialog').showModal(); $('new-button').onclick = () => $('new-dialog').showModal();
$('cancel-new').onclick = () => $('new-dialog').close(); $('confirm-new').onclick = () => { const input = $('new-seed'); if (!input.checkValidity()) { input.reportValidity(); return; } game = input.value ? createGame(Number(input.value)) : createGame(); selected = null; hover = null; $('new-dialog').close(); setView('realm'); render(); };
for (const button of document.querySelectorAll('.close-dialog')) button.onclick = () => button.closest('dialog').close();
$('spell-list').onclick = event => { const button = event.target.closest('[data-spell]'); if (!button || button.disabled) return; selected = selected === button.dataset.spell ? null : button.dataset.spell; render(); };
$('school-tabs').onclick = event => { const button = event.target.closest('[data-school]'); if (button) { schoolId = Number(button.dataset.school); renderTree(); } };
$('skill-grid').onclick = event => { const button = event.target.closest('[data-node]'); if (button) showNode(button.dataset.node); };
$('skill-search').oninput = $('skill-filter').onchange = renderTree;
$('wait-button').onclick = () => action(() => wait(game)); $('potion-button').onclick = () => action(() => drink(game));
for (const button of document.querySelectorAll('[data-move]')) button.onclick = () => action(() => move(game, ...button.dataset.move.split(',').map(Number)));
function tileAt(event) { const bounds = canvas.getBoundingClientRect(); return { x: Math.min(SIZE - 1, Math.max(0, Math.floor((event.clientX - bounds.left) / bounds.width * SIZE))), y: Math.min(SIZE - 1, Math.max(0, Math.floor((event.clientY - bounds.top) / bounds.height * SIZE))) }; }
canvas.onpointermove = event => { hover = tileAt(event); inspect(hover); draw(); }; canvas.onpointerleave = () => { hover = null; draw(); };
canvas.onclick = event => { const target = tileAt(event); if (selected) action(() => cast(game, selected, target)); else if (Math.abs(target.x - game.player.x) + Math.abs(target.y - game.player.y) === 1) action(() => move(game, target.x - game.player.x, target.y - game.player.y)); else inspect(target); };
document.addEventListener('keydown', event => {
  if (document.querySelector('dialog[open]') || ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName) || event.ctrlKey || event.metaKey || event.altKey) return;
  const key = event.key.toLowerCase(); if (key === 't') { event.preventDefault(); setView(view === 'tree' ? 'realm' : 'tree'); return; }
  if (view !== 'realm') return;
  const moves = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] };
  if (moves[key]) { event.preventDefault(); action(() => move(game, ...moves[key])); }
  else if (key === ' ' && event.target.tagName !== 'BUTTON') { event.preventDefault(); action(() => wait(game)); }
  else if (key === 'p') action(() => drink(game));
  else if (key === 'escape') { selected = null; render(); }
  else if (/^[1-9]$/.test(key)) { const spell = availableSpells(game)[Number(key) - 1]; if (spell) { selected = spell.id; render(); } }
});
render();
