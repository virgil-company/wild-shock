// Handcrafted SVG & Canvas 2D Visual Asset Library for Wild Shock — Rift Wizard 3 Edition
// Designed with warm, expressive, crisp dark-arcane fantasy illustration aesthetics.

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

function wrapSvg(inner, size = 24, viewBox = '0 0 32 32', cls = 'ws-icon') {
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="${viewBox}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;
}

// ============================================================================
// 1. WIZARD PORTRAIT (Rich illustrated avatar for Left Panel)
// ============================================================================
export function wizardPortraitSvg() {
  return `<svg class="wizard-portrait-svg" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The Riftwalker">
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
    <!-- Subtle arcane halo ring -->
    <circle cx="38" cy="40" r="32" stroke="#e5c27b" stroke-opacity="0.16" stroke-width="1" stroke-dasharray="3 3"/>
    <circle cx="38" cy="40" r="25" stroke="#7bd0ff" stroke-opacity="0.12" stroke-width="0.8"/>
    <!-- Floating sparkles -->
    <circle cx="14" cy="20" r="1.4" fill="#ffdf9f" opacity="0.8"/>
    <circle cx="66" cy="14" r="1.2" fill="#7bd0ff" opacity="0.9"/>
    <circle cx="18" cy="58" r="1" fill="#86efac" opacity="0.7"/>
    <!-- Shoulders & Robe -->
    <path d="M14 78 C15 58 24 51 38 51 C52 51 60 58 62 78 Z" fill="url(#wp-robe)" stroke="#3e594a" stroke-width="1.2"/>
    <!-- Gold Mantle Trim -->
    <path d="M24 53 L38 66 L52 53" stroke="url(#wp-gold)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="M38 66 L38 78" stroke="url(#wp-gold)" stroke-width="1.5" opacity="0.8"/>
    <!-- Hood Shadow & Face -->
    <ellipse cx="38" cy="43" rx="11.5" ry="11" fill="#0d1512" stroke="#2f4539" stroke-width="1"/>
    <!-- Glowing Arcane Eyes -->
    <g filter="url(#wp-glow)">
      <ellipse cx="33.5" cy="42.5" rx="2.4" ry="1.8" fill="#7bd0ff"/>
      <ellipse cx="42.5" cy="42.5" rx="2.4" ry="1.8" fill="#7bd0ff"/>
      <circle cx="33.5" cy="42.2" r="0.9" fill="#ffffff"/>
      <circle cx="42.5" cy="42.2" r="0.9" fill="#ffffff"/>
    </g>
    <!-- Beard / Scarf Collar -->
    <path d="M28 50 Q38 58 48 50 Q45 56 38 59 Q31 56 28 50Z" fill="#cbd5c8" opacity="0.88"/>
    <!-- Pointed Wizard Hat Brim -->
    <ellipse cx="38" cy="34" rx="23" ry="6.2" fill="#182720" stroke="#e5c27b" stroke-width="1.1" stroke-opacity="0.75"/>
    <!-- Wizard Hat Cone -->
    <path d="M21 34 L34 11 C36 8 40 7 44 10 L51 16 L44 18 L54 34 Z" fill="url(#wp-hat)" stroke="#496857" stroke-width="1.1" stroke-linejoin="round"/>
    <!-- Hat Gold Band & Buckle -->
    <path d="M23 32 Q38 36 53 32" stroke="url(#wp-gold)" stroke-width="3" fill="none" stroke-linecap="round"/>
    <rect x="35" y="30.5" width="6" height="5" rx="1" fill="#0e1512" stroke="#ffdf9f" stroke-width="1.2"/>
    <circle cx="38" cy="33" r="1" fill="#7bd0ff"/>
    <!-- Arcane Staff & Glowing Crystal -->
    <line x1="63" y1="27" x2="60" y2="78" stroke="#9e762f" stroke-width="3.2" stroke-linecap="round"/>
    <line x1="63" y1="27" x2="60" y2="78" stroke="#e5c27b" stroke-width="1.2" stroke-linecap="round" opacity="0.8"/>
    <path d="M58 26 C58 20 68 20 68 26 C68 30 63 32 63 32 C63 32 58 30 58 26Z" stroke="#e5c27b" stroke-width="1.5" fill="none"/>
    <circle cx="63" cy="24" r="5.2" fill="url(#wp-orb)" filter="url(#wp-glow)"/>
  </svg>`;
}

// ============================================================================
// 2. SPELL TAG / SCHOOL SVG EMBLEMS (All 20 RW3 Tags)
// ============================================================================
export function tagIconSvg(tag, size = 22) {
  const c = TAG_COLORS[tag] || '#e5c27b';
  const icons = {
    Fire: `<path d="M16 4C16 4 24 11 24 18.5C24 23.5 20.4 27.5 16 27.5C11.6 27.5 8 23.5 8 18.5C8 14.5 10.5 11.5 12 9.5C12 12 13.5 13 14.5 13C13.5 10 15 6.5 16 4Z" fill="${c}" fill-opacity="0.25" stroke="${c}" stroke-width="2" stroke-linejoin="round"/><path d="M16 14C16 14 20 17.5 20 21C20 23.2 18.2 25 16 25C13.8 25 12 23.2 12 21C12 18.5 14.2 16.5 16 14Z" fill="#fde68a"/>`,
    Ice: `<path d="M16 4V28M5.6 10L26.4 22M26.4 10L5.6 22" stroke="${c}" stroke-width="2" stroke-linecap="round"/><path d="M13 7L16 10L19 7M13 25L16 22L19 25M8 14L11 13L10 10M24 18L21 19L22 22M24 14L21 13L22 10M8 18L11 19L10 22" stroke="#e0f2fe" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16" cy="16" r="3" fill="${c}"/>`,
    Lightning: `<path d="M18 4L8 17.5H15.5L13.5 28L24 14H16.5L18 4Z" fill="${c}" fill-opacity="0.3" stroke="${c}" stroke-width="2" stroke-linejoin="round"/><path d="M17.2 7.5L11.5 16H16.5L15.2 23.5L21 15.5H16L17.2 7.5Z" fill="#fef9c3"/>`,
    Dark: `<path d="M21.5 22.5A10 10 0 1 1 13.5 6.5A8 8 0 1 0 21.5 22.5Z" fill="${c}" fill-opacity="0.3" stroke="${c}" stroke-width="2" stroke-linejoin="round"/><circle cx="22" cy="10" r="2" fill="#e9d5ff"/><path d="M22 6V14M18 10H26" stroke="#e9d5ff" stroke-width="1.2" stroke-linecap="round"/>`,
    Holy: `<circle cx="16" cy="16" r="6" fill="${c}" fill-opacity="0.35" stroke="${c}" stroke-width="2"/><path d="M16 4V8M16 24V28M4 16H8M24 16H28M7.5 7.5L10.5 10.5M21.5 21.5L24.5 24.5M24.5 7.5L21.5 10.5M10.5 21.5L7.5 24.5" stroke="${c}" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="16" r="2.5" fill="#fffbeb"/>`,
    Arcane: `<path d="M16 4L19.5 12.5L28 16L19.5 19.5L16 28L12.5 19.5L4 16L12.5 12.5L16 4Z" fill="${c}" fill-opacity="0.28" stroke="${c}" stroke-width="1.9" stroke-linejoin="round"/><circle cx="16" cy="16" r="3.2" fill="#f3e8ff"/>`,
    Nature: `<path d="M25 7C14 7 7 13 7 25C19 25 25 18 25 7Z" fill="${c}" fill-opacity="0.25" stroke="${c}" stroke-width="2" stroke-linejoin="round"/><path d="M7 25C12 20 17 15 24 8M13 19V14M17 15H22" stroke="${c}" stroke-width="1.8" stroke-linecap="round"/>`,
    Blood: `<path d="M16 5C16 5 24 14.2 24 19.5C24 23.9 20.4 27.5 16 27.5C11.6 27.5 8 23.9 8 19.5C8 14.2 16 5 16 5Z" fill="${c}" fill-opacity="0.32" stroke="${c}" stroke-width="2" stroke-linejoin="round"/><path d="M12.5 19.5C12.5 21.5 14 23 16 23" stroke="#fecaca" stroke-width="1.8" stroke-linecap="round"/>`,
    Metallic: `<polygon points="16,4 26,10 26,22 16,28 6,22 6,10" fill="${c}" fill-opacity="0.2" stroke="${c}" stroke-width="2" stroke-linejoin="round"/><polygon points="16,9 21.5,12.2 21.5,19.8 16,23 10.5,19.8 10.5,12.2" fill="${c}" fill-opacity="0.35" stroke="#f8fafc" stroke-width="1.3"/>`,
    Chaos: `<circle cx="16" cy="16" r="10" stroke="${c}" stroke-width="1.8" stroke-dasharray="4 2"/><path d="M16 6L18.5 13.5L26 16L18.5 18.5L16 26L13.5 18.5L6 16L13.5 13.5Z" fill="${c}" fill-opacity="0.35" stroke="#fde047" stroke-width="1.5"/><circle cx="16" cy="16" r="2.5" fill="#ffffff"/>`,
    Dragon: `<path d="M7 23C8 15 13 10 21 8L18 13L25 14L20 19L24 24C18 25 12 25 7 23Z" fill="${c}" fill-opacity="0.28" stroke="${c}" stroke-width="2" stroke-linejoin="round"/><circle cx="16" cy="15" r="1.8" fill="#fef08a"/>`,
    Slime: `<path d="M6 21C6 14 10.5 8 16 8C21.5 8 26 14 26 21C26 24.5 22.5 26 16 26C9.5 26 6 24.5 6 21Z" fill="${c}" fill-opacity="0.3" stroke="${c}" stroke-width="2"/><circle cx="12.5" cy="18" r="1.6" fill="#ecfccb"/><circle cx="19.5" cy="18" r="1.6" fill="#ecfccb"/><path d="M13 22Q16 23.5 19 22" stroke="#ecfccb" stroke-width="1.5" stroke-linecap="round"/>`,
    Eye: `<path d="M4 16C7.5 10 11.5 8 16 8C20.5 8 24.5 10 28 16C24.5 22 20.5 24 16 24C11.5 24 7.5 22 4 16Z" fill="${c}" fill-opacity="0.2" stroke="${c}" stroke-width="2"/><circle cx="16" cy="16" r="4.5" fill="${c}" fill-opacity="0.45" stroke="#e0f2fe" stroke-width="1.6"/><circle cx="16" cy="16" r="2" fill="#ffffff"/>`,
    Orb: `<circle cx="16" cy="16" r="10" fill="${c}" fill-opacity="0.25" stroke="${c}" stroke-width="2"/><ellipse cx="16" cy="16" rx="10" ry="4" transform="rotate(-25 16 16)" stroke="#c7d2fe" stroke-width="1.4"/><circle cx="12.5" cy="12" r="2" fill="#ffffff" opacity="0.8"/>`,
    Sorcery: `<path d="M7 25L21 11" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/><path d="M22 6L23.2 9.2L26.5 10.5L23.2 11.8L22 15L20.8 11.8L17.5 10.5L20.8 9.2Z" fill="#ffdf9f"/>`,
    Conjuration: `<circle cx="16" cy="16" r="10.5" stroke="${c}" stroke-width="1.8" stroke-dasharray="3 2"/><polygon points="16,7 24,22 8,22" fill="${c}" fill-opacity="0.25" stroke="${c}" stroke-width="1.8" stroke-linejoin="round"/><circle cx="16" cy="17" r="2.2" fill="#d1fae5"/>`,
    Enchantment: `<rect x="8" y="6" width="16" height="20" rx="2.5" fill="${c}" fill-opacity="0.2" stroke="${c}" stroke-width="1.9"/><path d="M12 12H20M12 16H20M12 20H17" stroke="#fae8ff" stroke-width="1.7" stroke-linecap="round"/>`,
    Translocation: `<path d="M7 12H23M19 8L23 12L19 16" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M25 20H9M13 16L9 20L13 24" stroke="#a5f3fc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
    Ritual: `<circle cx="16" cy="16" r="10" stroke="${c}" stroke-width="1.8"/><circle cx="16" cy="16" r="5" fill="${c}" fill-opacity="0.28" stroke="${c}" stroke-width="1.5"/><path d="M16 4V8M16 24V28M4 16H8M24 16H28" stroke="#fef3c7" stroke-width="1.8" stroke-linecap="round"/>`,
    Word: `<path d="M9 7H23V25L16 21.5L9 25V7Z" fill="${c}" fill-opacity="0.25" stroke="${c}" stroke-width="2" stroke-linejoin="round"/><path d="M13 12H19M16 12V18" stroke="#ffe4e6" stroke-width="1.8" stroke-linecap="round"/>`,
  };
  return wrapSvg(icons[tag] || icons.Arcane, size);
}

// ============================================================================
// 3. EQUIPMENT SLOT SVG EMBLEMS (Weapon, Head, Body, Feet, Trinket)
// ============================================================================
export function slotIconSvg(slot, size = 20) {
  const s = String(slot || '').toLowerCase();
  const icons = {
    weapon: `<path d="M7 25L22 10" stroke="#e5c27b" stroke-width="2.4" stroke-linecap="round"/><path d="M19 6L26 6L26 13L21.5 11.5L19 6Z" fill="#7bd0ff" fill-opacity="0.35" stroke="#7bd0ff" stroke-width="1.8" stroke-linejoin="round"/><path d="M10 18L14 22" stroke="#ffdf9f" stroke-width="2" stroke-linecap="round"/>`,
    head: `<path d="M6 22L9 10L16 15L23 10L26 22H6Z" fill="#e5c27b" fill-opacity="0.28" stroke="#e5c27b" stroke-width="2" stroke-linejoin="round"/><circle cx="16" cy="18" r="2" fill="#7bd0ff"/><path d="M6 25H26" stroke="#ffdf9f" stroke-width="2" stroke-linecap="round"/>`,
    body: `<path d="M11 6L6 11L9 15L10 26H22L23 15L26 11L21 6L16 10L11 6Z" fill="#86efac" fill-opacity="0.2" stroke="#a7c4b0" stroke-width="1.9" stroke-linejoin="round"/><path d="M16 10V26" stroke="#e5c27b" stroke-width="1.5"/>`,
    feet: `<path d="M11 6H18V18L25 21V25H9V18L11 6Z" fill="#7bd0ff" fill-opacity="0.22" stroke="#7bd0ff" stroke-width="1.9" stroke-linejoin="round"/><path d="M7 11L11 10M6 15L10.5 14" stroke="#e5c27b" stroke-width="1.6" stroke-linecap="round"/>`,
    trinket: `<circle cx="16" cy="18" r="7.5" fill="#c084fc" fill-opacity="0.25" stroke="#e5c27b" stroke-width="2"/><polygon points="16,13 19.5,18 16,23 12.5,18" fill="#c084fc" stroke="#f3e8ff" stroke-width="1.2"/><path d="M12 10.5C12 7.5 20 7.5 20 10.5" stroke="#e5c27b" stroke-width="1.8" stroke-linecap="round"/>`,
  };
  return wrapSvg(icons[s] || icons.trinket, size);
}

// ============================================================================
// 4. SHRINE SVG EMBLEMS (All 5 Shrine Types)
// ============================================================================
export function shrineIconSvg(type, size = 24) {
  const icons = {
    transmutation: `<path d="M6 16H26L23 22H9L6 16Z" fill="#7bd0ff" fill-opacity="0.25" stroke="#7bd0ff" stroke-width="2" stroke-linejoin="round"/><path d="M11 22L9 27H23L21 22" stroke="#e5c27b" stroke-width="1.8"/><path d="M16 5L17.8 9.2L22 11L17.8 12.8L16 17L14.2 12.8L10 11L14.2 9.2Z" fill="#ffdf9f"/>`,
    duplication: `<polygon points="12,6 19,16 12,26 5,16" fill="#c084fc" fill-opacity="0.28" stroke="#c084fc" stroke-width="1.9"/><polygon points="20,6 27,16 20,26 13,16" fill="#7bd0ff" fill-opacity="0.28" stroke="#7bd0ff" stroke-width="1.9"/>`,
    empowerment: `<path d="M16 4L21 12V27H11V12L16 4Z" fill="#e5c27b" fill-opacity="0.25" stroke="#e5c27b" stroke-width="2" stroke-linejoin="round"/><path d="M16 11V21M13 15L16 11L19 15" stroke="#fef08a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
    chronomancy: `<path d="M9 5H23M9 27H23M10 5C10 12 16 14 16 16C16 18 10 20 10 27M22 5C22 12 16 14 16 16C16 18 22 20 22 27" stroke="#7bd0ff" stroke-width="2" stroke-linecap="round"/><polygon points="12,24 20,24 16,19" fill="#e5c27b"/>`,
    calling: `<path d="M8 22H24L21 27H11L8 22Z" fill="#e5c27b" fill-opacity="0.25" stroke="#e5c27b" stroke-width="1.9"/><path d="M16 6C16 6 22 11.5 22 16C22 19.3 19.3 21.5 16 21.5C12.7 21.5 10 19.3 10 16C10 11.5 16 6 16 6Z" fill="#4ade80" fill-opacity="0.35" stroke="#4ade80" stroke-width="1.9"/>`,
  };
  return wrapSvg(icons[type] || icons.transmutation, size);
}

// ============================================================================
// 5. ENTITY / MONSTER / ITEM / PORTAL SVG ICONS (For Inspector & Cards)
// ============================================================================
export function entityIconSvg(kind, size = 36) {
  const icons = {
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
  return wrapSvg(icons[kind] || icons.empty, size);
}

// ============================================================================
// 6. UI CHROME ICONS
// ============================================================================
export function uiIconSvg(name, size = 18) {
  const icons = {
    brand: `<polygon points="16,2 28,9 28,23 16,30 4,23 4,9" fill="#e5c27b" fill-opacity="0.16" stroke="#e5c27b" stroke-width="2"/><path d="M17.5 6.5L10 17H15.5L14 25.5L22 14.5H16.5L17.5 6.5Z" fill="#ffdf9f"/>`,
    heart: `<path d="M16 26.5C16 26.5 6 20 6 12.5C6 8.9 8.9 6 12.3 6C14.3 6 15.5 7 16 8.2C16.5 7 17.7 6 19.7 6C23.1 6 26 8.9 26 12.5C26 20 16 26.5 16 26.5Z" fill="#f87171" fill-opacity="0.3" stroke="#f87171" stroke-width="2" stroke-linejoin="round"/>`,
    shield: `<path d="M16 4L25 8V15.5C25 21.5 21 25.5 16 28C11 25.5 7 21.5 7 15.5V8L16 4Z" fill="#7bd0ff" fill-opacity="0.25" stroke="#7bd0ff" stroke-width="2" stroke-linejoin="round"/>`,
    ward: `<polygon points="16,4 26,10 26,22 16,28 6,22 6,10" fill="#e5c27b" fill-opacity="0.22" stroke="#e5c27b" stroke-width="2"/>`,
    sp: `<path d="M16 4L19 13L28 16L19 19L16 28L13 19L4 16L13 13Z" fill="#ffdf9f" stroke="#e5c27b" stroke-width="1.4"/>`,
    skull: `<path d="M8 14C8 9 11.5 6 16 6C20.5 6 24 9 24 14C24 17.2 22.5 19.5 20.5 21V25H11.5V21C9.5 19.5 8 17.2 8 14Z" fill="#f87171" fill-opacity="0.22" stroke="#f87171" stroke-width="2" stroke-linejoin="round"/><circle cx="13" cy="14.5" r="2" fill="#f87171"/><circle cx="19" cy="14.5" r="2" fill="#f87171"/><path d="M14 25V22M18 25V22" stroke="#f87171" stroke-width="1.6"/>`,
    wait: `<circle cx="16" cy="16" r="10" stroke="#e5c27b" stroke-width="2"/><path d="M16 10V16L20 19" stroke="#ffdf9f" stroke-width="2" stroke-linecap="round"/>`,
    threat: `<circle cx="16" cy="16" r="9.5" stroke="#f87171" stroke-width="2"/><circle cx="16" cy="16" r="4" fill="#f87171" fill-opacity="0.4" stroke="#f87171" stroke-width="1.6"/><path d="M16 3V7M16 25V29M3 16H7M25 16H29" stroke="#f87171" stroke-width="1.8" stroke-linecap="round"/>`,
  };
  return wrapSvg(icons[name] || icons.sp, size);
}

// ============================================================================
// 7. HIGH-DETAIL CANVAS 2D TILESET & SPRITE RENDERER (32x32 per tile)
// ============================================================================
export function drawDungeonTile(ctx, x, y, tile, tVal, theme, n, time) {
  const px = x * tile, py = y * tile;
  if (tVal === 2) {
    // Abyssal Chasm with swirling void depth
    const grad = ctx.createRadialGradient(px + tile / 2, py + tile / 2, 2, px + tile / 2, py + tile / 2, tile * 0.72);
    grad.addColorStop(0, '#020408');
    grad.addColorStop(0.7, '#060c14');
    grad.addColorStop(1, '#112230');
    ctx.fillStyle = grad;
    ctx.fillRect(px, py, tile, tile);
    // Rim bevel
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 1.5, py + 1.5, tile - 3, tile - 3);
    // Subtle drifting void star
    const twinkle = 0.25 + 0.35 * Math.sin(time * 0.002 + x * 1.7 + y * 2.3);
    ctx.fillStyle = `rgba(125, 211, 252, ${twinkle})`;
    ctx.beginPath();
    ctx.arc(px + 8 + (n * 16), py + 8 + ((n * 7 % 1) * 16), 1.2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const isEmber = theme === 1;
  if (tVal === 1) {
    // Carved Masonry Wall Block
    const baseColors = isEmber ? ['#2b211f', '#312522', '#261d1b'] : ['#1f2d25', '#24342b', '#1c2921'];
    ctx.fillStyle = baseColors[Math.floor(n * 3)];
    ctx.fillRect(px + 0.5, py + 0.5, tile - 1, tile - 1);

    // Top highlight bevel & bottom shadow for 3D block feel
    ctx.fillStyle = isEmber ? 'rgba(251, 146, 60, 0.14)' : 'rgba(134, 239, 172, 0.12)';
    ctx.fillRect(px + 1, py + 1, tile - 2, 3);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.fillRect(px + 1, py + tile - 4, tile - 2, 3.5);

    // Brick mortar lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 1, py + tile * 0.52);
    ctx.lineTo(px + tile - 1, py + tile * 0.52);
    ctx.moveTo(px + tile * 0.5, py + 1);
    ctx.lineTo(px + tile * 0.5, py + tile * 0.52);
    ctx.stroke();

    // Organic Moss tuft or Glowing Ember vein
    if (n > 0.62) {
      ctx.fillStyle = isEmber ? 'rgba(249, 115, 22, 0.45)' : 'rgba(74, 222, 128, 0.32)';
      ctx.fillRect(px + 6 + Math.floor(n * 10), py + 6, 5, 2.5);
      ctx.fillRect(px + 9 + Math.floor(n * 8), py + 8.5, 3, 2);
    }
    return;
  }

  // Flagstone Dungeon Floor
  const floorColors = isEmber ? ['#161211', '#181413', '#141110'] : ['#111a15', '#131d17', '#0f1713'];
  ctx.fillStyle = floorColors[Math.floor(n * 3)];
  ctx.fillRect(px + 0.5, py + 0.5, tile - 1, tile - 1);

  // Subtle tile border
  ctx.strokeStyle = isEmber ? 'rgba(255, 223, 159, 0.035)' : 'rgba(134, 239, 172, 0.04)';
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 0.5, py + 0.5, tile - 1, tile - 1);

  // Tiny decorative pebbles / moss sprigs / ember dust
  if (n > 0.78) {
    ctx.fillStyle = isEmber ? 'rgba(251, 146, 60, 0.16)' : 'rgba(134, 239, 172, 0.16)';
    ctx.beginPath();
    ctx.arc(px + 10 + n * 8, py + 21, 1.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (n < 0.16) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.fillRect(px + 18, py + 11, 3, 2);
  }
}

export function drawCanvasCloud(ctx, cloud, tile, time) {
  const cx = cloud.x * tile + tile / 2;
  const cy = cloud.y * tile + tile / 2;
  const pulse = 1 + 0.08 * Math.sin(time * 0.004 + cloud.x + cloud.y);
  ctx.save();
  const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, tile * 0.55 * pulse);
  grad.addColorStop(0, `${cloud.color}66`);
  grad.addColorStop(0.65, `${cloud.color}33`);
  grad.addColorStop(1, `${cloud.color}00`);
  ctx.fillStyle = grad;
  ctx.fillRect(cloud.x * tile, cloud.y * tile, tile, tile);

  // Fluffy puffs
  ctx.fillStyle = `${cloud.color}55`;
  const drift = Math.sin(time * 0.003 + cloud.x * 2) * 1.5;
  ctx.beginPath();
  ctx.arc(cx - 5 + drift, cy + 2, 5.5, 0, Math.PI * 2);
  ctx.arc(cx + 4 + drift, cy + 1, 6, 0, Math.PI * 2);
  ctx.arc(cx + drift, cy - 3, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawCanvasPortal(ctx, portal, tile, isOpen, time) {
  const cx = portal.x * tile + tile / 2;
  const cy = portal.y * tile + tile / 2;
  const primary = portal.theme ? '#fb923c' : '#34d399';
  const secondary = portal.theme ? '#fef08a' : '#7bd0ff';
  const pulse = 0.88 + 0.12 * Math.sin(time * 0.005 + portal.y);

  ctx.save();
  // Outer aura when open
  if (isOpen) {
    const glow = ctx.createRadialGradient(cx, cy, 3, cx, cy, tile * 0.65);
    glow.addColorStop(0, `${primary}99`);
    glow.addColorStop(0.6, `${primary}33`);
    glow.addColorStop(1, `${primary}00`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, tile * 0.65, 0, Math.PI * 2);
    ctx.fill();
  }

  // Stone rune frame
  ctx.strokeStyle = isOpen ? primary : '#526358';
  ctx.lineWidth = isOpen ? 2.4 : 1.8;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 10.5 * pulse, 13.5 * pulse, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Swirling inner vortex
  ctx.fillStyle = isOpen ? `${primary}55` : '#1a241f';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 7.5 * pulse, 10.5 * pulse, 0, 0, Math.PI * 2);
  ctx.fill();

  if (isOpen) {
    // Rotating arcane swirl arcs
    const rot = time * 0.003;
    ctx.strokeStyle = secondary;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(cx, cy, 5.5, rot, rot + Math.PI * 1.1);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 2.3 * pulse, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Sealed lock cross
    ctx.strokeStyle = '#64746b';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy - 4); ctx.lineTo(cx + 4, cy + 4);
    ctx.moveTo(cx + 4, cy - 4); ctx.lineTo(cx - 4, cy + 4);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawCanvasShrine(ctx, shrine, tile, time) {
  const cx = shrine.x * tile + tile / 2;
  const cy = shrine.y * tile + tile / 2;
  const active = shrine.uses > 0;
  const colors = {
    transmutation: '#7bd0ff',
    duplication: '#c084fc',
    empowerment: '#ffdf9f',
    chronomancy: '#38bdf8',
    calling: '#4ade80',
  };
  const col = active ? (colors[shrine.type] || '#7bd0ff') : '#4b5a52';
  const bob = active ? Math.sin(time * 0.004) * 1.6 : 0;

  ctx.save();
  if (active) {
    const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, tile * 0.58);
    glow.addColorStop(0, `${col}55`);
    glow.addColorStop(1, `${col}00`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, tile * 0.58, 0, Math.PI * 2);
    ctx.fill();
  }
  // Stone pedestal
  ctx.fillStyle = '#25312b';
  ctx.strokeStyle = active ? '#e5c27b' : '#3d4c44';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(cx - 9, cy + 4, 18, 7, 2);
  ctx.fill();
  ctx.stroke();

  // Floating crystal / emblem above pedestal
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 11 + bob);
  ctx.lineTo(cx + 7, cy - 2 + bob);
  ctx.lineTo(cx, cy + 4 + bob);
  ctx.lineTo(cx - 7, cy - 2 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

export function drawCanvasItem(ctx, item, tile, time) {
  const cx = item.x * tile + tile / 2;
  const cy = item.y * tile + tile / 2;
  const bob = Math.sin(time * 0.005 + item.x * 1.3 + item.y) * 1.4;

  ctx.save();
  // Ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 10, 7, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  if (item.type === 'potion') {
    // Ruby Restoration Flask
    ctx.fillStyle = '#d4a373';
    ctx.fillRect(cx - 2.5, cy - 10 + bob, 5, 3);
    ctx.fillStyle = '#f43f5e';
    ctx.strokeStyle = '#fecdd3';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(cx, cy + 1 + bob, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - 2.5, cy - 1 + bob, 1.8, 0, Math.PI * 2);
    ctx.fill();
  } else if (item.type === 'shard') {
    // Golden Skill Shard Crystal
    const glow = ctx.createRadialGradient(cx, cy + bob, 1, cx, cy + bob, 11);
    glow.addColorStop(0, 'rgba(255, 223, 159, 0.55)');
    glow.addColorStop(1, 'rgba(255, 223, 159, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(cx, cy + bob, 11, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#e5c27b';
    ctx.strokeStyle = '#fffbeb';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 10 + bob);
    ctx.lineTo(cx + 6.5, cy + bob);
    ctx.lineTo(cx, cy + 9 + bob);
    ctx.lineTo(cx - 6.5, cy + bob);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    // RW3 Relic Component Gem
    const glow = ctx.createRadialGradient(cx, cy + bob, 1, cx, cy + bob, 11);
    glow.addColorStop(0, 'rgba(192, 132, 252, 0.5)');
    glow.addColorStop(1, 'rgba(192, 132, 252, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(cx, cy + bob, 11, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#c084fc';
    ctx.strokeStyle = '#f5d0fe';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      const rx = cx + Math.cos(a) * 7.2, ry = cy + bob + Math.sin(a) * 7.2;
      if (i === 0) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy + bob, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawCanvasWizard(ctx, player, tile, time) {
  const cx = player.x * tile + tile / 2;
  const cy = player.y * tile + tile / 2;
  const bob = Math.sin(time * 0.004) * 1.1;

  ctx.save();
  // Golden arcane aura ring beneath wizard
  const aura = ctx.createRadialGradient(cx, cy + 2, 3, cx, cy + 2, tile * 0.62);
  aura.addColorStop(0, 'rgba(229, 194, 123, 0.34)');
  aura.addColorStop(0.65, 'rgba(123, 208, 255, 0.14)');
  aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(cx, cy + 2, tile * 0.62, 0, Math.PI * 2);
  ctx.fill();

  // Drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 12, 9, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Robe body
  ctx.fillStyle = '#254235';
  ctx.strokeStyle = '#e5c27b';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy + 11);
  ctx.quadraticCurveTo(cx - 7, cy - 1 + bob, cx, cy - 2 + bob);
  ctx.quadraticCurveTo(cx + 7, cy - 1 + bob, cx + 8, cy + 11);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Face / Hood shadow
  ctx.fillStyle = '#0d1512';
  ctx.beginPath();
  ctx.arc(cx, cy - 2 + bob, 5.2, 0, Math.PI * 2);
  ctx.fill();
  // Glowing cyan eyes
  ctx.fillStyle = '#7bd0ff';
  ctx.fillRect(cx - 3, cy - 3 + bob, 2.2, 1.8);
  ctx.fillRect(cx + 0.8, cy - 3 + bob, 2.2, 1.8);

  // Pointed Wizard Hat
  ctx.fillStyle = '#2e4e3f';
  ctx.strokeStyle = '#ffdf9f';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 6 + bob, 10.5, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - 6.5, cy - 6.5 + bob);
  ctx.lineTo(cx + 1, cy - 16 + bob);
  ctx.lineTo(cx + 6.5, cy - 6.5 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Staff + Glowing Orb
  ctx.strokeStyle = '#d4a373';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx + 9.5, cy - 5 + bob);
  ctx.lineTo(cx + 9, cy + 11);
  ctx.stroke();

  const orbPulse = 3.2 + Math.sin(time * 0.007) * 0.5;
  ctx.fillStyle = '#7bd0ff';
  ctx.beginPath();
  ctx.arc(cx + 9.5, cy - 7 + bob, orbPulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx + 9.2, cy - 7.5 + bob, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawCanvasAlly(ctx, ally, tile, time) {
  const cx = ally.x * tile + tile / 2;
  const cy = ally.y * tile + tile / 2;
  const bob = Math.sin(time * 0.005 + ally.x) * 1.2;
  const col = ally.color || '#4ade80';

  ctx.save();
  // Friendly emerald ring
  ctx.strokeStyle = 'rgba(74, 222, 128, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 10, 9.5, 3.8, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Spirit guardian body
  ctx.fillStyle = `${col}cc`;
  ctx.strokeStyle = '#ecfdf5';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 10 + bob);
  ctx.lineTo(cx + 8, cy - 2 + bob);
  ctx.lineTo(cx + 6, cy + 9 + bob);
  ctx.lineTo(cx - 6, cy + 9 + bob);
  ctx.lineTo(cx - 8, cy - 2 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Bright friendly eyes
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx - 2.6, cy - 1.5 + bob, 1.5, 0, Math.PI * 2);
  ctx.arc(cx + 2.6, cy - 1.5 + bob, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawCanvasEnemy(ctx, enemy, tile, time) {
  const cx = enemy.x * tile + tile / 2;
  const cy = enemy.y * tile + tile / 2;
  const bob = Math.sin(time * 0.0045 + enemy.id * 1.1) * 1.1;

  ctx.save();
  // Drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.48)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 11.5, enemy.boss ? 11 : 8, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  if (enemy.isSpawner) {
    // Rift Lair — Pulsing Violet Obelisk
    const pulse = 1 + 0.08 * Math.sin(time * 0.006 + enemy.id);
    ctx.fillStyle = '#4c1d95';
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 13);
    ctx.lineTo(cx + 9, cy - 4);
    ctx.lineTo(cx + 7, cy + 11);
    ctx.lineTo(cx - 7, cy + 11);
    ctx.lineTo(cx - 9, cy - 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 3.5 * pulse, 5.5 * pulse, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.isFinalBoss) {
    // Mordred — Crimson Dread Arch-Lich
    const glow = ctx.createRadialGradient(cx, cy, 3, cx, cy, tile * 0.65);
    glow.addColorStop(0, 'rgba(248, 113, 113, 0.55)');
    glow.addColorStop(1, 'rgba(248, 113, 113, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(cx, cy, tile * 0.65, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#7f1d1d';
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy + bob, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Crown
    ctx.strokeStyle = '#ffdf9f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 7 + bob); ctx.lineTo(cx - 5, cy - 14 + bob);
    ctx.lineTo(cx, cy - 9 + bob); ctx.lineTo(cx + 5, cy - 14 + bob); ctx.lineTo(cx + 8, cy - 7 + bob);
    ctx.stroke();
    // Glowing eyes
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(cx - 3.5, cy - 1 + bob, 2.2, 0, Math.PI * 2);
    ctx.arc(cx + 3.5, cy - 1 + bob, 2.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.boss) {
    // The Rift Sovereign — Crowned Gold Boss
    ctx.fillStyle = '#4a3a18';
    ctx.strokeStyle = '#ffdf9f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy + 1 + bob, 9.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#ffdf9f';
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy - 7 + bob); ctx.lineTo(cx - 4, cy - 13 + bob);
    ctx.lineTo(cx, cy - 8 + bob); ctx.lineTo(cx + 4, cy - 13 + bob); ctx.lineTo(cx + 7, cy - 7 + bob);
    ctx.stroke();
    ctx.fillStyle = '#f87171';
    ctx.beginPath();
    ctx.arc(cx - 3.2, cy + bob, 2, 0, Math.PI * 2);
    ctx.arc(cx + 3.2, cy + bob, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.type === 0) {
    // Cinder Imp — Expressive ember-orange horned imp
    ctx.strokeStyle = '#fb923c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy - 6 + bob); ctx.lineTo(cx - 9, cy - 12 + bob);
    ctx.moveTo(cx + 5, cy - 6 + bob); ctx.lineTo(cx + 9, cy - 12 + bob);
    ctx.stroke();

    ctx.fillStyle = '#ea580c';
    ctx.strokeStyle = '#fdba74';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(cx, cy + 1 + bob, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(cx - 3, cy - 0.5 + bob, 1.8, 0, Math.PI * 2);
    ctx.arc(cx + 3, cy - 0.5 + bob, 1.8, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.type === 1) {
    // Hollow Knight — Armored dark-steel helm with glowing cyan visor
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cx - 7.5, cy - 9 + bob, 15, 18, [6, 6, 3, 3]);
    ctx.fill();
    ctx.stroke();
    // Visor
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx - 5.5, cy - 2 + bob, 11, 3.5);
    ctx.fillStyle = '#7bd0ff';
    ctx.fillRect(cx - 4, cy - 1 + bob, 8, 1.6);
  } else if (enemy.type === 2) {
    // Thorn Eye — Floating thorny arcane eyeball
    ctx.strokeStyle = '#86efac';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i + time * 0.001;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 7, cy + bob + Math.sin(a) * 7);
      ctx.lineTo(cx + Math.cos(a) * 11, cy + bob + Math.sin(a) * 11);
      ctx.stroke();
    }
    ctx.fillStyle = '#3b0764';
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy + bob, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(cx, cy + bob, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx + 1, cy - 1 + bob, 1.2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Rift Moth — Luminous fluttering storm-moth
    const flap = Math.sin(time * 0.012 + enemy.id) * 2.5;
    ctx.fillStyle = 'rgba(250, 204, 21, 0.72)';
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.ellipse(cx - 6.5, cy - 1 + bob, 6, 4.5 + flap * 0.3, -0.35, 0, Math.PI * 2);
    ctx.ellipse(cx + 6.5, cy - 1 + bob, 6, 4.5 + flap * 0.3, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#86efac';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 1 + bob, 2.5, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawCanvasEffect(ctx, effect, tile) {
  const cx = effect.x * tile + tile / 2;
  const cy = effect.y * tile + tile / 2;
  ctx.save();
  const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, tile * 0.65);
  grad.addColorStop(0, `${effect.color}bb`);
  grad.addColorStop(0.6, `${effect.color}44`);
  grad.addColorStop(1, `${effect.color}00`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, tile * 0.65, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = effect.color;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(cx, cy, tile * 0.38, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
