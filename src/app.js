import { getLocale, localeOptions, setLocale, t, translatePage } from './i18n/i18n.js';
import { grimoireSpellName } from './i18n/game-text.js';
import { availableSpells, createGame, restore, serialize } from './engine/index.js';
import { $, PROFILE_KEY, SAVE_KEY, loadProfile, loadStorageItem, saveStorageItem } from './ui/dom.js';
import { createBoardRenderer } from './ui/board-renderer.js';
import {
  initStaticIcons, populateFilters, renderBestiary, renderForgeSidebar,
  renderHeading, renderHud, renderInspection, renderForgeView,
  renderGrimoire, showSpellDetail, showWardrobe,
} from './ui/views.js';
import { createWikiController } from './ui/wiki.js';
import { bindInput } from './ui/input.js';

const loaded = loadStorageItem(SAVE_KEY);
const state = {
  game: restore(loaded.value) || createGame(),
  profile: loadProfile(),
  storageAvailable: loaded.ok,
  detailSpellId: null,
  inspectionTarget: null,
  logTurn: null,
  selected: null,
  hover: null,
  view: 'realm',
  showThreats: false,
};

const canvas = $('board');
const board = createBoardRenderer(canvas, state);
const wiki = createWikiController($('wiki-view'), { getState: () => state, standalone: false });

function saveProfile() {
  if (!saveStorageItem(PROFILE_KEY, JSON.stringify(state.profile))) state.storageAvailable = false;
}

function save() {
  if (!saveStorageItem(SAVE_KEY, serialize(state.game))) state.storageAvailable = false;
  $('save-state').textContent = t(state.storageAvailable ? 'save.available' : 'save.unavailable');
}

function updateHint(key) {
  const spell = availableSpells(state.game).find(s => s.id === state.selected);
  $('target-hint').textContent = state.game.deploying
    ? t('realm.deploy')
    : key ? t(key) : spell ? t('hint.target', { spell: grimoireSpellName(spell) }) : t('hint.move');
}

function render() {
  board.invalidate();
  renderHud(state, { onRender: render, onSaveProfile: saveProfile });
  renderForgeSidebar(state);
  if (state.view === 'grimoire') renderGrimoire(state);
  if (state.view === 'forge') renderForgeView(state);
  if (state.view === 'wiki') wiki.render();
  updateHint();
  renderInspection(state, state.inspectionTarget);
  board.draw();
  save();
}

let effectTimer = null;
function action(fn) {
  if (fn()) {
    render();
    clearTimeout(effectTimer);
    effectTimer = setTimeout(() => { state.game.effects = []; board.draw(); }, 350);
  } else {
    updateHint('hint.unavailable');
  }
}

function setView(next, options = {}) {
  state.view = next;
  document.body.classList.toggle('view-realm', next === 'realm');
  $('realm-view').hidden = next !== 'realm';
  $('grimoire-view').hidden = next !== 'grimoire';
  $('forge-view').hidden = next !== 'forge';
  $('wiki-view').hidden = next !== 'wiki';
  $('realm-tab').classList.toggle('active', next === 'realm');
  $('grimoire-tab').classList.toggle('active', next === 'grimoire');
  $('forge-tab').classList.toggle('active', next === 'forge');
  $('wiki-tab').classList.toggle('active', next === 'wiki');
  renderHeading(next);
  if (next === 'grimoire') renderGrimoire(state);
  else if (next === 'forge') renderForgeView(state);
  else if (next === 'wiki') {
    if (options.category) wiki.setCategory(options.category, options.query || '');
    else wiki.render();
  } else board.draw();
}

const language = $('language-select');
language.replaceChildren(...localeOptions.map(({ value, label }) => new Option(label, value)));
language.value = getLocale();
language.onchange = () => setLocale(language.value);

document.addEventListener('localechange', () => {
  initStaticIcons();
  populateFilters();
  if ($('bestiary-dialog').open) renderBestiary(state);
  if ($('guide-dialog').open) showWardrobe(state);
  renderHeading(state.view);
  render();
  if ($('detail-dialog').open && state.detailSpellId != null) showSpellDetail(state, state.detailSpellId, render);
});

bindInput(canvas, state, { render, draw: () => board.draw(), setView, action, saveProfile });
initStaticIcons();
document.body.classList.add('view-realm');
translatePage();
populateFilters();
renderHeading(state.view);
render();
board.startAnimationLoop();
