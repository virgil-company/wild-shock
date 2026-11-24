import { wardrobe } from '../data/rw3-catalog.js';
import { outfitUnlocks } from '../data/campaign.js';
import { covers, searchCatalogue, units } from '../data/bestiary.js';
import { componentName, enemyName, equipmentName, logText, schoolName } from '../i18n/game-text.js';
import { t } from '../i18n/i18n.js';
import {
  availableSpells, cancelChannel, claimReward, distance, finalRealmOf,
  hasSight, learnRw3Spell, learnRw3Upgrade, maxHealth, previewPortal,
} from '../engine/index.js';
import {
  CLOUD_TYPES, DAMAGE_TYPES, TAG_META, canLearnRw3Spell, canLearnRw3Upgrade,
  catalogueCounts, componentByName, craftableEquipment, effectiveRw3Spell,
  equipmentByName, equipmentSlots, getEquipmentModifiers, getUnitResistance,
  knownSpellIds, rw3Equipment, rw3Spells, rw3Tags, spellById, transmutationChoices,
} from '../rules/rw3.js';
import { entityIconSvg, shrineIconSvg, slotIconSvg, tagIconSvg, uiIconSvg, wizardPortraitSvg } from './svg-icons.js';
import { totalWikiEntries } from './wiki.js';
import { $, cleanRw3Desc, escapeHtml, h } from './dom.js';

export function initStaticIcons() {
  const bindings = [
    ['brand-mark-icon', uiIconSvg('brand', 34)],
    ['wizard-portrait', wizardPortraitSvg()],
    ['icon-vitality', uiIconSvg('heart', 14)],
    ['icon-shields', uiIconSvg('shield', 13)],
    ['icon-ward', uiIconSvg('ward', 13)],
    ['icon-sp', uiIconSvg('sp', 13)],
    ['icon-potion', entityIconSvg('potion', 28)],
    ['icon-threat', uiIconSvg('threat', 15)],
    ['icon-wait', uiIconSvg('wait', 15)],
    ['icon-skull', uiIconSvg('skull', 32)],
  ];
  for (const [id, svg] of bindings) {
    const el = $(id);
    if (el) el.innerHTML = svg;
  }
}

export function equippedLabel(game, slot) {
  return Object.values(game.equipment)
    .filter(e => equipmentByName.get(e.name)?.slot === slot)
    .map(e => equipmentName(e.name))
    .join(', ');
}

export function renderHeading(view) {
  const map = {
    realm: ['realm.title', 'realm.subtitle'],
    grimoire: ['rw3.grimoireTitle', 'rw3.grimoireSubtitle'],
    forge: ['rw3.forgeTitle', 'rw3.forgeSubtitle'],
    wiki: ['wiki.title', 'wiki.subtitle'],
  };
  const [tk, sk] = map[view] || map.realm;
  $('page-title').innerHTML = `${h(tk)}<span>.</span>`;
  $('page-subtitle').textContent = t(sk);
}

export function populateFilters() {
  const tagSel = $('rw3-tag-filter');
  const prevTag = tagSel.value || 'all';
  tagSel.innerHTML = `<option value="all">${h('rw3.allTags')}</option>` + rw3Tags.map(tag => `<option value="${escapeHtml(tag)}">${escapeHtml(tag)}</option>`).join('');
  tagSel.value = prevTag;

  const lvlSel = $('rw3-level-filter');
  const prevLvl = lvlSel.value || 'all';
  lvlSel.innerHTML = `<option value="all">${h('rw3.allLevels')}</option>` + [1, 2, 3, 4, 5, 6, 7, 8, 9].map(l => `<option value="${l}">Lvl ${l}</option>`).join('');
  lvlSel.value = prevLvl;

  const slotSel = $('rw3-slot-filter');
  const prevSlot = slotSel.value || 'all';
  slotSel.innerHTML = `<option value="all">${h('rw3.allSlots')}</option>` + equipmentSlots.map(s => `<option value="${escapeHtml(s)}">${h(`slots.${s.toLowerCase()}`)}</option>`).join('');
  slotSel.value = prevSlot;
}

export function renderResistances(game, unit) {
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

// Cache portal preview per (seed, realm, riftRoll, portal coords/theme/variant) to avoid regenerating on hover.
let cachedPortalPreviewKey = null;
let cachedPortalPreviewData = null;

function getPortalPreview(game, portal) {
  const key = `${game.seed}:${game.realm}:${game.riftRoll}:${portal.theme}:${portal.variant || 0}:${portal.affinity || ''}:${game.offeringTags.join(',')}`;
  if (key !== cachedPortalPreviewKey) {
    cachedPortalPreviewKey = key;
    cachedPortalPreviewData = previewPortal(game, portal);
  }
  return cachedPortalPreviewData;
}

export function renderInspection(state, p) {
  const game = state.game;
  state.inspectionTarget = p;
  const enemy = p && game.enemies.find(e => covers(e, p));
  const ally = p && (game.allies || []).find(a => distance(a, p) === 0);
  const cloud = p && (game.clouds || []).find(c => c.x === p.x && c.y === p.y);
  const panel = $('inspection');

  if (enemy) {
    const nextAction = enemy.isSpawner ? t('inspection.spawnerDesc', { cooldown: enemy.spawnCooldown })
      : enemy.statuses.freeze || enemy.statuses.stun || enemy.statuses.petrify ? t('inspection.frozen')
      : distance(enemy, game.player) <= enemy.range && hasSight(game, enemy, game.player) ? t('inspection.attack') : t('inspection.approach');
    const title = enemy.isSpawner ? t('inspection.spawner') : enemy.species || (enemy.isFinalBoss ? 'Mordred' : enemyName(enemy));
    const iconKey = enemy.isSpawner ? 'lair' : enemy.isFinalBoss ? 'mordred' : enemy.boss ? 'boss' : ['imp', 'knight', 'eye', 'moth'][enemy.type];
    panel.innerHTML = `<div class="inspect-head"><div class="inspect-symbol">${entityIconSvg(iconKey, 34)}</div><div><h3>${escapeHtml(title)}${enemy.shields ? ` <span class="cyan-val">[${enemy.shields} SH]</span>` : ''}</h3><p style="margin:2px 0 0;color:var(--gold)">${escapeHtml(nextAction)}</p></div></div><p>${h('inspection.enemyStats', enemy)}</p>${renderResistances(game, enemy)}${renderStatuses(enemy)}`;
  } else if (ally) {
    panel.innerHTML = `<div class="inspect-head"><div class="inspect-symbol">${entityIconSvg('ally', 34)}</div><div><h3>${escapeHtml(ally.name)}</h3><p style="margin:2px 0 0;color:var(--green)">${h('inspection.ally')}</p></div></div><p>HP ${ally.hp}/${ally.maxHp} · DMG ${ally.damage} · R${ally.range}${ally.shields ? ` · ${ally.shields} SH` : ''}${ally.duration ? ` · ${ally.duration}t` : ''}</p>${renderResistances(game, ally)}`;
  } else if (p && game.portals.some(r => distance(r, p) === 0)) {
    const portal = game.portals.find(r => distance(r, p) === 0);
    const next = getPortalPreview(game, portal);
    const preview = next ? [
      h('inspection.nextRealm', { enemies: next.enemies, boss: next.boss ? t('inspection.boss') : '' }),
      next.vault ? h('vault.name', { name: next.vault }) : '',
      escapeHtml(next.species.join(', ')),
      h('inspection.affinities', { schools: next.schools.map(schoolName).join(', ') }),
      h('inspection.shrines', { shrines: t(`shrine.${next.shrine}`) }),
      next.rw3Components?.length ? `RW3: ${next.rw3Components.map(componentName).join(', ')}` : '',
    ].filter(Boolean).join('<br>') : h('inspection.finalPortal');
    panel.innerHTML = `<div class="inspect-head"><div class="inspect-symbol">${entityIconSvg(portal.theme ? 'portal-ember' : 'portal-moss', 34)}</div><div><h3>${h(portal.theme ? 'inspection.emberfallRift' : 'inspection.mossboundRift')}</h3><p style="margin:2px 0 0">${h(game.enemies.length ? 'inspection.portalLocked' : 'inspection.portalOpen')}</p></div></div><p>${preview}</p>`;
  } else if (p && game.shrine && distance(game.shrine, p) === 0) {
    const sType = game.shrine.type || 'transmutation';
    panel.innerHTML = `<div class="inspect-head"><div class="inspect-symbol">${shrineIconSvg(sType, 32)}</div><div><h3>${h(`shrine.${sType}`)}</h3></div></div><p>${sType === 'transmutation' ? h('inspection.shrineDescription', { uses: game.shrine.uses }) : h(`shrine.${sType}Desc`)}</p>`;
  } else if (p && game.items.some(i => distance(i, p) === 0)) {
    const item = game.items.find(i => distance(i, p) === 0);
    const comp = item.type === 'rw3-component' ? componentByName.get(item.name) : null;
    const iconKey = item.type === 'potion' ? 'potion' : item.type === 'shard' ? 'shard' : 'component';
    const description = item.type === 'companion' ? t('item.companion', { name: item.name })
      : item.type === 'tome' ? t('item.tome', { spell: spellById.get(Number(item.spellId.slice(4)))?.name })
      : (item.type === 'scroll' || item.type === 'chest') ? item.options.map(c => item.type === 'scroll' ? spellById.get(c).name : equipmentName(c)).join(' · ')
      : item.type === 'component' ? t('inspection.material', { material: t(`materials.${item.material}`) })
      : item.type === 'rw3-component' ? `${componentName(item.name)}${comp?.desc ? ` — ${cleanRw3Desc(comp.desc)}` : ''}`
      : t(item.type === 'shard' ? 'inspection.shard' : 'inspection.potion');
    panel.innerHTML = `<div class="inspect-head"><div class="inspect-symbol">${entityIconSvg(iconKey, 34)}</div><div><h3>${escapeHtml(item.type === 'rw3-component' ? componentName(item.name) : t('pickup.' + item.type))}</h3></div></div><p>${escapeHtml(description)}</p>`;
  } else if (p && distance(game.player, p) === 0) {
    panel.innerHTML = `<div class="inspect-head"><div class="inspect-symbol" style="overflow:hidden;padding:0">${wizardPortraitSvg()}</div><div><h3>${h('inspection.player')}</h3><p style="margin:2px 0 0"><span class="cyan-val">${game.player.shields || 0} SH</span></p></div></div><p>${h('inspection.playerHealth', { hp: game.player.hp, maxHp: maxHealth(game), ward: game.player.shield })}<br>${h('inspection.playerResources', { points: game.points, potions: game.potions })}</p>${renderResistances(game, game.player)}`;
  } else if (cloud) {
    const def = CLOUD_TYPES[cloud.type] || CLOUD_TYPES.fire;
    panel.innerHTML = `<div class="inspect-head"><div class="inspect-symbol">${entityIconSvg('cloud', 34)}</div><div><h3>${escapeHtml(def.name)}</h3></div></div><p>${h('inspection.cloud')} · ${cloud.duration}t${cloud.damage ? ` · ${cloud.damage} ${cloud.damageType}` : ''}</p>`;
  } else if (p && game.tiles[p.y]?.[p.x] === 2) {
    panel.innerHTML = `<div class="inspect-head"><div class="inspect-symbol">${entityIconSvg('chasm', 34)}</div><div><h3>${h('inspection.chasm')}</h3></div></div><p>${h('inspection.chasmDesc')}</p>`;
  } else {
    panel.innerHTML = `<div class="inspect-head"><div class="inspect-symbol">${entityIconSvg('empty', 30)}</div><div><h3>${h('inspection.emptyTitle')}</h3></div></div><p>${h('inspection.emptyDescription')}</p>`;
  }
}

export function renderShrineResult(game) {
  const name = $('shrine-special-select').value;
  const select = $('shrine-result');
  const offering = game.shrine?.type === 'offering';
  const graft = game.shrine?.type === 'spellgraft';
  const choices = graft
    ? rw3Tags.filter(tag => !availableSpells(game).find(s => s.id === name)?.tags.includes(tag))
    : offering ? (componentByName.get(name)?.tags || [])
    : transmutationChoices(name).map(c => c.name);
  select.hidden = !['spellgraft', 'offering', 'transmutation'].includes(game.shrine?.type) || !choices.length;
  if (!select.hidden) select.replaceChildren(...choices.map(value => new Option(offering || graft ? value : componentName(value), value)));
}

export function renderForgeSidebar(state) {
  const game = state.game;
  const craftable = craftableEquipment(game).length;
  $('rw3-catalogue').textContent = `${craftable} / ${catalogueCounts().equipment}`;
  $('rw3-inventory').textContent = game.rw3Components.length ? game.rw3Components.map(componentName).join(' · ') : t('forge.empty');
  $('rw3-equipment').textContent = equipmentSlots.map(slot => `${t(`slots.${slot.toLowerCase()}`)}: ${equippedLabel(game, slot) || '—'}`).join(' · ');

  const shrine = game.shrine;
  const near = shrine && distance(game.player, shrine) <= 1;
  const sType = shrine?.type || 'transmutation';
  if ($('shrine-icon-slot')) $('shrine-icon-slot').innerHTML = shrineIconSvg(sType, 22);
  $('shrine-title').textContent = t(`shrine.${sType}`);
  $('shrine-state').textContent = shrine ? t('forge.shrineState', { uses: shrine.uses, reach: t(near ? 'forge.near' : 'forge.far') }) : t('forge.noShrine');
  $('shrine-special-desc').textContent = sType === 'transmutation' ? t('inspection.shrineDescription', { uses: shrine?.uses ?? 0 }) : t(`shrine.${sType}Desc`);

  const sel = $('shrine-special-select');
  if (['transmutation', 'duplication', 'offering', 'knowledge'].includes(sType)) {
    sel.hidden = false;
    sel.innerHTML = game.rw3Components.length
      ? [...new Set(game.rw3Components)].map(c => `<option value="${escapeHtml(c)}">${escapeHtml(componentName(c))}</option>`).join('')
      : `<option value="">—</option>`;
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
  renderShrineResult(game);
  $('threat-button').setAttribute('aria-pressed', String(state.showThreats));
}

export function renderHud(state, { onRender, onSaveProfile }) {
  const { game, profile } = state;
  if (game.mode === 'trial-improviser' && game.status !== 'playing' && !game.resultRecorded) {
    profile.improviserWins = game.status === 'won' ? (profile.improviserWins || 0) + 1 : 0;
    game.resultRecorded = true;
    if (profile.improviserWins >= 10 && !profile.outfits.includes('Unquenchable Flame')) profile.outfits.push('Unquenchable Flame');
    onSaveProfile();
  }
  const earned = outfitUnlocks(game).filter(name => !profile.outfits.includes(name));
  const discovered = game.defeatedSpecies.filter(n => !profile.defeated.includes(n));
  if (earned.length || discovered.length) {
    profile.outfits.push(...earned);
    profile.defeated.push(...discovered);
    onSaveProfile();
  }
  game.player.outfit = profile.selected;

  const reward = game.pendingReward;
  if (reward && game.status === 'playing') {
    $('reward-options').replaceChildren(...reward.options.map(choice => {
      const button = document.createElement('button');
      button.textContent = reward.type === 'scroll' ? spellById.get(choice).name : equipmentName(choice);
      button.onclick = () => { if (claimReward(game, choice)) { $('reward-dialog').close(); onRender(); } };
      return button;
    }));
    if (!$('reward-dialog').open) $('reward-dialog').showModal();
  }

  const maxR = finalRealmOf(game);
  const maxHp = maxHealth(game);
  const spells = availableSpells(game);

  $('spell-total').textContent = rw3Spells.length;
  $('equipment-total').textContent = rw3Equipment.length;
  if ($('wiki-total')) $('wiki-total').textContent = totalWikiEntries();
  $('seed-label').textContent = `#${String(game.seed).slice(-6).padStart(6, '0')}`;
  $('mode-badge').textContent = game.mode && game.mode !== 'standard' ? t(`mode.${game.mode}`).split('(')[0].trim() : '';
  $('health-label').textContent = `${game.player.hp} / ${maxHp}`;
  $('health-bar').style.width = `${Math.min(100, game.player.hp / maxHp * 100)}%`;
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

  const mods = getEquipmentModifiers(game);
  const banners = [];
  if (mods.quickstep && !game.quickstepUsed) banners.push(`<div class="banner-chip quickstep"><span>⇄ ${h('player.quickstepReady')}</span></div>`);
  if (game.channel) {
    const chSpell = spells.find(s => s.id === game.channel.spellId);
    banners.push(`<div class="banner-chip channel"><span>❂ ${h('player.channeling', { spell: chSpell?.name || '', turns: game.channel.turnsLeft })}</span><button id="cancel-channel-btn">${h('player.cancelChannel')}</button></div>`);
  }
  for (const buff of game.buffs || []) banners.push(`<div class="banner-chip"><span>✦ ${escapeHtml(buff.name)}</span><small>${buff.duration < 0 ? '∞' : buff.duration + 't'}</small></div>`);
  $('status-banners').innerHTML = banners.join('');
  if ($('cancel-channel-btn')) $('cancel-channel-btn').onclick = () => { cancelChannel(game); onRender(); };

  $('spell-count').textContent = String(spells.length).padStart(2, '0');
  $('spell-list').innerHTML = spells.map((s, i) => {
    const primaryTag = s.tags?.[0] || 'Arcane';
    const charges = game.charges[s.id] ?? 0;
    const canUse = game.status === 'playing' && (s.maxCharges === 0 || charges > 0) && (!s.hpCost || game.player.hp > s.hpCost);
    const meta = `${s.damage ? `${s.damage} DMG` : s.behavior.toUpperCase()} · R${s.range}${s.radius ? ` · A${s.radius}` : ''}${s.hpCost ? ` · -${s.hpCost}HP` : ''}${s.quickCast ? ' · ⚡QC' : ''}`;
    const chargeText = s.maxCharges === 0 ? '∞' : `${charges}/${s.maxCharges}`;
    const tooltip = cleanRw3Desc(s.desc);
    return `<button class="spell ${state.selected === s.id ? 'selected' : ''}" data-spell="${s.id}" data-tooltip="${escapeHtml(tooltip)}" aria-pressed="${state.selected === s.id}" ${canUse ? '' : 'disabled'}>
      <span class="spell-icon" style="border-color:${s.color}55">${tagIconSvg(primaryTag, 22)}</span>
      <span class="spell-text"><strong>${escapeHtml(s.name)}</strong><small>${escapeHtml(meta)}</small></span>
      <span class="spell-meta-right">${chargeText}${i < 9 ? `<br><span class="spell-hotkey">${i + 1}</span>` : ''}</span>
    </button>`;
  }).join('');

  $('allies-badge').textContent = (game.allies || []).length ? `${t('player.allies')}: ${game.allies.length}` : '';
  $('equipped-summary').innerHTML = equipmentSlots.map(slot => {
    const item = equippedLabel(game, slot);
    return `<div class="eq-slot-row"><span class="eq-slot-label">${slotIconSvg(slot, 15)}<span>${h(`slots.${slot.toLowerCase()}`)}</span></span><strong>${item ? escapeHtml(item) : '—'}</strong></div>`;
  }).join('');

  const turns = [...new Set(game.log.map(entry => entry.turn))];
  if (!turns.includes(state.logTurn)) state.logTurn = null;
  const index = state.logTurn === null ? 0 : turns.indexOf(state.logTurn);
  $('older-turn').disabled = index >= turns.length - 1;
  $('newer-turn').disabled = state.logTurn === null;
  const entries = state.logTurn === null ? game.log.slice(0, 14) : game.log.filter(e => e.turn === state.logTurn);
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
}

export function renderRw3Grimoire(state) {
  const game = state.game;
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

export function showRw3SpellDetail(state, spellId, onRender) {
  const game = state.game;
  state.detailRw3SpellId = spellId;
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
  if ($('dialog-learn-rw3')) $('dialog-learn-rw3').onclick = () => { if (learnRw3Spell(game, spellId)) { onRender(); showRw3SpellDetail(state, spellId, onRender); } };
  for (const btn of $('detail-content').querySelectorAll('[data-buy-upgrade]')) {
    btn.onclick = () => {
      const [sid, upid] = btn.dataset.buyUpgrade.split(':').map(Number);
      if (learnRw3Upgrade(game, sid, upid)) { onRender(); showRw3SpellDetail(state, sid, onRender); }
    };
  }
  if (!$('detail-dialog').open) $('detail-dialog').showModal();
}

export function renderRw3ForgeView(state) {
  const game = state.game;
  const craftable = craftableEquipment(game);
  const craftableNames = new Set(craftable.map(i => i.name));
  const equippedNames = new Set(Object.values(game.equipment).map(e => e.name));

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
      const item = equippedLabel(game, slot);
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
    const isEquipped = equippedNames.has(item.name);
    const recipeText = item.recipe.map(([tg, c]) => `${c}× ${tg}`).join(' + ');
    const bonuses = [...(item.bonuses || []), item.desc].filter(Boolean).map(cleanRw3Desc).join('\n');
    return `<div class="rw3-card ${canMake ? 'craftable-card' : ''} ${isEquipped ? 'learned-card' : ''}">
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
        <button class="${canMake ? 'primary' : ''}" data-forge-rw3="${escapeHtml(item.name)}" ${canMake ? '' : 'disabled'}>${isEquipped ? h('rw3.equippedSlot') : canMake ? h('rw3.forgeItem') : h('rw3.missingComponents')}</button>
      </div>
    </div>`;
  }).join('');
}

export function showUnit(state) {
  const unit = units.get($('unit-select').value);
  $('unit-detail').innerHTML = unit
    ? `<h3>${escapeHtml(unit.name)}</h3><p>${unit.hp} HP · ${unit.shields} SH · ${escapeHtml(unit.tags.join(' / '))}</p>${renderResistances(state.game, { resistances: unit.resists })}<dl>${unit.abilities.map(a => `<dt>${escapeHtml(a.name)}</dt><dd>${escapeHtml([a.damage ? a.damage + ' ' + a.damage_type.join('/') : '', a.range ? 'R' + a.range : '', cleanRw3Desc(a.desc)].filter(Boolean).join(' · '))}</dd>`).join('')}</dl>${unit.passives.map(p => `<p>${escapeHtml(cleanRw3Desc(p))}</p>`).join('')}`
    : h('bestiary.empty');
}

export function renderBestiary(state) {
  const list = $('unit-select');
  const previous = list.value;
  const defeatedOnly = $('unit-discovered').checked;
  const defeatedSet = defeatedOnly ? new Set(state.profile.defeated) : null;
  const query = $('unit-search').value;
  const matches = [...units.values()].filter(u =>
    (!defeatedSet || defeatedSet.has(u.name))
    && searchCatalogue(query, [u.name, ...u.tags, u.is_boss ? 'boss' : '', ...u.abilities.map(a => a.name)])
  );
  list.replaceChildren(...matches.map(u => new Option(u.name, u.name)));
  if (matches.some(u => u.name === previous)) list.value = previous;
  else list.selectedIndex = 0;
  showUnit(state);
}

export function showWardrobe(state) {
  const unlocked = new Set(state.profile.outfits);
  $('wardrobe-select').replaceChildren(...wardrobe.map(({ name, unlock }) => {
    const opt = new Option(unlocked.has(name) ? name : '🔒 ' + name, name);
    opt.title = unlock;
    opt.disabled = !unlocked.has(name);
    return opt;
  }));
  $('wardrobe-select').value = state.profile.selected;
  $('outfit-info').textContent = t('wardrobe.count', { count: state.profile.outfits.length, total: wardrobe.length });
}
