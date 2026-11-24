// Handcrafted SVG Visual Asset Library for Wild Shock — Rift Wizard 3 Edition
// Memoized so repeated card/grid renders reuse prebuilt SVG markup strings.

export const TAG_COLORS = {
  Fire: '#f97316',
  Ice: '#38bdf8',
  Lightning: '#facc15',
  Dark: '#a78bfa',
  Holy: '#fde68a',
  Arcane: '#c084fc',
  Nature: '#4ade80',
  Blood: '#f87171',
  Metallic: '#cbd5e1',
  Chaos: '#fb7185',
  Dragon: '#fb923c',
  Slime: '#a3e635',
  Eye: '#38bdf8',
  Orb: '#818cf8',
  Sorcery: '#e2e8f0',
  Conjuration: '#34d399',
  Enchantment: '#f0abfc',
  Translocation: '#22d3ee',
  Ritual: '#fbbf24',
  Word: '#fda4af',
  Physical: '#d6d3d1',
  Poison: '#84cc16',
};

const svgCache = new Map();

function wrapSvg(inner, size = 24, viewBox = '0 0 32 32', cls = 'ws-icon') {
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="${viewBox}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;
}

const WIZARD_PORTRAIT_SVG = `<svg class="wizard-portrait-svg" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The Riftwalker">
  <defs>
    <radialGradient id="wp-bg" cx="50%" cy="42%" r="58%">
      <stop offset="0%" stop-color="#263c33"/>
      <stop offset="65%" stop-color="#131e19"/>
      <stop offset="100%" stop-color="#090f0c"/>
    </radialGradient>
    <radialGradient id="wp-orb" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="35%" stop-color="#7bd0ff"/>
      <stop offset="80%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#0369a1"/>
    </radialGradient>
    <linearGradient id="wp-hat" x1="20" y1="8" x2="54" y2="42" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#355243"/>
      <stop offset="55%" stop-color="#1e3128"/>
      <stop offset="100%" stop-color="#111d17"/>
    </linearGradient>
    <linearGradient id="wp-robe" x1="16" y1="48" x2="60" y2="78" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#294236"/>
      <stop offset="100%" stop-color="#13211b"/>
    </linearGradient>
    <linearGradient id="wp-gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffdf9f"/>
      <stop offset="50%" stop-color="#e5c27b"/>
      <stop offset="100%" stop-color="#9e762f"/>
    </linearGradient>
    <filter id="wp-glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2.5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="80" height="80" fill="url(#wp-bg)"/>
  <circle cx="38" cy="40" r="32" stroke="#e5c27b" stroke-opacity="0.16" stroke-width="1" stroke-dasharray="3 3"/>
  <circle cx="38" cy="40" r="25" stroke="#7bd0ff" stroke-opacity="0.12" stroke-width="0.8"/>
  <circle cx="14" cy="20" r="1.4" fill="#ffdf9f" opacity="0.8"/>
  <circle cx="66" cy="14" r="1.2" fill="#7bd0ff" opacity="0.9"/>
  <circle cx="18" cy="58" r="1" fill="#86efac" opacity="0.7"/>
  <path d="M14 78 C15 58 24 51 38 51 C52 51 60 58 62 78 Z" fill="url(#wp-robe)" stroke="#3e594a" stroke-width="1.2"/>
  <path d="M24 53 L38 66 L52 53" stroke="url(#wp-gold)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M38 66 L38 78" stroke="url(#wp-gold)" stroke-width="1.5" opacity="0.8"/>
  <ellipse cx="38" cy="43" rx="11.5" ry="11" fill="#0d1512" stroke="#2f4539" stroke-width="1"/>
  <g filter="url(#wp-glow)">
    <ellipse cx="33.5" cy="42.5" rx="2.4" ry="1.8" fill="#7bd0ff"/>
    <ellipse cx="42.5" cy="42.5" rx="2.4" ry="1.8" fill="#7bd0ff"/>
    <circle cx="33.5" cy="42.2" r="0.9" fill="#ffffff"/>
    <circle cx="42.5" cy="42.2" r="0.9" fill="#ffffff"/>
  </g>
  <path d="M28 50 Q38 58 48 50 Q45 56 38 59 Q31 56 28 50Z" fill="#cbd5c8" opacity="0.88"/>
  <ellipse cx="38" cy="34" rx="23" ry="6.2" fill="#182720" stroke="#e5c27b" stroke-width="1.1" stroke-opacity="0.75"/>
  <path d="M21 34 L34 11 C36 8 40 7 44 10 L51 16 L44 18 L54 34 Z" fill="url(#wp-hat)" stroke="#496857" stroke-width="1.1" stroke-linejoin="round"/>
  <path d="M23 32 Q38 36 53 32" stroke="url(#wp-gold)" stroke-width="3" fill="none" stroke-linecap="round"/>
  <rect x="35" y="30.5" width="6" height="5" rx="1" fill="#0e1512" stroke="#ffdf9f" stroke-width="1.2"/>
  <circle cx="38" cy="33" r="1" fill="#7bd0ff"/>
  <line x1="63" y1="27" x2="60" y2="78" stroke="#9e762f" stroke-width="3.2" stroke-linecap="round"/>
  <line x1="63" y1="27" x2="60" y2="78" stroke="#e5c27b" stroke-width="1.2" stroke-linecap="round" opacity="0.8"/>
  <path d="M58 26 C58 20 68 20 68 26 C68 30 63 32 63 32 C63 32 58 30 58 26Z" stroke="#e5c27b" stroke-width="1.5" fill="none"/>
  <circle cx="63" cy="24" r="5.2" fill="url(#wp-orb)" filter="url(#wp-glow)"/>
</svg>`;

export function wizardPortraitSvg() {
  return WIZARD_PORTRAIT_SVG;
}

const SLOT_PATHS = {
  weapon: `<path d="M7 25L22 10" stroke="#e5c27b" stroke-width="2.4" stroke-linecap="round"/><path d="M19 6L26 6L26 13L21.5 11.5L19 6Z" fill="#7bd0ff" fill-opacity="0.35" stroke="#7bd0ff" stroke-width="1.8" stroke-linejoin="round"/><path d="M10 18L14 22" stroke="#ffdf9f" stroke-width="2" stroke-linecap="round"/>`,
  head: `<path d="M6 22L9 10L16 15L23 10L26 22H6Z" fill="#e5c27b" fill-opacity="0.28" stroke="#e5c27b" stroke-width="2" stroke-linejoin="round"/><circle cx="16" cy="18" r="2" fill="#7bd0ff"/><path d="M6 25H26" stroke="#ffdf9f" stroke-width="2" stroke-linecap="round"/>`,
  body: `<path d="M11 6L6 11L9 15L10 26H22L23 15L26 11L21 6L16 10L11 6Z" fill="#86efac" fill-opacity="0.2" stroke="#a7c4b0" stroke-width="1.9" stroke-linejoin="round"/><path d="M16 10V26" stroke="#e5c27b" stroke-width="1.5"/>`,
  feet: `<path d="M11 6H18V18L25 21V25H9V18L11 6Z" fill="#7bd0ff" fill-opacity="0.22" stroke="#7bd0ff" stroke-width="1.9" stroke-linejoin="round"/><path d="M7 11L11 10M6 15L10.5 14" stroke="#e5c27b" stroke-width="1.6" stroke-linecap="round"/>`,
  trinket: `<circle cx="16" cy="18" r="7.5" fill="#c084fc" fill-opacity="0.25" stroke="#e5c27b" stroke-width="2"/><polygon points="16,13 19.5,18 16,23 12.5,18" fill="#c084fc" stroke="#f3e8ff" stroke-width="1.2"/><path d="M12 10.5C12 7.5 20 7.5 20 10.5" stroke="#e5c27b" stroke-width="1.8" stroke-linecap="round"/>`,
};

const SHRINE_PATHS = {
  transmutation: `<path d="M6 16H26L23 22H9L6 16Z" fill="#7bd0ff" fill-opacity="0.25" stroke="#7bd0ff" stroke-width="2" stroke-linejoin="round"/><path d="M11 22L9 27H23L21 22" stroke="#e5c27b" stroke-width="1.8"/><path d="M16 5L17.8 9.2L22 11L17.8 12.8L16 17L14.2 12.8L10 11L14.2 9.2Z" fill="#ffdf9f"/>`,
  duplication: `<polygon points="12,6 19,16 12,26 5,16" fill="#c084fc" fill-opacity="0.28" stroke="#c084fc" stroke-width="1.9"/><polygon points="20,6 27,16 20,26 13,16" fill="#7bd0ff" fill-opacity="0.28" stroke="#7bd0ff" stroke-width="1.9"/>`,
  empowerment: `<path d="M16 4L21 12V27H11V12L16 4Z" fill="#e5c27b" fill-opacity="0.25" stroke="#e5c27b" stroke-width="2" stroke-linejoin="round"/><path d="M16 11V21M13 15L16 11L19 15" stroke="#fef08a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
  chronomancy: `<path d="M9 5H23M9 27H23M10 5C10 12 16 14 16 16C16 18 10 20 10 27M22 5C22 12 16 14 16 16C16 18 22 20 22 27" stroke="#7bd0ff" stroke-width="2" stroke-linecap="round"/><polygon points="12,24 20,24 16,19" fill="#e5c27b"/>`,
  calling: `<path d="M8 22H24L21 27H11L8 22Z" fill="#e5c27b" fill-opacity="0.25" stroke="#e5c27b" stroke-width="1.9"/><path d="M16 6C16 6 22 11.5 22 16C22 19.3 19.3 21.5 16 21.5C12.7 21.5 10 19.3 10 16C10 11.5 16 6 16 6Z" fill="#4ade80" fill-opacity="0.35" stroke="#4ade80" stroke-width="1.9"/>`,
};

const ENTITY_PATHS = {
  imp: `<path d="M9 12L6 6L13 10M23 12L26 6L19 10" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16" cy="17" r="8.5" fill="#f97316" fill-opacity="0.28" stroke="#fb923c" stroke-width="2"/><ellipse cx="12.8" cy="16" rx="1.8" ry="2.2" fill="#fef08a"/><ellipse cx="19.2" cy="16" rx="1.8" ry="2.2" fill="#fef08a"/><path d="M12.5 21.5Q16 24 19.5 21.5" stroke="#fed7aa" stroke-width="1.8" stroke-linecap="round"/>`,
  knight: `<path d="M9 14C9 8.5 12 6 16 6C20 6 23 8.5 23 14V24L16 27L9 24V14Z" fill="#94a3b8" fill-opacity="0.25" stroke="#cbd5e1" stroke-width="2" stroke-linejoin="round"/><path d="M11 15H21V18.5H11V15Z" fill="#0f172a" stroke="#7bd0ff" stroke-width="1.4"/><line x1="13" y1="16.7" x2="19" y2="16.7" stroke="#7bd0ff" stroke-width="2" stroke-linecap="round"/><path d="M9 10L6 6M23 10L26 6" stroke="#e5c27b" stroke-width="2" stroke-linecap="round"/>`,
  eye: `<circle cx="16" cy="16" r="9.5" fill="#a78bfa" fill-opacity="0.22" stroke="#c084fc" stroke-width="2"/><path d="M16 4V7M16 25V28M4 16H7M25 16H28M7.5 7.5L9.5 9.5M22.5 22.5L24.5 24.5M24.5 7.5L22.5 9.5M9.5 22.5L7.5 24.5" stroke="#86efac" stroke-width="1.8" stroke-linecap="round"/><circle cx="16" cy="16" r="5" fill="#38bdf8" fill-opacity="0.5" stroke="#e0f2fe" stroke-width="1.4"/><circle cx="16" cy="16" r="2.2" fill="#0f172a"/><circle cx="17.2" cy="14.8" r="1" fill="#ffffff"/>`,
  moth: `<path d="M16 14C12 8 5 7 5 13C5 18 11 19 16 18C21 19 27 18 27 13C27 7 20 8 16 14Z" fill="#facc15" fill-opacity="0.28" stroke="#fde047" stroke-width="1.9" stroke-linejoin="round"/><path d="M16 18C12 20 8 23 10 26C12.5 27 15 24 16 21C17 24 19.5 27 22 26C24 23 20 20 16 18Z" fill="#86efac" fill-opacity="0.28" stroke="#86efac" stroke-width="1.6"/><ellipse cx="16" cy="17" rx="2" ry="6" fill="#fef08a"/>`,
  boss: `<path d="M7 12L10 6L16 10L22 6L25 12" stroke="#ffdf9f" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16" cy="18" r="8.5" fill="#e5c27b" fill-opacity="0.28" stroke="#ffdf9f" stroke-width="2"/><circle cx="13" cy="17" r="2" fill="#f87171"/><circle cx="19" cy="17" r="2" fill="#f87171"/><path d="M12 22.5H20" stroke="#ffdf9f" stroke-width="1.8" stroke-linecap="round"/>`,
  mordred: `<path d="M6 12L10 4L16 9L22 4L26 12" stroke="#f87171" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 14C8 10 11.5 8 16 8C20.5 8 24 10 24 14V24L16 28L8 24V14Z" fill="#991b1b" fill-opacity="0.45" stroke="#f87171" stroke-width="2"/><circle cx="12.5" cy="16.5" r="2.2" fill="#fef08a"/><circle cx="19.5" cy="16.5" r="2.2" fill="#fef08a"/><path d="M12 22L14 20.5L16 22L18 20.5L20 22" stroke="#fca5a5" stroke-width="1.6"/>`,
  lair: `<polygon points="16,3 25,11 23,27 9,27 7,11" fill="#7c3aed" fill-opacity="0.3" stroke="#c084fc" stroke-width="2" stroke-linejoin="round"/><ellipse cx="16" cy="17" rx="4" ry="6.5" fill="#f472b6" fill-opacity="0.55" stroke="#fbcfe8" stroke-width="1.5"/>`,
  ally: `<path d="M16 5L24 12L21 26H11L8 12L16 5Z" fill="#4ade80" fill-opacity="0.28" stroke="#4ade80" stroke-width="2" stroke-linejoin="round"/><circle cx="13.5" cy="15" r="1.6" fill="#ecfdf5"/><circle cx="18.5" cy="15" r="1.6" fill="#ecfdf5"/><path d="M13.5 19.5Q16 21.5 18.5 19.5" stroke="#ecfdf5" stroke-width="1.5" stroke-linecap="round"/>`,
  potion: `<rect x="13" y="4" width="6" height="4" rx="1" fill="#d4a373"/><path d="M13 8V12L7.5 21C6.8 22.3 7.7 26.5 11 26.5H21C24.3 26.5 25.2 22.3 24.5 21L19 12V8H13Z" fill="#f43f5e" fill-opacity="0.35" stroke="#fda4af" stroke-width="2" stroke-linejoin="round"/><path d="M9.5 21.5H22.5C22.5 24 21 25 19.5 25H12.5C11 25 9.5 24 9.5 21.5Z" fill="#fb7185"/><circle cx="14" cy="19" r="1.3" fill="#fff1f2"/>`,
  shard: `<polygon points="16,4 24,14 16,28 8,14" fill="#e5c27b" fill-opacity="0.32" stroke="#ffdf9f" stroke-width="2" stroke-linejoin="round"/><polyline points="16,4 19,14 16,28" stroke="#fef3c7" stroke-width="1.4" fill="none"/><line x1="8" y1="14" x2="24" y2="14" stroke="#ffdf9f" stroke-width="1.2"/>`,
  component: `<polygon points="16,5 25,11 25,21 16,27 7,21 7,11" fill="#c084fc" fill-opacity="0.28" stroke="#e879f9" stroke-width="2" stroke-linejoin="round"/><circle cx="16" cy="16" r="4.2" fill="#f5d0fe" fill-opacity="0.65" stroke="#ffffff" stroke-width="1.2"/>`,
  'portal-moss': `<ellipse cx="16" cy="16" rx="9" ry="12" fill="#10b981" fill-opacity="0.22" stroke="#34d399" stroke-width="2.2"/><ellipse cx="16" cy="16" rx="5" ry="7.5" fill="#6ee7b7" fill-opacity="0.35" stroke="#a7f3d0" stroke-width="1.4"/><circle cx="16" cy="16" r="2.2" fill="#ecfdf5"/>`,
  'portal-ember': `<ellipse cx="16" cy="16" rx="9" ry="12" fill="#f97316" fill-opacity="0.24" stroke="#fb923c" stroke-width="2.2"/><ellipse cx="16" cy="16" rx="5" ry="7.5" fill="#fdba74" fill-opacity="0.38" stroke="#ffedd5" stroke-width="1.4"/><circle cx="16" cy="16" r="2.2" fill="#fff7ed"/>`,
  cloud: `<path d="M9 22H23C25.8 22 28 19.8 28 17C28 14.5 26.2 12.5 23.8 12.1C23 8.6 19.8 6 16 6C12 6 8.7 9 8.2 12.9C5.8 13.3 4 15.4 4 17.8C4 20.1 6.2 22 9 22Z" fill="#7bd0ff" fill-opacity="0.28" stroke="#7bd0ff" stroke-width="2" stroke-linejoin="round"/>`,
  chasm: `<rect x="5" y="5" width="22" height="22" rx="3" fill="#020617" stroke="#38bdf8" stroke-opacity="0.5" stroke-width="1.8"/><path d="M9 11L16 21L23 11" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
  empty: `<circle cx="16" cy="16" r="9" stroke="#998f80" stroke-width="1.6" stroke-dasharray="3 3"/><path d="M16 4V9M16 23V28M4 16H9M23 16H28" stroke="#e5c27b" stroke-width="1.8" stroke-linecap="round"/><circle cx="16" cy="16" r="2" fill="#e5c27b"/>`,
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
    default: return `<path d="M16 4L19.5 12.5L28 16L19.5 19.5L16 28L12.5 19.5L4 16L12.5 12.5L16 4Z" fill="${c}" fill-opacity="0.28" stroke="${c}" stroke-width="1.9" stroke-linejoin="round"/><circle cx="16" cy="16" r="3.2" fill="#f3e8ff"/>`;
  }
}

export function tagIconSvg(tag, size = 22) {
  const key = `tag:${tag}:${size}`;
  let cached = svgCache.get(key);
  if (!cached) { cached = wrapSvg(buildTagInner(tag), size); svgCache.set(key, cached); }
  return cached;
}

export function slotIconSvg(slot, size = 20) {
  const s = String(slot || '').toLowerCase();
  const key = `slot:${s}:${size}`;
  let cached = svgCache.get(key);
  if (!cached) { cached = wrapSvg(SLOT_PATHS[s] || SLOT_PATHS.trinket, size); svgCache.set(key, cached); }
  return cached;
}

export function shrineIconSvg(type, size = 24) {
  const key = `shrine:${type}:${size}`;
  let cached = svgCache.get(key);
  if (!cached) { cached = wrapSvg(SHRINE_PATHS[type] || SHRINE_PATHS.transmutation, size); svgCache.set(key, cached); }
  return cached;
}

export function entityIconSvg(kind, size = 36) {
  const key = `entity:${kind}:${size}`;
  let cached = svgCache.get(key);
  if (!cached) { cached = wrapSvg(ENTITY_PATHS[kind] || ENTITY_PATHS.empty, size); svgCache.set(key, cached); }
  return cached;
}

export function uiIconSvg(name, size = 18) {
  const key = `ui:${name}:${size}`;
  let cached = svgCache.get(key);
  if (!cached) { cached = wrapSvg(UI_PATHS[name] || UI_PATHS.sp, size); svgCache.set(key, cached); }
  return cached;
}
