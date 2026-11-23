import { schoolName, spellName, enemyName, componentName, equipmentName, logText } from './game-text.js';
import { t, getLocale, setLocale, translatePage, localeOptions } from './i18n.js';
import {
  forge, useShrine, threateningEnemies, previewPortal, SIZE,
  createGame, availableSpells, maxHealth, finalRealmOf, distance, hasSight, shortestPath,
  learnRw3Spell, learnRw3Upgrade, move, cast, wait, cancelChannel, drink, serialize, restore,
} from './engine.js';
import {
  catalogueCounts, equipmentSlots, rw3Spells, rw3Equipment, rw3Tags,
  spellById, componentByName, canLearnRw3Spell, canLearnRw3Upgrade,
  effectiveRw3Spell, findMatchingComponents, craftableEquipment, getEquipmentModifiers,
  getUnitResistance, DAMAGE_TYPES, TAG_META, CLOUD_TYPES,
} from './rw3.js';

const $ = id => document.getElementById(id);
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const h = (key, params) => escapeHtml(t(key, params));
const SAVE_KEY = 'wild-shock-v1';
const isLocalDevelopment = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(window.location.hostname);
let storageAvailable = true, saved;
try { saved = localStorage.getItem(SAVE_KEY); } catch { storageAvailable = false; }
let game = restore(saved) || createGame(undefined, { enableBigBang: isLocalDevelopment });
let detailRw3SpellId = null, inspectionTarget = null;
let selected = null, hover = null, view = 'realm', showThreats = false;

const canvas = $('board'), ctx = canvas.getContext('2d'), tile = canvas.width / SIZE;
const language = $('language-select');
language.replaceChildren(...localeOptions.map(({ value, label }) => new Option(label, value)));
language.value = getLocale(); language.onchange = () => setLocale(language.value);
document.addEventListener('localechange', () => {
  populateFilters();
  renderHeading(); render();
  if ($('detail-dialog').open && detailRw3SpellId != null) showRw3SpellDetail(detailRw3SpellId);
});

const sprites = {
  wizard: ['....aa....','...aaaa...','..aaaaaa..','...bbbb...','...bccb...','...bbbb...','..aaaaaa..','.aaaaaaaa.','.aa.aa.aa.','...a..a...'],
  imp: ['a......a','aa....aa','.aaaaaa.','.ab..ba.','..aaaa..','a.aaaa.a','.aaaaaa.','..a..a..','.aa..aa.'],
  knight: ['...aa...','..aaaa..','..abba..','..abba..','...aa...','c.aaa.ac','caaaaaac','c.aaa..c','..a.a...','.aa..aa..'],
  eye: ['...a....','.a.a.a..','..aaaa..','.abbbba.','abbccbba','.abbbba.','..aaaa..','.a.a.a..','...a....'],
  moth: ['a......a','.a....a.','aa.ab.aa','aaaabaaa','aaaabaaa','.aaabaa.','aa..b.aa','a...b..a'],
  lair: ['..aaaa..','.abbbba.','abccccba','abc..cba','abc..cba','abccccba','.abbbba.','..aaaa..'],
  ally: ['...aa...','..abba..','.abbbba.','..aaaa..','.aaaaaa.','..a..a..','.aa..aa.'],
  spark: ['.....aa.','....aa..','...aa...','..aaaaaa','....aaa.','...aa...','..aa....','.aa.....'],
  ember: ['....a...','...aa...','...aaa..','.a.aaa..','.aaaaaa.','aaabbaaa','aabbbbaa','.aabbaa.','..aaaa..'],
  crystal: ['...aa...','..abba..','.abbbba.','abbbbbba','aabbbbaa','.aabbaa.','..aaaa..','...aa...'],
  shard: ['....a...','...aba..','..abbba.','.abbbba.','..abba..','..aba...','..aa....','..a.....'],
  potion: ['..aaaa..','...bb...','..abba..','..abba..','.acccca.','.acccca.','.acccca.','..aaaa..'],
  component: ['...aa...','..abba..','.abbbba.','abcaacba','abc..cba','.abbbba.','..abba..','...aa...'],
};
const SHRINE_ICONS = { transmutation: '⚒', duplication: '❖', empowerment: '✦', chronomancy: '◷', calling: '♙' };

function sprite(pattern, x, y, colors, scale = 2) {
  const width = Math.max(...pattern.map(row => row.length));
  const ox = x * tile + (tile - width * scale) / 2, oy = y * tile + (tile - pattern.length * scale) / 2;
  pattern.forEach((row, py) => [...row].forEach((pixel, px) => { if (colors[pixel]) { ctx.fillStyle = colors[pixel]; ctx.fillRect(ox + px * scale, oy + py * scale, scale, scale); } }));
}
function itemVisual(item) {
  const key = item.type === 'component' ? item.material : item.type === 'rw3-component' ? 'component' : item.type;
  const color = { spark: '#f4dc79', ember: '#f49a61', crystal: '#8fd8ee', shard: '#ead99a', potion: '#d8d5c3', component: '#d7a6e8' }[key];
  return { key, colors: { a: color, b: key === 'potion' ? '#f5ead0' : '#fff0c4', c: key === 'potion' ? '#ed7187' : '#9272ac' } };
}
function spriteIcon(key, colors) {
  const pattern = sprites[key];
  const pixels = pattern.flatMap((row, y) => [...row].flatMap((pixel, x) => colors[pixel] ? [`<rect x="${x}" y="${y}" width="1" height="1" fill="${colors[pixel]}"/>`] : [])).join('');
  return `<svg width="32" height="32" viewBox="0 0 ${Math.max(...pattern.map(row => row.length))} ${pattern.length}" shape-rendering="crispEdges" aria-hidden="true">${pixels}</svg>`;
}
function cleanRw3Desc(text) {
  return String(text || '').replace(/\[([^:\]]+)(?::[^\]]+)?\]/g, '$1');
}

function draw() {
  ctx.fillStyle = '#0a110e'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const spell = availableSpells(game).find(s => s.id === selected);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const n = ((x * 73 + y * 137 + game.seed) % 97) / 97, tVal = game.tiles[y][x];
    if (tVal === 2) {
      // Chasm tile
      ctx.fillStyle = '#060a0d'; ctx.fillRect(x * tile + 1, y * tile + 1, tile - 2, tile - 2);
      ctx.strokeStyle = '#1b2b34'; ctx.strokeRect(x * tile + 3, y * tile + 3, tile - 6, tile - 6);
      continue;
    }
    const wall = tVal === 1;
    ctx.fillStyle = wall ? ['#263529', '#2b392b', '#303e2d'][Math.floor(n * 3)] : ['#16221b', '#18251d', '#1a271f'][Math.floor(n * 3)];
    ctx.fillRect(x * tile + 1, y * tile + 1, tile - 2, tile - 2);
    if (wall) {
      ctx.fillStyle = '#42503a'; ctx.fillRect(x * tile + 2, y * tile + 2, tile - 4, 2);
      ctx.fillStyle = '#142018'; ctx.fillRect(x * tile + 3, y * tile + tile - 5, tile - 4, 4);
      ctx.fillStyle = n > .5 ? '#576342' : '#394e34'; ctx.fillRect(x * tile + 5 + Math.floor(n * 12), y * tile + 8, 4, 3);
      ctx.strokeStyle = '#1c2a20'; ctx.beginPath(); ctx.moveTo(x * tile, y * tile + 17); ctx.lineTo((x + 1) * tile, y * tile + 17); ctx.stroke();
    } else {
      if (n > .65) { ctx.fillStyle = '#2c3d29'; ctx.fillRect(x * tile + 8, y * tile + 22, 2, 4); ctx.fillRect(x * tile + 11, y * tile + 20, 2, 5); }
      if (n < .2) { ctx.fillStyle = '#273527'; ctx.fillRect(x * tile + 19, y * tile + 12, 3, 2); }
      if (spell && (spell.range === 0 || (distance(game.player, { x, y }) <= spell.range && (!spell.requiresLos || hasSight(game, game.player, { x, y }))))) {
        ctx.fillStyle = `${spell.color}18`; ctx.fillRect(x * tile, y * tile, tile, tile);
      }
    }
  }
  // Clouds
  for (const cloud of game.clouds || []) {
    ctx.fillStyle = `${cloud.color}38`; ctx.fillRect(cloud.x * tile + 2, cloud.y * tile + 2, tile - 4, tile - 4);
    ctx.strokeStyle = `${cloud.color}88`; ctx.lineWidth = 1; ctx.strokeRect(cloud.x * tile + 3, cloud.y * tile + 3, tile - 6, tile - 6);
  }
  if (showThreats) for (let y = 1; y < SIZE - 1; y++) for (let x = 1; x < SIZE - 1; x++) {
    if (game.tiles[y][x] === 0 && threateningEnemies(game, { x, y }).length) { ctx.fillStyle = '#ef796b40'; ctx.fillRect(x * tile, y * tile, tile, tile); }
  }
  if (game.shrine) {
    ctx.fillStyle = game.shrine.uses ? '#7bd0ff' : '#53635c';
    ctx.font = '22px monospace';
    ctx.fillText(SHRINE_ICONS[game.shrine.type] || '⚒', game.shrine.x * tile + 5, game.shrine.y * tile + 24);
  }
  for (const portal of game.portals) {
    const cx = portal.x * tile + tile / 2, cy = portal.y * tile + tile / 2;
    ctx.strokeStyle = game.enemies.length ? '#657452' : portal.theme ? '#e7a378' : '#bbaddb'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(cx, cy, 10, 13, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = game.enemies.length ? '#394832' : '#8b81ac'; ctx.fillRect(cx - 3, cy - 6, 6, 12);
    ctx.fillStyle = '#b3c99b'; ctx.fillRect(cx - 1, cy - 3, 2, 6);
  }
  for (const item of game.items) {
    const visual = itemVisual(item);
    sprite(sprites[visual.key], item.x, item.y, visual.colors);
  }
  // Allied Minions
  for (const ally of game.allies || []) {
    ctx.strokeStyle = '#4ade80aa'; ctx.lineWidth = 1.5; ctx.strokeRect(ally.x * tile + 2, ally.y * tile + 2, tile - 4, tile - 4);
    sprite(sprites.ally, ally.x, ally.y, { a: ally.color || '#4ade80', b: '#e2f7e8' }, 2);
    if (ally.hp < ally.maxHp) { ctx.fillStyle = '#223328'; ctx.fillRect(ally.x * tile + 5, ally.y * tile + 28, 22, 2); ctx.fillStyle = '#4ade80'; ctx.fillRect(ally.x * tile + 5, ally.y * tile + 28, 22 * ally.hp / ally.maxHp, 2); }
    if (ally.shields > 0) { ctx.fillStyle = '#7bd0ff'; ctx.font = 'bold 9px monospace'; ctx.fillText(String(ally.shields), ally.x * tile + 3, ally.y * tile + 11); }
  }
  // Enemies & Spawners
  for (const enemy of game.enemies) {
    if (enemy.isSpawner) {
      sprite(sprites.lair, enemy.x, enemy.y, { a: '#a78bfa', b: '#4c1d95', c: '#f472b6' }, 2);
      ctx.fillStyle = '#f472b6'; ctx.font = 'bold 9px monospace'; ctx.fillText(String(enemy.spawnCooldown), enemy.x * tile + 23, enemy.y * tile + 11);
    } else {
      const colors = ['#c48b69', '#a9ae8b', '#ba9dbd', '#a6bb83'];
      sprite(sprites[['imp', 'knight', 'eye', 'moth'][enemy.type]], enemy.x, enemy.y, { a: enemy.isFinalBoss ? '#f87171' : enemy.boss ? '#e5c27b' : colors[enemy.type], b: '#4b493c', c: '#f4dca5' }, enemy.boss ? 3 : 2);
    }
    if (enemy.hp < enemy.maxHp) { ctx.fillStyle = '#42332b'; ctx.fillRect(enemy.x * tile + 5, enemy.y * tile + 28, 22, 2); ctx.fillStyle = '#d79f82'; ctx.fillRect(enemy.x * tile + 5, enemy.y * tile + 28, 22 * enemy.hp / enemy.maxHp, 2); }
    if (enemy.shields > 0) { ctx.fillStyle = '#7bd0ff'; ctx.font = 'bold 9px monospace'; ctx.fillText(String(enemy.shields), enemy.x * tile + 3, enemy.y * tile + 11); }
    if (Object.values(enemy.statuses || {}).some(n => n > 0)) { ctx.fillStyle = enemy.statuses.freeze ? '#7bd0ff' : enemy.statuses.stun || enemy.statuses.petrify ? '#facc15' : '#e5b77e'; ctx.fillRect(enemy.x * tile + 26, enemy.y * tile + 4, 3, 3); }
    if (!enemy.isSpawner && distance(enemy, game.player) <= enemy.range && hasSight(game, enemy, game.player)) { ctx.fillStyle = '#f87171'; ctx.font = 'bold 10px monospace'; ctx.fillText('!', enemy.x * tile + 26, enemy.y * tile + 15); }
  }
  ctx.fillStyle = '#e5c27b18'; ctx.fillRect(game.player.x * tile, game.player.y * tile, tile, tile);
  sprite(sprites.wizard, game.player.x, game.player.y, { a: '#b7c5a0', b: '#e6d8b7', c: '#334734' });
  ctx.fillStyle = '#c9b47f'; ctx.fillRect(game.player.x * tile + 27, game.player.y * tile + 12, 2, 16); ctx.fillStyle = '#eee1a1'; ctx.fillRect(game.player.x * tile + 25, game.player.y * tile + 9, 6, 5);
  for (const effect of game.effects || []) { ctx.strokeStyle = effect.color; ctx.lineWidth = 2; ctx.strokeRect(effect.x * tile + 3, effect.y * tile + 3, tile - 6, tile - 6); }
  if (hover) {
    if (spell) for (let y = Math.max(0, hover.y - (spell.radius || 0)); y <= Math.min(SIZE - 1, hover.y + (spell.radius || 0)); y++) for (let x = Math.max(0, hover.x - (spell.radius || 0)); x <= Math.min(SIZE - 1, hover.x + (spell.radius || 0)); x++) { ctx.fillStyle = `${spell.color}25`; ctx.fillRect(x * tile, y * tile, tile, tile); }
    ctx.strokeStyle = spell ? spell.color : '#cbd4b1'; ctx.lineWidth = 1; ctx.strokeRect(hover.x * tile + 1, hover.y * tile + 1, tile - 2, tile - 2);
  }
}

function save() {
  try { localStorage.setItem(SAVE_KEY, serialize(game)); } catch { storageAvailable = false; }
  $('save-state').textContent = t(storageAvailable ? 'save.available' : 'save.unavailable');
}

function render() {
  const maxR = finalRealmOf(game);
  $('seed-label').textContent = String(game.seed).slice(-6).padStart(6, '0');
  $('mode-badge').textContent = game.mode && game.mode !== 'standard' ? t(`mode.${game.mode}`).split('(')[0].trim() : '';
  $('health-label').textContent = `${game.player.hp} / ${maxHealth(game)}`; $('health-bar').style.width = `${Math.min(100, game.player.hp / maxHealth(game) * 100)}%`;
  $('shields-label').textContent = game.player.shields || 0;
  $('shield-label').textContent = game.player.shield; $('points-label').textContent = game.points; $('potions-label').textContent = game.potions;
  $('realm-number').textContent = String(game.realm).padStart(2, '0');
  $('realm-total').textContent = t('realm.ofTotal', { total: maxR });
  $('turn-label').textContent = t('realm.turn', { turn: String(game.turn + 1).padStart(3, '0') });
  $('realm-name').textContent = t(game.theme ? 'realm.emberfall' : 'realm.mossbound'); $('enemy-count').textContent = game.enemies.length;
  $('rift-status').textContent = t(game.enemies.length ? 'realm.sealed' : 'realm.open');
  $('potion-button').disabled = !game.potions || game.status !== 'playing'; $('wait-button').disabled = game.status !== 'playing';

  // Status banners (Quickstep, Channeling, Active Buffs)
  const mods = getEquipmentModifiers(game);
  const banners = [];
  if (mods.quickstep && !game.quickstepUsed) banners.push(`<div class="banner-chip quickstep"><span>⇄ ${h('player.quickstepReady')}</span></div>`);
  if (game.channel) {
    const chSpell = availableSpells(game).find(s => s.id === game.channel.spellId);
    banners.push(`<div class="banner-chip channel"><span>❂ ${h('player.channeling', { spell: chSpell?.name || '', turns: game.channel.turnsLeft })}</span><button id="cancel-channel-btn">${h('player.cancelChannel')}</button></div>`);
  }
  for (const buff of game.buffs || []) banners.push(`<div class="banner-chip"><span>✦ ${escapeHtml(buff.name)}</span><small>${buff.duration}t</small></div>`);
  $('status-banners').innerHTML = banners.join('');
  if ($('cancel-channel-btn')) $('cancel-channel-btn').onclick = () => { cancelChannel(game); render(); };

  const spells = availableSpells(game); $('spell-count').textContent = String(spells.length).padStart(2, '0');
  $('spell-list').innerHTML = spells.map((s, i) => {
    const name = s.isRw3 ? s.name : spellName(s);
    const charges = game.charges[s.id] ?? 0;
    const canUse = game.status === 'playing' && (s.isRw3 ? ((s.maxCharges === 0 || charges > 0) && (!s.hpCost || game.player.hp > s.hpCost)) : charges > 0);
    const meta = s.isRw3
      ? `${s.damage ? `${s.damage} DMG` : s.behavior.toUpperCase()} · R${s.range}${s.radius ? ` · A${s.radius}` : ''}${s.hpCost ? ` · -${s.hpCost}HP` : ''}${s.quickCast ? ' · ⚡QC' : ''}`
      : t('spell.stats', { damage: s.damage, range: s.range, area: s.radius ? t('spell.area', { radius: s.radius }) : '' });
    const chargeText = s.isRw3 && s.maxCharges === 0 ? '∞' : `${charges}/${s.maxCharges}`;
    const tooltip = s.isRw3 ? cleanRw3Desc(s.desc) : t('spell.tooltip', { effect: t(`effects.${s.effect}`), shortcut: i < 9 ? t('spell.shortcut', { key: i + 1 }) : '' });
    return `<button class="spell ${selected === s.id ? 'selected' : ''}" data-spell="${s.id}" data-tooltip="${escapeHtml(tooltip)}" aria-pressed="${selected === s.id}" ${canUse ? '' : 'disabled'}><span class="spell-icon" style="color:${s.color}" aria-hidden="true">${s.icon}</span><span class="spell-text"><strong>${escapeHtml(name)}</strong><small>${escapeHtml(meta)}</small></span><small>${chargeText}<br>${i < 9 ? `[${i + 1}]` : ''}</small></button>`;
  }).join('');

  $('allies-badge').textContent = (game.allies || []).length ? `${t('player.allies')}: ${game.allies.length}` : '';
  $('equipped-summary').innerHTML = equipmentSlots.map(slot => {
    const item = game.equipment?.[slot]?.name;
    return `<div class="eq-slot-row"><span>${h(`slots.${slot.toLowerCase()}`)}</span><strong>${item ? escapeHtml(equipmentName(item)) : '—'}</strong></div>`;
  }).join('');

  $('log').replaceChildren(...game.log.slice(0, 12).map(entry => {
    const row = document.createElement('div'); row.className = ['gold', 'red', 'green'].includes(entry.tone) ? entry.tone : '';
    const time = document.createElement('time'); time.textContent = String(entry.turn).padStart(3, '0');
    row.append(time, document.createTextNode(logText(entry))); return row;
  }));
  const tagCounts = {};
  for (const s of spells) if (s.isRw3) for (const tg of s.tags) tagCounts[tg] = (tagCounts[tg] || 0) + 1;
  const topTag = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Arcane';
  $('build-label').textContent = `${topTag} · ${game.rw3Spells?.length || 0}`;
  $('outcome').hidden = game.status === 'playing';
  if (game.status !== 'playing') {
    const progress = game.progress;
    const stats = [
      ['realm', String(game.realm).padStart(2, '0')], ['damage', progress.damageDealt], ['enemies', game.kills],
      ['pointsEarned', `+${progress.pointsEarned}`], ['pointsSpent', progress.pointsSpent], ['skills', game.rw3Spells?.length || 0],
      ['spells', progress.spellsCast], ['strikes', progress.staffStrikes], ['potions', progress.potionsUsed],
    ];
    $('outcome').innerHTML = `<div class="eyebrow">${h(`outcome.${game.status}.eyebrow`)}</div><h2>${h(`outcome.${game.status}.title`)}</h2><p class="outcome-intro">${h('outcome.introduction')}</p><div class="outcome-summary" aria-label="${h('outcome.summary')}">${stats.map(([key, value]) => `<div><span>${h(`outcome.${key}`)}</span><strong>${value}</strong></div>`).join('')}</div><p class="outcome-footnote">${h('outcome.progress', { realms: progress.realmsCleared, turns: game.turn })}</p><button id="restart-outcome">${h('outcome.restart')}</button>`;
    $('restart-outcome').onclick = () => $('new-dialog').showModal();
  }
  renderForge();
  if (view === 'grimoire') renderRw3Grimoire();
  if (view === 'forge') renderRw3ForgeView();
  updateHint(); inspect(inspectionTarget); draw(); save();
}

function updateHint(key) {
  const spell = availableSpells(game).find(s => s.id === selected);
  $('target-hint').textContent = key ? t(key) : spell ? t('hint.target', { spell: spell.isRw3 ? spell.name : spellName(spell) }) : t('hint.move');
}
function action(fn) {
  const done = fn();
  if (done) { render(); setTimeout(() => { game.effects = []; draw(); }, 350); }
  else updateHint('hint.unavailable');
}

function renderForge() {
  const craftable = craftableEquipment(game).length;
  $('rw3-catalogue').textContent = `${craftable} / ${catalogueCounts().equipment}`;
  $('rw3-inventory').textContent = game.rw3Components.length ? game.rw3Components.map(componentName).join(' · ') : t('forge.empty');
  $('rw3-equipment').textContent = equipmentSlots.map(slot => `${t(`slots.${slot.toLowerCase()}`)}: ${game.equipment?.[slot]?.name ? equipmentName(game.equipment[slot].name) : '—'}`).join(' · ');

  const shrine = game.shrine, near = shrine && distance(game.player, shrine) <= 1;
  const sType = shrine?.type || 'transmutation';
  $('shrine-title').textContent = t(`shrine.${sType}`);
  $('shrine-state').textContent = shrine ? t('forge.shrineState', { uses: shrine.uses, reach: t(near ? 'forge.near' : 'forge.far') }) : t('forge.noShrine');
  $('shrine-special-desc').textContent = sType === 'transmutation' ? t('inspection.shrineDescription', { uses: shrine?.uses ?? 0 }) : t(`shrine.${sType}Desc`);
  const sel = $('shrine-special-select');
  if (sType === 'transmutation' || sType === 'duplication') {
    sel.hidden = false;
    sel.innerHTML = game.rw3Components.length ? [...new Set(game.rw3Components)].map(c => `<option value="${escapeHtml(c)}">${escapeHtml(componentName(c))}</option>`).join('') : `<option value="">—</option>`;
    $('shrine-activate-button').disabled = game.status !== 'playing' || !near || !shrine?.uses || !game.rw3Components.length;
  } else if (sType === 'empowerment') {
    sel.hidden = false;
    const spells = availableSpells(game);
    sel.innerHTML = spells.map(s => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.isRw3 ? s.name : spellName(s))}</option>`).join('');
    $('shrine-activate-button').disabled = game.status !== 'playing' || !near || !shrine?.uses || !spells.length;
  } else {
    sel.hidden = true;
    $('shrine-activate-button').disabled = game.status !== 'playing' || !near || !shrine?.uses;
  }
  $('threat-button').setAttribute('aria-pressed', String(showThreats));
}

function renderResistances(unit) {
  const badges = DAMAGE_TYPES.map(dt => {
    const val = getUnitResistance(unit, dt, unit === game.player ? game : null);
    if (!val) return '';
    const cls = val >= 100 ? 'immune' : val < 0 ? 'weak' : '';
    return `<span class="res-badge ${cls}">${dt.slice(0, 3)} ${val > 0 ? '+' : ''}${val}%</span>`;
  }).filter(Boolean);
  return badges.length ? `<div class="res-grid">${badges.join('')}</div>` : '';
}

function renderStatuses(unit) {
  const chips = Object.entries(unit.statuses || {}).filter(([, v]) => v > 0).map(([k, v]) => `<span class="status-chip">${escapeHtml(k)} ${v}t</span>`);
  return chips.length ? `<div class="res-grid">${chips.join('')}</div>` : '';
}

function inspect(p) {
  inspectionTarget = p;
  const enemy = p && game.enemies.find(e => distance(e, p) === 0);
  const ally = p && (game.allies || []).find(a => distance(a, p) === 0);
  const cloud = p && (game.clouds || []).find(c => c.x === p.x && c.y === p.y);
  if (enemy) {
    const nextAction = enemy.isSpawner ? t('inspection.spawnerDesc', { cooldown: enemy.spawnCooldown })
      : enemy.statuses.freeze || enemy.statuses.stun || enemy.statuses.petrify ? t('inspection.frozen')
      : distance(enemy, game.player) <= enemy.range && hasSight(game, enemy, game.player) ? t('inspection.attack') : t('inspection.approach');
    const title = enemy.isSpawner ? t('inspection.spawner') : enemy.isFinalBoss ? 'Mordred' : enemyName(enemy);
    const iconKey = enemy.isSpawner ? 'lair' : ['imp', 'knight', 'eye', 'moth'][enemy.type];
    $('inspection').innerHTML = `<div class="inspect-symbol">${spriteIcon(iconKey, { a: enemy.isFinalBoss ? '#f87171' : enemy.boss ? '#e5c27b' : '#c5ad91', b: '#4b493c', c: '#f4dca5' })}</div><h3>${escapeHtml(title)}${enemy.shields ? ` <span class="cyan-val">[${enemy.shields} SH]</span>` : ''}</h3><p>${h('inspection.enemyStats', enemy)}<br><span style="color:var(--gold)">${escapeHtml(nextAction)}</span></p>${renderResistances(enemy)}${renderStatuses(enemy)}`;
  } else if (ally) {
    $('inspection').innerHTML = `<div class="inspect-symbol">${spriteIcon('ally', { a: ally.color || '#4ade80', b: '#e2f7e8' })}</div><h3>${escapeHtml(ally.name)} (${h('inspection.ally')})</h3><p>HP ${ally.hp}/${ally.maxHp} · DMG ${ally.damage} · R${ally.range}${ally.shields ? ` · ${ally.shields} SH` : ''}${ally.duration ? ` · ${ally.duration}t` : ''}</p>${renderResistances(ally)}`;
  } else if (p && game.portals.some(r => distance(r, p) === 0)) {
    const portal = game.portals.find(r => distance(r, p) === 0), next = previewPortal(game, portal.theme);
    const preview = next ? [
      h('inspection.nextRealm', { enemies: next.enemies, boss: next.boss ? t('inspection.boss') : '' }),
      h('inspection.affinities', { schools: next.schools.map(schoolName).join(', ') }),
      h('inspection.shrines', { shrines: t(`shrine.${next.shrine}`) }),
      next.rw3Components?.length ? `RW3: ${next.rw3Components.map(componentName).join(', ')}` : '',
    ].filter(Boolean).join('<br>') : h('inspection.finalPortal');
    $('inspection').innerHTML = `<div class="inspect-symbol">◈</div><h3>${h(portal.theme ? 'inspection.emberfallRift' : 'inspection.mossboundRift')}</h3><p>${h(game.enemies.length ? 'inspection.portalLocked' : 'inspection.portalOpen')}</p><p>${preview}</p>`;
  } else if (p && game.shrine && distance(game.shrine, p) === 0) {
    const sType = game.shrine.type || 'transmutation';
    $('inspection').innerHTML = `<div class="inspect-symbol">${SHRINE_ICONS[sType] || '⚒'}</div><h3>${h(`shrine.${sType}`)}</h3><p>${sType === 'transmutation' ? h('inspection.shrineDescription', { uses: game.shrine.uses }) : h(`shrine.${sType}Desc`)}</p>`;
  } else if (p && game.items.some(i => distance(i, p) === 0)) {
    const item = game.items.find(i => distance(i, p) === 0);
    const comp = item.type === 'rw3-component' ? componentByName.get(item.name) : null;
    const description = item.type === 'component' ? t('inspection.material', { material: t(`materials.${item.material}`) }) : item.type === 'rw3-component' ? `${componentName(item.name)}${comp?.desc ? ` — ${cleanRw3Desc(comp.desc)}` : ''}` : t(item.type === 'shard' ? 'inspection.shard' : 'inspection.potion');
    const visual = itemVisual(item);
    $('inspection').innerHTML = `<div class="inspect-symbol">${spriteIcon(visual.key, visual.colors)}</div><p>${escapeHtml(description)}</p>`;
  } else if (p && distance(game.player, p) === 0) {
    $('inspection').innerHTML = `<div class="inspect-symbol">✧</div><h3>${h('inspection.player')}</h3><p>${h('inspection.playerHealth', { hp: game.player.hp, maxHp: maxHealth(game), ward: game.player.shield })} · <span class="cyan-val">${game.player.shields || 0} SH</span><br>${h('inspection.playerResources', { points: game.points, potions: game.potions })}</p>${renderResistances(game.player)}`;
  } else if (cloud) {
    const def = CLOUD_TYPES[cloud.type] || CLOUD_TYPES.fire;
    $('inspection').innerHTML = `<div class="inspect-symbol" style="color:${cloud.color}">☁</div><h3>${escapeHtml(def.name)}</h3><p>${h('inspection.cloud')} · ${cloud.duration}t${cloud.damage ? ` · ${cloud.damage} ${cloud.damageType}` : ''}</p>`;
  } else if (p && game.tiles[p.y]?.[p.x] === 2) {
    $('inspection').innerHTML = `<div class="inspect-symbol">▽</div><h3>${h('inspection.chasm')}</h3><p>${h('inspection.chasmDesc')}</p>`;
  } else {
    $('inspection').innerHTML = `<div class="inspect-symbol">⌖</div><h3>${h('inspection.emptyTitle')}</h3><p>${h('inspection.emptyDescription')}</p>`;
  }
}

function renderHeading() {
  const map = {
    realm: ['realm.title', 'realm.subtitle'],
    grimoire: ['rw3.grimoireTitle', 'rw3.grimoireSubtitle'],
    forge: ['rw3.forgeTitle', 'rw3.forgeSubtitle'],
  };
  const [tk, sk] = map[view] || map.realm;
  $('page-title').innerHTML = `${h(tk)}<span>.</span>`;
  $('page-subtitle').textContent = t(sk);
}

function setView(next) {
  view = next;
  $('realm-view').hidden = next !== 'realm';
  $('grimoire-view').hidden = next !== 'grimoire';
  $('forge-view').hidden = next !== 'forge';
  $('realm-tab').classList.toggle('active', next === 'realm');
  $('grimoire-tab').classList.toggle('active', next === 'grimoire');
  $('forge-tab').classList.toggle('active', next === 'forge');
  renderHeading();
  if (next === 'grimoire') renderRw3Grimoire();
  else if (next === 'forge') renderRw3ForgeView();
  else draw();
}

function populateFilters() {
  const tagSel = $('rw3-tag-filter');
  const prevTag = tagSel.value || 'all';
  tagSel.innerHTML = `<option value="all">${h('rw3.allTags')}</option>` + rw3Tags.map(tag => `<option value="${escapeHtml(tag)}">${escapeHtml(tag)}</option>`).join('');
  tagSel.value = prevTag;

  const lvlSel = $('rw3-level-filter');
  const prevLvl = lvlSel.value || 'all';
  lvlSel.innerHTML = `<option value="all">${h('rw3.allLevels')}</option>` + [1,2,3,4,5,6,7,8,9].map(l => `<option value="${l}">Lvl ${l}</option>`).join('');
  lvlSel.value = prevLvl;

  const slotSel = $('rw3-slot-filter');
  const prevSlot = slotSel.value || 'all';
  slotSel.innerHTML = `<option value="all">${h('rw3.allSlots')}</option>` + equipmentSlots.map(s => `<option value="${escapeHtml(s)}">${h(`slots.${s.toLowerCase()}`)}</option>`).join('');
  slotSel.value = prevSlot;
}

function renderRw3Grimoire() {
  const learnedSet = new Set(game.rw3Spells || []);
  $('rw3-learned-count').textContent = learnedSet.size;
  $('rw3-grimoire-points').textContent = t('atlas.points', { points: game.points });
  const q = $('rw3-spell-search').value.trim().toLowerCase();
  const tag = $('rw3-tag-filter').value;
  const lvl = $('rw3-level-filter').value;
  const status = $('rw3-status-filter').value;

  const filtered = rw3Spells.filter(s => {
    if (tag !== 'all' && !s.tags.includes(tag)) return false;
    if (lvl !== 'all' && String(s.level) !== lvl) return false;
    if (status === 'learned' && !learnedSet.has(s.id)) return false;
    if (status === 'available' && !canLearnRw3Spell(game, s.id)) return false;
    if (q && !`${s.name} ${s.tags.join(' ')} ${s.desc}`.toLowerCase().includes(q)) return false;
    return true;
  });

  $('rw3-spell-grid').innerHTML = filtered.slice(0, 120).map(s => {
    const isLearned = learnedSet.has(s.id);
    const canBuy = canLearnRw3Spell(game, s.id);
    const upCount = (game.rw3Upgrades?.[s.id] || []).length;
    const tagPills = s.tags.map(tg => `<span class="tag-pill" style="color:${(TAG_META[tg] || TAG_META.Arcane).color}">${escapeHtml(tg)}</span>`).join('');
    const statsParts = [];
    if (s.stats?.damage) statsParts.push(`DMG ${s.stats.damage}`);
    if (s.stats?.range) statsParts.push(`RNG ${s.stats.range}`);
    if (s.stats?.max_charges) statsParts.push(`CHG ${s.stats.max_charges}`);
    if (s.stats?.hp_cost) statsParts.push(`HP -${s.stats.hp_cost}`);
    if (s.stats?.minion_health) statsParts.push(`MINION ${s.stats.minion_health}HP`);
    return `<div class="rw3-card ${isLearned ? 'learned-card' : ''}">
      <div class="rw3-card-head"><h3>${escapeHtml(s.name)}</h3><span class="rw3-lvl">${isLearned ? h('rw3.learnedBadge') : `LVL ${s.level} · ${s.level} SP`}</span></div>
      <div class="chip-wrap">${tagPills}</div>
      <div class="rw3-stats-line">${statsParts.map(x => `<span>${escapeHtml(x)}</span>`).join('')}</div>
      <p class="rw3-desc">${escapeHtml(cleanRw3Desc(s.desc))}</p>
      <div class="rw3-card-actions">
        ${isLearned ? '' : `<button class="primary" data-learn-rw3="${s.id}" ${canBuy ? '' : 'disabled'}>${h('rw3.learnSpell', { cost: s.level })}</button>`}
        <button data-inspect-rw3="${s.id}">${h('rw3.upgrades')} (${upCount}/${(s.upgrades || []).length})</button>
      </div>
    </div>`;
  }).join('');
}

function showRw3SpellDetail(spellId) {
  detailRw3SpellId = spellId;
  const base = spellById.get(spellId);
  if (!base) return;
  const eff = effectiveRw3Spell(game, spellId);
  const isLearned = (game.rw3Spells || []).includes(spellId);
  const learnedUps = new Set(game.rw3Upgrades?.[spellId] || []);
  const tagPills = eff.tags.map(tg => `<span class="tag-pill" style="color:${(TAG_META[tg] || TAG_META.Arcane).color}">${escapeHtml(tg)}</span>`).join('');
  const upsHtml = (base.upgrades || []).map(u => {
    const owned = learnedUps.has(u.sp_id);
    const canBuy = canLearnRw3Upgrade(game, spellId, u.sp_id);
    return `<div class="upgrade-item ${owned ? 'learned' : ''}">
      <div class="upgrade-item-head"><strong>${escapeHtml(u.name)}</strong><span class="rw3-lvl">${owned ? h('rw3.learnedBadge') : `${u.level} SP`}</span></div>
      <p class="rw3-desc">${escapeHtml(cleanRw3Desc(u.desc))}</p>
      ${owned ? '' : `<button class="primary" data-buy-upgrade="${spellId}:${u.sp_id}" ${canBuy ? '' : 'disabled'}>${h('rw3.upgradeSpell', { cost: u.level })}</button>`}
    </div>`;
  }).join('');

  $('detail-content').innerHTML = `
    <div class="eyebrow">RW3 · LVL ${base.level}</div>
    <h2>${escapeHtml(base.name)}</h2>
    <div class="chip-wrap">${tagPills}</div>
    <p class="rw3-desc" style="margin-top:10px">${escapeHtml(cleanRw3Desc(base.desc))}</p>
    <div class="detail-stats">
      <div>DMG<strong>${eff.damage} (${eff.damageTypes.join('/')})</strong></div>
      <div>RNG / AREA<strong>${eff.range} / ${eff.radius}</strong></div>
      <div>CHARGES / HP<strong>${eff.maxCharges || '∞'} / ${eff.hpCost ? `-${eff.hpCost} HP` : '0'}</strong></div>
      <div>POINTS<strong>${game.points} SP</strong></div>
    </div>
    ${isLearned ? '' : `<button class="primary" id="dialog-learn-rw3" ${canLearnRw3Spell(game, spellId) ? '' : 'disabled'}>${h('rw3.learnSpell', { cost: base.level })}</button>`}
    <h3 style="margin:18px 0 6px">${h('rw3.upgrades')}</h3>
    <div class="upgrade-list">${upsHtml}</div>
  `;
  if ($('dialog-learn-rw3')) $('dialog-learn-rw3').onclick = () => { if (learnRw3Spell(game, spellId)) { render(); showRw3SpellDetail(spellId); } };
  for (const btn of $('detail-content').querySelectorAll('[data-buy-upgrade]')) {
    btn.onclick = () => {
      const [sid, upid] = btn.dataset.buyUpgrade.split(':').map(Number);
      if (learnRw3Upgrade(game, sid, upid)) { render(); showRw3SpellDetail(sid); }
    };
  }
  if (!$('detail-dialog').open) $('detail-dialog').showModal();
}

function renderRw3ForgeView() {
  const craftable = craftableEquipment(game);
  const craftableNames = new Set(craftable.map(i => i.name));
  $('rw3-craftable-count').textContent = craftable.length;
  $('rw3-satchel-title').textContent = t('rw3.componentsHeld', { count: game.rw3Components.length });
  $('rw3-satchel-chips').innerHTML = game.rw3Components.length
    ? game.rw3Components.map(name => {
      const comp = componentByName.get(name);
      return `<span class="tag-pill" title="${escapeHtml(cleanRw3Desc(comp?.desc || ''))}">${escapeHtml(componentName(name))} <small style="opacity:.7">(${(comp?.tags || []).join('/')})</small></span>`;
    }).join('')
    : `<span class="muted">${h('forge.empty')}</span>`;

  const q = $('rw3-eq-search').value.trim().toLowerCase();
  const slot = $('rw3-slot-filter').value;
  const status = $('rw3-eq-status-filter').value;

  const filtered = rw3Equipment.filter(item => {
    if (slot !== 'all' && item.slot !== slot) return false;
    if (status === 'craftable' && !craftableNames.has(item.name)) return false;
    if (q && !`${item.name} ${equipmentName(item.name)} ${item.slot} ${item.tags.join(' ')} ${item.desc} ${(item.bonuses || []).join(' ')}`.toLowerCase().includes(q)) return false;
    return true;
  }).sort((a, b) => (craftableNames.has(b.name) ? 1 : 0) - (craftableNames.has(a.name) ? 1 : 0));

  $('rw3-eq-grid').innerHTML = filtered.slice(0, 120).map(item => {
    const canMake = craftableNames.has(item.name);
    const equipped = game.equipment?.[item.slot]?.name === item.name;
    const recipeText = item.recipe.map(([tg, c]) => `${c}× ${tg}`).join(' + ');
    const bonuses = [...(item.bonuses || []), item.desc].filter(Boolean).map(cleanRw3Desc).join('\n');
    return `<div class="rw3-card ${canMake ? 'craftable-card' : ''} ${equipped ? 'learned-card' : ''}">
      <div class="rw3-card-head"><h3>${escapeHtml(equipmentName(item.name))}</h3><span class="rw3-lvl">${h(`slots.${item.slot.toLowerCase()}`)}</span></div>
      <div class="chip-wrap">${item.tags.map(tg => `<span class="tag-pill" style="color:${(TAG_META[tg] || TAG_META.Arcane).color}">${escapeHtml(tg)}</span>`).join('')}</div>
      <div class="rw3-stats-line"><span>${escapeHtml(recipeText)}</span></div>
      <p class="rw3-desc">${escapeHtml(bonuses)}</p>
      <div class="rw3-card-actions">
        <button class="${canMake ? 'primary' : ''}" data-forge-rw3="${escapeHtml(item.name)}" ${canMake ? '' : 'disabled'}>${equipped ? h('rw3.equippedSlot') : canMake ? h('rw3.forgeItem') : h('rw3.missingComponents')}</button>
      </div>
    </div>`;
  }).join('');
}

$('shrine-activate-button').onclick = () => action(() => {
  const sType = game.shrine?.type || 'transmutation';
  const val = $('shrine-special-select').value;
  return useShrine(game, (sType === 'duplication' || sType === 'transmutation') ? { component: val } : sType === 'empowerment' ? { spellId: val } : {});
});
$('threat-button').onclick = () => { showThreats = !showThreats; renderForge(); draw(); };
$('realm-tab').onclick = () => setView('realm');
$('grimoire-tab').onclick = $('grimoire-cta').onclick = () => setView('grimoire');
$('forge-tab').onclick = $('open-forge-cta').onclick = () => setView('forge');
$('guide-button').onclick = () => $('guide-dialog').showModal();
$('new-button').onclick = () => $('new-dialog').showModal();
$('cancel-new').onclick = () => $('new-dialog').close();
$('confirm-new').onclick = () => {
  const input = $('new-seed'); if (!input.checkValidity()) { input.reportValidity(); return; }
  const mode = $('new-mode').value || 'standard';
  game = input.value ? createGame(Number(input.value), { enableBigBang: isLocalDevelopment, mode }) : createGame(undefined, { enableBigBang: isLocalDevelopment, mode });
  selected = null; hover = null; inspectionTarget = null; $('new-dialog').close(); setView('realm'); render();
};
for (const button of document.querySelectorAll('.close-dialog')) button.onclick = () => button.closest('dialog').close();
$('spell-list').onclick = event => { const button = event.target.closest('[data-spell]'); if (!button || button.disabled) return; selected = selected === button.dataset.spell ? null : button.dataset.spell; render(); };
$('rw3-spell-search').oninput = $('rw3-tag-filter').onchange = $('rw3-level-filter').onchange = $('rw3-status-filter').onchange = renderRw3Grimoire;
$('rw3-spell-grid').onclick = event => {
  const learnBtn = event.target.closest('[data-learn-rw3]');
  if (learnBtn && !learnBtn.disabled) { if (learnRw3Spell(game, Number(learnBtn.dataset.learnRw3))) render(); return; }
  const inspectBtn = event.target.closest('[data-inspect-rw3]');
  if (inspectBtn) showRw3SpellDetail(Number(inspectBtn.dataset.inspectRw3));
};
$('rw3-eq-search').oninput = $('rw3-slot-filter').onchange = $('rw3-eq-status-filter').onchange = renderRw3ForgeView;
$('rw3-eq-grid').onclick = event => {
  const btn = event.target.closest('[data-forge-rw3]');
  if (btn && !btn.disabled) {
    const name = btn.dataset.forgeRw3;
    const item = rw3Equipment.find(i => i.name === name);
    const chosen = findMatchingComponents(game.rw3Components, item);
    if (chosen && forge(game, name, chosen)) render();
  }
};
$('wait-button').onclick = () => action(() => wait(game));
$('potion-button').onclick = () => action(() => drink(game));
for (const button of document.querySelectorAll('[data-move]')) button.onclick = () => action(() => move(game, ...button.dataset.move.split(',').map(Number)));

function tileAt(event) { const bounds = canvas.getBoundingClientRect(); return { x: Math.min(SIZE - 1, Math.max(0, Math.floor((event.clientX - bounds.left) / bounds.width * SIZE))), y: Math.min(SIZE - 1, Math.max(0, Math.floor((event.clientY - bounds.top) / bounds.height * SIZE))) }; }
function walkTo(target) {
  const mods = getEquipmentModifiers(game);
  if (game.status !== 'playing' || (game.tiles[target.y]?.[target.x] !== 0 && !(mods.flying && game.tiles[target.y]?.[target.x] === 2))) return false;
  let moved = false;
  for (let steps = 0; steps < SIZE * SIZE && game.status === 'playing' && distance(game.player, target) !== 0; steps++) {
    const path = shortestPath(game, game.player, target, mods.flying);
    if (!path?.length) break;
    const next = path[0], before = { ...game.player };
    if (!move(game, next.x - game.player.x, next.y - game.player.y)) break;
    moved = true;
    if (distance(before, game.player) !== 1) break;
  }
  return moved;
}
canvas.onpointermove = event => { hover = tileAt(event); inspect(hover); draw(); };
canvas.onpointerleave = () => { hover = null; draw(); };
canvas.onclick = event => { const target = tileAt(event); if (selected) action(() => cast(game, selected, target)); else if (distance(game.player, target) > 0) action(() => walkTo(target)); else inspect(target); };

document.addEventListener('keydown', event => {
  if (document.querySelector('dialog[open]') || ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName) || event.ctrlKey || event.metaKey || event.altKey) return;
  const key = event.key.toLowerCase();
  if (key === 't' || key === 'g') { event.preventDefault(); setView(view === 'grimoire' ? 'realm' : 'grimoire'); return; }
  if (key === 'f') { event.preventDefault(); setView(view === 'forge' ? 'realm' : 'forge'); return; }
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
populateFilters();
renderHeading();
render();
