// Unique 64x64 visual assets for all 18 Bosses, 13 Companions, and 465 Monsters.

import { elementalFlourish, hashString, resolvePalette, uniqueBackdrop, wrapAssetSvg } from './palette.js';

// ==================== 18 BESPOKE BOSS PORTRAITS ====================
const BOSS_ART = {
  Ophan: `
    <circle cx="32" cy="32" r="28" fill="#422006" fill-opacity="0.5"/>
    <ellipse cx="32" cy="32" rx="24" ry="12" transform="rotate(-30 32 32)" stroke="#fde68a" stroke-width="3.2" fill="none"/>
    <ellipse cx="32" cy="32" rx="24" ry="12" transform="rotate(30 32 32)" stroke="#fbbf24" stroke-width="3.2" fill="none"/>
    <circle cx="32" cy="32" r="19" stroke="#f97316" stroke-width="2" stroke-dasharray="4 3"/>
    <circle cx="32" cy="32" r="9" fill="#fffbeb" stroke="#f59e0b" stroke-width="2"/>
    <circle cx="32" cy="32" r="4.5" fill="#7c3aed"/><circle cx="32" cy="32" r="2" fill="#09100d"/><circle cx="33.5" cy="30.5" r="1" fill="#ffffff"/>
    <circle cx="15" cy="22" r="2.5" fill="#fffbeb" stroke="#7c3aed" stroke-width="1"/><circle cx="49" cy="22" r="2.5" fill="#fffbeb" stroke="#7c3aed" stroke-width="1"/>
    <circle cx="15" cy="42" r="2.5" fill="#fffbeb" stroke="#7c3aed" stroke-width="1"/><circle cx="49" cy="42" r="2.5" fill="#fffbeb" stroke="#7c3aed" stroke-width="1"/>
    <circle cx="32" cy="12" r="2.5" fill="#fffbeb" stroke="#7c3aed" stroke-width="1"/><circle cx="32" cy="52" r="2.5" fill="#fffbeb" stroke="#7c3aed" stroke-width="1"/>`,

  'Insanity Queen': `
    <circle cx="32" cy="32" r="28" fill="#3b0764" fill-opacity="0.56"/>
    <path d="M12 52C14 38 22 36 32 36C42 36 50 38 52 52" fill="#581c87" stroke="#f472b6" stroke-width="2"/>
    <path d="M17 24L13 10L24 18L32 7L40 18L51 10L47 24Z" fill="#a855f7" stroke="#fde047" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="32" cy="31" r="11" fill="#1e1038" stroke="#e9d5ff" stroke-width="2"/>
    <path d="M24 29C27 26 30 29 27 32M40 29C37 26 34 29 37 32" stroke="#facc15" stroke-width="2" stroke-linecap="round"/>
    <circle cx="27" cy="29.5" r="1.4" fill="#f472b6"/><circle cx="37" cy="29.5" r="1.4" fill="#38bdf8"/>
    <path d="M26 37Q32 42 38 37" stroke="#f472b6" stroke-width="2" stroke-linecap="round"/>
    <path d="M11 33Q7 27 12 22M53 33Q57 27 52 22M10 43Q16 40 19 46M54 43Q48 40 45 46" stroke="#c084fc" stroke-width="2" stroke-linecap="round"/>`,

  Jormungandr: `
    <circle cx="32" cy="32" r="28" fill="#431407" fill-opacity="0.52"/>
    <circle cx="32" cy="32" r="21" stroke="#ea580c" stroke-width="8" fill="none"/>
    <circle cx="32" cy="32" r="21" stroke="#fde047" stroke-width="1.8" stroke-dasharray="6 5" fill="none"/>
    <path d="M24 11L34 6L42 14L35 21L24 17Z" fill="#dc2626" stroke="#fed7aa" stroke-width="1.8" stroke-linejoin="round"/>
    <circle cx="34" cy="11.5" r="2" fill="#fef08a"/>
    <path d="M20 14L26 11M22 18L26 15" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round"/>
    <polyline points="24,27 32,33 27,36 37,43" stroke="#facc15" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="32" cy="32" r="9" stroke="#fb7185" stroke-opacity="0.5" stroke-width="1.4" stroke-dasharray="3 3"/>`,

  'Pope the Frog': `
    <circle cx="32" cy="32" r="28" fill="#14532d" fill-opacity="0.52"/>
    <path d="M21 24L32 5L43 24Z" fill="#fffbeb" stroke="#e5c27b" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M32 10V20M28 15H36" stroke="#d97706" stroke-width="2" stroke-linecap="round"/>
    <ellipse cx="32" cy="40" rx="18" ry="13" fill="#4ade80" fill-opacity="0.82" stroke="#bbf7d0" stroke-width="2"/>
    <circle cx="22" cy="29" r="5.5" fill="#4ade80" stroke="#bbf7d0" stroke-width="1.8"/>
    <circle cx="42" cy="29" r="5.5" fill="#4ade80" stroke="#bbf7d0" stroke-width="1.8"/>
    <circle cx="22" cy="29" r="2.4" fill="#fef08a"/><circle cx="42" cy="29" r="2.4" fill="#fef08a"/>
    <rect x="20.5" y="28.3" width="3" height="1.3" fill="#09100d"/><rect x="40.5" y="28.3" width="3" height="1.3" fill="#09100d"/>
    <path d="M20 42Q32 48 44 42" stroke="#14532d" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M53 20C53 15 47 15 47 20V54" stroke="#ffdf9f" stroke-width="2.4" stroke-linecap="round"/>`,

  Yaldabaoth: `
    <circle cx="32" cy="32" r="28" fill="#4c1d95" fill-opacity="0.5"/>
    <path d="M32 4L36 14L46 8L43 19L55 18L47 27L58 32L47 37L55 46L43 45L46 56L36 50L32 60L28 50L18 56L21 45L9 46L17 37L6 32L17 27L9 18L21 19L18 8L28 14Z" fill="#f59e0b" fill-opacity="0.28" stroke="#fde68a" stroke-width="1.5"/>
    <path d="M22 44C20 53 32 57 42 52C47 49 45 43 38 42" stroke="#c084fc" stroke-width="4" stroke-linecap="round" fill="none"/>
    <circle cx="32" cy="30" r="12" fill="#b45309" stroke="#ffdf9f" stroke-width="2.2"/>
    <polygon points="23,23 20,16 27,20" fill="#fbbf24"/><polygon points="41,23 44,16 37,20" fill="#fbbf24"/>
    <circle cx="27.5" cy="29" r="2.3" fill="#fef08a"/><circle cx="36.5" cy="29" r="2.3" fill="#fef08a"/>
    <path d="M28 36L32 34L36 36" stroke="#fffbeb" stroke-width="2" stroke-linecap="round"/>`,

  'The Gardener': `
    <circle cx="32" cy="32" r="28" fill="#14532d" fill-opacity="0.5"/>
    <path d="M16 56C17 39 23 34 32 34C41 34 47 39 48 56Z" fill="#166534" stroke="#86efac" stroke-width="2"/>
    <path d="M21 32C21 17 26 11 32 11C38 11 43 17 43 32Z" fill="#14532d" stroke="#4ade80" stroke-width="2"/>
    <circle cx="28" cy="25" r="2" fill="#c084fc"/><circle cx="36" cy="25" r="2" fill="#c084fc"/>
    <path d="M11 48L24 31M24 48L11 31" stroke="#cbd5e1" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="13" cy="49" r="3" stroke="#e5c27b" stroke-width="1.8"/><circle cx="22" cy="49" r="3" stroke="#e5c27b" stroke-width="1.8"/>
    <path d="M44 45C50 38 54 27 49 18" stroke="#4ade80" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="51" cy="21" r="3.5" fill="#f0abfc" stroke="#ffffff" stroke-width="1"/>`,

  Gaia: `
    <circle cx="32" cy="32" r="28" fill="#064e3b" fill-opacity="0.52"/>
    <path d="M12 29C10 17 19 10 27 13C30 7 38 7 41 13C49 10 56 19 52 29Z" fill="#22c55e" fill-opacity="0.5" stroke="#86efac" stroke-width="2"/>
    <path d="M23 30C23 24 27 21 32 21C37 21 41 24 41 30C41 36 37 40 32 40C27 40 23 36 23 30Z" fill="#166534" stroke="#bbf7d0" stroke-width="2"/>
    <circle cx="28.5" cy="30" r="1.9" fill="#fef08a"/><circle cx="35.5" cy="30" r="1.9" fill="#fef08a"/>
    <path d="M28 40L22 55M32 40V56M36 40L42 55M25 46L15 53M39 46L49 53" stroke="#a16207" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="22" cy="18" r="2.2" fill="#fde68a"/><circle cx="43" cy="19" r="2.2" fill="#f472b6"/><circle cx="32" cy="13" r="2.2" fill="#7dd3fc"/>`,

  'Bafflement, Demon King': `
    <circle cx="32" cy="32" r="28" fill="#450a0a" fill-opacity="0.58"/>
    <path d="M18 24C10 18 8 10 15 7C17 14 21 17 24 19M46 24C54 18 56 10 49 7C47 14 43 17 40 19" fill="#991b1b" stroke="#fb923c" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M23 20L27 11L32 18L37 11L41 20Z" fill="#f59e0b" stroke="#fef08a" stroke-width="1.6"/>
    <path d="M17 28C17 20 23 18 32 18C41 18 47 20 47 28V43L32 54L17 43Z" fill="#7f1d1d" stroke="#f87171" stroke-width="2.2" stroke-linejoin="round"/>
    <polygon points="22,30 29,33 23,35" fill="#fef08a"/><polygon points="42,30 35,33 41,35" fill="#fef08a"/>
    <path d="M24 43L27 39L30 43L34 39L37 43L40 40" stroke="#fed7aa" stroke-width="2" stroke-linecap="round"/>`,

  'Snow Queen, Enthroned': `
    <circle cx="32" cy="32" r="28" fill="#0c4a6e" fill-opacity="0.54"/>
    <polygon points="12,56 15,15 24,25 32,7 40,25 49,15 52,56" fill="#0369a1" fill-opacity="0.52" stroke="#7dd3fc" stroke-width="2" stroke-linejoin="round"/>
    <path d="M22 54L25 37H39L42 54Z" fill="#bae6fd" fill-opacity="0.45" stroke="#e0f2fe" stroke-width="1.8"/>
    <circle cx="32" cy="29" r="7.5" fill="#e0f2fe" stroke="#38bdf8" stroke-width="1.8"/>
    <polygon points="24,23 26,14 30,20 32,12 34,20 38,14 40,23" fill="#ffffff" stroke="#7dd3fc" stroke-width="1.3"/>
    <circle cx="29.5" cy="29" r="1.5" fill="#0369a1"/><circle cx="34.5" cy="29" r="1.5" fill="#0369a1"/>`,

  'Snow Queen, Dethroned': `
    <circle cx="32" cy="32" r="28" fill="#082f49" fill-opacity="0.56"/>
    <polygon points="10,20 18,13 15,24" fill="#bae6fd"/><polygon points="54,19 46,12 49,24" fill="#7dd3fc"/>
    <polygon points="24,18 28,9 32,16" fill="#e0f2fe" stroke="#38bdf8" stroke-width="1.2"/>
    <polygon points="35,16 40,8 43,19" fill="#bae6fd" stroke="#38bdf8" stroke-width="1.2"/>
    <path d="M18 54L24 35L32 39L40 35L46 54Z" fill="#0284c7" fill-opacity="0.6" stroke="#bae6fd" stroke-width="2"/>
    <circle cx="32" cy="28" r="8.5" fill="#e0f2fe" stroke="#7dd3fc" stroke-width="2"/>
    <circle cx="29" cy="28" r="1.8" fill="#38bdf8"/><circle cx="35" cy="28" r="1.8" fill="#38bdf8"/>
    <path d="M10 40Q20 33 25 42M54 40Q44 33 39 42" stroke="#7dd3fc" stroke-width="2.2" stroke-linecap="round"/>`,

  'The Body Electric': `
    <circle cx="32" cy="32" r="28" fill="#1e293b" fill-opacity="0.56"/>
    <circle cx="32" cy="17" r="7" fill="#334155" stroke="#facc15" stroke-width="2"/>
    <path d="M21 30C21 26 25 24 32 24C39 24 43 26 43 30L40 53H24Z" fill="#1e293b" stroke="#cbd5e1" stroke-width="2"/>
    <circle cx="32" cy="35" r="5" fill="#38bdf8" stroke="#fef08a" stroke-width="1.8"/>
    <polyline points="11,18 20,25 14,31 23,37" stroke="#facc15" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    <polyline points="53,18 44,25 50,31 41,37" stroke="#facc15" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="28" y1="16.5" x2="36" y2="16.5" stroke="#7dd3fc" stroke-width="2.4" stroke-linecap="round"/>`,

  Amaru: `
    <circle cx="32" cy="32" r="28" fill="#1e1b4b" fill-opacity="0.52"/>
    <path d="M22 48C14 42 15 31 24 27L16 14L27 17L30 27" fill="#ea580c" fill-opacity="0.7" stroke="#fed7aa" stroke-width="2" stroke-linejoin="round"/>
    <path d="M42 48C50 42 49 31 40 27L48 14L37 17L34 27" fill="#0284c7" fill-opacity="0.7" stroke="#bae6fd" stroke-width="2" stroke-linejoin="round"/>
    <path d="M22 48Q32 58 42 48Q32 42 22 48Z" fill="#fde047" fill-opacity="0.4" stroke="#ffdf9f" stroke-width="1.8"/>
    <circle cx="21" cy="18" r="1.8" fill="#fef08a"/><circle cx="43" cy="18" r="1.8" fill="#ffffff"/>
    <path d="M12 27L6 22M11 34L5 34M52 27L58 22M53 34L59 34" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"/>`,

  'Sanguine Hierophant': `
    <circle cx="32" cy="32" r="28" fill="#450a0a" fill-opacity="0.56"/>
    <circle cx="32" cy="22" r="15" stroke="#ef4444" stroke-opacity="0.55" stroke-width="2" stroke-dasharray="4 3"/>
    <path d="M15 56L21 31L32 36L43 31L49 56Z" fill="#7f1d1d" stroke="#fca5a5" stroke-width="2"/>
    <path d="M24 31L32 10L40 31Z" fill="#991b1b" stroke="#ffdf9f" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="29" cy="25" r="1.8" fill="#fef08a"/><circle cx="35" cy="25" r="1.8" fill="#fef08a"/>
    <path d="M26 42H38L35 49H29Z" fill="#e5c27b" stroke="#ffdf9f" stroke-width="1.5"/>
    <path d="M32 36C32 36 35 39.5 35 41A3 3 0 0 1 29 41C29 39.5 32 36 32 36Z" fill="#ef4444"/>`,

  Mordred: `
    <circle cx="32" cy="32" r="28" fill="#2e0a16" fill-opacity="0.6"/>
    <path d="M13 24L19 7L27 18L32 11L37 18L45 7L51 24" stroke="#f87171" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M16 26C16 19 23 16 32 16C41 16 48 19 48 26V46L32 56L16 46Z" fill="#18101c" stroke="#f87171" stroke-width="2.3" stroke-linejoin="round"/>
    <circle cx="25" cy="32" r="3" fill="#fef08a"/><circle cx="39" cy="32" r="3" fill="#fef08a"/>
    <path d="M24 44L28 41L32 44L36 41L40 44" stroke="#fca5a5" stroke-width="2" stroke-linecap="round"/>`,

  'Mordred, Unbound': `
    <circle cx="32" cy="32" r="28" fill="#3b0764" fill-opacity="0.6"/>
    <path d="M8 42L18 35M56 42L46 35M9 26L18 28M55 26L46 28" stroke="#cbd5e1" stroke-width="2.4" stroke-dasharray="4 2"/>
    <path d="M12 22L18 5L26 16L32 8L38 16L46 5L52 22" stroke="#f472b6" stroke-width="2.8" stroke-linejoin="round"/>
    <path d="M16 25C16 18 23 15 32 15C41 15 48 18 48 25V46L32 56L16 46Z" fill="#2e0b2e" stroke="#c084fc" stroke-width="2.3"/>
    <ellipse cx="25" cy="31" rx="3.4" ry="2.2" fill="#f87171"/><ellipse cx="39" cy="31" rx="3.4" ry="2.2" fill="#f87171"/>
    <circle cx="25" cy="31" r="1.2" fill="#ffffff"/><circle cx="39" cy="31" r="1.2" fill="#ffffff"/>
    <path d="M23 42Q32 48 41 42" stroke="#f472b6" stroke-width="2.2" stroke-linecap="round"/>`,

  'Mordred, Ascendant': `
    <circle cx="32" cy="32" r="28" fill="#09040f" fill-opacity="0.72"/>
    <circle cx="32" cy="28" r="22" stroke="#ffdf9f" stroke-opacity="0.55" stroke-width="1.8"/>
    <path d="M8 40C4 25 10 14 20 18M56 40C60 25 54 14 44 18" stroke="#c084fc" stroke-width="2.8" stroke-linecap="round"/>
    <path d="M14 22L19 5L26 15L32 4L38 15L45 5L50 22" fill="#991b1b" fill-opacity="0.55" stroke="#ffdf9f" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M17 26C17 19 23 17 32 17C41 17 47 19 47 26V45L32 56L17 45Z" fill="#0f0717" stroke="#ffdf9f" stroke-width="2.2"/>
    <circle cx="25" cy="31" r="3" fill="#ffffff"/><circle cx="39" cy="31" r="3" fill="#ffffff"/>
    <circle cx="32" cy="24" r="2.2" fill="#f87171"/>
    <path d="M25 43L32 47L39 43" stroke="#ffdf9f" stroke-width="2" stroke-linecap="round"/>`,

  'The Sparking Soul': `
    <circle cx="32" cy="32" r="28" fill="#1e293b" fill-opacity="0.55"/>
    <circle cx="32" cy="32" r="14" fill="#facc15" fill-opacity="0.28" stroke="#fef08a" stroke-width="2.4"/>
    <polygon points="32,12 48,32 32,52 16,32" stroke="#cbd5e1" stroke-width="2" fill="none"/>
    <circle cx="32" cy="32" r="6" fill="#ffffff" stroke="#38bdf8" stroke-width="2"/>
    <polyline points="10,16 19,24 14,28 22,33" stroke="#facc15" stroke-width="2" stroke-linecap="round"/>
    <polyline points="54,48 45,40 50,36 42,31" stroke="#38bdf8" stroke-width="2" stroke-linecap="round"/>`,

  'Frost Saber': `
    <circle cx="32" cy="32" r="28" fill="#0c4a6e" fill-opacity="0.52"/>
    <path d="M13 51L47 13L53 11L51 17L19 53Z" fill="#bae6fd" fill-opacity="0.72" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>
    <path d="M15 39L25 49" stroke="#e5c27b" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M11 53L18 46" stroke="#38bdf8" stroke-width="3.4" stroke-linecap="round"/>
    <polygon points="34,15 39,10 38,20" fill="#7dd3fc"/><polygon points="45,28 53,27 44,34" fill="#e0f2fe"/>
    <path d="M22 20V30M17 25H27" stroke="#bae6fd" stroke-width="1.8" stroke-linecap="round"/>`,
};

// ==================== 13 BESPOKE COMPANION PORTRAITS ====================
const COMPANION_ART = {
  Necromancer: `
    <circle cx="32" cy="32" r="27" fill="#2e1065" fill-opacity="0.5"/>
    <path d="M15 55C17 42 22 37 32 37C42 37 47 42 49 55Z" fill="#3b0764" stroke="#a78bfa" stroke-width="2"/>
    <path d="M19 35C19 20 24 12 32 12C40 12 45 20 45 35Z" fill="#1e1038" stroke="#c084fc" stroke-width="2"/>
    <circle cx="28" cy="27" r="2.2" fill="#4ade80"/><circle cx="36" cy="27" r="2.2" fill="#4ade80"/>
    <line x1="51" y1="22" x2="49" y2="55" stroke="#a78bfa" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="51" cy="18" r="5" fill="#e4e4e7" stroke="#c084fc" stroke-width="1.4"/>
    <circle cx="49.5" cy="17.5" r="1.2" fill="#18181b"/><circle cx="52.5" cy="17.5" r="1.2" fill="#18181b"/>`,

  'Vampire Hunter': `
    <circle cx="32" cy="32" r="27" fill="#3b0d14" fill-opacity="0.5"/>
    <path d="M16 55L21 37H43L48 55Z" fill="#7f1d1d" stroke="#fca5a5" stroke-width="2"/>
    <circle cx="32" cy="30" r="8.5" fill="#1c1917" stroke="#d6d3d1" stroke-width="1.6"/>
    <ellipse cx="32" cy="22" rx="19" ry="4" fill="#292524" stroke="#e5c27b" stroke-width="1.6"/>
    <path d="M22 22L25 11H39L42 22Z" fill="#1c1917" stroke="#e5c27b" stroke-width="1.6"/>
    <circle cx="29" cy="30" r="1.8" fill="#fef08a"/><circle cx="35" cy="30" r="1.8" fill="#fef08a"/>
    <path d="M47 28L56 37M44 37H56M51 24V44" stroke="#e2e8f0" stroke-width="2" stroke-linecap="round"/>`,

  Paladin: `
    <circle cx="32" cy="32" r="27" fill="#422006" fill-opacity="0.48"/>
    <path d="M19 25C19 15 24 10 32 10C40 10 45 15 45 25V36L32 42L19 36Z" fill="#cbd5e1" stroke="#fde68a" stroke-width="2"/>
    <path d="M19 20L9 12L15 24M45 20L55 12L49 24" fill="#fffbeb" stroke="#fde68a" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M24 26H40M32 20V36" stroke="#0f172a" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M22 42H42L39 55L32 58L25 55Z" fill="#fbbf24" fill-opacity="0.45" stroke="#fde68a" stroke-width="2"/>
    <path d="M32 45V54M28 49H36" stroke="#fffbeb" stroke-width="2"/>`,

  'Dragon Knight': `
    <circle cx="32" cy="32" r="27" fill="#431407" fill-opacity="0.52"/>
    <path d="M21 20L12 8L26 17M43 20L52 8L38 17" fill="#fb923c" stroke="#fed7aa" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M19 26C19 17 24 14 32 14C40 14 45 17 45 26V40L32 47L19 40Z" fill="#475569" stroke="#fb923c" stroke-width="2"/>
    <path d="M23 28L32 32L41 28" stroke="#fef08a" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M14 55L20 43H44L50 55Z" fill="#9a3412" stroke="#fdba74" stroke-width="2"/>`,

  Ranger: `
    <circle cx="32" cy="32" r="27" fill="#14532d" fill-opacity="0.48"/>
    <path d="M17 55L21 37H41L45 55Z" fill="#166534" stroke="#86efac" stroke-width="2"/>
    <path d="M21 35C21 20 25 13 31 13C37 13 41 20 41 35Z" fill="#15803d" stroke="#86efac" stroke-width="1.8"/>
    <circle cx="28" cy="27" r="1.7" fill="#fef08a"/><circle cx="34" cy="27" r="1.7" fill="#fef08a"/>
    <path d="M46 13C55 21 55 41 46 49" stroke="#d97706" stroke-width="2.6" stroke-linecap="round" fill="none"/>
    <line x1="46" y1="13" x2="46" y2="49" stroke="#e2e8f0" stroke-width="1.2"/>
    <line x1="39" y1="31" x2="57" y2="31" stroke="#ffdf9f" stroke-width="2"/><polygon points="59,31 54,28 54,34" fill="#e2e8f0"/>`,

  Berserker: `
    <circle cx="32" cy="32" r="27" fill="#450a0a" fill-opacity="0.52"/>
    <path d="M18 22C11 16 11 9 18 8M46 22C53 16 53 9 46 8" stroke="#f5f5f4" stroke-width="3" stroke-linecap="round"/>
    <circle cx="32" cy="29" r="10.5" fill="#7f1d1d" stroke="#fca5a5" stroke-width="2"/>
    <path d="M25 25L30 28M39 25L34 28" stroke="#fef08a" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M13 54L24 40M51 54L40 40" stroke="#d97706" stroke-width="2.8" stroke-linecap="round"/>
    <path d="M10 42C10 36 16 35 20 40L15 47Z" fill="#cbd5e1" stroke="#f87171" stroke-width="1.5"/>
    <path d="M54 42C54 36 48 35 44 40L49 47Z" fill="#cbd5e1" stroke="#f87171" stroke-width="1.5"/>`,

  Assassin: `
    <circle cx="32" cy="32" r="27" fill="#2e1065" fill-opacity="0.52"/>
    <path d="M17 55L22 36H42L47 55Z" fill="#1e1b4b" stroke="#c084fc" stroke-width="2"/>
    <path d="M21 35C21 19 25 12 32 12C39 12 43 19 43 35Z" fill="#0f172a" stroke="#a855f7" stroke-width="2"/>
    <rect x="23" y="29" width="18" height="7" rx="2" fill="#312e81"/>
    <ellipse cx="28" cy="25" rx="2.4" ry="1.4" fill="#67e8f9"/><ellipse cx="36" cy="25" rx="2.4" ry="1.4" fill="#67e8f9"/>
    <path d="M11 49L23 36M53 49L41 36" stroke="#e2e8f0" stroke-width="2.6" stroke-linecap="round"/>`,

  'Witch Doctor': `
    <circle cx="32" cy="32" r="27" fill="#3b0764" fill-opacity="0.48"/>
    <path d="M16 17L24 22M24 9L28 19M32 6V17M40 9L36 19M48 17L40 22" stroke="#f0abfc" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M20 22C20 18 25 16 32 16C39 16 44 18 44 22L41 48L32 54L23 48Z" fill="#7c2d12" stroke="#f0abfc" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="27" cy="29" r="2.8" fill="#4ade80"/><circle cx="37" cy="29" r="2.8" fill="#4ade80"/>
    <path d="M26 40H38M28 38V42M32 38V42M36 38V42" stroke="#fde68a" stroke-width="1.8" stroke-linecap="round"/>`,

  Cleric: `
    <circle cx="32" cy="32" r="27" fill="#422006" fill-opacity="0.44"/>
    <circle cx="32" cy="24" r="14" stroke="#fde68a" stroke-opacity="0.65" stroke-width="1.8" stroke-dasharray="3 3"/>
    <path d="M16 55L21 36H43L48 55Z" fill="#f8fafc" fill-opacity="0.24" stroke="#fde68a" stroke-width="2"/>
    <circle cx="32" cy="26" r="8" fill="#fffbeb" fill-opacity="0.25" stroke="#fde68a" stroke-width="2"/>
    <path d="M32 18V34M26 26H38" stroke="#fffbeb" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M32 41V52M27 46.5H37" stroke="#fde68a" stroke-width="2.2" stroke-linecap="round"/>`,

  Engineer: `
    <circle cx="32" cy="32" r="27" fill="#1e293b" fill-opacity="0.52"/>
    <circle cx="24" cy="28" r="7" fill="#38bdf8" fill-opacity="0.35" stroke="#e5c27b" stroke-width="2.4"/>
    <circle cx="40" cy="28" r="7" fill="#38bdf8" fill-opacity="0.35" stroke="#e5c27b" stroke-width="2.4"/>
    <line x1="31" y1="28" x2="33" y2="28" stroke="#e5c27b" stroke-width="2.6"/>
    <circle cx="24" cy="28" r="2.2" fill="#e0f2fe"/><circle cx="40" cy="28" r="2.2" fill="#e0f2fe"/>
    <circle cx="32" cy="46" r="7" stroke="#cbd5e1" stroke-width="2.6" stroke-dasharray="4 3"/>
    <circle cx="32" cy="46" r="2.8" fill="#facc15"/>
    <path d="M17 18C20 12 44 12 47 18" stroke="#d97706" stroke-width="3" stroke-linecap="round"/>`,

  Bard: `
    <circle cx="32" cy="32" r="27" fill="#3b1d4a" fill-opacity="0.48"/>
    <path d="M15 24C19 14 36 12 46 21L38 25Z" fill="#059669" stroke="#fde68a" stroke-width="1.8"/>
    <path d="M40 17C46 10 53 10 55 15" stroke="#f472b6" stroke-width="2.4" stroke-linecap="round"/>
    <ellipse cx="28" cy="44" rx="10" ry="11" fill="#b45309" stroke="#ffdf9f" stroke-width="2"/>
    <circle cx="28" cy="44" r="3" fill="#451a03" stroke="#fde68a" stroke-width="1.2"/>
    <line x1="35" y1="35" x2="49" y2="21" stroke="#d97706" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M48 39V29L55 27V36" stroke="#7dd3fc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="46" cy="40" r="2.4" fill="#7dd3fc"/><circle cx="53" cy="37" r="2.4" fill="#7dd3fc"/>`,

  Alchemist: `
    <circle cx="32" cy="32" r="27" fill="#1a2e05" fill-opacity="0.5"/>
    <path d="M25 14H39V22L50 42C52 46 49 53 43 53H21C15 53 12 46 14 42L25 22Z" fill="#22c55e" fill-opacity="0.28" stroke="#cbd5e1" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M17 42H47C47 48 44 51 40 51H24C20 51 17 48 17 42Z" fill="#4ade80" fill-opacity="0.72"/>
    <rect x="24" y="10" width="16" height="4" rx="1.5" fill="#d97706"/>
    <circle cx="27" cy="45" r="2.2" fill="#ecfccb"/><circle cx="36" cy="43" r="1.6" fill="#ecfccb"/><circle cx="32" cy="34" r="2.4" fill="#a3e635"/>
    <circle cx="27" cy="28" r="1.5" fill="#fef08a"/>`,

  Valkyrie: `
    <circle cx="32" cy="32" r="27" fill="#1e293b" fill-opacity="0.5"/>
    <path d="M22 28C22 18 26 14 32 14C38 14 42 18 42 28V36H22Z" fill="#cbd5e1" stroke="#fde68a" stroke-width="2"/>
    <path d="M21 25C11 20 8 11 12 8C16 14 20 17 23 19M43 25C53 20 56 11 52 8C48 14 44 17 41 19" fill="#fffbeb" stroke="#fde68a" stroke-width="1.8" stroke-linejoin="round"/>
    <ellipse cx="32" cy="10" rx="9" ry="2.4" stroke="#fde68a" stroke-width="1.8"/>
    <circle cx="28.5" cy="28" r="1.8" fill="#7bd0ff"/><circle cx="35.5" cy="28" r="1.8" fill="#7bd0ff"/>
    <line x1="49" y1="16" x2="49" y2="56" stroke="#ffdf9f" stroke-width="2.4" stroke-linecap="round"/>
    <polygon points="49,9 53,18 45,18" fill="#ffffff" stroke="#7bd0ff" stroke-width="1.2"/>`,
};

// ==================== 65+ ANATOMICAL MONSTER SILHOUETTES ====================
function drawMonsterBody(kind, p, name) {
  const { main, light, dark, accent } = p;
  switch (kind) {
    case 'spider':
      return `
        <path d="M22 30L9 19M21 35L7 33M22 40L9 46M25 44L15 54M42 30L55 19M43 35L57 33M42 40L55 46M39 44L49 54" stroke="${light}" stroke-width="2.2" stroke-linecap="round"/>
        <ellipse cx="32" cy="39" rx="11" ry="12" fill="${dark}" stroke="${main}" stroke-width="2.2"/>
        <circle cx="32" cy="24" r="6.5" fill="${main}" fill-opacity="0.72" stroke="${light}" stroke-width="1.8"/>
        <circle cx="28.5" cy="22" r="1.6" fill="#fef08a"/><circle cx="35.5" cy="22" r="1.6" fill="#fef08a"/>
        <circle cx="30.8" cy="20.5" r="1.1" fill="#f87171"/><circle cx="33.2" cy="20.5" r="1.1" fill="#f87171"/>
        <path d="M29 36L32 42L35 36" stroke="${accent}" stroke-width="1.6" stroke-linejoin="round"/>`;

    case 'dragon':
      return `
        <path d="M24 31C12 22 7 14 9 9C15 15 21 17 27 22M40 31C52 22 57 14 55 9C49 15 43 17 37 22" fill="${main}" fill-opacity="0.38" stroke="${light}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M18 47C19 34 25 25 32 23C39 25 45 34 46 47L32 54Z" fill="${dark}" stroke="${main}" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M25 21L20 12L29 18M39 21L44 12L35 18" stroke="${accent}" stroke-width="2" stroke-linejoin="round"/>
        <polygon points="26,28 31,31 27,33" fill="#fef08a"/><polygon points="38,28 33,31 37,33" fill="#fef08a"/>
        <path d="M26 40L32 43L38 40M28 46L32 48L36 46" stroke="${light}" stroke-width="1.6" stroke-linecap="round"/>`;

    case 'hydra':
      return `
        <path d="M22 48C17 36 14 28 16 18L11 16L17 12L22 17" stroke="${main}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <path d="M32 48V18L28 12L32 8L36 12L32 18" stroke="${light}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <path d="M42 48C47 36 50 28 48 18L53 16L47 12L42 17" stroke="${accent}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <ellipse cx="32" cy="49" rx="14" ry="7" fill="${dark}" stroke="${main}" stroke-width="2"/>
        <circle cx="16" cy="15" r="1.5" fill="#fef08a"/><circle cx="32" cy="12" r="1.5" fill="#fef08a"/><circle cx="48" cy="15" r="1.5" fill="#fef08a"/>`;

    case 'wyrm':
      return `
        <path d="M16 49C10 38 18 29 28 32C38 35 48 28 46 18C44 12 37 10 31 14" stroke="${main}" stroke-width="8" stroke-linecap="round" fill="none"/>
        <path d="M16 49C10 38 18 29 28 32C38 35 48 28 46 18C44 12 37 10 31 14" stroke="${light}" stroke-width="2" stroke-dasharray="4 4" stroke-linecap="round" fill="none"/>
        <polygon points="24,13 33,8 35,17 26,20" fill="${dark}" stroke="${accent}" stroke-width="1.8"/>
        <circle cx="30" cy="13" r="1.8" fill="#fef08a"/>`;

    case 'egg':
      return `
        <path d="M32 11C42 11 48 25 48 37C48 48 41 54 32 54C23 54 16 48 16 37C16 25 22 11 32 11Z" fill="${dark}" stroke="${main}" stroke-width="2.4"/>
        <polyline points="19,33 26,28 31,36 38,29 45,35" stroke="${accent}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="27" cy="21" r="2.5" fill="${light}" opacity="0.65"/><circle cx="38" cy="43" r="3" fill="${main}" opacity="0.5"/>`;

    case 'slime':
      return `
        <path d="M11 45C11 27 19 16 32 16C45 16 53 27 53 45C53 51 45 54 32 54C19 54 11 51 11 45Z" fill="${main}" fill-opacity="0.52" stroke="${light}" stroke-width="2.3"/>
        <circle cx="24" cy="35" r="3" fill="#09100d"/><circle cx="40" cy="35" r="3" fill="#09100d"/>
        <circle cx="23" cy="34" r="1" fill="#ffffff"/><circle cx="39" cy="34" r="1" fill="#ffffff"/>
        <circle cx="22" cy="24" r="2.8" fill="${light}" opacity="0.7"/><circle cx="43" cy="44" r="2.4" fill="${accent}" opacity="0.8"/>`;

    case 'eye':
      return `
        <circle cx="32" cy="32" r="18" fill="#f8fafc" fill-opacity="0.16" stroke="${light}" stroke-width="2.2"/>
        <circle cx="32" cy="32" r="11" fill="${main}" fill-opacity="0.7" stroke="${accent}" stroke-width="1.8"/>
        <circle cx="32" cy="32" r="5" fill="#09100d"/>
        <circle cx="35" cy="29" r="2.2" fill="#ffffff"/>
        <path d="M24 49Q28 56 26 59M32 50V59M40 49Q36 56 38 59" stroke="${main}" stroke-width="2" stroke-linecap="round"/>`;

    case 'massOfEyes':
      return `
        <circle cx="32" cy="33" r="18" fill="${dark}" stroke="${main}" stroke-width="2"/>
        <circle cx="24" cy="26" r="6" fill="#f8fafc" stroke="${main}" stroke-width="1.4"/><circle cx="24" cy="26" r="2.5" fill="${accent}"/>
        <circle cx="40" cy="25" r="5.5" fill="#f8fafc" stroke="${main}" stroke-width="1.4"/><circle cx="40" cy="25" r="2.3" fill="${accent}"/>
        <circle cx="32" cy="38" r="6.5" fill="#f8fafc" stroke="${main}" stroke-width="1.4"/><circle cx="32" cy="38" r="2.8" fill="#09100d"/>
        <circle cx="20" cy="40" r="4" fill="#f8fafc"/><circle cx="20" cy="40" r="1.6" fill="#09100d"/>
        <circle cx="44" cy="39" r="4" fill="#f8fafc"/><circle cx="44" cy="39" r="1.6" fill="#09100d"/>`;

    case 'skull':
      return `
        <path d="M16 29C16 17 23 11 32 11C41 11 48 17 48 29C48 36 44 41 40 43V52H24V43C20 41 16 36 16 29Z" fill="${light}" fill-opacity="0.22" stroke="${light}" stroke-width="2.3" stroke-linejoin="round"/>
        <circle cx="25.5" cy="29" r="4.2" fill="#09100d" stroke="${main}" stroke-width="1.4"/>
        <circle cx="38.5" cy="29" r="4.2" fill="#09100d" stroke="${main}" stroke-width="1.4"/>
        <circle cx="25.5" cy="29" r="1.6" fill="${accent}"/><circle cx="38.5" cy="29" r="1.6" fill="${accent}"/>
        <polygon points="32,34 29.5,39 34.5,39" fill="#09100d"/>
        <path d="M28 45V52M32 45V52M36 45V52" stroke="${light}" stroke-width="1.8"/>`;

    case 'boneWheel':
      return `
        <circle cx="32" cy="32" r="21" stroke="${light}" stroke-width="4" fill="none"/>
        <path d="M32 11V53M11 32H53M17 17L47 47M47 17L17 47" stroke="${main}" stroke-width="2.2"/>
        <circle cx="32" cy="32" r="8" fill="${dark}" stroke="${light}" stroke-width="2"/>
        <circle cx="29.5" cy="31" r="1.7" fill="${accent}"/><circle cx="34.5" cy="31" r="1.7" fill="${accent}"/>`;

    case 'reaper':
      return `
        <path d="M18 55L23 30L32 12L41 30L46 55Z" fill="${dark}" stroke="${main}" stroke-width="2.2" stroke-linejoin="round"/>
        <ellipse cx="32" cy="28" rx="6.5" ry="7.5" fill="#09100d"/>
        <circle cx="29.5" cy="27" r="1.7" fill="${accent}"/><circle cx="34.5" cy="27" r="1.7" fill="${accent}"/>
        <line x1="48" y1="14" x2="45" y2="55" stroke="#d6d3d1" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M48 14C34 10 24 14 21 21C30 18 39 18 48 21Z" fill="#e2e8f0" stroke="${light}" stroke-width="1.5"/>`;

    case 'ghost':
      return `
        <path d="M17 32C17 19 23 12 32 12C41 12 47 19 47 32V52L41 47L35 53L32 48L29 53L23 47L17 52Z" fill="${main}" fill-opacity="0.34" stroke="${light}" stroke-width="2.2" stroke-linejoin="round"/>
        <ellipse cx="26.5" cy="29" rx="2.6" ry="3.6" fill="#09100d"/>
        <ellipse cx="37.5" cy="29" rx="2.6" ry="3.6" fill="#09100d"/>
        <ellipse cx="32" cy="39" rx="3.2" ry="4.2" fill="#09100d"/>`;

    case 'vampire':
      return `
        <path d="M10 38C10 24 17 18 24 26L32 17L40 26C47 18 54 24 54 38L44 34L41 53H23L20 34Z" fill="${dark}" stroke="${main}" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="32" cy="29" r="8" fill="#e4e4e7" fill-opacity="0.2" stroke="${light}" stroke-width="1.8"/>
        <circle cx="28.5" cy="28" r="1.9" fill="#ef4444"/><circle cx="35.5" cy="28" r="1.9" fill="#ef4444"/>
        <polygon points="28,34 30,39 31,34" fill="#ffffff"/><polygon points="36,34 34,39 33,34" fill="#ffffff"/>`;

    case 'bat':
      return `
        <path d="M32 30C24 18 12 16 7 25C12 29 14 35 12 41C19 36 25 36 32 41C39 36 45 36 52 41C50 35 52 29 57 25C52 16 40 18 32 30Z" fill="${dark}" stroke="${main}" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M27 25L25 17L30 23M37 25L39 17L34 23" fill="${main}"/>
        <circle cx="29" cy="29" r="1.8" fill="#fef08a"/><circle cx="35" cy="29" r="1.8" fill="#fef08a"/>`;

    case 'wolf':
      return `
        <path d="M18 25L15 11L26 20H38L49 11L46 25L49 38L32 51L15 38Z" fill="${dark}" stroke="${main}" stroke-width="2.2" stroke-linejoin="round"/>
        <polygon points="23,29 29,31 25,33" fill="${accent}"/><polygon points="41,29 35,31 39,33" fill="${accent}"/>
        <polygon points="29,38 35,38 32,42" fill="#09100d"/>
        <path d="M26 44L29 47L32 44L35 47L38 44" stroke="${light}" stroke-width="1.7"/>`;

    case 'bear':
      return `
        <circle cx="19" cy="19" r="6" fill="${dark}" stroke="${main}" stroke-width="2"/>
        <circle cx="45" cy="19" r="6" fill="${dark}" stroke="${main}" stroke-width="2"/>
        <ellipse cx="32" cy="35" rx="18" ry="17" fill="${dark}" stroke="${main}" stroke-width="2.3"/>
        <ellipse cx="32" cy="40" rx="8" ry="6" fill="${main}" fill-opacity="0.4" stroke="${light}" stroke-width="1.5"/>
        <circle cx="25" cy="30" r="2.2" fill="#fef08a"/><circle cx="39" cy="30" r="2.2" fill="#fef08a"/>
        <ellipse cx="32" cy="38" rx="3" ry="2" fill="#09100d"/>`;

    case 'lion':
      return `
        <path d="M32 9L38 15L46 13L47 21L54 26L50 34L53 42L45 45L42 53L32 49L22 53L19 45L11 42L14 34L10 26L17 21L18 13L26 15Z" fill="${main}" fill-opacity="0.45" stroke="${accent}" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="32" cy="32" r="12" fill="${dark}" stroke="${light}" stroke-width="2"/>
        <circle cx="27.5" cy="30" r="2" fill="#fef08a"/><circle cx="36.5" cy="30" r="2" fill="#fef08a"/>
        <polygon points="29,35 35,35 32,38.5" fill="${accent}"/>`;

    case 'cat':
      return `
        <path d="M18 26L15 11L27 20H37L49 11L46 26C48 36 42 46 32 46C22 46 16 36 18 26Z" fill="${dark}" stroke="${main}" stroke-width="2.2" stroke-linejoin="round"/>
        <ellipse cx="26" cy="30" rx="2.8" ry="2.2" fill="#fef08a"/><ellipse cx="38" cy="30" rx="2.8" ry="2.2" fill="#fef08a"/>
        <line x1="26" y1="28.5" x2="26" y2="31.5" stroke="#09100d" stroke-width="1.3"/><line x1="38" y1="28.5" x2="38" y2="31.5" stroke="#09100d" stroke-width="1.3"/>
        <path d="M11 35H20M12 39H20M44 35H53M44 39H52" stroke="${light}" stroke-width="1.4" stroke-linecap="round"/>`;

    case 'turtle':
      return `
        <path d="M12 38C12 22 21 15 32 15C43 15 52 22 52 38Z" fill="${dark}" stroke="${main}" stroke-width="2.4"/>
        <polygon points="32,20 41,26 38,36 26,36 23,26" fill="${main}" fill-opacity="0.42" stroke="${light}" stroke-width="1.6"/>
        <circle cx="53" cy="34" r="5" fill="${main}" stroke="${light}" stroke-width="1.6"/><circle cx="54.5" cy="33" r="1.4" fill="#fef08a"/>
        <rect x="16" y="39" width="7" height="9" rx="2.5" fill="${main}"/><rect x="41" y="39" width="7" height="9" rx="2.5" fill="${main}"/>`;

    case 'snake':
      return `
        <path d="M17 51C12 43 22 39 32 39C42 39 49 34 45 25C41 18 32 16 26 21" stroke="${main}" stroke-width="6.5" stroke-linecap="round" fill="none"/>
        <ellipse cx="23" cy="21" rx="7.5" ry="5.5" fill="${dark}" stroke="${light}" stroke-width="2"/>
        <circle cx="21" cy="19.5" r="1.7" fill="#fef08a"/>
        <path d="M15 22L9 20M12 21L9 24" stroke="#f87171" stroke-width="1.7" stroke-linecap="round"/>`;

    case 'toad':
      return `
        <ellipse cx="32" cy="39" rx="19" ry="13" fill="${dark}" stroke="${main}" stroke-width="2.3"/>
        <circle cx="22" cy="25" r="6" fill="${main}" stroke="${light}" stroke-width="1.8"/>
        <circle cx="42" cy="25" r="6" fill="${main}" stroke="${light}" stroke-width="1.8"/>
        <circle cx="22" cy="25" r="2.5" fill="#fef08a"/><circle cx="42" cy="25" r="2.5" fill="#fef08a"/>
        <path d="M19 42Q32 47 45 42" stroke="${light}" stroke-width="2" stroke-linecap="round"/>
        <circle cx="28" cy="35" r="2" fill="${accent}" opacity="0.65"/><circle cx="37" cy="34" r="2.2" fill="${accent}" opacity="0.65"/>`;

    case 'bird':
      return `
        <path d="M32 32C22 18 11 16 7 22C13 28 17 34 22 38L32 50L42 38C47 34 51 28 57 22C53 16 42 18 32 32Z" fill="${main}" fill-opacity="0.45" stroke="${light}" stroke-width="2.1" stroke-linejoin="round"/>
        <circle cx="32" cy="24" r="7" fill="${dark}" stroke="${main}" stroke-width="2"/>
        <polygon points="32,26 28.5,33 35.5,33" fill="#facc15"/>
        <circle cx="29" cy="23" r="1.6" fill="#ffffff"/><circle cx="35" cy="23" r="1.6" fill="#ffffff"/>`;

    case 'whale':
      return `
        <path d="M11 35C11 21 22 15 37 17C46 18 52 24 53 33C49 39 41 42 31 42C22 42 15 41 11 35Z" fill="${dark}" stroke="${main}" stroke-width="2.2"/>
        <path d="M47 35L56 46L44 43Z" fill="${main}" stroke="${light}" stroke-width="1.5"/>
        <circle cx="21" cy="28" r="2.2" fill="#fef08a"/>
        <path d="M14 36Q24 39 34 36" stroke="${light}" stroke-width="1.6"/>
        <circle cx="33" cy="25" r="1.6" fill="${accent}"/><circle cx="40" cy="29" r="1.4" fill="#ffffff"/><circle cx="29" cy="31" r="1.2" fill="${light}"/>`;

    case 'fish':
      return `
        <path d="M11 32C18 19 34 18 45 27L55 18V46L45 37C34 46 18 45 11 32Z" fill="${dark}" stroke="${main}" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M27 21L33 12L37 22" fill="${main}" stroke="${light}" stroke-width="1.5"/>
        <circle cx="21" cy="29" r="2.2" fill="#fef08a"/>
        <path d="M15 35L21 33L17 38" stroke="${light}" stroke-width="1.6"/>`;

    case 'hornet':
      return `
        <path d="M32 28C22 16 11 16 12 24C13 30 22 31 32 30C42 31 51 30 52 24C53 16 42 16 32 28Z" fill="${light}" fill-opacity="0.32" stroke="${light}" stroke-width="1.8"/>
        <ellipse cx="32" cy="38" rx="8" ry="13" fill="${dark}" stroke="${main}" stroke-width="2.2"/>
        <line x1="25" y1="35" x2="39" y2="35" stroke="${accent}" stroke-width="2.5"/><line x1="26" y1="42" x2="38" y2="42" stroke="${accent}" stroke-width="2.5"/>
        <polygon points="32,56 29,50 35,50" fill="#ffffff"/>
        <circle cx="29" cy="22" r="2.2" fill="#f87171"/><circle cx="35" cy="22" r="2.2" fill="#f87171"/>`;

    case 'mantis':
      return `
        <path d="M26 24L13 18L19 34M38 24L51 18L45 34" stroke="${light}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
        <polygon points="32,14 40,22 32,29 24,22" fill="${main}" stroke="${light}" stroke-width="1.8"/>
        <path d="M32 29L38 49L32 54L26 49Z" fill="${dark}" stroke="${main}" stroke-width="2"/>
        <circle cx="27.5" cy="21" r="2" fill="#fef08a"/><circle cx="36.5" cy="21" r="2" fill="#fef08a"/>`;

    case 'butterfly':
      return `
        <path d="M32 29C22 12 8 11 9 25C10 35 21 36 32 34C43 36 54 35 55 25C56 11 42 12 32 29Z" fill="${main}" fill-opacity="0.48" stroke="${light}" stroke-width="2"/>
        <path d="M32 35C23 39 14 46 18 52C23 55 29 48 32 42C35 48 41 55 46 52C50 46 41 39 32 35Z" fill="${accent}" fill-opacity="0.4" stroke="${accent}" stroke-width="1.8"/>
        <ellipse cx="32" cy="35" rx="2.8" ry="12" fill="${light}"/>
        <path d="M30 22L24 12M34 22L40 12" stroke="${light}" stroke-width="1.6" stroke-linecap="round"/>`;

    case 'worm':
      return `
        <path d="M16 49C16 37 28 39 32 32C36 25 46 27 46 18" stroke="${main}" stroke-width="10" stroke-linecap="round" fill="none"/>
        <path d="M16 49C16 37 28 39 32 32C36 25 46 27 46 18" stroke="${dark}" stroke-width="2" stroke-dasharray="3 5" stroke-linecap="round" fill="none"/>
        <circle cx="46" cy="17" r="6" fill="${dark}" stroke="${light}" stroke-width="1.8"/>
        <circle cx="46" cy="17" r="2.5" fill="${accent}"/>`;

    case 'bull':
      return `
        <path d="M18 24C10 21 8 12 14 9C14 15 17 18 22 19M46 24C54 21 56 12 50 9C50 15 47 18 42 19" fill="${light}" stroke="${accent}" stroke-width="1.8"/>
        <path d="M19 24H45L41 47L32 52L23 47Z" fill="${dark}" stroke="${main}" stroke-width="2.3" stroke-linejoin="round"/>
        <circle cx="26" cy="31" r="2.2" fill="#fef08a"/><circle cx="38" cy="31" r="2.2" fill="#fef08a"/>
        <circle cx="32" cy="46" r="4" stroke="#ffdf9f" stroke-width="2"/>`;

    case 'goblin':
      return `
        <path d="M19 30L6 23L17 38M45 30L58 23L47 38" fill="${main}" stroke="${light}" stroke-width="1.9" stroke-linejoin="round"/>
        <ellipse cx="32" cy="35" rx="14" ry="13" fill="${dark}" stroke="${main}" stroke-width="2.2"/>
        <polygon points="24,31 30,33 25,35" fill="#facc15"/><polygon points="40,31 34,33 39,35" fill="#facc15"/>
        <path d="M25 42L28 39L32 42L36 39L39 42" stroke="${light}" stroke-width="1.8"/>`;

    case 'orc':
      return `
        <path d="M16 32C16 19 22 14 32 14C42 14 48 19 48 32V46L32 52L16 46Z" fill="${dark}" stroke="${main}" stroke-width="2.3" stroke-linejoin="round"/>
        <polygon points="21,44 24,34 27,44" fill="#fffbeb"/><polygon points="43,44 40,34 37,44" fill="#fffbeb"/>
        <circle cx="25" cy="29" r="2.3" fill="#f87171"/><circle cx="39" cy="29" r="2.3" fill="#f87171"/>
        <path d="M22 24L29 26M42 24L35 26" stroke="${light}" stroke-width="2.2" stroke-linecap="round"/>`;

    case 'cyclops':
      return `
        <path d="M15 34C15 18 22 12 32 12C42 12 49 18 49 34V49L32 54L15 49Z" fill="${dark}" stroke="${main}" stroke-width="2.3"/>
        <ellipse cx="32" cy="28" rx="9" ry="6.5" fill="#fffbeb" stroke="${light}" stroke-width="1.8"/>
        <circle cx="32" cy="28" r="3.8" fill="${accent}"/><circle cx="32" cy="28" r="1.6" fill="#09100d"/>
        <path d="M24 43H40" stroke="${light}" stroke-width="2.2" stroke-linecap="round"/>`;

    case 'imp':
      return `
        <path d="M21 24L13 10L27 20M43 24L51 10L37 20" fill="${main}" stroke="${light}" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="32" cy="35" r="15" fill="${dark}" stroke="${main}" stroke-width="2.3"/>
        <polygon points="24,31 30,34 25,36" fill="#fef08a"/><polygon points="40,31 34,34 39,36" fill="#fef08a"/>
        <path d="M24 43Q32 48 40 43" stroke="${light}" stroke-width="2" stroke-linecap="round"/>`;

    case 'angel':
      return `
        <path d="M23 33C11 26 7 15 11 11C17 16 22 20 26 24M41 33C53 26 57 15 53 11C47 16 42 20 38 24" fill="${light}" fill-opacity="0.35" stroke="${light}" stroke-width="2" stroke-linejoin="round"/>
        <ellipse cx="32" cy="11" rx="10" ry="3" stroke="#fde68a" stroke-width="2.2"/>
        <path d="M22 54L26 30H38L42 54Z" fill="${dark}" stroke="${main}" stroke-width="2"/>
        <circle cx="32" cy="23" r="6.5" fill="${main}" fill-opacity="0.55" stroke="${light}" stroke-width="1.8"/>`;

    case 'faery':
      return `
        <path d="M32 32C21 15 9 14 10 25C11 33 21 36 32 34C43 36 53 33 54 25C55 14 43 15 32 32Z" fill="${main}" fill-opacity="0.38" stroke="${light}" stroke-width="1.9"/>
        <path d="M32 36C24 40 19 48 23 52C27 54 30 47 32 43C34 47 37 54 41 52C45 48 40 40 32 36Z" fill="${accent}" fill-opacity="0.35" stroke="${accent}" stroke-width="1.5"/>
        <circle cx="32" cy="26" r="5.5" fill="${light}" stroke="${main}" stroke-width="1.6"/>
        <circle cx="32" cy="36" r="3" fill="#ffffff"/>`;

    case 'wizard':
      return `
        <path d="M16 55L22 37H42L48 55Z" fill="${dark}" stroke="${main}" stroke-width="2"/>
        <ellipse cx="32" cy="25" rx="18" ry="4.5" fill="${dark}" stroke="${light}" stroke-width="1.8"/>
        <path d="M20 25L32 8L44 25Z" fill="${main}" fill-opacity="0.7" stroke="${light}" stroke-width="1.8" stroke-linejoin="round"/>
        <circle cx="28" cy="32" r="2" fill="${accent}"/><circle cx="36" cy="32" r="2" fill="${accent}"/>`;

    case 'knight':
      return `
        <path d="M18 26C18 14 24 10 32 10C40 10 46 14 46 26V44L32 53L18 44Z" fill="${dark}" stroke="${light}" stroke-width="2.2" stroke-linejoin="round"/>
        <rect x="22" y="26" width="20" height="6.5" rx="1.5" fill="#09100d" stroke="${main}" stroke-width="1.5"/>
        <line x1="25" y1="29.2" x2="39" y2="29.2" stroke="${accent}" stroke-width="2.4" stroke-linecap="round"/>
        <line x1="32" y1="36" x2="32" y2="49" stroke="${light}" stroke-width="1.8"/>`;

    case 'rider':
      return `
        <path d="M15 47C16 35 24 31 36 32L46 23L52 28L46 37L48 52H41L39 42H26L23 52H16Z" fill="${dark}" stroke="${main}" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="29" cy="20" r="6" fill="${main}" fill-opacity="0.65" stroke="${light}" stroke-width="1.8"/>
        <line x1="16" y1="12" x2="48" y2="29" stroke="${accent}" stroke-width="2.4" stroke-linecap="round"/>`;

    case 'golem':
      return `
        <rect x="15" y="14" width="34" height="36" rx="6" fill="${dark}" stroke="${main}" stroke-width="2.5"/>
        <path d="M15 26H49M26 14V26M38 38V50" stroke="${light}" stroke-opacity="0.35" stroke-width="1.5"/>
        <rect x="22" y="21" width="6" height="4" rx="1" fill="${accent}"/><rect x="36" y="21" width="6" height="4" rx="1" fill="${accent}"/>
        <path d="M23 39H41" stroke="${light}" stroke-width="2.4" stroke-linecap="round"/>`;

    case 'idol':
      return `
        <path d="M18 54H46L42 46H22Z" fill="${dark}" stroke="${accent}" stroke-width="2"/>
        <path d="M22 46V21L32 10L42 21V46Z" fill="${main}" fill-opacity="0.35" stroke="${light}" stroke-width="2.2" stroke-linejoin="round"/>
        <circle cx="28" cy="27" r="2.2" fill="${accent}"/><circle cx="36" cy="27" r="2.2" fill="${accent}"/>
        <path d="M27 36L32 33L37 36L32 39Z" fill="${light}"/>`;

    case 'orb':
      return `
        <circle cx="32" cy="32" r="17" fill="${dark}" stroke="${main}" stroke-width="2.5"/>
        <ellipse cx="32" cy="32" rx="22" ry="7" transform="rotate(-24 32 32)" stroke="${accent}" stroke-width="1.8" fill="none"/>
        <circle cx="32" cy="32" r="7" fill="${main}" fill-opacity="0.6" stroke="${light}" stroke-width="1.5"/>
        <circle cx="26" cy="24" r="3" fill="#ffffff" opacity="0.7"/>`;

    case 'rift':
      return `
        <path d="M32 7C41 18 44 26 44 32C44 38 41 46 32 57C23 46 20 38 20 32C20 26 23 18 32 7Z" fill="${dark}" stroke="${main}" stroke-width="2.4" stroke-linejoin="round"/>
        <path d="M32 14C36 22 37 27 37 32C37 37 36 42 32 50C28 42 27 37 27 32C27 27 28 22 32 14Z" fill="${main}" fill-opacity="0.65" stroke="${light}" stroke-width="1.5"/>
        <line x1="32" y1="20" x2="32" y2="44" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>`;

    case 'spire':
      return `
        <path d="M20 55H44L39 46H25Z" fill="${dark}" stroke="${light}" stroke-width="2"/>
        <polygon points="32,8 40,46 24,46" fill="${main}" fill-opacity="0.45" stroke="${light}" stroke-width="2.2" stroke-linejoin="round"/>
        <circle cx="32" cy="11" r="4" fill="${accent}"/>
        <path d="M18 18L25 22M46 18L39 22M16 30L24 32M48 30L40 32" stroke="${accent}" stroke-width="2" stroke-linecap="round"/>`;

    case 'furnace':
      return `
        <path d="M15 52V24C15 15 22 10 32 10C42 10 49 15 49 24V52Z" fill="#334155" stroke="${light}" stroke-width="2.2"/>
        <path d="M22 52V32C22 26 26 23 32 23C38 23 42 26 42 32V52Z" fill="${main}" stroke="#fef08a" stroke-width="1.8"/>
        <path d="M27 30V52M32 24V52M37 30V52" stroke="#1e293b" stroke-width="2"/>`;

    case 'blade':
      return `
        <path d="M17 47L46 13L51 11L49 17L22 50Z" fill="${light}" fill-opacity="0.82" stroke="${main}" stroke-width="2" stroke-linejoin="round"/>
        <line x1="25" y1="40" x2="45" y2="17" stroke="${accent}" stroke-width="1.6"/>
        <path d="M15 38L26 48" stroke="#e5c27b" stroke-width="3.2" stroke-linecap="round"/>
        <line x1="12" y1="52" x2="19" y2="44" stroke="#b45309" stroke-width="3.4" stroke-linecap="round"/>`;

    case 'shield':
      return `
        <path d="M32 9L50 17V33C50 44 42 52 32 56C22 52 14 44 14 33V17L32 9Z" fill="${dark}" stroke="${light}" stroke-width="2.4" stroke-linejoin="round"/>
        <circle cx="27" cy="29" r="2.2" fill="${accent}"/><circle cx="37" cy="29" r="2.2" fill="${accent}"/>
        <path d="M25 39H39" stroke="${main}" stroke-width="2.2" stroke-linecap="round"/>`;

    case 'cannon':
      return `
        <rect x="18" y="21" width="32" height="18" rx="4" transform="rotate(-18 34 30)" fill="#334155" stroke="${light}" stroke-width="2.2"/>
        <ellipse cx="48" cy="24" rx="4.5" ry="8" transform="rotate(-18 48 24)" fill="#09100d" stroke="${accent}" stroke-width="2"/>
        <circle cx="25" cy="44" r="9" fill="${dark}" stroke="#e5c27b" stroke-width="2.4"/>
        <circle cx="25" cy="44" r="3" fill="#e5c27b"/>`;

    case 'spikeball':
      return `
        <path d="M32 7V15M32 49V57M7 32H15M49 32H57M14 14L20 20M44 44L50 50M50 14L44 20M20 44L14 50" stroke="${light}" stroke-width="2.8" stroke-linecap="round"/>
        <circle cx="32" cy="32" r="15" fill="${dark}" stroke="${main}" stroke-width="2.3"/>
        <circle cx="27" cy="30" r="2.2" fill="${accent}"/><circle cx="37" cy="30" r="2.2" fill="${accent}"/>`;

    case 'fountain':
      return `
        <path d="M16 40H48L43 52H21Z" fill="#334155" stroke="${light}" stroke-width="2"/>
        <path d="M22 30H42L39 40H25Z" fill="${dark}" stroke="${main}" stroke-width="1.8"/>
        <path d="M32 14C27 14 21 19 21 29M32 14C37 14 43 19 43 29M32 14V30" stroke="${main}" stroke-width="3" stroke-linecap="round" fill="none"/>`;

    case 'scroll':
      return `
        <rect x="17" y="13" width="30" height="38" rx="4" fill="#fef3c7" fill-opacity="0.22" stroke="${main}" stroke-width="2.2"/>
        <line x1="23" y1="24" x2="41" y2="24" stroke="${light}" stroke-width="2" stroke-linecap="round"/>
        <line x1="23" y1="32" x2="39" y2="32" stroke="${accent}" stroke-width="2" stroke-linecap="round"/>
        <line x1="23" y1="40" x2="35" y2="40" stroke="${light}" stroke-width="2" stroke-linecap="round"/>`;

    case 'tree':
      return `
        <path d="M16 32C12 20 20 11 32 11C44 11 52 20 48 32Z" fill="${main}" fill-opacity="0.45" stroke="${light}" stroke-width="2.2"/>
        <path d="M26 31V53H38V31M26 48L18 55M38 48L46 55" fill="${dark}" stroke="#a16207" stroke-width="2.4" stroke-linejoin="round"/>
        <circle cx="29" cy="39" r="1.8" fill="${accent}"/><circle cx="35" cy="39" r="1.8" fill="${accent}"/>`;

    case 'mushroom':
      return `
        <path d="M12 34C12 18 21 12 32 12C43 12 52 18 52 34Z" fill="${main}" fill-opacity="0.65" stroke="${light}" stroke-width="2.2"/>
        <rect x="25" y="34" width="14" height="19" rx="4" fill="#e7e5e4" fill-opacity="0.3" stroke="${light}" stroke-width="2"/>
        <circle cx="23" cy="23" r="3" fill="${accent}"/><circle cx="37" cy="20" r="3.5" fill="${accent}"/><circle cx="43" cy="28" r="2.2" fill="${light}"/>`;

    case 'pumpkin':
      return `
        <path d="M32 10V17" stroke="#4ade80" stroke-width="3" stroke-linecap="round"/>
        <ellipse cx="32" cy="36" rx="20" ry="16" fill="#ea580c" stroke="#fed7aa" stroke-width="2.2"/>
        <ellipse cx="32" cy="36" rx="10" ry="16" stroke="#9a3412" stroke-width="1.6" fill="none"/>
        <polygon points="22,30 28,34 21,35" fill="#fef08a"/><polygon points="42,30 43,35 36,34" fill="#fef08a"/>
        <path d="M22 42L26 45L30 42L34 45L38 42L42 44" stroke="#fef08a" stroke-width="2" stroke-linejoin="round"/>`;

    case 'hand':
      return `
        <path d="M22 54V33L18 22C17 19 21 18 22 21L25 30V15C25 12 29 12 29 15V29V13C29 10 34 10 34 13V29V16C34 13 38 13 38 16V31L42 23C43 20 47 22 45 25L41 38V54Z" fill="${main}" fill-opacity="0.52" stroke="${light}" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="32" cy="40" r="3.5" fill="${accent}"/>`;

    case 'brain':
      return `
        <path d="M20 42C13 40 12 30 18 26C16 17 24 12 31 16C38 12 48 17 46 26C52 30 51 40 44 42C41 48 35 48 32 45C29 48 23 48 20 42Z" fill="${main}" fill-opacity="0.55" stroke="${light}" stroke-width="2.2"/>
        <path d="M32 16V45M23 23Q27 28 22 33M41 23Q37 28 42 33" stroke="${accent}" stroke-width="1.8" stroke-linecap="round"/>`;

    case 'casket':
      return `
        <polygon points="23,10 41,10 48,26 42,54 22,54 16,26" fill="${dark}" stroke="${light}" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M32 18V42M24 27H40" stroke="${accent}" stroke-width="2.4" stroke-linecap="round"/>`;

    case 'fortress':
      return `
        <path d="M14 54V20H21V26H28V20H36V26H43V20H50V54Z" fill="${dark}" stroke="${light}" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M26 54V40C26 36 28.5 34 32 34C35.5 34 38 36 38 40V54Z" fill="#09100d" stroke="${main}" stroke-width="1.8"/>`;

    case 'hammer':
      return `
        <line x1="32" y1="26" x2="32" y2="55" stroke="#d97706" stroke-width="4" stroke-linecap="round"/>
        <rect x="14" y="12" width="36" height="16" rx="3" fill="${main}" fill-opacity="0.65" stroke="${light}" stroke-width="2.2"/>
        <path d="M32 15V25M27 20H37" stroke="#fffbeb" stroke-width="2"/>`;

    case 'mirror':
      return `
        <ellipse cx="32" cy="30" rx="14" ry="20" fill="#bae6fd" fill-opacity="0.32" stroke="${light}" stroke-width="2.6"/>
        <line x1="23" y1="22" x2="35" y2="16" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
        <line x1="24" y1="36" x2="41" y2="26" stroke="#ffffff" stroke-opacity="0.6" stroke-width="1.6" stroke-linecap="round"/>
        <rect x="28" y="49" width="8" height="7" rx="2" fill="#e5c27b"/>`;

    case 'balloon':
      return `
        <ellipse cx="32" cy="26" rx="15" ry="18" fill="${main}" fill-opacity="0.72" stroke="${light}" stroke-width="2"/>
        <path d="M32 44Q28 50 34 56" stroke="${light}" stroke-width="1.8" stroke-linecap="round"/>
        <circle cx="26" cy="24" r="2.2" fill="#09100d"/><circle cx="38" cy="24" r="2.2" fill="#09100d"/>
        <path d="M26 32Q32 37 38 32" stroke="#09100d" stroke-width="2"/>`;

    case 'apple':
      return `
        <path d="M32 18C22 15 15 24 16 36C17 47 25 53 32 50C39 53 47 47 48 36C49 24 42 15 32 18Z" fill="#dc2626" stroke="#fca5a5" stroke-width="2.2"/>
        <path d="M32 18C32 12 36 10 40 11" stroke="#4ade80" stroke-width="2.4" stroke-linecap="round"/>
        <circle cx="26" cy="32" r="2.2" fill="#fef08a"/><circle cx="38" cy="32" r="2.2" fill="#fef08a"/>
        <path d="M26 40L32 37L38 40" stroke="#fef08a" stroke-width="2"/>`;

    case 'box':
      return `
        <rect x="14" y="20" width="36" height="30" rx="3" fill="${dark}" stroke="${main}" stroke-width="2.3"/>
        <path d="M14 29H50M32 20V50" stroke="${accent}" stroke-width="2"/>
        <circle cx="32" cy="34" r="4" fill="${main}" stroke="#ffffff" stroke-width="1.4"/>`;

    case 'kettle':
      return `
        <path d="M22 22C22 13 42 13 42 22" stroke="#cbd5e1" stroke-width="2.6" fill="none"/>
        <circle cx="32" cy="37" r="15" fill="#334155" stroke="${light}" stroke-width="2.2"/>
        <path d="M46 33L55 26L52 38" stroke="${light}" stroke-width="2.4" stroke-linejoin="round"/>
        <circle cx="27" cy="35" r="2" fill="${accent}"/><circle cx="37" cy="35" r="2" fill="${accent}"/>`;

    case 'quill':
      return `
        <path d="M15 53C20 35 33 17 50 11C49 26 39 39 24 45Z" fill="${main}" fill-opacity="0.65" stroke="${light}" stroke-width="2" stroke-linejoin="round"/>
        <line x1="13" y1="55" x2="48" y2="14" stroke="#fffbeb" stroke-width="2" stroke-linecap="round"/>`;

    case 'card':
      return `
        <rect x="17" y="11" width="30" height="42" rx="4" fill="#f8fafc" fill-opacity="0.18" stroke="${light}" stroke-width="2.2"/>
        <polygon points="32,20 40,32 32,44 24,32" fill="${main}" stroke="${accent}" stroke-width="1.8"/>`;

    case 'pachyderm':
      return `
        <ellipse cx="32" cy="34" rx="16" ry="15" fill="${dark}" stroke="${main}" stroke-width="2.2"/>
        <path d="M17 24C10 24 9 37 16 40M47 24C54 24 55 37 48 40" fill="${main}" fill-opacity="0.35" stroke="${light}" stroke-width="1.8"/>
        <path d="M32 37V52Q32 56 37 54" stroke="${light}" stroke-width="4" stroke-linecap="round" fill="none"/>
        <path d="M23 41L17 48M41 41L47 48" stroke="#fffbeb" stroke-width="2.4" stroke-linecap="round"/>
        <circle cx="26" cy="29" r="2" fill="#fef08a"/><circle cx="38" cy="29" r="2" fill="#fef08a"/>`;

    case 'elemental':
    default:
      return `
        <path d="M32 10C41 18 48 25 46 37C45 46 39 52 32 53C25 52 19 46 18 37C16 25 23 18 32 10Z" fill="${main}" fill-opacity="0.45" stroke="${light}" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M21 31L12 24M43 31L52 24" stroke="${accent}" stroke-width="2.4" stroke-linecap="round"/>
        <circle cx="26.5" cy="30" r="2.4" fill="#ffffff"/><circle cx="37.5" cy="30" r="2.4" fill="#ffffff"/>
        <path d="M26 40Q32 45 38 40" stroke="${accent}" stroke-width="2" stroke-linecap="round"/>`;
  }
}

function classifyMonsterShape(name, unit) {
  const n = name.toLowerCase();
  const tags = unit?.tags || [];
  if (/\b(spider|dryder|arachnid)\b/.test(n) || tags.includes('Spider')) return 'spider';
  if (/\b(hydra|orochi|chimera|two headed)\b/.test(n)) return 'hydra';
  if (/\b(egg)\b/.test(n)) return 'egg';
  if (/\b(wyrm)\b/.test(n)) return 'wyrm';
  if (/\b(dragon|drake|dracolich|necrodrake|cindervein|stormcrest|winterbringer)\b/.test(n) || tags.includes('Dragon')) return 'dragon';
  if (/\b(slime|goo|gelgut)\b/.test(n) || tags.includes('Slime')) return 'slime';
  if (/\b(mass of eyes)\b/.test(n)) return 'massOfEyes';
  if (/\b(eye|eyeball|watcher|observer|seer|fearface)\b/.test(n) || tags.includes('Eye')) return 'eye';
  if (/\b(bone wheel)\b/.test(n)) return 'boneWheel';
  if (/\b(reaper|death|executioner)\b/.test(n) && !/\b(deathchill|death snake|death mage)\b/.test(n)) return 'reaper';
  if (/\b(casket|tombstone)\b/.test(n)) return 'casket';
  if (/\b(ghost|banshee|spirit|sorrow|geist|wretch|ancestor)\b/.test(n)) return 'ghost';
  if (/\b(vampire)\b/.test(n)) return 'vampire';
  if (/\b(bat)\b/.test(n)) return 'bat';
  if (/\b(skull|skeleton|lich|bone|zombie|ossuary|thunderbones|corpse)\b/.test(n) || tags.includes('Undead')) return 'skull';
  if (/\b(wolf|werewolf|hound|fenris|stalker|displacer)\b/.test(n)) return 'wolf';
  if (/\b(bear|yeti)\b/.test(n)) return 'bear';
  if (/\b(lion|lamasu|haetae)\b/.test(n)) return 'lion';
  if (/\b(cat|nine the)\b/.test(n)) return 'cat';
  if (/\b(turtle)\b/.test(n)) return 'turtle';
  if (/\b(snake|gorgon|medusa)\b/.test(n)) return 'snake';
  if (/\b(toad|frog|shru)\b/.test(n)) return 'toad';
  if (/\b(phoenix|eagle|raven|bird|cockatrice|avian|thunderbird|hamsa|gloomwing)\b/.test(n)) return 'bird';
  if (/\b(whale|swimmer)\b/.test(n)) return 'whale';
  if (/\b(fish|shark|coral)\b/.test(n)) return 'fish';
  if (/\b(hornet|fly|bug|scuttler)\b/.test(n)) return 'hornet';
  if (/\b(mantis)\b/.test(n)) return 'mantis';
  if (/\b(butterfly|moth)\b/.test(n)) return 'butterfly';
  if (/\b(worm|maggot|leech)\b/.test(n)) return 'worm';
  if (/\b(minotaur|bull|centaur|satyr|goatia|pan|minos|taurokelevee|trollataur)\b/.test(n)) return 'bull';
  if (/\b(goblin|gremlin|kobold|boggart|gnome|hemogoblin)\b/.test(n)) return 'goblin';
  if (/\b(orc|ogre|troll|trollet|duergar|titan)\b/.test(n)) return 'orc';
  if (/\b(cyclops)\b/.test(n)) return 'cyclops';
  if (/\b(angel|seraph|archon|saint|aesir|odin)\b/.test(n)) return 'angel';
  if (/\b(faery|fae|aelf|siren)\b/.test(n)) return 'faery';
  if (/\b(wizard|mage|magus|shaman|priest|warlock|cultist|witch|hag|enchanter|translocator|prismancer|mechanomancer|druid|prophet|chronos|time keeper|fujin|philosopher|blacksmith|arbiter|brewer|collector)\b/.test(n)) return 'wizard';
  if (/\b(rider)\b/.test(n)) return 'rider';
  if (/\b(knight|armor|guard|paladin)\b/.test(n)) return 'knight';
  if (/\b(cave|camp|fortress|castle|hive|pillar)\b/.test(n)) return 'fortress';
  if (/\b(idol|totem|reliquary)\b/.test(n)) return 'idol';
  if (/\b(orb)\b/.test(n) || tags.includes('Orb')) return 'orb';
  if (/\b(rift)\b/.test(n)) return 'rift';
  if (/\b(spire)\b/.test(n)) return 'spire';
  if (/\b(furnace)\b/.test(n)) return 'furnace';
  if (/\b(blade|sword)\b/.test(n)) return 'blade';
  if (/\b(shield)\b/.test(n)) return 'shield';
  if (/\b(cannon)\b/.test(n)) return 'cannon';
  if (/\b(spike ball|spikeball)\b/.test(n)) return 'spikeball';
  if (/\b(fountain)\b/.test(n)) return 'fountain';
  if (/\b(scroll)\b/.test(n)) return 'scroll';
  if (/\b(tree|treant|oakheart|yggdrasil|vine|thorn|fly trap|bark)\b/.test(n)) return 'tree';
  if (/\b(mushboom|myco|rot sprout)\b/.test(n)) return 'mushroom';
  if (/\b(pumpkin|jack o|scarecrow)\b/.test(n)) return 'pumpkin';
  if (/\b(hand)\b/.test(n)) return 'hand';
  if (/\b(brain)\b/.test(n)) return 'brain';
  if (/\b(hammer)\b/.test(n)) return 'hammer';
  if (/\b(mirror)\b/.test(n)) return 'mirror';
  if (/\b(balloon)\b/.test(n)) return 'balloon';
  if (/\b(apple)\b/.test(n)) return 'apple';
  if (/\b(box)\b/.test(n)) return 'box';
  if (/\b(kettle)\b/.test(n)) return 'kettle';
  if (/\b(quill)\b/.test(n)) return 'quill';
  if (/\b(card)\b/.test(n)) return 'card';
  if (/\b(pachyderm)\b/.test(n)) return 'pachyderm';
  if (/\b(golem|colossus|gargoyle|construct|statue|sentinel)\b/.test(n) || tags.includes('Construct')) return 'golem';
  if (/\b(imp|fiend|demon|tormentor|troubler|maw|belcher|devourer|blightmonger|puppet|leghead|pain)\b/.test(n) || tags.includes('Demon')) return 'imp';
  return 'elemental';
}

function monsterRoleOverlay(name, unit, p) {
  const n = name.toLowerCase();
  let extra = '';
  if (/\b(queen|king|empress|prince|lord|tyrant|count|warchief|pumpking|grand)\b/.test(n)) {
    extra += `<path d="M22 14L25 7L29 12L32 6L35 12L39 7L42 14Z" fill="#fbbf24" stroke="#fffbeb" stroke-width="1.2" stroke-linejoin="round"/>`;
  }
  if (/\b(archer|huntsman)\b/.test(n)) {
    extra += `<path d="M51 16C57 24 57 38 51 46" stroke="#e5c27b" stroke-width="2" fill="none"/><line x1="47" y1="31" x2="59" y2="31" stroke="#fffbeb" stroke-width="1.6"/>`;
  }
  if (/\b(bomber|rocket)\b/.test(n)) {
    extra += `<circle cx="51" cy="46" r="5" fill="#1e293b" stroke="#f97316" stroke-width="1.6"/><path d="M53 41L56 37" stroke="#fef08a" stroke-width="2" stroke-linecap="round"/>`;
  }
  if (unit?.shields > 0 && !/\bshield\b/.test(n)) {
    extra += `<circle cx="32" cy="32" r="24.5" stroke="#7bd0ff" stroke-opacity="0.45" stroke-width="1.5" stroke-dasharray="6 4"/>`;
  }
  if (/\b(baby|small|fragment|sapling)\b/.test(n)) {
    extra += `<circle cx="52" cy="14" r="3" fill="${p.light}" fill-opacity="0.5"/>`;
  }
  if (/\b(giant|towering|megalith|ultimate|methuselah|mother of)\b/.test(n)) {
    extra += `<path d="M9 14L14 9M55 14L50 9M9 50L14 55M55 50L50 55" stroke="${p.accent}" stroke-width="2" stroke-linecap="round"/>`;
  }
  if (/\b(rainbow)\b/.test(n)) {
    extra += `<path d="M16 17A16 16 0 0 1 48 17" stroke="#f87171" stroke-width="1.8" fill="none"/><path d="M19 19A13 13 0 0 1 45 19" stroke="#facc15" stroke-width="1.8" fill="none"/><path d="M22 21A10 10 0 0 1 42 21" stroke="#38bdf8" stroke-width="1.8" fill="none"/>`;
  }
  return extra;
}

export function unitAssetSvg(unit, size = 34) {
  if (!unit) return wrapAssetSvg('<circle cx="32" cy="32" r="14" stroke="#998f80" stroke-width="2"/>', size);
  const name = typeof unit === 'string' ? unit : (unit.name || unit.species || 'Monster');
  const tags = unit.tags || [];
  const p = resolvePalette(name, tags, unit.is_boss ? 'Blood' : unit.is_companion ? 'Nature' : 'Arcane');

  if (BOSS_ART[name]) {
    return wrapAssetSvg(`${uniqueBackdrop(`boss:${name}`, p, 'boss')}${BOSS_ART[name]}`, size, 'ws-icon', name);
  }
  if (COMPANION_ART[name]) {
    return wrapAssetSvg(`${uniqueBackdrop(`comp:${name}`, p, 'aura')}${COMPANION_ART[name]}`, size, 'ws-icon', name);
  }

  const shape = classifyMonsterShape(name, unit);
  const h = hashString(`unit:${name}`);
  const isBaby = /\b(baby|small|fragment|sapling)\b/i.test(name);
  const scaleTransform = isBaby ? ' transform="translate(8 8) scale(0.75)"' : '';
  const body = `<g${scaleTransform}>${drawMonsterBody(shape, p, name)}</g>`;
  const flourish = elementalFlourish(p.key, p);
  const role = monsterRoleOverlay(name, unit, p);
  const gemX = 11 + (h % 6);
  const gemY = 53 - ((h >>> 5) % 5);
  const inner = `${uniqueBackdrop(`unit:${name}`, p)}${body}${flourish}${role}<circle cx="${gemX}" cy="${gemY}" r="1.2" fill="${p.accent}" opacity="0.7"/>`;
  return wrapAssetSvg(inner, size, 'ws-icon', name);
}

// Helper exported for Summon Spells so conjuration spells can embed the actual creature they summon!
export function unitSilhouetteInner(name, tags = []) {
  const p = resolvePalette(name, tags, 'Conjuration');
  if (BOSS_ART[name]) return BOSS_ART[name];
  if (COMPANION_ART[name]) return COMPANION_ART[name];
  const shape = classifyMonsterShape(name, { tags });
  return drawMonsterBody(shape, p, name);
}
