import { getLocale, localeOptions, setLocale, translatePage } from './i18n/i18n.js';
import { restore } from './engine/index.js';
import { $, SAVE_KEY, loadProfile, loadStorageItem } from './ui/dom.js';
import { uiIconSvg } from './ui/svg-icons.js';
import { createWikiController } from './ui/wiki.js';

const loaded = loadStorageItem(SAVE_KEY);
const state = {
  game: restore(loaded.value),
  profile: loadProfile(),
};

const brandIcon = $('brand-mark-icon');
if (brandIcon) brandIcon.innerHTML = uiIconSvg('brand', 34);

const language = $('language-select');
language.replaceChildren(...localeOptions.map(({ value, label }) => new Option(label, value)));
language.value = getLocale();
language.onchange = () => setLocale(language.value);

const wiki = createWikiController($('wiki-root'), {
  getState: () => state,
  standalone: true,
});

const params = new URLSearchParams(window.location.search);
const initialCategory = params.get('cat') || 'monsters';
const initialQuery = params.get('q') || '';

document.addEventListener('localechange', () => {
  translatePage();
  wiki.render();
});

translatePage();
wiki.setCategory(initialCategory, initialQuery);
