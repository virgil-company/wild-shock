import en from './locales/en.js';
import ptBR from './locales/pt-BR.js';
import es from './locales/es.js';

// Register a complete locale file here to make it available in the menu.
const registry = {
  en: { label: 'EN', messages: en },
  'pt-BR': { label: 'PT-BR', messages: ptBR },
  es: { label: 'ES', messages: es },
};
export const locales = Object.fromEntries(Object.entries(registry).map(([value, { messages }]) => [value, messages]));
export const localeOptions = Object.entries(registry).map(([value, { label }]) => ({ value, label }));
const normalizeLocale = value => Object.hasOwn(locales, value) ? value : 'en';
let locale = 'en';
try { locale = normalizeLocale(globalThis.window?.localStorage?.getItem('wild-shock-locale')); } catch { /* Storage may be disabled. */ }
export const getLocale = () => locale;

// Parameters can contain translation references so saved events stay language neutral.
export function t(key, params = {}) {
  const template = locales[locale][key] ?? en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (placeholder, name) => {
    if (!Object.hasOwn(params, name)) return placeholder;
    const value = params[name];
    return value && typeof value === 'object' && typeof value.key === 'string'
      ? t(value.key, value.params)
      : String(value);
  });
}
export function setLocale(value) {
  locale = normalizeLocale(value);
  try { globalThis.window?.localStorage?.setItem('wild-shock-locale', locale); } catch { /* Switching works without storage. */ }
  if (typeof document !== 'undefined') {
    translatePage();
    document.dispatchEvent(new Event('localechange'));
  }
}

const translatedAttributes = { 'aria-label': 'aria-label', tooltip: 'data-tooltip', placeholder: 'placeholder', title: 'title', alt: 'alt', content: 'content' };
// Only elements explicitly marked with keys are translated. Text, HTML, CSS and
// game identifiers are never searched or rewritten to guess a translation.
export function translatePage(root = document) {
  document.documentElement.lang = locale;
  for (const element of root.querySelectorAll('[data-i18n]')) {
    element.textContent = t(element.dataset.i18n);
  }
  for (const [name, attribute] of Object.entries(translatedAttributes)) {
    const marker = `data-i18n-${name}`;
    for (const element of root.querySelectorAll(`[${marker}]`)) {
      element.setAttribute(attribute, t(element.getAttribute(marker)));
    }
  }
  const language = document.getElementById('language-select');
  if (language) language.value = locale;
}
