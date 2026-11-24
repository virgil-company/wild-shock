// Unique 64x64 visual assets for all 198 Spells.

import { elementalFlourish, hashString, resolvePalette, uniqueBackdrop, wrapAssetSvg } from './palette.js';
import { unitSilhouetteInner } from './units.js';

// Bespoke handcrafted artwork for signature iconic spells
const SPELL_ART = {
  Fireball: `
    <path d="M12 52C14 34 22 20 35 12C33 20 37 22 43 17C47 26 52 31 50 42C47 51 39 54 30 53Z" fill="#ea580c" fill-opacity="0.72" stroke="#fed7aa" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="34" cy="36" r="12" fill="#f97316" stroke="#fef08a" stroke-width="2"/>
    <circle cx="33" cy="36" r="6" fill="#fef08a"/>
    <path d="M10 47L19 42M15 55L24 47" stroke="#fb923c" stroke-width="2.4" stroke-linecap="round"/>`,

  Iceball: `
    <circle cx="32" cy="32" r="15" fill="#0284c7" fill-opacity="0.65" stroke="#bae6fd" stroke-width="2.2"/>
    <path d="M32 9V55M12 20L52 44M52 20L12 44" stroke="#e0f2fe" stroke-width="2.2" stroke-linecap="round"/>
    <polygon points="32,20 40,32 32,44 24,32" fill="#7dd3fc" fill-opacity="0.7" stroke="#ffffff" stroke-width="1.5"/>`,

  'Lightning Bolt': `
    <path d="M40 7L17 34H31L23 57L48 28H34L40 7Z" fill="#facc15" fill-opacity="0.82" stroke="#fef9c3" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M12 22L19 25M46 42L54 45" stroke="#7dd3fc" stroke-width="2" stroke-linecap="round"/>`,

  'Chain Lightning': `
    <polyline points="10,16 24,25 18,32 33,38 29,46 53,51" stroke="#facc15" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <polyline points="33,38 45,23 54,15" stroke="#fef08a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="10" cy="16" r="4" fill="#7dd3fc"/><circle cx="33" cy="38" r="4.5" fill="#ffffff" stroke="#facc15" stroke-width="1.6"/>
    <circle cx="53" cy="51" r="4" fill="#7dd3fc"/><circle cx="54" cy="15" r="3.5" fill="#fef08a"/>`,

  'Magic Missile': `
    <path d="M10 42L27 25L23 33L10 42Z" fill="#c084fc" stroke="#f3e8ff" stroke-width="1.5"/>
    <path d="M18 52L48 16L40 31L18 52Z" fill="#a855f7" stroke="#ffffff" stroke-width="1.8"/>
    <path d="M31 54L52 33L42 40L31 54Z" fill="#67e8f9" stroke="#e0f2fe" stroke-width="1.5"/>
    <circle cx="48" cy="16" r="3.5" fill="#ffffff"/><circle cx="27" cy="25" r="2.5" fill="#f3e8ff"/><circle cx="52" cy="33" r="2.5" fill="#a5f3fc"/>`,

  'Blood Bullet': `
    <path d="M12 32H29C39 32 49 28 53 32C49 36 39 32 29 32Z" fill="#ef4444"/>
    <path d="M24 23H40C47 23 54 27 54 32C54 37 47 41 40 41H24Z" fill="#cbd5e1" stroke="#f87171" stroke-width="2.2" stroke-linejoin="round"/>
    <line x1="33" y1="23" x2="33" y2="41" stroke="#dc2626" stroke-width="2.5"/>
    <path d="M9 26H19M7 32H18M11 38H19" stroke="#ef4444" stroke-width="2.4" stroke-linecap="round"/>`,

  'Death Bolt': `
    <path d="M10 48L35 23" stroke="#a78bfa" stroke-width="5" stroke-linecap="round"/>
    <circle cx="43" cy="21" r="10" fill="#2e1065" stroke="#ede9fe" stroke-width="2"/>
    <circle cx="40" cy="20" r="2.2" fill="#4ade80"/><circle cx="46" cy="20" r="2.2" fill="#4ade80"/>
    <path d="M40 27V30M43 27V30M46 27V30" stroke="#ede9fe" stroke-width="1.5"/>`,

  'Dragon Claw': `
    <path d="M13 18C24 25 32 36 37 52" stroke="#f97316" stroke-width="4.5" stroke-linecap="round"/>
    <path d="M24 11C35 20 43 32 47 48" stroke="#fef08a" stroke-width="4.5" stroke-linecap="round"/>
    <path d="M37 10C46 18 52 28 55 41" stroke="#ef4444" stroke-width="4" stroke-linecap="round"/>`,

  'Dragon Breath': `
    <path d="M10 24L22 18L26 27L19 32L26 37L20 44L10 38Z" fill="#9a3412" stroke="#fed7aa" stroke-width="1.8" stroke-linejoin="round"/>
    <circle cx="17" cy="24" r="1.8" fill="#fef08a"/>
    <path d="M24 32L55 15V49Z" fill="#f97316" fill-opacity="0.45" stroke="#fef08a" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M26 32L53 24M26 32L54 32M26 32L53 40" stroke="#38bdf8" stroke-opacity="0.75" stroke-width="2" stroke-linecap="round"/>`,

  Icicle: `
    <polygon points="32,8 42,20 36,56 28,56 22,20" fill="#38bdf8" fill-opacity="0.72" stroke="#e0f2fe" stroke-width="2" stroke-linejoin="round"/>
    <polygon points="16,14 21,21 18,40 14,21" fill="#7dd3fc" stroke="#e0f2fe" stroke-width="1.3"/>
    <polygon points="48,14 52,21 48,40 44,21" fill="#7dd3fc" stroke="#e0f2fe" stroke-width="1.3"/>
    <line x1="32" y1="12" x2="32" y2="52" stroke="#ffffff" stroke-width="1.5"/>`,

  'Poison Sting': `
    <path d="M13 51L47 17" stroke="#84cc16" stroke-width="3.2" stroke-linecap="round"/>
    <polygon points="53,11 46,24 40,18" fill="#ecfccb" stroke="#84cc16" stroke-width="1.6"/>
    <path d="M47 29C47 29 53 36 53 40A6 6 0 0 1 41 40C41 36 47 29 47 29Z" fill="#65a30d" stroke="#d9f99d" stroke-width="1.8"/>
    <path d="M18 39L25 46" stroke="#a3e635" stroke-width="2.6" stroke-linecap="round"/>`,

  'Black Hole': `
    <ellipse cx="32" cy="32" rx="26" ry="9" transform="rotate(-22 32 32)" stroke="#c084fc" stroke-width="3" fill="none"/>
    <ellipse cx="32" cy="32" rx="22" ry="6" transform="rotate(-22 32 32)" stroke="#67e8f9" stroke-width="1.5" fill="none"/>
    <circle cx="32" cy="32" r="13" fill="#030712" stroke="#f0abfc" stroke-width="2.4"/>
    <circle cx="32" cy="32" r="8" fill="#000000"/>`,

  'Death Clock': `
    <circle cx="32" cy="32" r="20" fill="#18181b" stroke="#cbd5e1" stroke-width="2.6"/>
    <circle cx="32" cy="32" r="15" stroke="#a78bfa" stroke-width="1.4" stroke-dasharray="2 4"/>
    <path d="M32 32V19M32 32L42 36" stroke="#f87171" stroke-width="2.6" stroke-linecap="round"/>
    <circle cx="32" cy="14" r="3" fill="#e4e4e7"/>`,

  'Wheel of Death': `
    <circle cx="32" cy="32" r="18" stroke="#e4e4e7" stroke-width="3.6" fill="none"/>
    <path d="M32 8V56M8 32H56M15 15L49 49M49 15L15 49" stroke="#a78bfa" stroke-width="2.2"/>
    <circle cx="32" cy="32" r="6" fill="#2e1065" stroke="#f87171" stroke-width="2"/>`,

  Magnetize: `
    <path d="M18 14V34C18 44 24 50 32 50C40 50 46 44 46 34V14" stroke="#ef4444" stroke-width="7" stroke-linecap="butt" fill="none"/>
    <rect x="14.5" y="12" width="7" height="7" fill="#e2e8f0"/><rect x="42.5" y="12" width="7" height="7" fill="#e2e8f0"/>
    <polyline points="26,22 32,28 28,31 37,37" stroke="#facc15" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,

  'Moon Glaive': `
    <path d="M44 13A20 20 0 1 0 44 51A14 14 0 1 1 44 13Z" fill="#cbd5e1" fill-opacity="0.82" stroke="#c084fc" stroke-width="2.2"/>
    <circle cx="29" cy="32" r="4" fill="#67e8f9" stroke="#ffffff" stroke-width="1.4"/>`,

  'Bone Spear': `
    <line x1="12" y1="52" x2="46" y2="18" stroke="#f5f5f4" stroke-width="4" stroke-linecap="round"/>
    <polygon points="54,10 47,26 38,17" fill="#fffbeb" stroke="#ef4444" stroke-width="1.8"/>
    <circle cx="11" cy="50" r="3" fill="#f5f5f4"/><circle cx="14" cy="53" r="3" fill="#f5f5f4"/>`,

  'Silver Spear': `
    <line x1="12" y1="52" x2="46" y2="18" stroke="#e2e8f0" stroke-width="3.6" stroke-linecap="round"/>
    <polygon points="55,9 46,26 38,18" fill="#ffffff" stroke="#fde68a" stroke-width="1.8"/>
    <path d="M36 16L48 28" stroke="#fde68a" stroke-width="2.2"/>`,

  'Armageddon Blade': `
    <path d="M14 50L47 12L54 10L52 17L20 53Z" fill="#fb7185" fill-opacity="0.8" stroke="#fef08a" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M13 38L27 51" stroke="#fde047" stroke-width="4" stroke-linecap="round"/>
    <path d="M29 22L36 29M36 15L43 22" stroke="#fef08a" stroke-width="2"/>`,

  'Volcanic Eruption': `
    <polygon points="10,54 24,26 40,26 54,54" fill="#57534e" stroke="#fb923c" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M26 26C25 16 29 11 32 8C35 11 39 16 38 26Z" fill="#f97316" stroke="#fef08a" stroke-width="1.8"/>
    <path d="M29 28L25 46M35 28L39 44" stroke="#ef4444" stroke-width="2.6" stroke-linecap="round"/>
    <circle cx="18" cy="17" r="2.5" fill="#fb923c"/><circle cx="47" cy="16" r="2.2" fill="#fef08a"/>`,

  Earthquake: `
    <path d="M8 44H24L29 31L35 49L41 37L46 44H56" stroke="#a16207" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
    <polygon points="22,42 29,24 35,42" fill="#78716c" stroke="#86efac" stroke-width="1.8"/>
    <polygon points="35,44 43,29 50,44" fill="#57534e" stroke="#4ade80" stroke-width="1.6"/>`,

  'Prison of Thorns': `
    <path d="M16 14V50M27 12V52M37 12V52M48 14V50" stroke="#4ade80" stroke-width="3" stroke-linecap="round"/>
    <path d="M12 24H52M12 40H52" stroke="#22c55e" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M16 20L11 17M27 32L22 29M37 22L42 19M48 36L53 33" stroke="#c084fc" stroke-width="2" stroke-linecap="round"/>`,

  'Gates of Helheim': `
    <path d="M13 54V22C13 13 21 9 32 9C43 9 51 13 51 22V54" stroke="#a78bfa" stroke-width="3" fill="none"/>
    <path d="M22 14V54M32 10V54M42 14V54" stroke="#7c3aed" stroke-width="2.4"/>
    <polyline points="17,27 29,34 25,40 46,47" stroke="#facc15" stroke-width="2.4" stroke-linecap="round"/>`,

  'Wall of Ice': `
    <polygon points="10,52 13,20 22,12 29,22 36,10 44,21 51,14 54,52" fill="#38bdf8" fill-opacity="0.52" stroke="#e0f2fe" stroke-width="2.2" stroke-linejoin="round"/>
    <line x1="22" y1="14" x2="22" y2="52" stroke="#bae6fd" stroke-width="1.5"/><line x1="36" y1="12" x2="36" y2="52" stroke="#bae6fd" stroke-width="1.5"/>`,

  'Wall of Flame': `
    <path d="M10 52C10 34 15 24 18 16C21 26 24 22 28 12C31 24 35 20 38 14C42 25 46 21 49 17C52 28 54 36 54 52Z" fill="#f97316" fill-opacity="0.72" stroke="#fef08a" stroke-width="2" stroke-linejoin="round"/>
    <path d="M16 52C18 40 22 34 26 32C30 38 34 30 38 30C42 36 46 40 48 52Z" fill="#fef08a" fill-opacity="0.75"/>`,

  'Pillar of Fire': `
    <path d="M22 55V12C26 8 38 8 42 12V55Z" fill="#f97316" fill-opacity="0.65" stroke="#fef08a" stroke-width="2.2"/>
    <path d="M27 55V16C30 13 34 13 37 16V55Z" fill="#fef08a" fill-opacity="0.8"/>
    <ellipse cx="32" cy="54" rx="18" ry="4" stroke="#fde68a" stroke-width="2"/>`,

  'Healing Light': `
    <path d="M14 54L24 12H40L50 54Z" fill="#fde68a" fill-opacity="0.28" stroke="#fde68a" stroke-width="1.6"/>
    <path d="M32 20V46M20 33H44" stroke="#fffbeb" stroke-width="5" stroke-linecap="round"/>
    <path d="M32 20V46M20 33H44" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"/>`,

  'Heavenly Blast': `
    <circle cx="32" cy="32" r="14" fill="#fde68a" fill-opacity="0.45" stroke="#fffbeb" stroke-width="2.2"/>
    <path d="M32 6V16M32 48V58M6 32H16M48 32H58M14 14L21 21M43 43L50 50M50 14L43 21M21 43L14 50" stroke="#fde68a" stroke-width="2.6" stroke-linecap="round"/>
    <circle cx="32" cy="32" r="6" fill="#ffffff"/>`,

  'Touch of Death': `
    <path d="M22 54V33L18 22C17 19 21 18 22 21L25 30V15C25 12 29 12 29 15V29V13C29 10 34 10 34 13V29V16C34 13 38 13 38 16V31L42 23C43 20 47 22 45 25L41 38V54Z" fill="#e4e4e7" fill-opacity="0.28" stroke="#a78bfa" stroke-width="2"/>
    <circle cx="32" cy="38" r="5" fill="#7c3aed" stroke="#f472b6" stroke-width="1.6"/>`,

  'Bouncing Slimeball': `
    <path d="M10 47Q19 20 28 45Q36 28 45 24" stroke="#bef264" stroke-width="2" stroke-dasharray="3 3" fill="none"/>
    <circle cx="46" cy="24" r="11" fill="#84cc16" fill-opacity="0.78" stroke="#ecfccb" stroke-width="2.2"/>
    <circle cx="43" cy="21" r="2.6" fill="#ecfccb"/><circle cx="14" cy="48" r="4" fill="#a3e635" fill-opacity="0.5"/>`,

  'Dread Lash': `
    <path d="M13 51C16 32 34 40 38 28C42 16 28 14 25 22C23 28 36 25 52 14" stroke="#a78bfa" stroke-width="3.2" stroke-linecap="round" fill="none"/>
    <polygon points="54,12 46,13 50,20" fill="#f472b6"/>`,

  Freeze: `
    <polygon points="32,9 51,21 51,43 32,55 13,43 13,21" fill="#38bdf8" fill-opacity="0.34" stroke="#bae6fd" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M32 16V48M18 24L46 40M46 24L18 40" stroke="#e0f2fe" stroke-width="2" stroke-linecap="round"/>`,

  Petrify: `
    <polygon points="22,52 16,32 23,14 41,14 48,32 42,52" fill="#64748b" fill-opacity="0.72" stroke="#cbd5e1" stroke-width="2.2" stroke-linejoin="round"/>
    <polyline points="28,15 33,27 26,37 35,51" stroke="#c084fc" stroke-width="2.2" stroke-linecap="round"/>`,

  Melt: `
    <path d="M14 26H50V36C50 40 46 40 46 35C46 31 41 31 41 39C41 47 36 47 36 37C36 32 31 32 31 44C31 52 25 52 25 42C25 33 20 33 20 40C20 44 14 44 14 36Z" fill="#f97316" fill-opacity="0.78" stroke="#fef08a" stroke-width="2" stroke-linejoin="round"/>`,

  Shatter: `
    <polygon points="32,10 38,24 25,22" fill="#bae6fd" stroke="#ffffff" stroke-width="1.4"/>
    <polygon points="48,24 37,33 44,44" fill="#38bdf8" stroke="#e0f2fe" stroke-width="1.4"/>
    <polygon points="15,28 28,31 19,45" fill="#7dd3fc" stroke="#ffffff" stroke-width="1.4"/>
    <polygon points="31,37 40,52 24,52" fill="#e0f2fe" stroke="#38bdf8" stroke-width="1.4"/>`,

  'Pain Mirror': `
    <ellipse cx="32" cy="32" rx="16" ry="22" fill="#ef4444" fill-opacity="0.28" stroke="#fca5a5" stroke-width="2.4"/>
    <polyline points="26,14 34,27 25,35 37,49" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>`,

  'Ritual of Flying Daggers': `
    <path d="M32 9L35 23H29Z" fill="#e2e8f0" stroke="#fbbf24" stroke-width="1.2"/>
    <path d="M55 32L41 35V29Z" fill="#e2e8f0" stroke="#fbbf24" stroke-width="1.2"/>
    <path d="M32 55L29 41H35Z" fill="#e2e8f0" stroke="#fbbf24" stroke-width="1.2"/>
    <path d="M9 32L23 29V35Z" fill="#e2e8f0" stroke="#fbbf24" stroke-width="1.2"/>
    <circle cx="32" cy="32" r="14" stroke="#fbbf24" stroke-width="1.8" stroke-dasharray="4 3"/>`,

  'Prismatic Beam': `
    <polygon points="14,44 26,20 38,44" fill="#e0f2fe" fill-opacity="0.45" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>
    <line x1="6" y1="34" x2="21" y2="34" stroke="#ffffff" stroke-width="3"/>
    <line x1="33" y1="28" x2="57" y2="17" stroke="#f87171" stroke-width="2.4"/>
    <line x1="35" y1="32" x2="58" y2="27" stroke="#facc15" stroke-width="2.4"/>
    <line x1="36" y1="36" x2="58" y2="37" stroke="#4ade80" stroke-width="2.4"/>
    <line x1="35" y1="40" x2="57" y2="47" stroke="#38bdf8" stroke-width="2.4"/>`,

  Teleport: `
    <ellipse cx="32" cy="49" rx="16" ry="5" fill="#22d3ee" fill-opacity="0.35" stroke="#67e8f9" stroke-width="2"/>
    <path d="M24 47V22C24 15 40 15 40 22V47" fill="#c084fc" fill-opacity="0.28" stroke="#e9d5ff" stroke-width="2" stroke-dasharray="4 3"/>
    <path d="M32 10L34.5 16L40 18.5L34.5 21L32 27L29.5 21L24 18.5L29.5 16Z" fill="#ffffff"/>`,

  Blink: `
    <circle cx="19" cy="42" r="8" stroke="#67e8f9" stroke-opacity="0.5" stroke-width="2" stroke-dasharray="3 3"/>
    <path d="M24 38L42 22" stroke="#22d3ee" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="45" cy="20" r="9" fill="#c084fc" fill-opacity="0.6" stroke="#ffffff" stroke-width="2"/>`,

  'Fan of Flames': `
    <path d="M12 32L52 12C56 24 56 40 52 52Z" fill="#f97316" fill-opacity="0.55" stroke="#fed7aa" stroke-width="2" stroke-linejoin="round"/>
    <path d="M16 32L49 21M16 32L51 32M16 32L49 43" stroke="#fef08a" stroke-width="2.2" stroke-linecap="round"/>`,

  Lifedrain: `
    <path d="M19 36C19 25 27 18 32 14C37 18 45 25 45 36C45 44 39 50 32 50C25 50 19 44 19 36Z" fill="#991b1b" fill-opacity="0.7" stroke="#f87171" stroke-width="2.2"/>
    <path d="M12 22Q21 29 29 31M52 44Q43 37 35 35" stroke="#c084fc" stroke-width="2.4" stroke-linecap="round"/>`,

  'Boiling Blood': `
    <path d="M14 36H50C50 47 42 54 32 54C22 54 14 47 14 36Z" fill="#991b1b" stroke="#f87171" stroke-width="2.2"/>
    <circle cx="24" cy="27" r="4.5" fill="#ef4444" stroke="#fed7aa" stroke-width="1.5"/>
    <circle cx="36" cy="21" r="5.5" fill="#f97316" stroke="#fef08a" stroke-width="1.5"/>
    <circle cx="43" cy="30" r="3.2" fill="#ef4444" stroke="#fecaca" stroke-width="1.2"/>`,
};

function drawSpellPattern(spell, p) {
  const name = spell.name || '';
  const n = name.toLowerCase();
  const tags = spell.tags || [];
  const { main, light, dark, accent } = p;

  // 1. Eye / Gaze / Vision spells
  if (/\b(eye|gaze|vision|blinding|watcher)\b/.test(n) || tags.includes('Eye')) {
    return `
      <path d="M8 32C15 19 23 15 32 15C41 15 49 19 56 32C49 45 41 49 32 49C23 49 15 45 8 32Z" fill="${dark}" stroke="${light}" stroke-width="2.2"/>
      <circle cx="32" cy="32" r="11" fill="${main}" fill-opacity="0.82" stroke="${accent}" stroke-width="2"/>
      <circle cx="32" cy="32" r="4.8" fill="#09100d"/>
      <circle cx="35" cy="29" r="2.2" fill="#ffffff"/>`;
  }

  // 2. Word / Litany spells — glowing calligraphic rune tablet
  if (/\b(word|litany)\b/.test(n) || tags.includes('Word')) {
    return `
      <path d="M16 12H48V52L32 44L16 52Z" fill="${dark}" stroke="${main}" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M24 22H40M32 22V38M25 32L32 26L39 32" stroke="${accent}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  // 3. Summon / Conjuration spells — show the ACTUAL summoned unit inside a summoning circle!
  const summonTarget = spell.summons?.[0]
    || (tags.includes('Conjuration') ? name.replace(/^(Summon|Call|Dream the|Horde of|Flock of|Choir of)\s+/i, '') : null);
  if (summonTarget && (tags.includes('Conjuration') || tags.includes('Orb'))) {
    const innerUnit = unitSilhouetteInner(summonTarget, tags);
    return `<g transform="translate(6 6) scale(0.82)">${innerUnit}</g>`;
  }

  // 4. Form / Metamorphosis spells
  if (/\bform\b/.test(n)) {
    return `
      <circle cx="32" cy="18" r="7.5" fill="${main}" fill-opacity="0.7" stroke="${light}" stroke-width="2"/>
      <path d="M18 52L23 30L32 27L41 30L46 52Z" fill="${dark}" stroke="${main}" stroke-width="2.2"/>
      <path d="M11 32A21 21 0 0 1 53 32" stroke="${accent}" stroke-width="2" stroke-dasharray="4 3" fill="none"/>`;
  }

  // 5. Storm / Blizzard / Rain / Weather spells
  if (/\b(storm|blizzard|rain|miasma|cloud)\b/.test(n)) {
    return `
      <path d="M15 32H49C53 32 56 29 56 25C56 21 53 18 49 17.5C47 12 41 9 34 9C26 9 20 14 19 20C14 21 11 24 11 28C11 30.5 12.8 32 15 32Z" fill="${dark}" stroke="${light}" stroke-width="2.1"/>
      <path d="M21 37L17 51M32 37L28 54M43 37L39 51" stroke="${main}" stroke-width="2.8" stroke-linecap="round"/>
      <circle cx="24" cy="45" r="2" fill="${accent}"/><circle cx="45" cy="45" r="2" fill="${accent}"/>`;
  }

  // 6. Beam / Ray / Pulse / Arc / Bolt / Shot / Rip
  if (/\b(beam|pulse|arc|bolt|shot|rip|strike|wrath|hatebolts|annihilate|barrage|cascade)\b/.test(n)) {
    return `
      <path d="M10 52L46 16" stroke="${main}" stroke-width="6" stroke-linecap="round"/>
      <path d="M10 52L46 16" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
      <path d="M46 16L54 8M44 10L53 19M38 14L50 26" stroke="${accent}" stroke-width="2.2" stroke-linecap="round"/>
      <circle cx="46" cy="16" r="7" fill="${main}" fill-opacity="0.6" stroke="${light}" stroke-width="1.8"/>`;
  }

  // 7. Wind / Wave / Vortex / Torrent / Roar / Burst
  if (/\b(wind|wave|vortex|torrent|roar|burst|combust|shrapnel)\b/.test(n)) {
    return `
      <path d="M10 24Q24 14 38 24T55 22" stroke="${light}" stroke-width="2.6" stroke-linecap="round" fill="none"/>
      <path d="M9 35Q24 25 38 35T56 34" stroke="${main}" stroke-width="3.2" stroke-linecap="round" fill="none"/>
      <path d="M13 46Q26 38 40 46T54 45" stroke="${accent}" stroke-width="2.4" stroke-linecap="round" fill="none"/>`;
  }

  // 8. Passage / Walk / Disperse / Translocation / Ride
  if (/\b(passage|walk|disperse|dispersion|ride|shift)\b/.test(n) || tags.includes('Translocation')) {
    return `
      <ellipse cx="32" cy="32" rx="14" ry="22" fill="${dark}" stroke="${main}" stroke-width="2.4"/>
      <path d="M16 32H48M41 25L48 32L41 39" stroke="${accent}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  // 9. Ritual / Offering / Seal / Halo / Aura / Warding / Purity / Permanence / Sanction
  if (/\b(ritual|offering|seal|halo|aura|ward|purity|permanence|sanction|suspend|tax|flux|transfusion|dominate|multicast|scourge|hex|curse|darkness|immolate|vampir|devour|ironize|calcif|savagery|cleave|chill|shock|mercurize|amalgamate|slimify|power|pain)\b/.test(n)) {
    return `
      <circle cx="32" cy="32" r="20" stroke="${main}" stroke-width="2.2" fill="${dark}" fill-opacity="0.55"/>
      <polygon points="32,12 49,42 15,42" stroke="${light}" stroke-width="1.8" fill="${main}" fill-opacity="0.22" stroke-linejoin="round"/>
      <polygon points="32,52 15,22 49,22" stroke="${accent}" stroke-width="1.6" fill="none" stroke-linejoin="round"/>
      <circle cx="32" cy="32" r="5" fill="${accent}"/>`;
  }

  // 10. Default magical blast
  return `
    <path d="M32 10L38 25L54 32L38 39L32 54L26 39L10 32L26 25Z" fill="${main}" fill-opacity="0.55" stroke="${light}" stroke-width="2.2" stroke-linejoin="round"/>
    <circle cx="32" cy="32" r="6" fill="${accent}"/>`;
}

export function spellAssetSvg(spell, size = 28) {
  if (!spell) return wrapAssetSvg('<circle cx="32" cy="32" r="14" stroke="#c084fc" stroke-width="2"/>', size);
  const name = typeof spell === 'string' ? spell : (spell.name || 'Spell');
  const tags = spell.tags || [];
  const p = resolvePalette(name, tags, 'Arcane');
  const isConj = tags.includes('Conjuration') && !SPELL_ART[name];
  const bg = uniqueBackdrop(`spell:${spell.id ?? name}:${name}`, p, isConj ? 'conjuration' : 'aura');
  const body = SPELL_ART[name] || drawSpellPattern(spell, p);
  const flourish = SPELL_ART[name] ? '' : elementalFlourish(p.key, p);
  const h = hashString(`spell:${name}`);
  const cornerRune = `<circle cx="${11 + (h % 5)}" cy="${11 + ((h >>> 4) % 5)}" r="1.2" fill="${p.light}" opacity="0.75"/>`;
  return wrapAssetSvg(`${bg}${body}${flourish}${cornerRune}`, size, 'ws-icon', name);
}
