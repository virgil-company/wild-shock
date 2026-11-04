import { schoolName, pathName, spellName, enemyName, componentName, equipmentName, nodeName, nodeDescription, buildName, logText } from './game-text.js';
import { materials, artifacts, canCraft, enhanceSpell } from './artifacts.js';
import { schools, paths, nodes, nodeMap, spellInfo } from './catalog.js';
import { t, getLocale, setLocale, translatePage, localeOptions } from './i18n.js';
import { craft, transmute, threateningEnemies, previewPortal, SIZE, createGame, availableSpells, maxHealth, distance, hasSight, shortestPath, learningPlan, learn, move, cast, wait, drink, serialize, restore } from './engine.js';
import { catalogueCounts, equipmentSlots } from './rw3.js';
const $ = id => document.getElementById(id);
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const h = (key, params) => escapeHtml(t(key, params));
const SAVE_KEY = 'wild-shock-v1';
const isLocalDevelopment = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(window.location.hostname);
let storageAvailable = true, saved;
try { saved = localStorage.getItem(SAVE_KEY); } catch { storageAvailable = false; }
let game = restore(saved) || createGame(undefined, { enableBigBang: isLocalDevelopment });
let detailNodeId = null, inspectionTarget = null;
let selected = null, hover = null, view = 'realm', schoolId = 0, showThreats = false;
const canvas = $('board'), ctx = canvas.getContext('2d'), tile = canvas.width / SIZE;
const language = $('language-select');
language.replaceChildren(...localeOptions.map(({ value, label }) => new Option(label, value)));
language.value = getLocale(); language.onchange = () => setLocale(language.value);
document.addEventListener('localechange', () => {
  renderHeading(); render();
  if ($('detail-dialog').open && detailNodeId) showNode(detailNodeId);
});
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
  if (showThreats) for (let y = 1; y < SIZE - 1; y++) for (let x = 1; x < SIZE - 1; x++) {
    if (game.tiles[y][x] === 0 && threateningEnemies(game, { x, y }).length) { ctx.fillStyle = '#ef796b40'; ctx.fillRect(x * tile, y * tile, tile, tile); }
  }
  if (game.shrine) {
    ctx.fillStyle = game.shrine.uses ? '#8fc9dd' : '#53635c';
    ctx.font = '24px monospace'; ctx.fillText('⚒', game.shrine.x * tile + 4, game.shrine.y * tile + 25);
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
    if (item.type === 'component') { ctx.fillStyle = { spark: '#d4cc79', ember: '#ee9270', crystal: '#8fc9dd' }[item.material]; ctx.font = 'bold 18px monospace'; ctx.fillText({ spark: 'S', ember: 'E', crystal: 'C' }[item.material], cx - 6, cy + 6); }
    else if (item.type === 'rw3-component') { ctx.fillStyle = '#d7a6e8'; ctx.font = 'bold 16px monospace'; ctx.fillText('◇', cx - 6, cy + 6); }
    else if (item.type === 'shard') { ctx.beginPath(); ctx.moveTo(cx, cy - 7); ctx.lineTo(cx + 5, cy); ctx.lineTo(cx, cy + 7); ctx.lineTo(cx - 5, cy); ctx.closePath(); ctx.fill(); }
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
function save() {
  try { localStorage.setItem(SAVE_KEY, serialize(game)); } catch { storageAvailable = false; }
  $('save-state').textContent = t(storageAvailable ? 'save.available' : 'save.unavailable');
}
function render() {
  $('seed-label').textContent = String(game.seed).slice(-6).padStart(6, '0');
  $('health-label').textContent = `${game.player.hp} / ${maxHealth(game)}`; $('health-bar').style.width = `${game.player.hp / maxHealth(game) * 100}%`;
  $('shield-label').textContent = game.player.shield; $('points-label').textContent = game.points; $('potions-label').textContent = game.potions;
  $('realm-number').textContent = String(game.realm).padStart(2, '0');
  $('turn-label').textContent = t('realm.turn', { turn: String(game.turn + 1).padStart(3, '0') });
  $('realm-name').textContent = t(game.theme ? 'realm.emberfall' : 'realm.mossbound'); $('enemy-count').textContent = game.enemies.length;
  $('rift-status').textContent = t(game.enemies.length ? 'realm.sealed' : 'realm.open');
  $('potion-button').disabled = !game.potions || game.status !== 'playing'; $('wait-button').disabled = game.status !== 'playing';
  const spells = availableSpells(game); $('spell-count').textContent = String(spells.length).padStart(2, '0');
  $('spell-list').innerHTML = spells.map((s, i) => {
    const name = spellName(s), effect = t(`effects.${s.effect}`);
    const tooltip = t('spell.tooltip', { effect, shortcut: i < 9 ? t('spell.shortcut', { key: i + 1 }) : '' });
    return `<button class="spell ${selected === s.id ? 'selected' : ''}" data-spell="${s.id}" data-tooltip="${escapeHtml(tooltip)}" aria-label="${h('spell.accessible', { name, effect, damage: s.damage, range: s.range })}" aria-pressed="${selected === s.id}" ${!game.charges[s.id] || game.status !== 'playing' ? 'disabled' : ''}><span class="spell-icon" style="color:${s.color}" aria-hidden="true">${s.icon}</span><span class="spell-text"><strong>${escapeHtml(name)}</strong><small>${h('spell.stats', { damage: s.damage, range: s.range, area: s.radius ? t('spell.area', { radius: s.radius }) : '' })}</small></span><small>${game.charges[s.id]}/${s.maxCharges}<br>${i < 9 ? `[${i + 1}]` : ''}</small></button>`;
  }).join('');
  $('log').replaceChildren(...game.log.slice(0, 12).map(entry => {
    const row = document.createElement('div'); row.className = ['gold', 'red', 'green'].includes(entry.tone) ? entry.tone : '';
    const time = document.createElement('time'); time.textContent = String(entry.turn).padStart(3, '0');
    row.append(time, document.createTextNode(logText(entry))); return row;
  }));
  const counts = schools.map(s => game.learned.filter(id => nodeMap.get(id).school === s.id).length);
  const strongest = schools[counts.indexOf(Math.max(...counts))];
  $('build-label').textContent = buildName(strongest.id, game.learned.length > 20);
  $('outcome').hidden = game.status === 'playing';
  if (game.status !== 'playing') {
    const progress = game.progress;
    const stats = [
      ['realm', String(game.realm).padStart(2, '0')], ['damage', progress.damageDealt], ['enemies', game.kills],
      ['pointsEarned', `+${progress.pointsEarned}`], ['pointsSpent', progress.pointsSpent], ['skills', game.learned.length],
      ['spells', progress.spellsCast], ['strikes', progress.staffStrikes], ['potions', progress.potionsUsed],
    ];
    $('outcome').innerHTML = `<div class="eyebrow">${h(`outcome.${game.status}.eyebrow`)}</div><h2>${h(`outcome.${game.status}.title`)}</h2><p class="outcome-intro">${h('outcome.introduction')}</p><div class="outcome-summary" aria-label="${h('outcome.summary')}">${stats.map(([key, value]) => `<div><span>${h(`outcome.${key}`)}</span><strong>${value}</strong></div>`).join('')}</div><p class="outcome-footnote">${h('outcome.progress', { realms: progress.realmsCleared, turns: game.turn })}</p><button id="restart-outcome">${h('outcome.restart')}</button>`;
    $('restart-outcome').onclick = () => $('new-dialog').showModal();
  }
  renderForge();
  if (view === 'tree') renderTree();
  updateHint(); inspect(inspectionTarget); draw(); save();
}
function updateHint(key) {
  const spell = availableSpells(game).find(s => s.id === selected);
  $('target-hint').textContent = key ? t(key) : spell ? t('hint.target', { spell: spellName(spell) }) : t('hint.move');
}
function action(fn) {
  const done = fn();
  if (done) { render(); setTimeout(() => { game.effects = []; draw(); }, 350); }
  else updateHint('hint.unavailable');
}
function renderForge() {
  const counts = catalogueCounts();
  const stock = materials.map(key => `${t(`materials.${key}`)}: ${game.components[key]}`).join(' · ');
  $('component-stock').textContent = t('forge.stock', { materials: stock, count: game.rw3Components.length });
  $('rw3-catalogue').textContent = t('forge.counts', counts);
  $('rw3-inventory').textContent = game.rw3Components.length ? game.rw3Components.map(componentName).join(' · ') : t('forge.empty');
  $('rw3-equipment').textContent = equipmentSlots.map(slot => `${t(`slots.${slot.toLowerCase()}`)}: ${game.equipment?.[slot]?.name ? equipmentName(game.equipment[slot].name) : '—'}`).join(' · ');
  $('artifact-count').textContent = `${game.artifacts.length} / ${artifacts.length}`;
  $('artifact-list').innerHTML = artifacts.map(item => `<div class="artifact-card"><strong>${h(`artifacts.${item.id}.name`)}</strong><p>${h(`artifacts.${item.id}.description`)}</p><small>${Object.entries(item.recipe).map(([key, count]) => `${count} ${h(`materials.${key}`)}`).join(' + ')}</small><button data-craft="${item.id}" data-tooltip="${h('forge.instant')}" ${canCraft(game, item.id) ? '' : 'disabled'}>${h(game.artifacts.includes(item.id) ? 'forge.equipped' : 'forge.craft')}</button></div>`).join('');
  const shrine = game.shrine, near = shrine && distance(game.player, shrine) <= 1;
  $('shrine-state').textContent = shrine ? t('forge.shrineState', { uses: shrine.uses, reach: t(near ? 'forge.near' : 'forge.far') }) : t('forge.noShrine');
  $('transmute-button').disabled = game.status !== 'playing' || !near || !shrine.uses || $('material-from').value === $('material-to').value || !game.components[$('material-from').value];
  $('threat-button').setAttribute('aria-pressed', String(showThreats));
}
function inspect(p) {
  inspectionTarget = p;
  const enemy = p && game.enemies.find(e => distance(e, p) === 0);
  if (enemy) {
    const nextAction = enemy.statuses.freeze ? 'inspection.frozen' : distance(enemy, game.player) <= enemy.range && hasSight(game, enemy, game.player) ? 'inspection.attack' : 'inspection.approach';
    $('inspection').innerHTML = `<div class="inspect-symbol" style="color:${schools[enemy.school].color}">${schools[enemy.school].icon}</div><h3>${escapeHtml(enemyName(enemy))}</h3><p>${h('inspection.enemyStats', enemy)}<br>${h('inspection.resistance', { school: schoolName(enemy.school) })}<br><span style="color:var(--gold)">${h(nextAction)}</span></p>`;
  } else if (p && game.portals.some(r => distance(r, p) === 0)) {
    const portal = game.portals.find(r => distance(r, p) === 0), next = previewPortal(game, portal.theme);
    const preview = next ? [
      h('inspection.nextRealm', { enemies: next.enemies, boss: next.boss ? t('inspection.boss') : '' }),
      h('inspection.affinities', { schools: next.schools.map(schoolName).join(', ') }),
      h('inspection.materials', { materials: next.components.map(key => t(`materials.${key}`)).join(', ') }),
      h('inspection.shrines', { shrines: next.shrine }),
    ].join('<br>') : h('inspection.finalPortal');
    $('inspection').innerHTML = `<div class="inspect-symbol">◈</div><h3>${h(portal.theme ? 'inspection.emberfallRift' : 'inspection.mossboundRift')}</h3><p>${h(game.enemies.length ? 'inspection.portalLocked' : 'inspection.portalOpen')}</p><p>${preview}</p>`;
  } else if (p && game.shrine && distance(game.shrine, p) === 0) {
    $('inspection').innerHTML = `<div class="inspect-symbol">⚒</div><h3>${h('inspection.shrine')}</h3><p>${h('inspection.shrineDescription', { uses: game.shrine.uses })}</p>`;
  } else if (p && game.items.some(i => distance(i, p) === 0)) {
    const item = game.items.find(i => distance(i, p) === 0);
    $('inspection').textContent = item.type === 'component' ? t('inspection.material', { material: t(`materials.${item.material}`) }) : item.type === 'rw3-component' ? t('inspection.component', { name: componentName(item.name) }) : t(item.type === 'shard' ? 'inspection.shard' : 'inspection.potion');
  } else if (p && distance(game.player, p) === 0) {
    $('inspection').innerHTML = `<div class="inspect-symbol">✧</div><h3>${h('inspection.player')}</h3><p>${h('inspection.playerHealth', { hp: game.player.hp, maxHp: maxHealth(game), ward: game.player.shield })}<br>${h('inspection.playerResources', { points: game.points, potions: game.potions })}</p>`;
  } else {
    $('inspection').innerHTML = `<div class="inspect-symbol">⌖</div><h3>${h('inspection.emptyTitle')}</h3><p>${h('inspection.emptyDescription')}</p>`;
  }
}
function renderHeading() {
  $('page-title').innerHTML = `${h(view === 'tree' ? 'atlas.title' : 'realm.title')}<span>.</span>`;
  $('page-subtitle').textContent = t(view === 'tree' ? 'atlas.subtitle' : 'realm.subtitle');
}
function setView(next) {
  view = next; $('realm-view').hidden = next !== 'realm'; $('tree-view').hidden = next !== 'tree';
  $('realm-tab').classList.toggle('active', next === 'realm'); $('tree-tab').classList.toggle('active', next === 'tree');
  renderHeading(); if (next === 'tree') renderTree(); else draw();
}
function renderTree() {
  $('learned-count').textContent = game.learned.length; $('atlas-points').textContent = t('atlas.points', { points: game.points });
  $('school-tabs').innerHTML = schools.map(s => `<button class="school-tab ${s.id === schoolId ? 'active' : ''}" data-school="${s.id}" aria-pressed="${s.id === schoolId}"><span style="color:${s.color}">${s.icon}</span>${escapeHtml(schoolName(s.id))}</button>`).join('');
  const query = $('skill-search').value.trim().toLowerCase(), filter = $('skill-filter').value;
  const matches = nodes.filter(n => `${n.name} ${n.description} ${nodeName(n)} ${nodeDescription(n)}`.toLowerCase().includes(query));
  if (query && !matches.some(n => n.school === schoolId) && matches.length) { schoolId = matches[0].school; renderTree(); return; }
  let count = 0;
  let html = paths.map(p => `<div class="path-label">${escapeHtml(pathName(p.id))}<br><small>${h(`paths.${p.id}.description`)}</small></div>`).join('');
  for (let rank = 1; rank <= 16; rank++) for (const path of paths) {
    const node = nodeMap.get(`${schoolId}-${path.id}-${rank}`), learned = game.learned.includes(node.id), plan = learningPlan(game, node.id), available = plan.canLearn;
    const visible = matches.includes(node) && (filter === 'all' || filter === 'learned' && learned || filter === 'available' && available); if (visible) count++;
    const state = t(learned ? 'atlas.state.learned' : available ? 'atlas.state.available' : 'atlas.state.locked');
    html += `<button class="skill-node ${learned ? 'learned' : available ? 'available' : ''} ${visible ? '' : 'filtered'}" data-node="${node.id}" aria-label="${h('atlas.nodeAccessible', { name: nodeName(node), state: learned ? t('atlas.learned') : t('atlas.cost', { cost: plan.cost }) })}"><span>${learned ? '✓' : rank === 1 ? schools[schoolId].icon : '◇'} ${escapeHtml(pathName(path.id))} ${rank}</span><small>${learned ? escapeHtml(state) : h('atlas.nodeCost', { cost: plan.cost, state })}</small></button>`;
  }
  $('skill-grid').innerHTML = html;
  $('search-results').textContent = t('atlas.results', { count, school: schoolName(schoolId), summary: query ? t('atlas.matches', { count: matches.length }) : t('atlas.structure') });
}
function showNode(id) {
  detailNodeId = id;
  const node = nodeMap.get(id), learned = game.learned.includes(id), parent = nodeMap.get(node.parent), plan = learningPlan(game, id), canLearn = plan.canLearn;
  const spell = enhanceSpell(game, spellInfo(node.school, node.path, game.learned));
  const stat = paths[node.path].stat;
  const bonusKey = ['radius', 'chain', 'armor', 'duration'].includes(stat) ? stat : 'default';
  $('detail-content').innerHTML = `<div class="eyebrow" style="color:${schools[node.school].color}">${h('detail.heading', { school: schoolName(node.school).toLocaleUpperCase(getLocale()), rank: node.rank })}</div><h2>${escapeHtml(nodeName(node))}</h2><p>${escapeHtml(nodeDescription(node))}</p><div class="detail-stats"><div>${h('detail.costLabel')}<strong>${h('detail.cost', { cost: learned ? node.cost : plan.cost, points: game.points })}</strong></div><div>${h('detail.prerequisite')}<strong>${parent ? escapeHtml(nodeName(parent)) : h('detail.root')}</strong></div><div>${h('detail.damage')}<strong>${spell.damage} · ${h(`effects.${spell.effect}`)}</strong></div><div>${h('detail.rangeLabel')}<strong>${h('detail.range', { range: spell.range, radius: spell.radius })}</strong></div></div><p class="muted">${plan.nodes.length > 1 ? h('detail.includes', { count: plan.nodes.length - 1, skills: plan.nodes.slice(0, -1).map(nodeName).join(', ') }) : ''}</p><p class="muted">${h(`detail.bonus.${bonusKey}`)}</p><button class="primary" id="learn-node" ${canLearn ? '' : 'disabled'}>${learned ? h('detail.learned') : canLearn ? h(plan.nodes.length > 1 ? 'detail.learnPrerequisites' : 'detail.learn', { cost: plan.cost }) : h('detail.unavailable')}</button>`;
  $('learn-node').onclick = () => { if (learn(game, id)) { render(); showNode(id); } };
  if (!$('detail-dialog').open) $('detail-dialog').showModal();
}
$('artifact-list').onclick = event => { const button = event.target.closest('[data-craft]'); if (button && !button.disabled) action(() => craft(game, button.dataset.craft)); };
$('material-from').onchange = $('material-to').onchange = renderForge;
$('transmute-button').onclick = () => action(() => transmute(game, $('material-from').value, $('material-to').value));
$('threat-button').onclick = () => { showThreats = !showThreats; renderForge(); draw(); };
$('realm-tab').onclick = () => setView('realm'); $('tree-tab').onclick = $('atlas-cta').onclick = () => setView('tree');
$('guide-button').onclick = () => $('guide-dialog').showModal(); $('new-button').onclick = () => $('new-dialog').showModal();
$('cancel-new').onclick = () => $('new-dialog').close(); $('confirm-new').onclick = () => { const input = $('new-seed'); if (!input.checkValidity()) { input.reportValidity(); return; } game = input.value ? createGame(Number(input.value), { enableBigBang: isLocalDevelopment }) : createGame(undefined, { enableBigBang: isLocalDevelopment }); selected = null; hover = null; inspectionTarget = null; $('new-dialog').close(); setView('realm'); render(); };
for (const button of document.querySelectorAll('.close-dialog')) button.onclick = () => button.closest('dialog').close();
$('spell-list').onclick = event => { const button = event.target.closest('[data-spell]'); if (!button || button.disabled) return; selected = selected === button.dataset.spell ? null : button.dataset.spell; render(); };
$('school-tabs').onclick = event => { const button = event.target.closest('[data-school]'); if (button) { schoolId = Number(button.dataset.school); renderTree(); } };
$('skill-grid').onclick = event => { const button = event.target.closest('[data-node]'); if (button) showNode(button.dataset.node); };
$('skill-search').oninput = $('skill-filter').onchange = renderTree;
$('wait-button').onclick = () => action(() => wait(game)); $('potion-button').onclick = () => action(() => drink(game));
for (const button of document.querySelectorAll('[data-move]')) button.onclick = () => action(() => move(game, ...button.dataset.move.split(',').map(Number)));
function tileAt(event) { const bounds = canvas.getBoundingClientRect(); return { x: Math.min(SIZE - 1, Math.max(0, Math.floor((event.clientX - bounds.left) / bounds.width * SIZE))), y: Math.min(SIZE - 1, Math.max(0, Math.floor((event.clientY - bounds.top) / bounds.height * SIZE))) }; }
function walkTo(target) {
  if (game.status !== 'playing' || game.tiles[target.y]?.[target.x] !== 0) return false;
  let moved = false;
  // Enemies move after every step, so find a new shortest route from the
  // current position rather than following a route that may now be blocked.
  for (let steps = 0; steps < SIZE * SIZE && game.status === 'playing' && distance(game.player, target) !== 0; steps++) {
    const path = shortestPath(game, game.player, target);
    if (!path?.length) break;
    const next = path[0], before = { ...game.player };
    if (!move(game, next.x - game.player.x, next.y - game.player.y)) break;
    moved = true;
    // An occupied next tile is attacked rather than entered; stop here so a
    // click never turns into repeated automatic staff attacks.
    if (distance(before, game.player) !== 1) break;
  }
  return moved;
}
canvas.onpointermove = event => { hover = tileAt(event); inspect(hover); draw(); }; canvas.onpointerleave = () => { hover = null; draw(); };
canvas.onclick = event => { const target = tileAt(event); if (selected) action(() => cast(game, selected, target)); else if (distance(game.player, target) > 0) action(() => walkTo(target)); else inspect(target); };
document.addEventListener('keydown', event => {
  if (document.querySelector('dialog[open]') || ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName) || event.ctrlKey || event.metaKey || event.altKey) return;
  const key = event.key.toLowerCase(); if (key === 't') { event.preventDefault(); setView(view === 'tree' ? 'realm' : 'tree'); return; }
  if (view !== 'realm') return;
  const moves = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] };
  if (moves[key]) { event.preventDefault(); action(() => move(game, ...moves[key])); }
  else if (key === ' ' && event.target.tagName !== 'BUTTON') { event.preventDefault(); action(() => wait(game)); }
  else if (key === 'y') { showThreats = !showThreats; renderForge(); draw(); }
  else if (key === 'p') action(() => drink(game));
  else if (key === 'escape') { selected = null; render(); }
  else if (/^[1-9]$/.test(key)) { const spell = availableSpells(game)[Number(key) - 1]; if (spell) { selected = spell.id; render(); } }
});
translatePage();
renderHeading();
render();
