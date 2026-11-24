// Unique 64x64 visual assets for all 94 Components, 6 Artifacts, 6 Realm Pickups, and 3 Basic Materials.

import { elementalFlourish, hashString, resolvePalette, uniqueBackdrop, wrapAssetSvg } from './palette.js';

// ==================== 6 BESPOKE ARTIFACTS ====================
const ARTIFACT_ART = {
  stormglass: `
    <circle cx="32" cy="32" r="27" fill="#1e1b4b" fill-opacity="0.5"/>
    <line x1="14" y1="52" x2="45" y2="17" stroke="#bae6fd" stroke-width="4.4" stroke-linecap="round"/>
    <line x1="14" y1="52" x2="45" y2="17" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/>
    <polygon points="46,8 55,17 46,27 37,17" fill="#38bdf8" fill-opacity="0.6" stroke="#facc15" stroke-width="2"/>
    <polyline points="21,21 29,25 24,30 33,34" stroke="#facc15" stroke-width="2.2" stroke-linecap="round"/>`,

  cinderheart: `
    <circle cx="32" cy="32" r="27" fill="#431407" fill-opacity="0.52"/>
    <path d="M32 53C32 53 12 40 12 25C12 17 18 11 25 11C29 11 31 13.5 32 16C33 13.5 35 11 39 11C46 11 52 17 52 25C52 40 32 53 32 53Z" fill="#dc2626" fill-opacity="0.72" stroke="#fb923c" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M32 21C32 21 39 27 39 33C39 37 36 40 32 40C28 40 25 37 25 33C25 27 32 21 32 21Z" fill="#fef08a"/>`,

  'rime-mantle': `
    <circle cx="32" cy="32" r="27" fill="#0c4a6e" fill-opacity="0.5"/>
    <path d="M20 13L32 19L44 13L53 53H11Z" fill="#0284c7" fill-opacity="0.62" stroke="#bae6fd" stroke-width="2.3" stroke-linejoin="round"/>
    <path d="M18 15Q32 23 46 15" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>
    <path d="M32 28V44M25 32L39 40M39 32L25 40" stroke="#e0f2fe" stroke-width="1.8" stroke-linecap="round"/>`,

  prism: `
    <circle cx="32" cy="32" r="27" fill="#1e1b4b" fill-opacity="0.5"/>
    <line x1="7" y1="34" x2="22" y2="34" stroke="#ffffff" stroke-width="2.8"/>
    <polygon points="32,12 48,47 16,47" fill="#e0f2fe" fill-opacity="0.38" stroke="#ffffff" stroke-width="2.2" stroke-linejoin="round"/>
    <line x1="41" y1="29" x2="57" y2="21" stroke="#f87171" stroke-width="2.2"/>
    <line x1="43" y1="34" x2="58" y2="33" stroke="#facc15" stroke-width="2.2"/>
    <line x1="45" y1="39" x2="57" y2="45" stroke="#38bdf8" stroke-width="2.2"/>`,

  'thorn-ring': `
    <circle cx="32" cy="32" r="27" fill="#14532d" fill-opacity="0.5"/>
    <circle cx="32" cy="34" r="15" stroke="#22c55e" stroke-width="4.6" fill="none"/>
    <path d="M21 21L16 14M43 21L48 14M17 37L10 38M47 37L54 38M32 49V56" stroke="#84cc16" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="32" cy="19" r="4.2" fill="#a3e635" stroke="#ecfccb" stroke-width="1.4"/>`,

  'storm-bell': `
    <circle cx="32" cy="32" r="27" fill="#422006" fill-opacity="0.48"/>
    <path d="M32 11C22 11 17 20 17 31L12 45H52L47 31C47 20 42 11 32 11Z" fill="#d97706" fill-opacity="0.72" stroke="#fef08a" stroke-width="2.3" stroke-linejoin="round"/>
    <circle cx="32" cy="50" r="4.5" fill="#fef08a"/>
    <path d="M8 22A12 12 0 0 0 8 36M56 22A12 12 0 0 1 56 36" stroke="#7dd3fc" stroke-width="2.2" stroke-linecap="round"/>`,
};

export function artifactAssetSvg(artifact, size = 28) {
  const id = typeof artifact === 'string' ? artifact : artifact?.id;
  const inner = ARTIFACT_ART[id] || ARTIFACT_ART.prism;
  return wrapAssetSvg(inner, size, 'ws-icon', artifact?.name || id || 'Artifact');
}

// ==================== 6 REALM PICKUPS & 3 BASIC MATERIALS ====================
export const PICKUP_ART = {
  potion: `
    <circle cx="32" cy="32" r="26" fill="#4c0519" fill-opacity="0.42"/>
    <rect x="26" y="8" width="12" height="7" rx="2" fill="#d4a373"/>
    <path d="M26 15V23L15 41C13 45 16 53 23 53H41C48 53 51 45 49 41L38 23V15Z" fill="#f43f5e" fill-opacity="0.34" stroke="#fda4af" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M18 42H46C46 48 42 51 38 51H26C22 51 18 48 18 42Z" fill="#fb7185"/>
    <circle cx="26" cy="37" r="2.6" fill="#fff1f2"/>`,

  shard: `
    <circle cx="32" cy="32" r="26" fill="#422006" fill-opacity="0.45"/>
    <polygon points="32,7 48,28 32,57 16,28" fill="#e5c27b" fill-opacity="0.42" stroke="#ffdf9f" stroke-width="2.4" stroke-linejoin="round"/>
    <polyline points="32,7 38,28 32,57" stroke="#fffbeb" stroke-width="1.8" fill="none"/>
    <line x1="16" y1="28" x2="48" y2="28" stroke="#ffdf9f" stroke-width="1.5"/>`,

  scroll: `
    <circle cx="32" cy="32" r="26" fill="#422006" fill-opacity="0.42"/>
    <rect x="16" y="11" width="32" height="42" rx="4" fill="#fef3c7" fill-opacity="0.24" stroke="#e5c27b" stroke-width="2.3"/>
    <rect x="13" y="10" width="38" height="6" rx="3" fill="#d4a373"/><rect x="13" y="48" width="38" height="6" rx="3" fill="#d4a373"/>
    <path d="M23 23H41M23 31H41M23 39H35" stroke="#ffdf9f" stroke-width="2.2" stroke-linecap="round"/>`,

  tome: `
    <circle cx="32" cy="32" r="26" fill="#3b0764" fill-opacity="0.48"/>
    <rect x="14" y="10" width="36" height="44" rx="4" fill="#7c3aed" fill-opacity="0.42" stroke="#c084fc" stroke-width="2.3"/>
    <line x1="22" y1="10" x2="22" y2="54" stroke="#e9d5ff" stroke-width="2.4"/>
    <path d="M36 21L38.5 27.5L45 30L38.5 32.5L36 39L33.5 32.5L27 30L33.5 27.5Z" fill="#ffdf9f"/>`,

  chest: `
    <circle cx="32" cy="32" r="26" fill="#422006" fill-opacity="0.45"/>
    <rect x="10" y="19" width="44" height="32" rx="4" fill="#92400e" fill-opacity="0.65" stroke="#e5c27b" stroke-width="2.4"/>
    <path d="M10 31H54M22 19V51M42 19V51" stroke="#e5c27b" stroke-width="2"/>
    <rect x="27" y="27" width="10" height="10" rx="2" fill="#ffdf9f" stroke="#451a03" stroke-width="1.4"/>`,

  companion: `
    <circle cx="32" cy="32" r="26" fill="#064e3b" fill-opacity="0.48"/>
    <path d="M16 54L22 34H42L48 54Z" fill="#10b981" fill-opacity="0.52" stroke="#86efac" stroke-width="2.2"/>
    <circle cx="32" cy="22" r="9" fill="#065f46" stroke="#a7f3d0" stroke-width="2"/>
    <circle cx="29" cy="21" r="1.8" fill="#ffffff"/><circle cx="35" cy="21" r="1.8" fill="#ffffff"/>
    <line x1="48" y1="14" x2="48" y2="54" stroke="#ffdf9f" stroke-width="2.6" stroke-linecap="round"/>`,

  spark: `
    <circle cx="32" cy="32" r="25" fill="#422006" fill-opacity="0.45"/>
    <path d="M36 8L18 34H30L25 56L46 28H34Z" fill="#facc15" stroke="#fef9c3" stroke-width="2" stroke-linejoin="round"/>`,

  ember: `
    <circle cx="32" cy="32" r="25" fill="#431407" fill-opacity="0.48"/>
    <path d="M32 10C32 10 47 22 47 36C47 45 40 53 32 53C24 53 17 45 17 36C17 22 32 10 32 10Z" fill="#f97316" stroke="#fed7aa" stroke-width="2.2"/>
    <path d="M32 26C32 26 39 33 39 39C39 43 36 47 32 47C28 47 25 43 25 39C25 33 32 26 32 26Z" fill="#fef08a"/>`,

  crystal: `
    <circle cx="32" cy="32" r="25" fill="#0c4a6e" fill-opacity="0.48"/>
    <polygon points="32,8 47,26 32,56 17,26" fill="#38bdf8" fill-opacity="0.58" stroke="#e0f2fe" stroke-width="2.2" stroke-linejoin="round"/>
    <line x1="32" y1="8" x2="32" y2="56" stroke="#ffffff" stroke-opacity="0.7" stroke-width="1.6"/>`,
};

export function pickupAssetSvg(kind, size = 28) {
  return wrapAssetSvg(PICKUP_ART[kind] || PICKUP_ART.shard, size, 'ws-icon', kind);
}

// ==================== 94 UNIQUE COMPONENTS ====================
function drawComponentObject(kind, p) {
  const { main, light, dark, accent } = p;
  switch (kind) {
    case 'mote':
      return `<circle cx="32" cy="32" r="14" fill="${main}" fill-opacity="0.35" stroke="${light}" stroke-width="1.8"/><path d="M32 12L36 28L52 32L36 36L32 52L28 36L12 32L28 28Z" fill="${light}"/>`;
    case 'ember':
      return `<path d="M32 11C32 11 46 22 46 36C46 45 40 52 32 52C24 52 18 45 18 36C18 22 32 11 32 11Z" fill="${main}" fill-opacity="0.75" stroke="${light}" stroke-width="2.2"/><path d="M32 26C32 26 38 32 38 39C38 43 35 46 32 46C29 46 26 43 26 39C26 32 32 26 32 26Z" fill="#fef08a"/>`;
    case 'ice':
      return `<polygon points="32,10 50,22 50,42 32,54 14,42 14,22" fill="${main}" fill-opacity="0.5" stroke="${light}" stroke-width="2.2" stroke-linejoin="round"/><path d="M32 15V49M18 24L46 40M46 24L18 40" stroke="#ffffff" stroke-width="1.6"/>`;
    case 'awl':
      return `<line x1="15" y1="49" x2="29" y2="35" stroke="#b45309" stroke-width="6" stroke-linecap="round"/><path d="M29 35L51 13L35 29Z" fill="${light}" stroke="${main}" stroke-width="2.2" stroke-linejoin="round"/>`;
    case 'heart':
      return `<path d="M32 52C32 52 13 39 13 25C13 18 18 13 24.5 13C28.5 13 31 15 32 17.5C33 15 35.5 13 39.5 13C46 13 51 18 51 25C51 39 32 52 32 52Z" fill="${main}" fill-opacity="0.72" stroke="${light}" stroke-width="2.2"/>`;
    case 'icon':
      return `<rect x="16" y="12" width="32" height="40" rx="5" fill="${dark}" stroke="#ffdf9f" stroke-width="2.2"/><path d="M32 20V44M23 31H41" stroke="#fffbeb" stroke-width="3" stroke-linecap="round"/>`;
    case 'incense':
      return `<path d="M18 44H46L41 52H23Z" fill="#78350f" stroke="#e5c27b" stroke-width="2"/><line x1="32" y1="44" x2="43" y2="22" stroke="#d97706" stroke-width="2.6"/><circle cx="44" cy="21" r="2.2" fill="#f97316"/><path d="M40 16Q34 11 41 8M31 24Q24 17 31 11" stroke="${light}" stroke-width="2" stroke-linecap="round" fill="none"/>`;
    case 'jar':
      return `<rect x="24" y="11" width="16" height="6" rx="2" fill="#d97706"/><rect x="17" y="17" width="30" height="35" rx="7" fill="${main}" fill-opacity="0.28" stroke="${light}" stroke-width="2.2"/><polyline points="35,23 26,34 33,34 29,46 39,33 32,33" fill="${accent}" stroke="#ffffff" stroke-width="1.2"/>`;
    case 'ring':
      return `<circle cx="32" cy="35" r="15" stroke="#e5c27b" stroke-width="4.4" fill="none"/><polygon points="32,12 39,20 32,27 25,20" fill="${main}" stroke="${light}" stroke-width="1.8"/>`;
    case 'rune':
      return `<polygon points="32,10 49,21 45,51 19,51 15,21" fill="${dark}" stroke="${main}" stroke-width="2.2" stroke-linejoin="round"/><path d="M26 22L38 22L28 33L38 44M32 18V46" stroke="${accent}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
    case 'ore':
      return `<polygon points="15,44 19,21 35,14 50,25 46,47 26,51" fill="#475569" stroke="${light}" stroke-width="2.2" stroke-linejoin="round"/><polygon points="24,25 36,21 40,34 27,38" fill="${main}" stroke="${accent}" stroke-width="1.4"/>`;
    case 'eye':
      return `<path d="M9 32C16 20 24 16 32 16C40 16 48 20 55 32C48 44 40 48 32 48C24 48 16 44 9 32Z" fill="${dark}" stroke="${light}" stroke-width="2.2"/><circle cx="32" cy="32" r="9.5" fill="${main}" stroke="${accent}" stroke-width="1.8"/><circle cx="32" cy="32" r="4" fill="#09100d"/><circle cx="34" cy="29.5" r="1.8" fill="#ffffff"/>`;
    case 'ooze':
      return `<path d="M13 43C13 27 21 18 32 18C43 18 51 27 51 43C51 49 43 53 32 53C21 53 13 49 13 43Z" fill="${main}" fill-opacity="0.7" stroke="${light}" stroke-width="2.2"/><circle cx="25" cy="34" r="3.2" fill="${light}"/><circle cx="38" cy="40" r="4" fill="${accent}"/>`;
    case 'cloth':
      return `<path d="M16 14C25 18 39 11 48 16L45 50C36 45 25 53 15 48Z" fill="${dark}" stroke="${main}" stroke-width="2.2" stroke-linejoin="round"/><path d="M22 25Q32 22 42 26M21 37Q32 34 41 38" stroke="${accent}" stroke-width="1.8"/>`;
    case 'flower':
      return `<circle cx="32" cy="19" r="7.5" fill="${main}" fill-opacity="0.78" stroke="${light}" stroke-width="1.6"/><circle cx="44" cy="28" r="7.5" fill="${main}" fill-opacity="0.78" stroke="${light}" stroke-width="1.6"/><circle cx="39" cy="42" r="7.5" fill="${main}" fill-opacity="0.78" stroke="${light}" stroke-width="1.6"/><circle cx="25" cy="42" r="7.5" fill="${main}" fill-opacity="0.78" stroke="${light}" stroke-width="1.6"/><circle cx="20" cy="28" r="7.5" fill="${main}" fill-opacity="0.78" stroke="${light}" stroke-width="1.6"/><circle cx="32" cy="31" r="6" fill="${accent}"/>`;
    case 'tablet':
      return `<rect x="16" y="11" width="32" height="42" rx="4" fill="${dark}" stroke="${light}" stroke-width="2.2"/><path d="M23 21H41M23 29H41M23 37H37M23 44H33" stroke="${accent}" stroke-width="2.2" stroke-linecap="round"/>`;
    case 'mushroom':
      return `<path d="M13 34C13 18 22 13 32 13C42 13 51 18 51 34Z" fill="${main}" fill-opacity="0.78" stroke="${light}" stroke-width="2.2"/><rect x="26" y="34" width="12" height="18" rx="4" fill="#e7e5e4" fill-opacity="0.32" stroke="${light}" stroke-width="2"/><circle cx="24" cy="24" r="3" fill="${accent}"/><circle cx="39" cy="22" r="2.8" fill="${accent}"/>`;
    case 'basin':
      return `<path d="M12 28H52L45 48H19Z" fill="#334155" stroke="${light}" stroke-width="2.2" stroke-linejoin="round"/><ellipse cx="32" cy="28" rx="19" ry="5" fill="${main}" stroke="${accent}" stroke-width="1.8"/>`;
    case 'vial':
      return `<rect x="27" y="10" width="10" height="5" rx="1.5" fill="#d97706"/><path d="M27 15V24L18 42C16 46 19 52 25 52H39C45 52 48 46 46 42L37 24V15Z" fill="${main}" fill-opacity="0.45" stroke="${light}" stroke-width="2.2"/><path d="M21 41H43C43 47 40 50 36 50H28C24 50 21 47 21 41Z" fill="${accent}"/>`;
    case 'seed':
      return `<path d="M32 12C43 18 47 32 42 44C38 51 26 51 22 44C17 32 21 18 32 12Z" fill="${dark}" stroke="${main}" stroke-width="2.3"/><path d="M32 16V48M25 28L32 34L39 28" stroke="${accent}" stroke-width="2" stroke-linecap="round"/>`;
    case 'cog':
      return `<circle cx="32" cy="32" r="16" stroke="${light}" stroke-width="5" stroke-dasharray="6 4" fill="none"/><circle cx="32" cy="32" r="12" fill="${dark}" stroke="${main}" stroke-width="2.2"/><circle cx="32" cy="32" r="4.5" fill="${accent}"/>`;
    case 'dice':
      return `<rect x="15" y="15" width="34" height="34" rx="6" fill="${dark}" stroke="${main}" stroke-width="2.4"/><circle cx="24" cy="24" r="2.8" fill="${accent}"/><circle cx="40" cy="24" r="2.8" fill="${accent}"/><circle cx="32" cy="32" r="2.8" fill="${light}"/><circle cx="24" cy="40" r="2.8" fill="${accent}"/><circle cx="40" cy="40" r="2.8" fill="${accent}"/>`;
    case 'rosary':
      return `<ellipse cx="32" cy="24" rx="14" ry="11" stroke="${main}" stroke-width="2.6" stroke-dasharray="3 4" fill="none"/><path d="M32 35V53M25 42H39" stroke="${light}" stroke-width="3" stroke-linecap="round"/>`;
    case 'tooth':
      return `<path d="M23 12C38 14 47 26 44 51C36 41 29 36 20 33C19 24 20 17 23 12Z" fill="#fffbeb" fill-opacity="0.88" stroke="${main}" stroke-width="2.2" stroke-linejoin="round"/>`;
    case 'vine':
      return `<path d="M14 50C17 32 30 37 33 25C36 14 48 13 52 21" stroke="${main}" stroke-width="3.6" stroke-linecap="round" fill="none"/><path d="M22 36L14 31M32 29L41 33M38 18L33 11" stroke="${accent}" stroke-width="2.4" stroke-linecap="round"/>`;
    case 'scale':
      return `<path d="M32 11C43 17 48 27 48 37C48 46 41 53 32 53C23 53 16 46 16 37C16 27 21 17 32 11Z" fill="${main}" fill-opacity="0.68" stroke="${light}" stroke-width="2.2"/><path d="M32 15V50M21 31L32 38L43 31" stroke="${accent}" stroke-width="1.6"/>`;
    case 'feather':
      return `<path d="M14 52C19 32 32 16 51 11C50 28 38 41 22 46Z" fill="${main}" fill-opacity="0.72" stroke="${light}" stroke-width="2" stroke-linejoin="round"/><line x1="12" y1="54" x2="48" y2="14" stroke="#fffbeb" stroke-width="2"/>`;
    case 'candle':
      return `<rect x="23" y="25" width="18" height="28" rx="3" fill="#fffbeb" fill-opacity="0.82" stroke="#e5c27b" stroke-width="2"/><path d="M32 10C32 10 38 16 38 20.5C38 23.5 35.3 25.5 32 25.5C28.7 25.5 26 23.5 26 20.5C26 16 32 10 32 10Z" fill="#f97316" stroke="#fef08a" stroke-width="1.6"/>`;
    case 'skull':
      return `<path d="M18 29C18 18 24 13 32 13C40 13 46 18 46 29C46 36 42 40 39 42V50H25V42C22 40 18 36 18 29Z" fill="#e4e4e7" fill-opacity="0.28" stroke="${light}" stroke-width="2.2"/><circle cx="26.5" cy="29" r="3.4" fill="${accent}"/><circle cx="37.5" cy="29" r="3.4" fill="${accent}"/>`;
    case 'egg':
      return `<path d="M32 11C42 11 47 25 47 37C47 47 41 53 32 53C23 53 17 47 17 37C17 25 22 11 32 11Z" fill="${dark}" stroke="${main}" stroke-width="2.3"/><polyline points="20,34 27,28 32,37 38,30 44,36" stroke="${accent}" stroke-width="2.2" stroke-linecap="round"/>`;
    case 'bone':
      return `<line x1="18" y1="46" x2="46" y2="18" stroke="#f5f5f4" stroke-width="6" stroke-linecap="round"/><circle cx="16" cy="43" r="4.5" fill="#f5f5f4"/><circle cx="21" cy="48" r="4.5" fill="#f5f5f4"/><circle cx="43" cy="16" r="4.5" fill="#f5f5f4"/><circle cx="48" cy="21" r="4.5" fill="#f5f5f4"/>`;
    case 'stopwatch':
      return `<rect x="28" y="8" width="8" height="5" rx="1" fill="#e5c27b"/><circle cx="32" cy="34" r="18" fill="${dark}" stroke="#e5c27b" stroke-width="2.4"/><path d="M32 34V22M32 34L41 38" stroke="${light}" stroke-width="2.4" stroke-linecap="round"/><polyline points="21,25 29,33 25,44" stroke="#f87171" stroke-width="1.8"/>`;
    case 'key':
      return `<circle cx="23" cy="23" r="10" stroke="#e5c27b" stroke-width="3.2" fill="${dark}"/><line x1="30" y1="30" x2="51" y2="51" stroke="#e5c27b" stroke-width="3.4" stroke-linecap="round"/><path d="M41 41L47 35M47 47L53 41" stroke="#ffdf9f" stroke-width="2.8" stroke-linecap="round"/>`;
    case 'note':
      return `<path d="M26 45V16L48 11V40" stroke="${main}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><ellipse cx="21" cy="46" rx="6.5" ry="5" fill="${accent}" stroke="${light}" stroke-width="1.6"/><ellipse cx="43" cy="41" rx="6.5" ry="5" fill="${accent}" stroke="${light}" stroke-width="1.6"/>`;
    case 'quipu':
      return `<line x1="12" y1="16" x2="52" y2="16" stroke="#e5c27b" stroke-width="3.4" stroke-linecap="round"/><path d="M18 16V48M27 16V52M37 16V46M46 16V50" stroke="${main}" stroke-width="2.4" stroke-linecap="round"/><circle cx="18" cy="30" r="2.6" fill="${accent}"/><circle cx="27" cy="38" r="2.6" fill="${light}"/><circle cx="37" cy="27" r="2.6" fill="${accent}"/><circle cx="46" cy="36" r="2.6" fill="${light}"/>`;
    case 'ingot':
      return `<polygon points="14,45 21,23 43,23 50,45" fill="${main}" fill-opacity="0.72" stroke="${light}" stroke-width="2.2" stroke-linejoin="round"/><polygon points="21,23 26,16 38,16 43,23" fill="${accent}" fill-opacity="0.8"/>`;
    case 'orb':
      return `<circle cx="32" cy="32" r="16" fill="${dark}" stroke="${main}" stroke-width="2.4"/><circle cx="32" cy="32" r="7" fill="${main}" fill-opacity="0.65"/><circle cx="26" cy="25" r="2.8" fill="#ffffff" opacity="0.75"/>`;
    case 'collar':
      return `<ellipse cx="32" cy="34" rx="18" ry="12" stroke="${main}" stroke-width="4.4" fill="none"/><circle cx="32" cy="46" r="4.5" fill="#ffdf9f" stroke="#78350f" stroke-width="1.4"/>`;
    case 'locket':
      return `<path d="M26 14C26 9 38 9 38 14" stroke="#e5c27b" stroke-width="2" fill="none"/><ellipse cx="32" cy="35" rx="14" ry="17" fill="${dark}" stroke="#ffdf9f" stroke-width="2.4"/><polygon points="32,25 38,35 32,45 26,35" fill="${main}"/>`;
    case 'shard':
    default:
      return `<polygon points="32,9 49,25 32,55 15,25" fill="${main}" fill-opacity="0.55" stroke="${light}" stroke-width="2.2" stroke-linejoin="round"/><polyline points="32,9 38,25 32,55" stroke="#ffffff" stroke-opacity="0.7" stroke-width="1.5" fill="none"/>`;
  }
}

function classifyComponentKind(comp) {
  const n = (comp?.name || '').toLowerCase();
  if (/\b(mote|ash)\b/.test(n)) return 'mote';
  if (/\b(ember|brand)\b/.test(n)) return 'ember';
  if (/\b(ice|frost core)\b/.test(n)) return 'ice';
  if (/\b(awl|blade fragment)\b/.test(n)) return 'awl';
  if (/\b(heart|heartwood)\b/.test(n)) return 'heart';
  if (/\b(icon|relic|reliquary|phylactery)\b/.test(n)) return 'icon';
  if (/\b(incense)\b/.test(n)) return 'incense';
  if (/\b(jar)\b/.test(n)) return 'jar';
  if (/\b(ring)\b/.test(n)) return 'ring';
  if (/\b(rune|sigil|seal|fetish)\b/.test(n)) return 'rune';
  if (/\b(ore|plate|shimmersteel)\b/.test(n)) return 'ore';
  if (/\b(eye|eyes|lens|oculite|retinal)\b/.test(n)) return 'eye';
  if (/\b(ooze|resin|cysts|slime core)\b/.test(n)) return 'ooze';
  if (/\b(weave|threads|strings)\b/.test(n)) return 'cloth';
  if (/\b(flower|petal|bloom)\b/.test(n)) return 'flower';
  if (/\b(inscription|tablet|script|vellum|palimpsest|cortex)\b/.test(n)) return 'tablet';
  if (/\b(fungus)\b/.test(n)) return 'mushroom';
  if (/\b(basin)\b/.test(n)) return 'basin';
  if (/\b(serum|water|ambrosia|blood|homunculi)\b/.test(n)) return 'vial';
  if (/\b(seed)\b/.test(n)) return 'seed';
  if (/\b(cog)\b/.test(n)) return 'cog';
  if (/\b(dice)\b/.test(n)) return 'dice';
  if (/\b(rosary)\b/.test(n)) return 'rosary';
  if (/\b(tooth|fang)\b/.test(n)) return 'tooth';
  if (/\b(vine)\b/.test(n)) return 'vine';
  if (/\b(scale)\b/.test(n)) return 'scale';
  if (/\b(feather)\b/.test(n)) return 'feather';
  if (/\b(candle)\b/.test(n)) return 'candle';
  if (/\b(skull)\b/.test(n)) return 'skull';
  if (/\b(egg)\b/.test(n)) return 'egg';
  if (/\b(bone)\b/.test(n)) return 'bone';
  if (/\b(stopwatch)\b/.test(n)) return 'stopwatch';
  if (/\b(key|keystone)\b/.test(n)) return 'key';
  if (/\b(note)\b/.test(n)) return 'note';
  if (/\b(quipu)\b/.test(n)) return 'quipu';
  if (/\b(ingot)\b/.test(n)) return 'ingot';
  if (/\b(orb|ball|moonstone|beacon|socket)\b/.test(n)) return 'orb';
  if (/\b(collar)\b/.test(n)) return 'collar';
  if (/\b(locket)\b/.test(n)) return 'locket';
  return 'shard';
}

export function componentAssetSvg(component, size = 28) {
  if (!component) return pickupAssetSvg('crystal', size);
  const name = typeof component === 'string' ? component : (component.name || 'Component');
  const tags = component.tags || [];
  const p = resolvePalette(name, tags, 'Arcane');
  const kind = classifyComponentKind(component);
  const rareRing = component.rare
    ? `<circle cx="32" cy="32" r="27" stroke="#ffdf9f" stroke-opacity="0.65" stroke-width="1.6"/>`
    : '';
  const bg = uniqueBackdrop(`comp:${name}`, p);
  const body = drawComponentObject(kind, p);
  const flourish = elementalFlourish(p.key, p);
  const h = hashString(`comp:${name}`);
  const pip = `<circle cx="${12 + (h % 6)}" cy="${52 - ((h >>> 5) % 5)}" r="1.2" fill="${p.accent}" opacity="0.8"/>`;
  return wrapAssetSvg(`${bg}${rareRing}${body}${flourish}${pip}`, size, 'ws-icon', name);
}
