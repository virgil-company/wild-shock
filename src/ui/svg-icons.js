// Handcrafted & Compositional SVG Visual Asset Library for Wild Shock
// Memoized so repeated card/grid/canvas renders reuse prebuilt SVG markup strings.

import { TAG_COLORS, wrapAssetSvg } from './assets/palette.js';
import { unitAssetSvg } from './assets/units.js';
import { spellAssetSvg } from './assets/spells.js';
import { equipmentAssetSvg } from './assets/equipment.js';
import { PICKUP_ART, artifactAssetSvg, componentAssetSvg, pickupAssetSvg } from './assets/items.js';
import {
  WORLD_ENTITY_ART, cloudAssetSvg, mutatorAssetSvg, outfitAssetSvg,
  shrineAssetSvg, vaultAssetSvg, wizardPortraitAssetSvg,
} from './assets/world.js';

export { TAG_COLORS };

const svgCache = new Map();

function memo(key, builder) {
  let cached = svgCache.get(key);
  if (!cached) {
    cached = builder();
    svgCache.set(key, cached);
  }
  return cached;
}

function wrapSmallSvg(inner, size = 24, viewBox = '0 0 32 32', cls = 'ws-icon') {
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="${viewBox}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;
}

const SLOT_PATHS = {
  weapon: `<path d="M7 25L22 10" stroke="#e5c27b" stroke-width="2.4" stroke-linecap="round"/><path d="M19 6L26 6L26 13L21.5 11.5L19 6Z" fill="#7bd0ff" fill-opacity="0.35" stroke="#7bd0ff" stroke-width="1.8" stroke-linejoin="round"/><path d="M10 18L14 22" stroke="#ffdf9f" stroke-width="2" stroke-linecap="round"/>`,
  head: `<path d="M6 22L9 10L16 15L23 10L26 22H6Z" fill="#e5c27b" fill-opacity="0.28" stroke="#e5c27b" stroke-width="2" stroke-linejoin="round"/><circle cx="16" cy="18" r="2" fill="#7bd0ff"/><path d="M6 25H26" stroke="#ffdf9f" stroke-width="2" stroke-linecap="round"/>`,
  body: `<path d="M11 6L6 11L9 15L10 26H22L23 15L26 11L21 6L16 10L11 6Z" fill="#86efac" fill-opacity="0.2" stroke="#a7c4b0" stroke-width="1.9" stroke-linejoin="round"/><path d="M16 10V26" stroke="#e5c27b" stroke-width="1.5"/>`,
  feet: `<path d="M11 6H18V18L25 21V25H9V18L11 6Z" fill="#7bd0ff" fill-opacity="0.22" stroke="#7bd0ff" stroke-width="1.9" stroke-linejoin="round"/><path d="M7 11L11 10M6 15L10.5 14" stroke="#e5c27b" stroke-width="1.6" stroke-linecap="round"/>`,
  trinket: `<circle cx="16" cy="18" r="7.5" fill="#c084fc" fill-opacity="0.25" stroke="#e5c27b" stroke-width="2"/><polygon points="16,13 19.5,18 16,23 12.5,18" fill="#c084fc" stroke="#f3e8ff" stroke-width="1.2"/><path d="M12 10.5C12 7.5 20 7.5 20 10.5" stroke="#e5c27b" stroke-width="1.8" stroke-linecap="round"/>`,
};

const UI_PATHS = {
  brand: `<polygon points="16,2 28,9 28,23 16,30 4,23 4,9" fill="#e5c27b" fill-opacity="0.16" stroke="#e5c27b" stroke-width="2"/><path d="M17.5 6.5L10 17H15.5L14 25.5L22 14.5H16.5L17.5 6.5Z" fill="#ffdf9f"/>`,
  heart: `<path d="M16 26.5C16 26.5 6 20 6 12.5C6 8.9 8.9 6 12.3 6C14.3 6 15.5 7 16 8.2C16.5 7 17.7 6 19.7 6C23.1 6 26 8.9 26 12.5C26 20 16 26.5 16 26.5Z" fill="#f87171" fill-opacity="0.3" stroke="#f87171" stroke-width="2" stroke-linejoin="round"/>`,
  shield: `<path d="M16 4L25 8V15.5C25 21.5 21 25.5 16 28C11 25.5 7 21.5 7 15.5V8L16 4Z" fill="#7bd0ff" fill-opacity="0.25" stroke="#7bd0ff" stroke-width="2" stroke-linejoin="round"/>`,
  ward: `<polygon points="16,4 26,10 26,22 16,28 6,22 6,10" fill="#e5c27b" fill-opacity="0.22" stroke="#e5c27b" stroke-width="2"/>`,
  sp: `<path d="M16 4L19 13L28 16L19 19L16 28L13 19L4 16L13 13Z" fill="#ffdf9f" stroke="#e5c27b" stroke-width="1.4"/>`,
  skull: `<path d="M8 14C8 9 11.5 6 16 6C20.5 6 24 9 24 14C24 17.2 22.5 19.5 20.5 21V25H11.5V21C9.5 19.5 8 17.2 8 14Z" fill="#f87171" fill-opacity="0.22" stroke="#f87171" stroke-width="2" stroke-linejoin="round"/><circle cx="13" cy="14.5" r="2" fill="#f87171"/><circle cx="19" cy="14.5" r="2" fill="#f87171"/><path d="M14 25V22M18 25V22" stroke="#f87171" stroke-width="1.6"/>`,
  wait: `<circle cx="16" cy="16" r="10" stroke="#e5c27b" stroke-width="2"/><path d="M16 10V16L20 19" stroke="#ffdf9f" stroke-width="2" stroke-linecap="round"/>`,
  threat: `<circle cx="16" cy="16" r="9.5" stroke="#f87171" stroke-width="2"/><circle cx="16" cy="16" r="4" fill="#f87171" fill-opacity="0.4" stroke="#f87171" stroke-width="1.6"/><path d="M16 3V7M16 25V29M3 16H7M25 16H29" stroke="#f87171" stroke-width="1.8" stroke-linecap="round"/>`,
};

function buildTagInner(tag) {
  const c = TAG_COLORS[tag] || '#e5c27b';
  switch (tag) {
    case 'Fire': return `<path d="M16 4C16 4 24 11 24 18.5C24 23.5 20.4 27.5 16 27.5C11.6 27.5 8 23.5 8 18.5C8 14.5 10.5 11.5 12 9.5C12 12 13.5 13 14.5 13C13.5 10 15 6.5 16 4Z" fill="${c}" fill-opacity="0.25" stroke="${c}" stroke-width="2" stroke-linejoin="round"/><path d="M16 14C16 14 20 17.5 20 21C20 23.2 18.2 25 16 25C13.8 25 12 23.2 12 21C12 18.5 14.2 16.5 16 14Z" fill="#fde68a"/>`;
    case 'Ice': return `<path d="M16 4V28M5.6 10L26.4 22M26.4 10L5.6 22" stroke="${c}" stroke-width="2" stroke-linecap="round"/><path d="M13 7L16 10L19 7M13 25L16 22L19 25M8 14L11 13L10 10M24 18L21 19L22 22M24 14L21 13L22 10M8 18L11 19L10 22" stroke="#e0f2fe" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16" cy="16" r="3" fill="${c}"/>`;
    case 'Lightning': return `<path d="M18 4L8 17.5H15.5L13.5 28L24 14H16.5L18 4Z" fill="${c}" fill-opacity="0.3" stroke="${c}" stroke-width="2" stroke-linejoin="round"/><path d="M17.2 7.5L11.5 16H16.5L15.2 23.5L21 15.5H16L17.2 7.5Z" fill="#fef9c3"/>`;
    case 'Dark': return `<path d="M21.5 22.5A10 10 0 1 1 13.5 6.5A8 8 0 1 0 21.5 22.5Z" fill="${c}" fill-opacity="0.3" stroke="${c}" stroke-width="2" stroke-linejoin="round"/><circle cx="22" cy="10" r="2" fill="#e9d5ff"/><path d="M22 6V14M18 10H26" stroke="#e9d5ff" stroke-width="1.2" stroke-linecap="round"/>`;
    case 'Holy': return `<circle cx="16" cy="16" r="6" fill="${c}" fill-opacity="0.35" stroke="${c}" stroke-width="2"/><path d="M16 4V8M16 24V28M4 16H8M24 16H28M7.5 7.5L10.5 10.5M21.5 21.5L24.5 24.5M24.5 7.5L21.5 10.5M10.5 21.5L7.5 24.5" stroke="${c}" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="16" r="2.5" fill="#fffbeb"/>`;
    case 'Nature': return `<path d="M25 7C14 7 7 13 7 25C19 25 25 18 25 7Z" fill="${c}" fill-opacity="0.25" stroke="${c}" stroke-width="2" stroke-linejoin="round"/><path d="M7 25C12 20 17 15 24 8M13 19V14M17 15H22" stroke="${c}" stroke-width="1.8" stroke-linecap="round"/>`;
    case 'Blood': return `<path d="M16 5C16 5 24 14.2 24 19.5C24 23.9 20.4 27.5 16 27.5C11.6 27.5 8 23.9 8 19.5C8 14.2 16 5 16 5Z" fill="${c}" fill-opacity="0.32" stroke="${c}" stroke-width="2" stroke-linejoin="round"/><path d="M12.5 19.5C12.5 21.5 14 23 16 23" stroke="#fecaca" stroke-width="1.8" stroke-linecap="round"/>`;
    case 'Metallic': return `<polygon points="16,4 26,10 26,22 16,28 6,22 6,10" fill="${c}" fill-opacity="0.2" stroke="${c}" stroke-width="2" stroke-linejoin="round"/><polygon points="16,9 21.5,12.2 21.5,19.8 16,23 10.5,19.8 10.5,12.2" fill="${c}" fill-opacity="0.35" stroke="#f8fafc" stroke-width="1.3"/>`;
    case 'Chaos': return `<circle cx="16" cy="16" r="10" stroke="${c}" stroke-width="1.8" stroke-dasharray="4 2"/><path d="M16 6L18.5 13.5L26 16L18.5 18.5L16 26L13.5 18.5L6 16L13.5 13.5Z" fill="${c}" fill-opacity="0.35" stroke="#fde047" stroke-width="1.5"/><circle cx="16" cy="16" r="2.5" fill="#ffffff"/>`;
    case 'Dragon': return `<path d="M7 23C8 15 13 10 21 8L18 13L25 14L20 19L24 24C18 25 12 25 7 23Z" fill="${c}" fill-opacity="0.28" stroke="${c}" stroke-width="2" stroke-linejoin="round"/><circle cx="16" cy="15" r="1.8" fill="#fef08a"/>`;
    case 'Slime': return `<path d="M6 21C6 14 10.5 8 16 8C21.5 8 26 14 26 21C26 24.5 22.5 26 16 26C9.5 26 6 24.5 6 21Z" fill="${c}" fill-opacity="0.3" stroke="${c}" stroke-width="2"/><circle cx="12.5" cy="18" r="1.6" fill="#ecfccb"/><circle cx="19.5" cy="18" r="1.6" fill="#ecfccb"/><path d="M13 22Q16 23.5 19 22" stroke="#ecfccb" stroke-width="1.5" stroke-linecap="round"/>`;
    case 'Eye': return `<path d="M4 16C7.5 10 11.5 8 16 8C20.5 8 24.5 10 28 16C24.5 22 20.5 24 16 24C11.5 24 7.5 22 4 16Z" fill="${c}" fill-opacity="0.2" stroke="${c}" stroke-width="2"/><circle cx="16" cy="16" r="4.5" fill="${c}" fill-opacity="0.45" stroke="#e0f2fe" stroke-width="1.6"/><circle cx="16" cy="16" r="2" fill="#ffffff"/>`;
    case 'Orb': return `<circle cx="16" cy="16" r="10" fill="${c}" fill-opacity="0.25" stroke="${c}" stroke-width="2"/><ellipse cx="16" cy="16" rx="10" ry="4" transform="rotate(-25 16 16)" stroke="#c7d2fe" stroke-width="1.4"/><circle cx="12.5" cy="12" r="2" fill="#ffffff" opacity="0.8"/>`;
    case 'Sorcery': return `<path d="M7 25L21 11" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/><path d="M22 6L23.2 9.2L26.5 10.5L23.2 11.8L22 15L20.8 11.8L17.5 10.5L20.8 9.2Z" fill="#ffdf9f"/>`;
    case 'Conjuration': return `<circle cx="16" cy="16" r="10.5" stroke="${c}" stroke-width="1.8" stroke-dasharray="3 2"/><polygon points="16,7 24,22 8,22" fill="${c}" fill-opacity="0.25" stroke="${c}" stroke-width="1.8" stroke-linejoin="round"/><circle cx="16" cy="17" r="2.2" fill="#d1fae5"/>`;
    case 'Enchantment': return `<rect x="8" y="6" width="16" height="20" rx="2.5" fill="${c}" fill-opacity="0.2" stroke="${c}" stroke-width="1.9"/><path d="M12 12H20M12 16H20M12 20H17" stroke="#fae8ff" stroke-width="1.7" stroke-linecap="round"/>`;
    case 'Translocation': return `<path d="M7 12H23M19 8L23 12L19 16" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M25 20H9M13 16L9 20L13 24" stroke="#a5f3fc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
    case 'Ritual': return `<circle cx="16" cy="16" r="10" stroke="${c}" stroke-width="1.8"/><circle cx="16" cy="16" r="5" fill="${c}" fill-opacity="0.28" stroke="${c}" stroke-width="1.5"/><path d="M16 4V8M16 24V28M4 16H8M24 16H28" stroke="#fef3c7" stroke-width="1.8" stroke-linecap="round"/>`;
    case 'Word': return `<path d="M9 7H23V25L16 21.5L9 25V7Z" fill="${c}" fill-opacity="0.25" stroke="${c}" stroke-width="2" stroke-linejoin="round"/><path d="M13 12H19M16 12V18" stroke="#ffe4e6" stroke-width="1.8" stroke-linecap="round"/>`;
    case 'Physical': return `<path d="M8 24L22 10M18 8L24 8L24 14" stroke="${c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 17L15 21" stroke="#e5c27b" stroke-width="2" stroke-linecap="round"/>`;
    case 'Poison': return `<path d="M16 5C16 5 23 13 23 19C23 23 20 26.5 16 26.5C12 26.5 9 23 9 19C9 13 16 5 16 5Z" fill="${c}" fill-opacity="0.28" stroke="${c}" stroke-width="2"/><circle cx="13.5" cy="18.5" r="1.5" fill="#ecfccb"/><circle cx="18.5" cy="18.5" r="1.5" fill="#ecfccb"/><path d="M14 22.5H18" stroke="#ecfccb" stroke-width="1.5" stroke-linecap="round"/>`;
    case 'Construct': return `<rect x="7" y="7" width="18" height="18" rx="3" fill="${c}" fill-opacity="0.22" stroke="${c}" stroke-width="2"/><circle cx="12.5" cy="14" r="1.6" fill="#7bd0ff"/><circle cx="19.5" cy="14" r="1.6" fill="#7bd0ff"/><path d="M11 20H21" stroke="#cbd5e1" stroke-width="1.8" stroke-linecap="round"/>`;
    case 'Demon': return `<path d="M9 12L6 5L13 10M23 12L26 5L19 10" stroke="${c}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16" cy="18" r="8" fill="${c}" fill-opacity="0.28" stroke="${c}" stroke-width="2"/><circle cx="13" cy="17" r="1.8" fill="#fef08a"/><circle cx="19" cy="17" r="1.8" fill="#fef08a"/>`;
    case 'Glass': return `<polygon points="16,4 25,13 16,28 7,13" fill="${c}" fill-opacity="0.22" stroke="${c}" stroke-width="2" stroke-linejoin="round"/><path d="M16 4L19 13L16 28M7 13H25" stroke="#ecfeff" stroke-width="1.2" opacity="0.8"/>`;
    case 'Living': return `<circle cx="16" cy="16" r="9.5" fill="${c}" fill-opacity="0.2" stroke="${c}" stroke-width="2"/><path d="M16 10V22M11 16H21" stroke="#dcfce7" stroke-width="2" stroke-linecap="round"/>`;
    case 'Spider': return `<circle cx="16" cy="17" r="5.5" fill="${c}" fill-opacity="0.32" stroke="${c}" stroke-width="2"/><circle cx="16" cy="10" r="3" fill="${c}" fill-opacity="0.4" stroke="${c}" stroke-width="1.6"/><path d="M11 14L5 10M10.5 17H4M11 20L6 24M21 14L27 10M21.5 17H28M21 20L26 24" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/>`;
    case 'Undead': return `<path d="M9 14C9 9.5 12 6.5 16 6.5C20 6.5 23 9.5 23 14C23 17 21.5 19 20 20.5V24.5H12V20.5C10.5 19 9 17 9 14Z" fill="${c}" fill-opacity="0.2" stroke="${c}" stroke-width="2" stroke-linejoin="round"/><circle cx="13.2" cy="14.5" r="1.9" fill="#a78bfa"/><circle cx="18.8" cy="14.5" r="1.9" fill="#a78bfa"/>`;
    default: return `<path d="M16 4L19.5 12.5L28 16L19.5 19.5L16 28L12.5 19.5L4 16L12.5 12.5L16 4Z" fill="${c}" fill-opacity="0.28" stroke="${c}" stroke-width="1.9" stroke-linejoin="round"/><circle cx="16" cy="16" r="3.2" fill="#f3e8ff"/>`;
  }
}

export function wizardPortraitSvg(outfitName = 'Wizard') {
  return memo(`portrait:${outfitName}`, () => wizardPortraitAssetSvg(outfitName));
}

export function tagIconSvg(tag, size = 22) {
  return memo(`tag:${tag}:${size}`, () => wrapSmallSvg(buildTagInner(tag), size));
}

export function slotIconSvg(slot, size = 20) {
  const s = String(slot || '').toLowerCase();
  return memo(`slot:${s}:${size}`, () => wrapSmallSvg(SLOT_PATHS[s] || SLOT_PATHS.trinket, size));
}

export function uiIconSvg(name, size = 18) {
  return memo(`ui:${name}:${size}`, () => wrapSmallSvg(UI_PATHS[name] || UI_PATHS.sp, size));
}

export function unitIconSvg(unit, size = 34) {
  if (!unit) return entityIconSvg('empty', size);
  const name = typeof unit === 'string' ? unit : (unit.name || unit.species || 'unit');
  const key = `unit:${name}:${unit.is_boss ? 'b' : ''}:${unit.is_companion ? 'c' : ''}:${unit.shields || 0}:${size}`;
  return memo(key, () => unitAssetSvg(unit, size));
}

export function spellIconSvg(spell, size = 28) {
  if (!spell) return tagIconSvg('Arcane', size);
  const key = `spell:${spell.id ?? spell.name}:${size}`;
  return memo(key, () => spellAssetSvg(spell, size));
}

export function equipmentIconSvg(item, size = 28) {
  if (!item) return slotIconSvg('trinket', size);
  const key = `eq:${item.name || item}:${item.slot || ''}:${size}`;
  return memo(key, () => equipmentAssetSvg(item, size));
}

export function componentIconSvg(component, size = 28) {
  const name = typeof component === 'string' ? component : (component?.name || 'component');
  const key = `comp:${name}:${component?.rare ? 1 : 0}:${size}`;
  return memo(key, () => componentAssetSvg(component, size));
}

export function artifactIconSvg(artifact, size = 28) {
  const id = typeof artifact === 'string' ? artifact : (artifact?.id || 'prism');
  return memo(`art:${id}:${size}`, () => artifactAssetSvg(artifact, size));
}

export function pickupIconSvg(kind, size = 28) {
  return memo(`pickup:${kind}:${size}`, () => pickupAssetSvg(kind, size));
}

export function shrineIconSvg(type, size = 26) {
  return memo(`shrine:${type}:${size}`, () => shrineAssetSvg(type, size));
}

export function cloudIconSvg(cloudOrColor = 'blizzard', size = 28) {
  const id = typeof cloudOrColor === 'string' ? cloudOrColor : (cloudOrColor?.id || cloudOrColor?.type || cloudOrColor?.color || 'blizzard');
  return memo(`cloud:${id}:${size}`, () => cloudAssetSvg(cloudOrColor, size));
}

export function vaultIconSvg(name, size = 28) {
  return memo(`vault:${name}:${size}`, () => vaultAssetSvg(name, size));
}

export function mutatorIconSvg(id, size = 28) {
  return memo(`mutator:${id}:${size}`, () => mutatorAssetSvg(id, size));
}

export function outfitIconSvg(name, size = 30) {
  return memo(`outfit:${name}:${size}`, () => outfitAssetSvg(name, size));
}

export function entityIconSvg(kind, size = 36) {
  if (PICKUP_ART[kind]) return pickupIconSvg(kind, size);
  if (WORLD_ENTITY_ART[kind]) {
    return memo(`world-ent:${kind}:${size}`, () => wrapAssetSvg(WORLD_ENTITY_ART[kind], size, 'ws-icon', kind));
  }
  if (kind === 'ally') return pickupIconSvg('companion', size);
  if (kind === 'boss') return unitIconSvg({ name: 'Bafflement, Demon King', is_boss: true }, size);
  if (kind === 'mordred') return unitIconSvg({ name: 'Mordred', is_boss: true, boss_kind: 'mordred' }, size);
  if (kind === 'imp') return unitIconSvg({ name: 'Fire Imp', tags: ['Demon', 'Fire'] }, size);
  if (kind === 'knight') return unitIconSvg({ name: 'Void Knight', tags: ['Metallic', 'Dark'] }, size);
  if (kind === 'eye') return unitIconSvg({ name: 'Floating Eyeball', tags: ['Eye', 'Arcane'] }, size);
  if (kind === 'moth') return unitIconSvg({ name: 'Glass Butterfly', tags: ['Glass', 'Living'], flying: true }, size);
  if (kind === 'component') return componentIconSvg({ name: 'Arcane Mote', tags: ['Arcane'] }, size);
  if (kind === 'vault') return vaultIconSvg('Souls', size);
  if (kind === 'mutator') return mutatorIconSvg('vulnerability', size);
  if (kind === 'outfit') return outfitIconSvg('Wizard', size);
  if (kind === 'artifact') return artifactIconSvg('prism', size);
  if (kind === 'cloud') return cloudIconSvg('blizzard', size);
  return memo(`world-ent:empty:${size}`, () => wrapAssetSvg(WORLD_ENTITY_ART.empty, size, 'ws-icon', 'empty'));
}
