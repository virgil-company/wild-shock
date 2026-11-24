import { componentName, equipmentName } from '../i18n/game-text.js';
import { t } from '../i18n/i18n.js';
import {
  SIZE, availableSpells, cast, createGame, deploy, distance, drink, forge,
  learnRw3Spell, move, rerollRifts, shortestPath, useShrine, wait,
} from '../engine/index.js';
import {
  canForge, componentByName, equipmentByName, findMatchingComponents, getEquipmentModifiers,
} from '../rules/rw3.js';
import { $ } from './dom.js';
import {
  renderBestiary, renderForgeSidebar, renderInspection, renderRw3ForgeView,
  renderRw3Grimoire, renderShrineResult, showRw3SpellDetail, showUnit, showWardrobe,
} from './views.js';

export function bindInput(canvas, state, controllers) {
  const { render, draw, setView, action, saveProfile } = controllers;

  $('shrine-special-select').onchange = () => renderShrineResult(state.game);
  $('bestiary-button').onclick = () => setView('wiki', { category: 'monsters' });
  $('unit-search').oninput = $('unit-discovered').onchange = () => renderBestiary(state);
  $('unit-select').onchange = () => showUnit(state);

  $('older-turn').onclick = () => {
    const turns = [...new Set(state.game.log.map(e => e.turn))];
    state.logTurn = turns[(state.logTurn == null ? 0 : turns.indexOf(state.logTurn)) + 1];
    render();
  };
  $('newer-turn').onclick = () => {
    const turns = [...new Set(state.game.log.map(e => e.turn))];
    const idx = turns.indexOf(state.logTurn);
    state.logTurn = idx <= 1 ? null : turns[idx - 1];
    render();
  };

  $('shrine-activate-button').onclick = () => action(() => {
    const val = $('shrine-special-select').value;
    const result = $('shrine-result').value;
    return useShrine(state.game, { component: val, spellId: val, slot: val, result, tag: result });
  });

  $('threat-button').onclick = () => {
    state.showThreats = !state.showThreats;
    renderForgeSidebar(state);
    draw();
  };

  $('realm-tab').onclick = () => setView('realm');
  $('grimoire-tab').onclick = $('grimoire-cta').onclick = () => setView('grimoire');
  $('forge-tab').onclick = $('open-forge-cta').onclick = () => setView('forge');
  if ($('wiki-tab')) $('wiki-tab').onclick = () => setView('wiki');

  $('guide-button').onclick = () => { showWardrobe(state); $('guide-dialog').showModal(); };
  $('wardrobe-select').onchange = () => { state.profile.selected = $('wardrobe-select').value; saveProfile(); render(); };
  $('reroll-rifts').onclick = () => action(() => rerollRifts(state.game));
  $('reward-dialog').oncancel = event => event.preventDefault();

  $('new-mode').onchange = () => {
    $('mutator-options').hidden = $('new-mode').value !== 'custom';
    $('new-seed').disabled = $('new-mode').value === 'weekly';
  };
  for (const el of $('mutator-options').querySelectorAll('input')) {
    el.checked = state.profile.mutators?.includes(el.value);
  }
  $('new-button').onclick = () => $('new-dialog').showModal();
  $('cancel-new').onclick = () => $('new-dialog').close();
  $('confirm-new').onclick = () => {
    const input = $('new-seed');
    if (!input.checkValidity()) { input.reportValidity(); return; }
    const mode = $('new-mode').value || 'standard';
    if (state.game.mode === 'trial-improviser' && state.game.status === 'playing') state.profile.improviserWins = 0;
    state.profile.mutators = [...$('mutator-options').querySelectorAll(':checked')].map(el => el.value);
    saveProfile();
    state.game = createGame(input.value ? Number(input.value) : undefined, { mode, selectedMutators: state.profile.mutators });
    state.logTurn = null;
    state.selected = null;
    state.hover = null;
    state.inspectionTarget = null;
    $('new-dialog').close();
    setView('realm');
    render();
  };

  for (const button of document.querySelectorAll('.close-dialog')) {
    button.onclick = () => button.closest('dialog').close();
  }

  $('spell-list').onclick = event => {
    const button = event.target.closest('[data-spell]');
    if (!button || button.disabled) return;
    state.selected = state.selected === button.dataset.spell ? null : button.dataset.spell;
    render();
  };

  $('rw3-spell-search').oninput = $('rw3-tag-filter').onchange = $('rw3-level-filter').onchange = $('rw3-status-filter').onchange = () => renderRw3Grimoire(state);
  $('rw3-spell-grid').onclick = event => {
    const learnBtn = event.target.closest('[data-learn-rw3]');
    if (learnBtn && !learnBtn.disabled) { if (learnRw3Spell(state.game, Number(learnBtn.dataset.learnRw3))) render(); return; }
    const inspectBtn = event.target.closest('[data-inspect-rw3]');
    if (inspectBtn) showRw3SpellDetail(state, Number(inspectBtn.dataset.inspectRw3), render);
  };

  $('rw3-eq-search').oninput = $('rw3-slot-filter').onchange = $('rw3-eq-status-filter').onchange = () => renderRw3ForgeView(state);
  $('rw3-eq-grid').onclick = event => {
    const btn = event.target.closest('[data-forge-rw3]');
    if (!btn || btn.disabled) return;
    const name = btn.dataset.forgeRw3;
    const item = equipmentByName.get(name);
    const chosen = findMatchingComponents(state.game.rw3Components, item);
    if (!chosen) return;
    const list = $('ingredient-choices');
    $('ingredient-title').textContent = equipmentName(name);
    $('ingredient-recipe').textContent = item.recipe.map(([tag, count]) => count + ' × ' + tag).join(' + ');
    const options = [...new Set(state.game.rw3Components)];
    list.replaceChildren(...Array.from({ length: item.recipe_cost }, (_, i) => {
      const select = document.createElement('select');
      select.setAttribute('aria-label', t('forge.ingredient', { n: i + 1 }));
      select.replaceChildren(new Option('—', ''), ...options.map(c => new Option(componentName(c) + ' · ' + componentByName.get(c).tags.join('/'), c)));
      select.value = chosen[i] || '';
      return select;
    }));
    const selection = () => [...list.children].map(el => el.value).filter(Boolean);
    list.onchange = () => { $('craft-chosen').disabled = !canForge(state.game, name, selection()); };
    list.onchange();
    $('craft-chosen').onclick = () => { if (forge(state.game, name, selection())) { $('ingredients-dialog').close(); render(); } };
    $('ingredients-dialog').showModal();
  };

  $('wait-button').onclick = () => action(() => wait(state.game));
  $('potion-button').onclick = () => action(() => drink(state.game));
  for (const button of document.querySelectorAll('[data-move]')) {
    button.onclick = () => action(() => move(state.game, ...button.dataset.move.split(',').map(Number)));
  }

  function tileAt(event) {
    const bounds = canvas.getBoundingClientRect();
    return {
      x: Math.min(SIZE - 1, Math.max(0, Math.floor((event.clientX - bounds.left) / bounds.width * SIZE))),
      y: Math.min(SIZE - 1, Math.max(0, Math.floor((event.clientY - bounds.top) / bounds.height * SIZE))),
    };
  }

  function walkTo(target) {
    const game = state.game;
    const mods = getEquipmentModifiers(game);
    if (game.status !== 'playing' || (game.tiles[target.y]?.[target.x] !== 0 && !(mods.flying && game.tiles[target.y]?.[target.x] === 2))) return false;
    if (game.mode !== 'standard' && distance(game.player, target) === 1) return move(game, target.x - game.player.x, target.y - game.player.y);
    let moved = false;
    for (let steps = 0; steps < SIZE * SIZE && game.status === 'playing' && distance(game.player, target) !== 0; steps++) {
      const path = shortestPath(game, game.player, target, mods.flying);
      if (!path?.length) break;
      const next = path[0];
      const before = { ...game.player };
      if (!move(game, next.x - game.player.x, next.y - game.player.y)) break;
      moved = true;
      if (game.deploying || game.pendingReward || distance(before, game.player) !== 1) break;
    }
    return moved;
  }

  // Only inspect & redraw when the hovered tile actually changes (avoids work on sub-tile mouse motion).
  canvas.onpointermove = event => {
    const next = tileAt(event);
    if (state.hover && state.hover.x === next.x && state.hover.y === next.y) return;
    state.hover = next;
    renderInspection(state, next);
    draw();
  };
  canvas.onpointerleave = () => {
    if (!state.hover) return;
    state.hover = null;
    draw();
  };
  canvas.onclick = event => {
    const target = tileAt(event);
    if (state.game.deploying) { state.selected = null; action(() => deploy(state.game, target)); }
    else if (state.selected) action(() => cast(state.game, state.selected, target));
    else if (distance(state.game.player, target) > 0) action(() => walkTo(target));
    else renderInspection(state, target);
  };

  const KEYPAD_DIAGONALS = { Numpad1: [-1, 1], Numpad3: [1, 1], Numpad7: [-1, -1], Numpad9: [1, -1] };
  const CARDINAL_KEYS = {
    arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1],
    arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0],
  };

  document.addEventListener('keydown', event => {
    if (document.querySelector('dialog[open]') || ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName) || event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === '[' || key === ']') {
      const speeds = [0.5, 1, 2, 4];
      const index = speeds.indexOf(state.profile.speed || 1) + (key === ']' ? 1 : -1);
      state.profile.speed = speeds[Math.max(0, Math.min(speeds.length - 1, index))];
      saveProfile();
      $('target-hint').textContent = t('realm.animationSpeed', { speed: state.profile.speed });
      return;
    }
    if (key === 't' || key === 'g') { event.preventDefault(); setView(state.view === 'grimoire' ? 'realm' : 'grimoire'); return; }
    if (key === 'f') { event.preventDefault(); setView(state.view === 'forge' ? 'realm' : 'forge'); return; }
    if (key === 'b') { event.preventDefault(); setView(state.view === 'wiki' ? 'realm' : 'wiki'); return; }
    if (state.view !== 'realm') return;
    if (state.game.deploying && key === 'enter') { event.preventDefault(); action(() => deploy(state.game, state.hover || state.game.player)); return; }
    if (state.game.mode !== 'standard' && KEYPAD_DIAGONALS[event.code]) { event.preventDefault(); action(() => move(state.game, ...KEYPAD_DIAGONALS[event.code])); return; }
    if (CARDINAL_KEYS[key]) { event.preventDefault(); action(() => move(state.game, ...CARDINAL_KEYS[key])); }
    else if (key === ' ' && event.target.tagName !== 'BUTTON') { event.preventDefault(); action(() => wait(state.game)); }
    else if (key === 'y') { state.showThreats = !state.showThreats; renderForgeSidebar(state); draw(); }
    else if (key === 'q' && state.game.lastCast && availableSpells(state.game).some(s => s.id === state.game.lastCast.spellId)) {
      state.selected = state.game.lastCast.spellId;
      state.hover = { ...state.game.lastCast.target };
      renderInspection(state, state.hover);
      render();
    } else if (key === 'enter' && state.selected && state.hover && event.target.tagName !== 'BUTTON') {
      event.preventDefault();
      action(() => cast(state.game, state.selected, state.hover));
    } else if (key === 'p') action(() => drink(state.game));
    else if (key === 'escape') { state.selected = null; render(); }
    else if (/^[1-9]$/.test(key)) {
      const spell = availableSpells(state.game)[Number(key) - 1];
      if (spell) { state.selected = spell.id; render(); }
    }
  });
}
