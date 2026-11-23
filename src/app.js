import { wardrobe } from './rw3-catalog.js';
import { outfitUnlocks } from './campaign.js';
import { units, covers, searchCatalogue } from './bestiary.js';
import { schoolName, enemyName, componentName, equipmentName, logText } from './game-text.js';
import { t, getLocale, setLocale, translatePage, localeOptions } from './i18n.js';
import {
  deploy, claimReward, rerollRifts, forge, useShrine, threateningEnemies, previewPortal, SIZE,
  createGame, availableSpells, maxHealth, finalRealmOf, distance, hasSight, shortestPath,
  learnRw3Spell, learnRw3Upgrade, move, cast, wait, cancelChannel, drink, serialize, restore,
} from './engine.js';
import {
  catalogueCounts, equipmentSlots, rw3Spells, rw3Equipment, rw3Tags,
  transmutationChoices, knownSpellIds, spellById, componentByName, canLearnRw3Spell, canLearnRw3Upgrade,
  equipmentByName, canForge, effectiveRw3Spell, findMatchingComponents, craftableEquipment, getEquipmentModifiers,
  getUnitResistance, DAMAGE_TYPES, TAG_META, CLOUD_TYPES,
} from './rw3.js';
import {
  wizardPortraitSvg, tagIconSvg, slotIconSvg, shrineIconSvg, entityIconSvg, uiIconSvg,
  drawDungeonTile, drawCanvasCloud, drawCanvasPortal, drawCanvasShrine, drawCanvasItem,
  drawCanvasWizard, drawCanvasAlly, drawCanvasEnemy, drawCanvasEffect,
} from './assets.js';

const $ = id => document.getElementById(id);
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const h = (key, params) => escapeHtml(t(key, params));
const SAVE_KEY = 'wild-shock-v2';
let storageAvailable = true, saved;
try { saved = localStorage.getItem(SAVE_KEY); } catch { storageAvailable = false; }
let game = restore(saved) || createGame();
const PROFILE_KEY = 'wild-shock-wardrobe-v1';
let profile = { outfits: ['Wizard'], selected: 'Wizard', mutators: [], defeated: [] };
try {
  const stored = JSON.parse(localStorage.getItem(PROFILE_KEY));
  if (Array.isArray(stored?.outfits)) profile = { ...profile, ...stored };
} catch { /* The current journey remains playable without profile storage. */ }
function saveProfile() { try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch { storageAvailable = false; } }
let detailRw3SpellId = null, inspectionTarget = null;
let logTurn = null;
let selected = null, hover = null, view = 'realm', showThreats = false;

const canvas = $('board'), ctx = canvas.getContext('2d'), tile = canvas.width / SIZE;
const language = $('language-select');
language.replaceChildren(...localeOptions.map(({ value, label }) => new Option(label, value)));
language.value = getLocale(); language.onchange = () => setLocale(language.value);
document.addEventListener('localechange', () => {
  populateFilters();
  if ($('bestiary-dialog').open) renderBestiary();
  if ($('guide-dialog').open) showWardrobe();
  renderHeading(); render();
  if ($('detail-dialog').open && detailRw3SpellId != null) showRw3SpellDetail(detailRw3SpellId);
});

// Hydrate handcrafted SVG icons across static chrome slots
function initStaticIcons() {
  if ($('brand-mark-icon')) $('brand-mark-icon').innerHTML = uiIconSvg('brand', 34);
  if ($('wizard-portrait')) $('wizard-portrait').innerHTML = wizardPortraitSvg();
  if ($('icon-vitality')) $('icon-vitality').innerHTML = uiIconSvg('heart', 14);
  if ($('icon-shields')) $('icon-shields').innerHTML = uiIconSvg('shield', 13);
  if ($('icon-ward')) $('icon-ward').innerHTML = uiIconSvg('ward', 13);
  if ($('icon-sp')) $('icon-sp').innerHTML = uiIconSvg('sp', 13);
  if ($('icon-potion')) $('icon-potion').innerHTML = entityIconSvg('potion', 28);
  if ($('icon-threat')) $('icon-threat').innerHTML = uiIconSvg('threat', 15);
  if ($('icon-wait')) $('icon-wait').innerHTML = uiIconSvg('wait', 15);
  if ($('icon-skull')) $('icon-skull').innerHTML = uiIconSvg('skull', 32);
}

function cleanRw3Desc(text) {
  return String(text || '').replace(/\[([^:\]]+)(?::[^\]]+)?\]/g, '$1');
}

function draw(time = performance.now()) {
  time *= profile.speed || 1;
  ctx.fillStyle = '#09100d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const spell = availableSpells(game).find(s => s.id === selected);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const n = ((x * 73 + y * 137 + game.seed) % 97) / 97;
      const tVal = game.tiles[y][x];
      drawDungeonTile(ctx, x, y, tile, tVal, game.theme, n, time);
      if (tVal === 0 && spell && (spell.range === 0 || (distance(game.player, { x, y }) <= spell.range && (!spell.requiresLos || hasSight(game, game.player, { x, y }))))) {
        ctx.fillStyle = `${spell.color}1c`;
        ctx.fillRect(x * tile + 1, y * tile + 1, tile - 2, tile - 2);
      }
    }
  }

  // Elemental Clouds
  for (const cloud of game.clouds || []) {
    drawCanvasCloud(ctx, cloud, tile, time);
  }

  // Enemy Threat Zones
  if (showThreats) {
    for (let y = 1; y < SIZE - 1; y++) {
      for (let x = 1; x < SIZE - 1; x++) {
        if (game.tiles[y][x] === 0 && threateningEnemies(game, { x, y }).length) {
          ctx.fillStyle = 'rgba(248, 113, 113, 0.24)';
          ctx.fillRect(x * tile + 1, y * tile + 1, tile - 2, tile - 2);
          ctx.strokeStyle = 'rgba(248, 113, 113, 0.5)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x * tile + 1.5, y * tile + 1.5, tile - 3, tile - 3);
        }
      }
    }
  }

  // Shrine
  if (game.shrine) {
    drawCanvasShrine(ctx, game.shrine, tile, time);
  }

  // Dimensional Portals
  const portalsOpen = game.enemies.length === 0;
  for (const portal of game.portals) {
    drawCanvasPortal(ctx, portal, tile, portalsOpen, time);
  }

  // Items & Pickups
  for (const item of game.items) {
    drawCanvasItem(ctx, item, tile, time);
  }

  // Allied Minions
  for (const ally of game.allies || []) {
    drawCanvasAlly(ctx, ally, tile, time);
    if (ally.hp < ally.maxHp) {
      ctx.fillStyle = '#14261c';
      ctx.fillRect(ally.x * tile + 4, ally.y * tile + 27, 24, 3);
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(ally.x * tile + 4, ally.y * tile + 27, 24 * Math.max(0, ally.hp / ally.maxHp), 3);
    }
    if (ally.shields > 0) {
      ctx.fillStyle = '#09100d';
      ctx.fillRect(ally.x * tile + 1, ally.y * tile + 1, 11, 10);
      ctx.fillStyle = '#7bd0ff';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.fillText(String(ally.shields), ally.x * tile + 3, ally.y * tile + 9);
    }
  }

  const threatening = showThreats && hover ? new Set(threateningEnemies(game, hover)) : null;
  // Enemies & Spawners
  for (const enemy of game.enemies) {
    if (enemy.radius) {
      const side = (enemy.radius * 2 + 1) * tile;
      ctx.fillStyle = 'rgba(248, 113, 113, 0.16)';
      ctx.fillRect((enemy.x - enemy.radius) * tile, (enemy.y - enemy.radius) * tile, side, side);
      ctx.strokeStyle = '#c58a66'; ctx.strokeRect((enemy.x - enemy.radius) * tile, (enemy.y - enemy.radius) * tile, side, side);
    }
    if (threatening?.has(enemy)) {
      ctx.strokeStyle = '#ffdf9f'; ctx.lineWidth = 2; ctx.strokeRect(enemy.x * tile + 1, enemy.y * tile + 1, tile - 2, tile - 2);
    }
    drawCanvasEnemy(ctx, enemy, tile, time);
    if (enemy.isSpawner) {
      ctx.fillStyle = 'rgba(9, 16, 13, 0.85)';
      ctx.fillRect(enemy.x * tile + 19, enemy.y * tile + 1, 12, 11);
      ctx.fillStyle = '#f472b6';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.fillText(String(enemy.spawnCooldown), enemy.x * tile + 22, enemy.y * tile + 10);
    }
    if (enemy.hp < enemy.maxHp) {
      ctx.fillStyle = '#2e1616';
      ctx.fillRect(enemy.x * tile + 4, enemy.y * tile + 27, 24, 3);
      ctx.fillStyle = '#f87171';
      ctx.fillRect(enemy.x * tile + 4, enemy.y * tile + 27, 24 * Math.max(0, enemy.hp / enemy.maxHp), 3);
    }
    if (enemy.shields > 0) {
      ctx.fillStyle = 'rgba(9, 16, 13, 0.85)';
      ctx.fillRect(enemy.x * tile + 1, enemy.y * tile + 1, 11, 10);
      ctx.fillStyle = '#7bd0ff';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.fillText(String(enemy.shields), enemy.x * tile + 3, enemy.y * tile + 9);
    }
    if (Object.values(enemy.statuses || {}).some(n => n > 0)) {
      ctx.fillStyle = enemy.statuses.freeze ? '#7bd0ff' : enemy.statuses.stun || enemy.statuses.petrify ? '#facc15' : '#fb923c';
      ctx.beginPath();
      ctx.arc(enemy.x * tile + 27, enemy.y * tile + 5, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!enemy.isSpawner && distance(enemy, game.player) <= enemy.range && hasSight(game, enemy, game.player)) {
      ctx.fillStyle = '#f87171';
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.fillText('!', enemy.x * tile + 24, enemy.y * tile + 17);
    }
  }

  // Player Wizard
  drawCanvasWizard(ctx, game.player, tile, time);

  // Spell Impact VFX
  for (const effect of game.effects || []) {
    drawCanvasEffect(ctx, effect, tile);
  }

  // Hover Reticle & AoE Preview
  if (hover) {
    if (spell) {
      const r = spell.radius || 0;
      for (let y = Math.max(0, hover.y - r); y <= Math.min(SIZE - 1, hover.y + r); y++) {
        for (let x = Math.max(0, hover.x - r); x <= Math.min(SIZE - 1, hover.x + r); x++) {
          ctx.fillStyle = `${spell.color}30`;
          ctx.fillRect(x * tile + 1, y * tile + 1, tile - 2, tile - 2);
        }
      }
    }
    ctx.strokeStyle = spell ? spell.color : '#ffdf9f';
    ctx.lineWidth = 1.8;
    ctx.strokeRect(hover.x * tile + 1.5, hover.y * tile + 1.5, tile - 3, tile - 3);
  }
}

// Smooth idle animation loop for portals, floating gems, flames & wizard orb
let lastFrame = 0;
function animate(now) {
  if (view === 'realm' && !document.hidden && now - lastFrame > 50) {
    lastFrame = now;
    draw(now);
  }
  requestAnimationFrame(animate);
}

function save() {
  try { localStorage.setItem(SAVE_KEY, serialize(game)); } catch { storageAvailable = false; }
  $('save-state').textContent = t(storageAvailable ? 'save.available' : 'save.unavailable');
}

function equippedLabel(slot) {
  return Object.values(game.equipment).filter(e => equipmentByName.get(e.name)?.slot === slot).map(e => equipmentName(e.name)).join(', ');
}

function render() {
  if (game.mode === 'trial-improviser' && game.status !== 'playing' && !game.resultRecorded) {
    profile.improviserWins = game.status === 'won' ? (profile.improviserWins || 0) + 1 : 0;
    game.resultRecorded = true;
    if (profile.improviserWins >= 10 && !profile.outfits.includes('Unquenchable Flame')) profile.outfits.push('Unquenchable Flame');
    saveProfile();
  }
  const earned = outfitUnlocks(game).filter(name => !profile.outfits.includes(name));
  const discovered = game.defeatedSpecies.filter(n => !profile.defeated.includes(n));
  if (earned.length || discovered.length) { profile.outfits.push(...earned); profile.defeated.push(...discovered); saveProfile(); }
  game.player.outfit = profile.selected;
  const reward = game.pendingReward;
  if (reward && game.status === 'playing') {
    $('reward-options').replaceChildren(...reward.options.map(choice => {
      const button = document.createElement('button');
      button.textContent = reward.type === 'scroll' ? spellById.get(choice).name : equipmentName(choice);
      button.onclick = () => { if (claimReward(game, choice)) { $('reward-dialog').close(); render(); } };
      return button;
    }));
    if (!$('reward-dialog').open) $('reward-dialog').showModal();
  }
  const maxR = finalRealmOf(game);
  $('spell-total').textContent = rw3Spells.length; $('equipment-total').textContent = rw3Equipment.length;
  $('seed-label').textContent = `#${String(game.seed).slice(-6).padStart(6, '0')}`;
  $('mode-badge').textContent = game.mode && game.mode !== 'standard' ? t(`mode.${game.mode}`).split('(')[0].trim() : '';
  $('health-label').textContent = `${game.player.hp} / ${maxHealth(game)}`;
  $('health-bar').style.width = `${Math.min(100, game.player.hp / maxHealth(game) * 100)}%`;
  $('shields-label').textContent = game.player.shields || 0;
  $('shield-label').textContent = game.player.shield;
  $('points-label').textContent = game.points;
  $('potions-label').textContent = game.potions;
  $('realm-number').textContent = String(game.realm).padStart(2, '0');
  $('realm-total').textContent = t('realm.ofTotal', { total: maxR });
  $('turn-label').textContent = t('realm.turn', { turn: String(game.turn + 1).padStart(3, '0') });
  $('realm-name').textContent = game.vault ? t('vault.name', { name: game.vault }) : t(game.theme ? 'realm.emberfall' : 'realm.mossbound');
  $('enemy-count').textContent = game.enemies.length;
  $('reroll-rifts').textContent = t('rift.reroll', { count: game.rerolls });
  $('reroll-rifts').disabled = game.status !== 'playing' || !game.rerolls || game.realm >= maxR;
  $('rift-status').textContent = t(game.enemies.length ? 'realm.sealed' : 'realm.open');
  $('potion-button').disabled = !game.potions || game.status !== 'playing';
  $('wait-button').disabled = game.status !== 'playing' || game.deploying;

  // Status banners (Quickstep, Channeling, Active Buffs)
  const mods = getEquipmentModifiers(game);
  const banners = [];
  if (mods.quickstep && !game.quickstepUsed) banners.push(`<div class="banner-chip quickstep"><span>⇄ ${h('player.quickstepReady')}</span></div>`);
  if (game.channel) {
    const chSpell = availableSpells(game).find(s => s.id === game.channel.spellId);
    banners.push(`<div class="banner-chip channel"><span>❂ ${h('player.channeling', { spell: chSpell?.name || '', turns: game.channel.turnsLeft })}</span><button id="cancel-channel-btn">${h('player.cancelChannel')}</button></div>`);
  }
  for (const buff of game.buffs || []) banners.push(`<div class="banner-chip"><span>✦ ${escapeHtml(buff.name)}</span><small>${buff.duration < 0 ? "∞" : buff.duration + "t"}</small></div>`);
  $('status-banners').innerHTML = banners.join('');
  if ($('cancel-channel-btn')) $('cancel-channel-btn').onclick = () => { cancelChannel(game); render(); };

  const spells = availableSpells(game);
  $('spell-count').textContent = String(spells.length).padStart(2, '0');
  $('spell-list').innerHTML = spells.map((s, i) => {
    const primaryTag = s.tags?.[0] || 'Arcane';
    const charges = game.charges[s.id] ?? 0;
    const canUse = game.status === 'playing' && (s.maxCharges === 0 || charges > 0) && (!s.hpCost || game.player.hp > s.hpCost);
    const meta = `${s.damage ? `${s.damage} DMG` : s.behavior.toUpperCase()} · R${s.range}${s.radius ? ` · A${s.radius}` : ''}${s.hpCost ? ` · -${s.hpCost}HP` : ''}${s.quickCast ? ' · ⚡QC' : ''}`;
    const chargeText = s.maxCharges === 0 ? '∞' : `${charges}/${s.maxCharges}`;
    const tooltip = cleanRw3Desc(s.desc);
    return `<button class="spell ${selected === s.id ? 'selected' : ''}" data-spell="${s.id}" data-tooltip="${escapeHtml(tooltip)}" aria-pressed="${selected === s.id}" ${canUse ? '' : 'disabled'}>
      <span class="spell-icon" style="border-color:${s.color}55">${tagIconSvg(primaryTag, 22)}</span>
      <span class="spell-text"><strong>${escapeHtml(s.name)}</strong><small>${escapeHtml(meta)}</small></span>
      <span class="spell-meta-right">${chargeText}${i < 9 ? `<br><span class="spell-hotkey">${i + 1}</span>` : ''}</span>
    </button>`;
  }).join('');

  $('allies-badge').textContent = (game.allies || []).length ? `${t('player.allies')}: ${game.allies.length}` : '';
  $('equipped-summary').innerHTML = equipmentSlots.map(slot => {
    const item = equippedLabel(slot);
    return `<div class="eq-slot-row"><span class="eq-slot-label">${slotIconSvg(slot, 15)}<span>${h(`slots.${slot.toLowerCase()}`)}</span></span><strong>${item ? escapeHtml(item) : '—'}</strong></div>`;
  }).join('');

  const turns = [...new Set(game.log.map(entry => entry.turn))];
  if (!turns.includes(logTurn)) logTurn = null;
  const index = logTurn === null ? 0 : turns.indexOf(logTurn);
  $('older-turn').disabled = index >= turns.length - 1;
  $('newer-turn').disabled = logTurn === null;
  const entries = logTurn === null ? game.log.slice(0, 14) : game.log.filter(e => e.turn === logTurn);
  $('log').replaceChildren(...entries.map(entry => {
    const row = document.createElement('div');
    row.className = ['gold', 'red', 'green'].includes(entry.tone) ? entry.tone : '';
    const timeEl = document.createElement('time');
    timeEl.textContent = String(entry.turn).padStart(3, '0');
    row.append(timeEl, document.createTextNode(logText(entry)));
    return row;
  }));

  const tagCounts = {};
  for (const s of spells) for (const tg of s.tags) tagCounts[tg] = (tagCounts[tg] || 0) + 1;
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
    $('outcome').innerHTML = `<div class="eyebrow">${h(`outcome.${game.status}.eyebrow`)}</div><h2>${h(`outcome.${game.status}.title`)}</h2><p class="outcome-intro">${h('outcome.introduction')}</p><div class="outcome-summary" aria-label="${h('outcome.summary')}">${stats.map(([key, value]) => `<div><span>${h(`outcome.${key}`)}</span><strong>${value}</strong></div>`).join('')}</div><p class="outcome-footnote">${h('outcome.progress', { realms: progress.realmsCleared, turns: game.turn })}</p><button class="primary" id="restart-outcome">${h('outcome.restart')}</button>`;
    $('restart-outcome').onclick = () => $('new-dialog').showModal();
  }
  renderForge();
  if (view === 'grimoire') renderRw3Grimoire();
  if (view === 'forge') renderRw3ForgeView();
  updateHint(); inspect(inspectionTarget); draw(); save();
}

function updateHint(key) {
  const spell = availableSpells(game).find(s => s.id === selected);
  $('target-hint').textContent = game.deploying ? t('realm.deploy') : key ? t(key) : spell ? t('hint.target', { spell: spell.name }) : t('hint.move');
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
  $('rw3-equipment').textContent = equipmentSlots.map(slot => `${t(`slots.${slot.toLowerCase()}`)}: ${equippedLabel(slot) || '—'}`).join(' · ');

  const shrine = game.shrine, near = shrine && distance(game.player, shrine) <= 1;
  const sType = shrine?.type || 'transmutation';
  if ($('shrine-icon-slot')) $('shrine-icon-slot').innerHTML = shrineIconSvg(sType, 22);
  $('shrine-title').textContent = t(`shrine.${sType}`);
  $('shrine-state').textContent = shrine ? t('forge.shrineState', { uses: shrine.uses, reach: t(near ? 'forge.near' : 'forge.far') }) : t('forge.noShrine');
  $('shrine-special-desc').textContent = sType === 'transmutation' ? t('inspection.shrineDescription', { uses: shrine?.uses ?? 0 }) : t(`shrine.${sType}Desc`);
  const sel = $('shrine-special-select');
  if (['transmutation', 'duplication', 'offering', 'knowledge'].includes(sType)) {
    sel.hidden = false;
    sel.innerHTML = game.rw3Components.length ? [...new Set(game.rw3Components)].map(c => `<option value="${escapeHtml(c)}">${escapeHtml(componentName(c))}</option>`).join('') : `<option value="">—</option>`;
    $('shrine-activate-button').disabled = game.status !== 'playing' || !near || !shrine?.uses || !game.rw3Components.length;
  } else if (sType === 'reformation') {
    sel.hidden = false;
    const slots = Object.keys(game.equipment).filter(slot => game.equipment[slot].components.length);
    sel.replaceChildren(...slots.map(slot => new Option(equipmentName(game.equipment[slot].name), slot)));
    $('shrine-activate-button').disabled = game.status !== 'playing' || !near || !shrine?.uses || !slots.length;
  } else if (['empowerment', 'haste', 'spellgraft'].includes(sType)) {
    sel.hidden = false;
    const spells = availableSpells(game).filter(s => sType !== 'haste' || !s.quickCast);
    sel.innerHTML = spells.map(s => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`).join('');
    $('shrine-activate-button').disabled = game.status !== 'playing' || !near || !shrine?.uses || !spells.length;
  } else {
    sel.hidden = true;
    $('shrine-activate-button').disabled = game.status !== 'playing' || !near || !shrine?.uses;
  }
  renderShrineResult();
  $('threat-button').setAttribute('aria-pressed', String(showThreats));
}

function renderShrineResult() {
  const name = $('shrine-special-select').value, select = $('shrine-result');
  const offering = game.shrine?.type === 'offering';
  const graft = game.shrine?.type === 'spellgraft';
  const choices = graft ? rw3Tags.filter(tag => !availableSpells(game).find(s => s.id === name)?.tags.includes(tag)) : offering ? (componentByName.get(name)?.tags || []) : transmutationChoices(name).map(c => c.name);
  select.hidden = !['spellgraft', 'offering', 'transmutation'].includes(game.shrine?.type) || !choices.length;
  if (!select.hidden) select.replaceChildren(...choices.map(value => new Option(offering || graft ? value : componentName(value), value)));
}

function renderBestiary() {
  const list = $('unit-select'), previous = list.value;
  const matches = [...units.values()].filter(u => (!$('unit-discovered').checked || profile.defeated.includes(u.name)) && searchCatalogue($('unit-search').value, [u.name, ...u.tags, u.is_boss ? 'boss' : '', ...u.abilities.map(a => a.name)]));
  list.replaceChildren(...matches.map(u => new Option(u.name, u.name)));
  if (matches.some(u => u.name === previous)) list.value = previous;
  else list.selectedIndex = 0;
  showUnit();
}
function showUnit() {
  const unit = units.get($('unit-select').value);
  $('unit-detail').innerHTML = unit ? `<h3>${escapeHtml(unit.name)}</h3><p>${unit.hp} HP · ${unit.shields} SH · ${escapeHtml(unit.tags.join(' / '))}</p>${renderResistances({ resistances: unit.resists })}<dl>${unit.abilities.map(a => `<dt>${escapeHtml(a.name)}</dt><dd>${escapeHtml([a.damage ? a.damage + ' ' + a.damage_type.join('/') : '', a.range ? 'R' + a.range : '', cleanRw3Desc(a.desc)].filter(Boolean).join(' · '))}</dd>`).join('')}</dl>${unit.passives.map(p => `<p>${escapeHtml(cleanRw3Desc(p))}</p>`).join('')}` : h('bestiary.empty');
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
  const enemy = p && game.enemies.find(e => covers(e, p));
  const ally = p && (game.allies || []).find(a => distance(a, p) === 0);
  const cloud = p && (game.clouds || []).find(c => c.x === p.x && c.y === p.y);
  if (enemy) {
    const nextAction = enemy.isSpawner ? t('inspection.spawnerDesc', { cooldown: enemy.spawnCooldown })
      : enemy.statuses.freeze || enemy.statuses.stun || enemy.statuses.petrify ? t('inspection.frozen')
      : distance(enemy, game.player) <= enemy.range && hasSight(game, enemy, game.player) ? t('inspection.attack') : t('inspection.approach');
    const title = enemy.isSpawner ? t('inspection.spawner') : enemy.species || (enemy.isFinalBoss ? 'Mordred' : enemyName(enemy));
    const iconKey = enemy.isSpawner ? 'lair' : enemy.isFinalBoss ? 'mordred' : enemy.boss ? 'boss' : ['imp', 'knight', 'eye', 'moth'][enemy.type];
    $('inspection').innerHTML = `<div class="inspect-head"><div class="inspect-symbol">${entityIconSvg(iconKey, 34)}</div><div><h3>${escapeHtml(title)}${enemy.shields ? ` <span class="cyan-val">[${enemy.shields} SH]</span>` : ''}</h3><p style="margin:2px 0 0;color:var(--gold)">${escapeHtml(nextAction)}</p></div></div><p>${h('inspection.enemyStats', enemy)}</p>${renderResistances(enemy)}${renderStatuses(enemy)}`;
  } else if (ally) {
    $('inspection').innerHTML = `<div class="inspect-head"><div class="inspect-symbol">${entityIconSvg('ally', 34)}</div><div><h3>${escapeHtml(ally.name)}</h3><p style="margin:2px 0 0;color:var(--green)">${h('inspection.ally')}</p></div></div><p>HP ${ally.hp}/${ally.maxHp} · DMG ${ally.damage} · R${ally.range}${ally.shields ? ` · ${ally.shields} SH` : ''}${ally.duration ? ` · ${ally.duration}t` : ''}</p>${renderResistances(ally)}`;
  } else if (p && game.portals.some(r => distance(r, p) === 0)) {
    const portal = game.portals.find(r => distance(r, p) === 0), next = previewPortal(game, portal);
    const preview = next ? [
      h('inspection.nextRealm', { enemies: next.enemies, boss: next.boss ? t('inspection.boss') : '' }),
      next.vault ? h('vault.name', { name: next.vault }) : '',
      escapeHtml(next.species.join(', ')),
      h('inspection.affinities', { schools: next.schools.map(schoolName).join(', ') }),
      h('inspection.shrines', { shrines: t(`shrine.${next.shrine}`) }),
      next.rw3Components?.length ? `RW3: ${next.rw3Components.map(componentName).join(', ')}` : '',
    ].filter(Boolean).join('<br>') : h('inspection.finalPortal');
    $('inspection').innerHTML = `<div class="inspect-head"><div class="inspect-symbol">${entityIconSvg(portal.theme ? 'portal-ember' : 'portal-moss', 34)}</div><div><h3>${h(portal.theme ? 'inspection.emberfallRift' : 'inspection.mossboundRift')}</h3><p style="margin:2px 0 0">${h(game.enemies.length ? 'inspection.portalLocked' : 'inspection.portalOpen')}</p></div></div><p>${preview}</p>`;
  } else if (p && game.shrine && distance(game.shrine, p) === 0) {
    const sType = game.shrine.type || 'transmutation';
    $('inspection').innerHTML = `<div class="inspect-head"><div class="inspect-symbol">${shrineIconSvg(sType, 32)}</div><div><h3>${h(`shrine.${sType}`)}</h3></div></div><p>${sType === 'transmutation' ? h('inspection.shrineDescription', { uses: game.shrine.uses }) : h(`shrine.${sType}Desc`)}</p>`;
  } else if (p && game.items.some(i => distance(i, p) === 0)) {
    const item = game.items.find(i => distance(i, p) === 0);
    const comp = item.type === 'rw3-component' ? componentByName.get(item.name) : null;
    const iconKey = item.type === 'potion' ? 'potion' : item.type === 'shard' ? 'shard' : 'component';
    const description = item.type === 'companion' ? t('item.companion', { name: item.name }) : item.type === 'tome' ? t('item.tome', { spell: spellById.get(Number(item.spellId.slice(4)))?.name }) : ['scroll', 'chest'].includes(item.type) ? item.options.map(c => item.type === 'scroll' ? spellById.get(c).name : equipmentName(c)).join(' · ') : item.type === 'component' ? t('inspection.material', { material: t(`materials.${item.material}`) }) : item.type === 'rw3-component' ? `${componentName(item.name)}${comp?.desc ? ` — ${cleanRw3Desc(comp.desc)}` : ''}` : t(item.type === 'shard' ? 'inspection.shard' : 'inspection.potion');
    $('inspection').innerHTML = `<div class="inspect-head"><div class="inspect-symbol">${entityIconSvg(iconKey, 34)}</div><div><h3>${escapeHtml(item.type === 'rw3-component' ? componentName(item.name) : t('pickup.' + item.type))}</h3></div></div><p>${escapeHtml(description)}</p>`;
  } else if (p && distance(game.player, p) === 0) {
    $('inspection').innerHTML = `<div class="inspect-head"><div class="inspect-symbol" style="overflow:hidden;padding:0">${wizardPortraitSvg()}</div><div><h3>${h('inspection.player')}</h3><p style="margin:2px 0 0"><span class="cyan-val">${game.player.shields || 0} SH</span></p></div></div><p>${h('inspection.playerHealth', { hp: game.player.hp, maxHp: maxHealth(game), ward: game.player.shield })}<br>${h('inspection.playerResources', { points: game.points, potions: game.potions })}</p>${renderResistances(game.player)}`;
  } else if (cloud) {
    const def = CLOUD_TYPES[cloud.type] || CLOUD_TYPES.fire;
    $('inspection').innerHTML = `<div class="inspect-head"><div class="inspect-symbol">${entityIconSvg('cloud', 34)}</div><div><h3>${escapeHtml(def.name)}</h3></div></div><p>${h('inspection.cloud')} · ${cloud.duration}t${cloud.damage ? ` · ${cloud.damage} ${cloud.damageType}` : ''}</p>`;
  } else if (p && game.tiles[p.y]?.[p.x] === 2) {
    $('inspection').innerHTML = `<div class="inspect-head"><div class="inspect-symbol">${entityIconSvg('chasm', 34)}</div><div><h3>${h('inspection.chasm')}</h3></div></div><p>${h('inspection.chasmDesc')}</p>`;
  } else {
    $('inspection').innerHTML = `<div class="inspect-head"><div class="inspect-symbol">${entityIconSvg('empty', 30)}</div><div><h3>${h('inspection.emptyTitle')}</h3></div></div><p>${h('inspection.emptyDescription')}</p>`;
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
  document.body.classList.toggle('view-realm', next === 'realm');
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
  const learnedSet = new Set(knownSpellIds(game));
  $('rw3-learned-count').textContent = learnedSet.size;
  $('rw3-grimoire-points').textContent = t('atlas.points', { points: game.points });
  const q = $('rw3-spell-search').value.toLowerCase();
  const tag = $('rw3-tag-filter').value;
  const lvl = $('rw3-level-filter').value;
  const status = $('rw3-status-filter').value;

  const filtered = rw3Spells.filter(s => {
    if (game.allowedSpells && !game.allowedSpells.includes(s.id) && !learnedSet.has(s.id) && !s.granted_by) return false;
    if (tag !== 'all' && !s.tags.includes(tag)) return false;
    if (lvl !== 'all' && String(s.level) !== lvl) return false;
    if (status === 'learned' && !learnedSet.has(s.id)) return false;
    if (status === 'available' && !canLearnRw3Spell(game, s.id)) return false;
    if (q && !searchCatalogue(q, [s.name, ...s.tags, s.desc, s.granted_by || ''], s.summons)) return false;
    return true;
  });

  $('rw3-spell-grid').innerHTML = filtered.map(s => {
    const isLearned = learnedSet.has(s.id);
    const canBuy = canLearnRw3Spell(game, s.id);
    const upCount = (game.rw3Upgrades?.[s.id] || []).length;
    const primaryTag = s.tags?.[0] || 'Arcane';
    const primaryColor = (TAG_META[primaryTag] || TAG_META.Arcane).color;
    const tagPills = s.tags.map(tg => `<span class="tag-pill" style="color:${(TAG_META[tg] || TAG_META.Arcane).color}">${tagIconSvg(tg, 12)}<span>${escapeHtml(tg)}</span></span>`).join('');
    const statsParts = [];
    if (s.stats?.damage) statsParts.push(`DMG ${s.stats.damage}`);
    if (s.stats?.range) statsParts.push(`RNG ${s.stats.range}`);
    if (s.stats?.max_charges) statsParts.push(`CHG ${s.stats.max_charges}`);
    if (s.stats?.hp_cost) statsParts.push(`HP -${s.stats.hp_cost}`);
    if (s.stats?.minion_health) statsParts.push(`MINION ${s.stats.minion_health}HP`);
    return `<div class="rw3-card ${isLearned ? 'learned-card' : ''}">
      <div class="rw3-card-head">
        <div class="rw3-card-title-group">
          <span class="card-emblem" style="border-color:${primaryColor}55">${tagIconSvg(primaryTag, 22)}</span>
          <h3>${escapeHtml(s.name)}</h3>
        </div>
        <span class="rw3-lvl">${isLearned ? h('rw3.learnedBadge') : `LVL ${s.level} · ${s.level} SP`}</span>
      </div>
      <div class="chip-wrap">${tagPills}</div>
      <div class="rw3-stats-line">${statsParts.map(x => `<span>${escapeHtml(x)}</span>`).join('')}</div>
      <p class="rw3-desc">${escapeHtml(cleanRw3Desc(s.desc))}</p>
      <div class="rw3-card-actions">
        ${s.granted_by && !isLearned ? h('book.requires', { item: equipmentName(s.granted_by) }) : isLearned ? '' : `<button class="primary" data-learn-rw3="${s.id}" ${canBuy ? '' : 'disabled'}>${h('rw3.learnSpell', { cost: s.level })}</button>`}
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
  const isLearned = knownSpellIds(game).includes(spellId);
  const learnedUps = new Set(game.rw3Upgrades?.[spellId] || []);
  const primaryTag = eff.tags?.[0] || 'Arcane';
  const tagPills = eff.tags.map(tg => `<span class="tag-pill" style="color:${(TAG_META[tg] || TAG_META.Arcane).color}">${tagIconSvg(tg, 12)}<span>${escapeHtml(tg)}</span></span>`).join('');
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
    <div class="rw3-card-title-group" style="margin:8px 0 12px">
      <span class="card-emblem">${tagIconSvg(primaryTag, 24)}</span>
      <h2 style="margin:0">${escapeHtml(base.name)}</h2>
    </div>
    <div class="chip-wrap">${tagPills}</div>
    <p class="rw3-desc" style="margin-top:10px">${escapeHtml(cleanRw3Desc(base.desc))}</p>
    <div class="detail-stats">
      <div>DMG<strong>${eff.damage} (${eff.damageTypes.join('/')})</strong></div>
      <div>RNG / AREA<strong>${eff.range} / ${eff.radius}</strong></div>
      <div>CHARGES / HP<strong>${eff.maxCharges || '∞'} / ${eff.hpCost ? `-${eff.hpCost} HP` : '0'}</strong></div>
      <div>POINTS<strong>${game.points} SP</strong></div>
    </div>
    ${base.granted_by && !isLearned ? h('book.requires', { item: equipmentName(base.granted_by) }) : isLearned ? '' : `<button class="primary" id="dialog-learn-rw3" ${canLearnRw3Spell(game, spellId) ? '' : 'disabled'}>${h('rw3.learnSpell', { cost: base.level })}</button>`}
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
      return `<span class="tag-pill" title="${escapeHtml(cleanRw3Desc(comp?.desc || ''))}">${entityIconSvg('component', 13)}<span>${escapeHtml(componentName(name))}</span> <small style="opacity:.7">(${(comp?.tags || []).join('/')})</small></span>`;
    }).join('')
    : `<span class="muted">${h('forge.empty')}</span>`;

  if ($('forge-equipped-strip')) {
    $('forge-equipped-strip').innerHTML = equipmentSlots.map(slot => {
      const item = equippedLabel(slot);
      return `<div class="loadout-slot-card ${item ? 'equipped' : ''}">
        ${slotIconSvg(slot, 22)}
        <div>
          <span>${h(`slots.${slot.toLowerCase()}`)}</span>
          <strong>${item ? escapeHtml(item) : '—'}</strong>
        </div>
      </div>`;
    }).join('');
  }

  const q = $('rw3-eq-search').value.toLowerCase();
  const slot = $('rw3-slot-filter').value;
  const status = $('rw3-eq-status-filter').value;

  const filtered = rw3Equipment.filter(item => {
    if (game.allowedEquipment && !game.allowedEquipment.includes(item.name)) return false;
    if (slot !== 'all' && item.slot !== slot) return false;
    if (status === 'craftable' && !craftableNames.has(item.name)) return false;
    if (q && !searchCatalogue(q, [item.name, equipmentName(item.name), item.slot, t(`slots.${item.slot.toLowerCase()}`), { Feet: 'footwear', Head: 'headwear' }[item.slot], ...item.tags, item.desc, ...item.bonuses], item.summons)) return false;
    return true;
  }).sort((a, b) => (craftableNames.has(b.name) ? 1 : 0) - (craftableNames.has(a.name) ? 1 : 0));

  $('rw3-eq-grid').innerHTML = filtered.map(item => {
    const canMake = craftableNames.has(item.name);
    const equipped = Object.values(game.equipment).some(e => e.name === item.name);
    const recipeText = item.recipe.map(([tg, c]) => `${c}× ${tg}`).join(' + ');
    const bonuses = [...(item.bonuses || []), item.desc].filter(Boolean).map(cleanRw3Desc).join('\n');
    return `<div class="rw3-card ${canMake ? 'craftable-card' : ''} ${equipped ? 'learned-card' : ''}">
      <div class="rw3-card-head">
        <div class="rw3-card-title-group">
          <span class="card-emblem">${slotIconSvg(item.slot, 22)}</span>
          <h3>${escapeHtml(equipmentName(item.name))}</h3>
        </div>
        <span class="rw3-lvl">${h(`slots.${item.slot.toLowerCase()}`)}</span>
      </div>
      <div class="chip-wrap">${item.tags.map(tg => `<span class="tag-pill" style="color:${(TAG_META[tg] || TAG_META.Arcane).color}">${tagIconSvg(tg, 12)}<span>${escapeHtml(tg)}</span></span>`).join('')}</div>
      <div class="rw3-stats-line"><span>${escapeHtml(recipeText)}</span></div>
      <p class="rw3-desc">${escapeHtml(bonuses)}</p>
      <div class="rw3-card-actions">
        <button class="${canMake ? 'primary' : ''}" data-forge-rw3="${escapeHtml(item.name)}" ${canMake ? '' : 'disabled'}>${equipped ? h('rw3.equippedSlot') : canMake ? h('rw3.forgeItem') : h('rw3.missingComponents')}</button>
      </div>
    </div>`;
  }).join('');
}

$('shrine-special-select').onchange = renderShrineResult;
$('bestiary-button').onclick = () => { renderBestiary(); $('bestiary-dialog').showModal(); };
$('unit-search').oninput = $('unit-discovered').onchange = renderBestiary;
$('unit-select').onchange = showUnit;
$('older-turn').onclick = () => { const turns = [...new Set(game.log.map(e => e.turn))]; logTurn = turns[(logTurn == null ? 0 : turns.indexOf(logTurn)) + 1]; render(); };
$('newer-turn').onclick = () => { const turns = [...new Set(game.log.map(e => e.turn))]; const idx = turns.indexOf(logTurn); logTurn = idx <= 1 ? null : turns[idx - 1]; render(); };
$('shrine-activate-button').onclick = () => action(() => {
  const val = $('shrine-special-select').value;
  const result = $('shrine-result').value;
  return useShrine(game, { component: val, spellId: val, slot: val, result, tag: result });
});
$('threat-button').onclick = () => { showThreats = !showThreats; renderForge(); draw(); };
$('realm-tab').onclick = () => setView('realm');
$('grimoire-tab').onclick = $('grimoire-cta').onclick = () => setView('grimoire');
$('forge-tab').onclick = $('open-forge-cta').onclick = () => setView('forge');
function showWardrobe() {
  $('wardrobe-select').replaceChildren(...wardrobe.map(({ name, unlock }) => {
    const opt = new Option(profile.outfits.includes(name) ? name : '🔒 ' + name, name);
    opt.title = unlock; opt.disabled = !profile.outfits.includes(name); return opt;
  }));
  $('wardrobe-select').value = profile.selected;
  $('outfit-info').textContent = t('wardrobe.count', { count: profile.outfits.length, total: wardrobe.length });
}
$('guide-button').onclick = () => { showWardrobe(); $('guide-dialog').showModal(); };
$('wardrobe-select').onchange = () => { profile.selected = $('wardrobe-select').value; saveProfile(); render(); };
$('reroll-rifts').onclick = () => action(() => rerollRifts(game));
$('reward-dialog').oncancel = event => event.preventDefault();
$('new-mode').onchange = () => {
  $('mutator-options').hidden = $('new-mode').value !== 'custom';
  $('new-seed').disabled = $('new-mode').value === 'weekly';
};
for (const el of $('mutator-options').querySelectorAll('input')) el.checked = profile.mutators?.includes(el.value);
$('new-button').onclick = () => $('new-dialog').showModal();
$('cancel-new').onclick = () => $('new-dialog').close();
$('confirm-new').onclick = () => {
  const input = $('new-seed'); if (!input.checkValidity()) { input.reportValidity(); return; }
  const mode = $('new-mode').value || 'standard';
  if (game.mode === 'trial-improviser' && game.status === 'playing') profile.improviserWins = 0;
  profile.mutators = [...$('mutator-options').querySelectorAll(':checked')].map(el => el.value); saveProfile();
  game = createGame(input.value ? Number(input.value) : undefined, { mode, selectedMutators: profile.mutators });
  logTurn = null; selected = null; hover = null; inspectionTarget = null; $('new-dialog').close(); setView('realm'); render();
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
    if (!chosen) return;
    const list = $('ingredient-choices');
    $('ingredient-title').textContent = equipmentName(name);
    $('ingredient-recipe').textContent = item.recipe.map(([tag, count]) => count + ' × ' + tag).join(' + ');
    const options = [...new Set(game.rw3Components)];
    list.replaceChildren(...Array.from({ length: item.recipe_cost }, (_, i) => {
      const select = document.createElement('select');
      select.setAttribute('aria-label', t('forge.ingredient', { n: i + 1 }));
      select.replaceChildren(new Option('—', ''), ...options.map(c => new Option(componentName(c) + ' · ' + componentByName.get(c).tags.join('/'), c)));
      select.value = chosen[i] || ''; return select;
    }));
    const selection = () => [...list.children].map(el => el.value).filter(Boolean);
    list.onchange = () => { $('craft-chosen').disabled = !canForge(game, name, selection()); };
    list.onchange();
    $('craft-chosen').onclick = () => { if (forge(game, name, selection())) { $('ingredients-dialog').close(); render(); } };
    $('ingredients-dialog').showModal();
  }
};
$('wait-button').onclick = () => action(() => wait(game));
$('potion-button').onclick = () => action(() => drink(game));
for (const button of document.querySelectorAll('[data-move]')) button.onclick = () => action(() => move(game, ...button.dataset.move.split(',').map(Number)));

function tileAt(event) { const bounds = canvas.getBoundingClientRect(); return { x: Math.min(SIZE - 1, Math.max(0, Math.floor((event.clientX - bounds.left) / bounds.width * SIZE))), y: Math.min(SIZE - 1, Math.max(0, Math.floor((event.clientY - bounds.top) / bounds.height * SIZE))) }; }
function walkTo(target) {
  const mods = getEquipmentModifiers(game);
  if (game.status !== 'playing' || (game.tiles[target.y]?.[target.x] !== 0 && !(mods.flying && game.tiles[target.y]?.[target.x] === 2))) return false;
  if (game.mode !== 'standard' && distance(game.player, target) === 1) return move(game, target.x - game.player.x, target.y - game.player.y);
  let moved = false;
  for (let steps = 0; steps < SIZE * SIZE && game.status === 'playing' && distance(game.player, target) !== 0; steps++) {
    const path = shortestPath(game, game.player, target, mods.flying);
    if (!path?.length) break;
    const next = path[0], before = { ...game.player };
    if (!move(game, next.x - game.player.x, next.y - game.player.y)) break;
    moved = true;
    if (game.deploying || game.pendingReward || distance(before, game.player) !== 1) break;
  }
  return moved;
}
canvas.onpointermove = event => { hover = tileAt(event); inspect(hover); draw(); };
canvas.onpointerleave = () => { hover = null; draw(); };
canvas.onclick = event => { const target = tileAt(event); if (game.deploying) { selected = null; action(() => deploy(game, target)); } else if (selected) action(() => cast(game, selected, target)); else if (distance(game.player, target) > 0) action(() => walkTo(target)); else inspect(target); };

document.addEventListener('keydown', event => {
  if (document.querySelector('dialog[open]') || ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName) || event.ctrlKey || event.metaKey || event.altKey) return;
  const key = event.key.toLowerCase();
  if (key === '[' || key === ']') {
    const speeds = [0.5, 1, 2, 4];
    const index = speeds.indexOf(profile.speed || 1) + (key === ']' ? 1 : -1);
    profile.speed = speeds[Math.max(0, Math.min(speeds.length - 1, index))];
    saveProfile();
    $('target-hint').textContent = t('realm.animationSpeed', { speed: profile.speed });
    return;
  }
  if (key === 't' || key === 'g') { event.preventDefault(); setView(view === 'grimoire' ? 'realm' : 'grimoire'); return; }
  if (key === 'f') { event.preventDefault(); setView(view === 'forge' ? 'realm' : 'forge'); return; }
  if (view !== 'realm') return;
  if (game.deploying && key === 'enter') { event.preventDefault(); action(() => deploy(game, hover || game.player)); return; }
  const keypad = { Numpad1: [-1, 1], Numpad3: [1, 1], Numpad7: [-1, -1], Numpad9: [1, -1] };
  if (game.mode !== 'standard' && keypad[event.code]) { event.preventDefault(); action(() => move(game, ...keypad[event.code])); return; }
  const moves = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] };
  if (moves[key]) { event.preventDefault(); action(() => move(game, ...moves[key])); }
  else if (key === ' ' && event.target.tagName !== 'BUTTON') { event.preventDefault(); action(() => wait(game)); }
  else if (key === 'y') { showThreats = !showThreats; renderForge(); draw(); }
  else if (key === 'q' && game.lastCast && availableSpells(game).some(s => s.id === game.lastCast.spellId)) { selected = game.lastCast.spellId; hover = { ...game.lastCast.target }; inspect(hover); render(); }
  else if (key === 'enter' && selected && hover && event.target.tagName !== 'BUTTON') { event.preventDefault(); action(() => cast(game, selected, hover)); }
  else if (key === 'p') action(() => drink(game));
  else if (key === 'escape') { selected = null; render(); }
  else if (/^[1-9]$/.test(key)) { const spell = availableSpells(game)[Number(key) - 1]; if (spell) { selected = spell.id; render(); } }
});

initStaticIcons();
document.body.classList.add('view-realm');
translatePage();
populateFilters();
renderHeading();
render();
requestAnimationFrame(animate);
