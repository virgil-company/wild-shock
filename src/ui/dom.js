import { t } from '../i18n/i18n.js';

export const SAVE_KEY = 'wild-shock-v2';
export const PROFILE_KEY = 'wild-shock-wardrobe-v1';

const domCache = new Map();
export function $(id) {
  let el = domCache.get(id);
  if (!el || !el.isConnected) {
    el = document.getElementById(id);
    if (el) domCache.set(id, el);
  }
  return el;
}

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = value => String(value).replace(/[&<>"']/g, char => HTML_ESCAPES[char]);
export const h = (key, params) => escapeHtml(t(key, params));
export const cleanRw3Desc = text => String(text || '').replace(/\[([^:\]]+)(?::[^\]]+)?\]/g, '$1');

export function loadStorageItem(key) {
  try {
    return { ok: true, value: localStorage.getItem(key) };
  } catch {
    return { ok: false, value: null };
  }
}

export function saveStorageItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function loadProfile() {
  const base = { outfits: ['Wizard'], selected: 'Wizard', mutators: [], defeated: [] };
  try {
    const stored = JSON.parse(localStorage.getItem(PROFILE_KEY));
    if (Array.isArray(stored?.outfits)) return { ...base, ...stored };
  } catch { /* The current journey remains playable without profile storage. */ }
  return base;
}
