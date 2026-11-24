// Unique 64x64 visual assets for all 375 Equipment items.

import { elementalFlourish, hashString, resolvePalette, uniqueBackdrop, wrapAssetSvg } from './palette.js';

function drawEquipmentShape(kind, p) {
  const { main, light, dark, accent } = p;
  switch (kind) {
    // ---- WEAPONS ----
    case 'staff':
      return `
        <line x1="15" y1="53" x2="45" y2="17" stroke="#b45309" stroke-width="4" stroke-linecap="round"/>
        <line x1="15" y1="53" x2="45" y2="17" stroke="#e5c27b" stroke-width="1.4" stroke-linecap="round"/>
        <path d="M39 14C44 9 52 11 52 18C52 24 46 26 42 23" stroke="${light}" stroke-width="2.2" fill="none"/>
        <circle cx="46" cy="17" r="6.5" fill="${main}" stroke="${accent}" stroke-width="1.8"/>
        <circle cx="44" cy="15" r="2" fill="#ffffff"/>`;

    case 'wand':
      return `
        <line x1="14" y1="50" x2="44" y2="20" stroke="${dark}" stroke-width="4.2" stroke-linecap="round"/>
        <line x1="14" y1="50" x2="44" y2="20" stroke="${main}" stroke-width="2" stroke-linecap="round"/>
        <path d="M48 9L50 15L56 17L50 19L48 25L46 19L40 17L46 15Z" fill="${accent}" stroke="#ffffff" stroke-width="1"/>`;

    case 'scepter':
      return `
        <line x1="16" y1="52" x2="42" y2="24" stroke="#e5c27b" stroke-width="4" stroke-linecap="round"/>
        <polygon points="46,10 54,18 46,27 37,18" fill="${main}" stroke="#ffdf9f" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="46" cy="18" r="3.5" fill="${accent}"/>
        <path d="M34 26L41 33" stroke="#ffdf9f" stroke-width="2.6" stroke-linecap="round"/>`;

    case 'dagger':
      return `
        <path d="M24 40L47 13L52 12L49 19L30 44Z" fill="${light}" fill-opacity="0.88" stroke="${main}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M20 35L31 46" stroke="#e5c27b" stroke-width="3.2" stroke-linecap="round"/>
        <line x1="15" y1="50" x2="25" y2="40" stroke="#78350f" stroke-width="3.8" stroke-linecap="round"/>
        <circle cx="14" cy="51" r="2.6" fill="${accent}"/>`;

    case 'sword':
      return `
        <path d="M19 45L48 11L54 10L52 17L24 49Z" fill="${light}" fill-opacity="0.85" stroke="${main}" stroke-width="2" stroke-linejoin="round"/>
        <line x1="25" y1="41" x2="48" y2="15" stroke="${accent}" stroke-width="1.8"/>
        <path d="M15 36L29 49" stroke="#e5c27b" stroke-width="3.6" stroke-linecap="round"/>
        <line x1="12" y1="52" x2="21" y2="43" stroke="#92400e" stroke-width="4" stroke-linecap="round"/>`;

    case 'spear':
      return `
        <line x1="11" y1="53" x2="44" y2="20" stroke="#b45309" stroke-width="3.4" stroke-linecap="round"/>
        <polygon points="55,9 46,26 38,18" fill="${light}" stroke="${main}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M37 17L47 27" stroke="${accent}" stroke-width="2.4"/>`;

    case 'glaive':
      return `
        <line x1="12" y1="54" x2="40" y2="24" stroke="#b45309" stroke-width="3.4" stroke-linecap="round"/>
        <path d="M36 27C37 16 45 10 55 11C53 23 47 30 37 31Z" fill="${main}" fill-opacity="0.75" stroke="${light}" stroke-width="2" stroke-linejoin="round"/>`;

    case 'cleaver':
      return `
        <line x1="14" y1="52" x2="29" y2="37" stroke="#92400e" stroke-width="4.4" stroke-linecap="round"/>
        <path d="M26 35L45 13L55 23L37 44Z" fill="#cbd5e1" stroke="${main}" stroke-width="2.2" stroke-linejoin="round"/>
        <circle cx="46" cy="22" r="2.5" fill="#09100d"/>`;

    case 'banner':
      return `
        <line x1="18" y1="10" x2="18" y2="55" stroke="#e5c27b" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M20 14H50V39L35 47L20 39Z" fill="${dark}" stroke="${main}" stroke-width="2.2" stroke-linejoin="round"/>
        <polygon points="35,20 40,30 35,38 30,30" fill="${accent}"/>`;

    case 'hammer':
      return `
        <line x1="16" y1="52" x2="41" y2="27" stroke="#b45309" stroke-width="4" stroke-linecap="round"/>
        <rect x="30" y="13" width="23" height="15" rx="3" transform="rotate(45 41 21)" fill="${dark}" stroke="${light}" stroke-width="2.2"/>
        <circle cx="42" cy="22" r="3" fill="${accent}"/>`;

    case 'bracers':
      return `
        <rect x="13" y="21" width="16" height="24" rx="4" fill="${dark}" stroke="${main}" stroke-width="2.2"/>
        <rect x="35" y="21" width="16" height="24" rx="4" fill="${dark}" stroke="${main}" stroke-width="2.2"/>
        <path d="M13 28H29M35 28H51M13 38H29M35 38H51" stroke="${accent}" stroke-width="2"/>`;

    case 'boiler':
      return `
        <rect x="17" y="18" width="30" height="34" rx="7" fill="#334155" stroke="${main}" stroke-width="2.3"/>
        <circle cx="32" cy="35" r="8" fill="${main}" fill-opacity="0.7" stroke="#fef08a" stroke-width="1.8"/>
        <path d="M24 18V11H40V18" stroke="#cbd5e1" stroke-width="2.4"/>`;

    case 'loom':
      return `
        <rect x="14" y="14" width="36" height="36" rx="4" fill="${dark}" stroke="#e5c27b" stroke-width="2.4"/>
        <path d="M22 14V50M32 14V50M42 14V50" stroke="${main}" stroke-width="2"/>
        <path d="M14 25H50M14 39H50" stroke="${accent}" stroke-width="2"/>`;

    // ---- HEAD ----
    case 'crown':
      return `
        <path d="M11 45L14 20L24 31L32 14L40 31L50 20L53 45Z" fill="${main}" fill-opacity="0.48" stroke="#ffdf9f" stroke-width="2.3" stroke-linejoin="round"/>
        <rect x="11" y="45" width="42" height="6" rx="2" fill="#e5c27b"/>
        <circle cx="32" cy="36" r="4" fill="${accent}" stroke="#ffffff" stroke-width="1.2"/>
        <circle cx="20" cy="38" r="2.4" fill="${light}"/><circle cx="44" cy="38" r="2.4" fill="${light}"/>`;

    case 'halo':
      return `
        <ellipse cx="32" cy="28" rx="21" ry="8" stroke="#fde68a" stroke-width="4" fill="none"/>
        <ellipse cx="32" cy="28" rx="21" ry="8" stroke="#ffffff" stroke-width="1.4" fill="none"/>
        <path d="M32 11V17M18 15L22 20M46 15L42 20M32 40V49" stroke="${accent}" stroke-width="2" stroke-linecap="round"/>`;

    case 'plagueMask':
      return `
        <path d="M18 22C18 14 24 11 32 11C40 11 46 14 46 22C46 31 38 35 32 53C26 35 18 31 18 22Z" fill="#e2e8f0" fill-opacity="0.88" stroke="${main}" stroke-width="2.2" stroke-linejoin="round"/>
        <circle cx="25.5" cy="24" r="4.2" fill="#09100d" stroke="#e5c27b" stroke-width="1.6"/>
        <circle cx="38.5" cy="24" r="4.2" fill="#09100d" stroke="#e5c27b" stroke-width="1.6"/>
        <circle cx="25.5" cy="24" r="1.6" fill="${accent}"/><circle cx="38.5" cy="24" r="1.6" fill="${accent}"/>`;

    case 'mask':
      return `
        <path d="M15 24C15 15 22 12 32 12C42 12 49 15 49 24C49 38 42 49 32 53C22 49 15 38 15 24Z" fill="${dark}" stroke="${main}" stroke-width="2.3" stroke-linejoin="round"/>
        <ellipse cx="24.5" cy="28" rx="4.2" ry="2.8" fill="${accent}"/><ellipse cx="39.5" cy="28" rx="4.2" ry="2.8" fill="${accent}"/>
        <path d="M25 40Q32 44 39 40" stroke="${light}" stroke-width="2" stroke-linecap="round"/>`;

    case 'hat':
      return `
        <ellipse cx="32" cy="45" rx="23" ry="6.5" fill="${dark}" stroke="${main}" stroke-width="2.2"/>
        <path d="M18 44L32 11L46 44Z" fill="${main}" fill-opacity="0.58" stroke="${light}" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M20 41Q32 46 44 41" stroke="#e5c27b" stroke-width="3.2" stroke-linecap="round"/>`;

    case 'monocle':
      return `
        <circle cx="30" cy="28" r="14" fill="${main}" fill-opacity="0.28" stroke="#e5c27b" stroke-width="2.8"/>
        <circle cx="30" cy="28" r="7" stroke="${light}" stroke-opacity="0.6" stroke-width="1.4"/>
        <path d="M43 34Q52 44 44 55" stroke="#e5c27b" stroke-width="2" stroke-dasharray="3 2" fill="none"/>`;

    case 'helm':
      return `
        <path d="M17 29C17 16 23 11 32 11C41 11 47 16 47 29V48L32 53L17 48Z" fill="${dark}" stroke="${light}" stroke-width="2.3" stroke-linejoin="round"/>
        <path d="M21 30H43V35H21Z" fill="#09100d" stroke="${main}" stroke-width="1.5"/>
        <line x1="32" y1="11" x2="32" y2="52" stroke="${accent}" stroke-width="2"/>`;

    // ---- BODY ----
    case 'cloak':
      return `
        <path d="M21 14L32 19L43 14L53 53H11Z" fill="${dark}" stroke="${main}" stroke-width="2.3" stroke-linejoin="round"/>
        <path d="M24 15L32 52L40 15" fill="${main}" fill-opacity="0.3" stroke="${accent}" stroke-width="1.6"/>
        <circle cx="32" cy="19" r="3.5" fill="#ffdf9f"/>`;

    case 'armor':
      return `
        <path d="M20 12L11 20L15 29L18 28V52H46V28L49 29L53 20L44 12L32 18Z" fill="${dark}" stroke="${light}" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M23 26H41M23 36H41M32 18V52" stroke="${main}" stroke-width="2"/>
        <circle cx="32" cy="31" r="3.5" fill="${accent}"/>`;

    case 'robe':
      return `
        <path d="M22 12L10 23L16 30L20 27L16 54H48L44 27L48 30L54 23L42 12L32 20Z" fill="${dark}" stroke="${main}" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M32 20V54M24 14L32 24L40 14" stroke="#e5c27b" stroke-width="2"/>`;

    // ---- FEET ----
    case 'wingedBoots':
      return `
        <path d="M22 14H36V36L50 41V50H18V36Z" fill="${dark}" stroke="${main}" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M22 25C12 22 9 15 12 12C16 16 19 18 23 19M22 33C13 31 11 26 14 24" stroke="#ffdf9f" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M18 46H50" stroke="${accent}" stroke-width="2"/>`;

    case 'sandals':
      return `
        <path d="M13 44H51V50H13Z" fill="#92400e" stroke="#e5c27b" stroke-width="2"/>
        <path d="M20 44L26 24L35 44M22 35H38M30 44L41 34" stroke="${main}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;

    case 'boots':
      return `
        <path d="M21 13H37V36L51 41V51H17V36Z" fill="${dark}" stroke="${main}" stroke-width="2.3" stroke-linejoin="round"/>
        <path d="M21 20H37M21 28H37" stroke="${accent}" stroke-width="2"/>
        <path d="M17 47H51" stroke="${light}" stroke-width="2.2"/>`;

    // ---- TRINKETS ----
    case 'book':
      return `
        <rect x="14" y="10" width="36" height="44" rx="4" fill="${dark}" stroke="${main}" stroke-width="2.3"/>
        <line x1="22" y1="10" x2="22" y2="54" stroke="#e5c27b" stroke-width="2.4"/>
        <polygon points="36,21 42,32 36,43 30,32" fill="${main}" fill-opacity="0.6" stroke="${accent}" stroke-width="1.6"/>
        <circle cx="36" cy="32" r="2.6" fill="#ffffff"/>`;

    case 'ring':
      return `
        <circle cx="32" cy="36" r="15" stroke="#e5c27b" stroke-width="4.5" fill="none"/>
        <polygon points="32,12 40,21 32,29 24,21" fill="${main}" stroke="${light}" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="32" cy="20" r="2.5" fill="#ffffff"/>`;

    case 'eye':
      return `
        <path d="M9 32C16 20 24 16 32 16C40 16 48 20 55 32C48 44 40 48 32 48C24 48 16 44 9 32Z" fill="${dark}" stroke="#e5c27b" stroke-width="2.2"/>
        <circle cx="32" cy="32" r="10" fill="${main}" stroke="${light}" stroke-width="1.8"/>
        <circle cx="32" cy="32" r="4.5" fill="#09100d"/><circle cx="34.5" cy="29.5" r="2" fill="#ffffff"/>`;

    case 'lantern':
      return `
        <path d="M25 14C25 9 39 9 39 14" stroke="#e5c27b" stroke-width="2.2" fill="none"/>
        <rect x="20" y="15" width="24" height="5" rx="1.5" fill="#e5c27b"/>
        <path d="M21 20H43L46 46H18Z" fill="${main}" fill-opacity="0.32" stroke="#e5c27b" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M32 25C32 25 38 31 38 36C38 39.5 35.3 42 32 42C28.7 42 26 39.5 26 36C26 31 32 25 32 25Z" fill="${accent}"/>
        <rect x="17" y="46" width="30" height="5" rx="2" fill="#e5c27b"/>`;

    case 'hourglass':
      return `
        <line x1="17" y1="11" x2="47" y2="11" stroke="#e5c27b" stroke-width="3.2" stroke-linecap="round"/>
        <line x1="17" y1="53" x2="47" y2="53" stroke="#e5c27b" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M21 12C21 25 32 28 32 32C32 36 21 39 21 52M43 12C43 25 32 28 32 32C32 36 43 39 43 52" fill="${main}" fill-opacity="0.2" stroke="${light}" stroke-width="2"/>
        <polygon points="24,50 40,50 32,39" fill="${accent}"/>`;

    case 'chalice':
      return `
        <path d="M18 14H46L42 33C41 38 37 41 32 41C27 41 23 38 22 33Z" fill="${main}" fill-opacity="0.45" stroke="#ffdf9f" stroke-width="2.3" stroke-linejoin="round"/>
        <line x1="32" y1="41" x2="32" y2="52" stroke="#e5c27b" stroke-width="3.4"/>
        <line x1="22" y1="53" x2="42" y2="53" stroke="#ffdf9f" stroke-width="3.2" stroke-linecap="round"/>
        <ellipse cx="32" cy="17" rx="11" ry="2.8" fill="${accent}" fill-opacity="0.7"/>`;

    case 'vial':
      return `
        <rect x="27" y="10" width="10" height="6" rx="1.5" fill="#d97706"/>
        <path d="M27 16V24L18 41C16 46 19 53 25 53H39C45 53 48 46 46 41L37 24V16Z" fill="${main}" fill-opacity="0.4" stroke="${light}" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M21 41H43C43 47 40 50 36 50H28C24 50 21 47 21 41Z" fill="${accent}"/>`;

    case 'doll':
      return `
        <circle cx="32" cy="20" r="8.5" fill="#a8a29e" stroke="${main}" stroke-width="2"/>
        <path d="M15 31H49L40 37L43 53H35L32 44L29 53H21L24 37Z" fill="${dark}" stroke="${light}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M28 18L30 22M30 18L28 22M34 18L36 22M36 18L34 22" stroke="#09100d" stroke-width="1.6"/>
        <line x1="42" y1="15" x2="52" y2="10" stroke="#f87171" stroke-width="2"/><circle cx="53" cy="9.5" r="2.5" fill="#f87171"/>`;

    case 'bell':
      return `
        <path d="M32 11C22 11 17 20 17 31L12 45H52L47 31C47 20 42 11 32 11Z" fill="${main}" fill-opacity="0.55" stroke="#ffdf9f" stroke-width="2.3" stroke-linejoin="round"/>
        <circle cx="32" cy="50" r="4.5" fill="#ffdf9f"/>`;

    case 'censer':
      return `
        <path d="M32 9V20M22 28L32 18L42 28" stroke="#e5c27b" stroke-width="2"/>
        <ellipse cx="32" cy="36" rx="14" ry="11" fill="${dark}" stroke="#ffdf9f" stroke-width="2.2"/>
        <path d="M24 34H40M26 40H38" stroke="${main}" stroke-width="2"/>
        <path d="M24 17Q20 11 26 8M40 17Q44 11 38 8" stroke="${light}" stroke-width="1.8" stroke-linecap="round"/>`;

    case 'mirror':
      return `
        <ellipse cx="32" cy="27" rx="14" ry="18" fill="#e0f2fe" fill-opacity="0.28" stroke="#e5c27b" stroke-width="2.6"/>
        <line x1="32" y1="45" x2="32" y2="56" stroke="#e5c27b" stroke-width="4" stroke-linecap="round"/>
        <line x1="24" y1="21" x2="35" y2="15" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>`;

    case 'cage':
      return `
        <path d="M16 52V24C16 15 23 11 32 11C41 11 48 15 48 24V52Z" fill="${dark}" fill-opacity="0.55" stroke="#cbd5e1" stroke-width="2.2"/>
        <path d="M24 13V52M32 11V52M40 13V52M16 32H48" stroke="#94a3b8" stroke-width="2"/>
        <circle cx="32" cy="36" r="5" fill="${main}" opacity="0.8"/>`;

    case 'cube':
      return `
        <polygon points="32,10 52,21 52,43 32,54 12,43 12,21" fill="${dark}" stroke="${main}" stroke-width="2.3" stroke-linejoin="round"/>
        <path d="M12 21L32 32L52 21M32 32V54" stroke="${light}" stroke-width="2"/>`;

    case 'orb':
      return `
        <circle cx="32" cy="32" r="17" fill="${dark}" stroke="${main}" stroke-width="2.4"/>
        <ellipse cx="32" cy="32" rx="22" ry="7" transform="rotate(-24 32 32)" stroke="${accent}" stroke-width="1.8" fill="none"/>
        <circle cx="32" cy="32" r="6" fill="${main}"/><circle cx="26" cy="24" r="2.8" fill="#ffffff" opacity="0.75"/>`;

    case 'orrery':
      return `
        <circle cx="32" cy="32" r="21" stroke="#e5c27b" stroke-width="1.8" fill="none"/>
        <ellipse cx="32" cy="32" rx="21" ry="8" transform="rotate(-32 32 32)" stroke="${light}" stroke-width="1.8" fill="none"/>
        <ellipse cx="32" cy="32" rx="21" ry="8" transform="rotate(32 32 32)" stroke="${main}" stroke-width="1.8" fill="none"/>
        <circle cx="32" cy="32" r="6" fill="${accent}"/><circle cx="48" cy="22" r="3" fill="${main}"/><circle cx="17" cy="43" r="2.6" fill="${light}"/>`;

    case 'chains':
      return `
        <rect x="12" y="25" width="18" height="14" rx="7" transform="rotate(-35 21 32)" stroke="${light}" stroke-width="3.2" fill="none"/>
        <rect x="23" y="25" width="18" height="14" rx="7" transform="rotate(35 32 32)" stroke="${main}" stroke-width="3.2" fill="none"/>
        <rect x="34" y="25" width="18" height="14" rx="7" transform="rotate(-35 43 32)" stroke="${accent}" stroke-width="3.2" fill="none"/>`;

    case 'shield':
      return `
        <path d="M32 9L50 17V33C50 44 42 52 32 56C22 52 14 44 14 33V17L32 9Z" fill="${dark}" stroke="${main}" stroke-width="2.4" stroke-linejoin="round"/>
        <polygon points="32,19 40,31 32,44 24,31" fill="${accent}" fill-opacity="0.65" stroke="${light}" stroke-width="1.5"/>`;

    case 'horn':
      return `
        <path d="M13 42C24 41 37 32 45 14L53 20C44 42 29 51 14 48Z" fill="${dark}" stroke="#ffdf9f" stroke-width="2.3" stroke-linejoin="round"/>
        <path d="M37 26L46 31M27 36L35 43" stroke="${main}" stroke-width="2.2"/>`;

    case 'scales':
      return `
        <line x1="32" y1="12" x2="32" y2="52" stroke="#e5c27b" stroke-width="2.8"/>
        <line x1="14" y1="22" x2="50" y2="22" stroke="#ffdf9f" stroke-width="2.6" stroke-linecap="round"/>
        <path d="M14 22L9 37H21Z" fill="${main}" fill-opacity="0.45" stroke="${light}" stroke-width="1.6"/>
        <path d="M50 22L43 37H55Z" fill="${accent}" fill-opacity="0.45" stroke="${light}" stroke-width="1.6"/>
        <line x1="22" y1="52" x2="42" y2="52" stroke="#e5c27b" stroke-width="3" stroke-linecap="round"/>`;

    case 'heart':
      return `
        <path d="M32 52C32 52 13 39 13 25C13 17.5 18.5 12 25 12C29 12 31 14.2 32 16.5C33 14.2 35 12 39 12C45.5 12 51 17.5 51 25C51 39 32 52 32 52Z" fill="${main}" fill-opacity="0.7" stroke="${light}" stroke-width="2.3" stroke-linejoin="round"/>
        <circle cx="25" cy="24" r="3" fill="#ffffff" opacity="0.55"/>`;

    case 'shard':
      return `
        <polygon points="32,8 48,26 32,56 16,26" fill="${main}" fill-opacity="0.62" stroke="${light}" stroke-width="2.2" stroke-linejoin="round"/>
        <polyline points="32,8 38,26 32,56" stroke="#ffffff" stroke-opacity="0.7" stroke-width="1.5" fill="none"/>`;

    case 'mitts':
      return `
        <path d="M21 52V32L14 28C11 26 14 21 17 23L22 26V17C22 12 42 12 42 17V52Z" fill="${dark}" stroke="${main}" stroke-width="2.3" stroke-linejoin="round"/>
        <path d="M21 44H42" stroke="#e5c27b" stroke-width="2.6"/>`;

    case 'sickle':
      return `
        <path d="M24 44L14 54" stroke="#92400e" stroke-width="4.2" stroke-linecap="round"/>
        <path d="M23 44C39 46 51 34 48 18C45 11 36 10 29 14C39 16 42 28 34 36Z" fill="${light}" stroke="${main}" stroke-width="2" stroke-linejoin="round"/>`;

    case 'amulet':
    default:
      return `
        <path d="M22 13C22 9 42 9 42 13L37 22H27Z" stroke="#e5c27b" stroke-width="2" fill="none"/>
        <circle cx="32" cy="36" r="15" fill="${dark}" stroke="#e5c27b" stroke-width="2.4"/>
        <polygon points="32,25 40,36 32,47 24,36" fill="${main}" stroke="${accent}" stroke-width="1.6" stroke-linejoin="round"/>
        <circle cx="32" cy="36" r="2.8" fill="#ffffff"/>`;
  }
}

function classifyEquipmentShape(item) {
  const n = (item?.name || '').toLowerCase();
  const slot = (item?.slot || '').toLowerCase();

  // Exact object keywords take priority regardless of slot
  if (/\b(book|codex|manual|cantromancy)\b/.test(n)) return 'book';
  if (/\b(plague doctor's mask)\b/.test(n)) return 'plagueMask';
  if (/\b(crown|diadem|coronet)\b/.test(n)) return 'crown';
  if (/\b(halo)\b/.test(n)) return 'halo';
  if (/\b(mask)\b/.test(n)) return 'mask';
  if (/\b(hat|cap)\b/.test(n)) return 'hat';
  if (/\b(monocle)\b/.test(n)) return 'monocle';
  if (/\b(helm|visor|casque)\b/.test(n)) return 'helm';
  if (/\b(winged|stormbrood)\b/.test(n) && slot === 'feet') return 'wingedBoots';
  if (/\b(sandals|slippers)\b/.test(n)) return 'sandals';
  if (/\b(boots|shoes|clogs|sabatons|treads|striders|mukluks|soles|backtrackers|timestriders)\b/.test(n) || slot === 'feet') return 'boots';
  if (/\b(cloak|mantle)\b/.test(n)) return 'cloak';
  if (/\b(armor|plate|mail|carapace)\b/.test(n)) return 'armor';
  if (/\b(robe|robes|vestments|raiment)\b/.test(n) || slot === 'body') return 'robe';
  if (/\b(hourglass|timer)\b/.test(n)) return 'hourglass';
  if (/\b(lantern|beacon)\b/.test(n)) return 'lantern';
  if (/\b(ring|draupnir|torc)\b/.test(n)) return 'ring';
  if (/\b(chalice|basin|mazer)\b/.test(n)) return 'chalice';
  if (/\b(vial|ampule|serum|venom|acidifier|goo|powder)\b/.test(n)) return 'vial';
  if (/\b(doll)\b/.test(n)) return 'doll';
  if (/\b(bell)\b/.test(n)) return 'bell';
  if (/\b(censer)\b/.test(n)) return 'censer';
  if (/\b(mirror)\b/.test(n)) return 'mirror';
  if (/\b(cage)\b/.test(n)) return 'cage';
  if (/\b(cube|abacus)\b/.test(n)) return 'cube';
  if (/\b(orrery|astrolabe|armillary|dynamo|lodestar)\b/.test(n)) return 'orrery';
  if (/\b(orb|bauble)\b/.test(n)) return 'orb';
  if (/\b(links|tether)\b/.test(n)) return 'chains';
  if (/\b(eye|oculus|iris|razoreye)\b/.test(n)) return 'eye';
  if (/\b(shield)\b/.test(n)) return 'shield';
  if (/\b(horn)\b/.test(n)) return 'horn';
  if (/\b(scales)\b/.test(n)) return 'scales';
  if (/\b(heart|bloodwell)\b/.test(n)) return 'heart';
  if (/\b(mitts|claw)\b/.test(n)) return 'mitts';
  if (/\b(sickle)\b/.test(n)) return 'sickle';
  if (/\b(shard|stone|ruby|prism|pole)\b/.test(n)) return 'shard';
  if (/\b(banner)\b/.test(n)) return 'banner';
  if (/\b(boiler)\b/.test(n)) return 'boiler';
  if (/\b(loom|weaver)\b/.test(n)) return 'loom';
  if (/\b(hammer|pulverizer)\b/.test(n)) return 'hammer';
  if (/\b(bracers)\b/.test(n)) return 'bracers';
  if (/\b(cleaver)\b/.test(n)) return 'cleaver';
  if (/\b(glaive)\b/.test(n)) return 'glaive';
  if (/\b(spear|lance)\b/.test(n)) return 'spear';
  if (/\b(dagger|sting)\b/.test(n)) return 'dagger';
  if (/\b(blade|brand|breaker|saber)\b/.test(n)) return 'sword';
  if (/\b(scepter|rod|keraunos|majesty|purifier|starblesser)\b/.test(n)) return 'scepter';
  if (/\b(wand|cane)\b/.test(n)) return 'wand';
  if (/\b(staff)\b/.test(n) || slot === 'weapon') return 'staff';
  if (slot === 'head') return 'helm';
  return 'amulet';
}

export function equipmentAssetSvg(item, size = 28) {
  if (!item) return wrapAssetSvg('<circle cx="32" cy="32" r="14" stroke="#e5c27b" stroke-width="2"/>', size);
  const name = typeof item === 'string' ? item : (item.name || 'Equipment');
  const tags = item.tags || [];
  const p = resolvePalette(name, tags, 'Metallic');
  const shape = classifyEquipmentShape(item);
  const bg = uniqueBackdrop(`eq:${name}`, p);
  const body = drawEquipmentShape(shape, p);
  const flourish = elementalFlourish(p.key, p);
  const h = hashString(`eq:${name}`);
  const rivet = `<circle cx="${50 - (h % 6)}" cy="${12 + ((h >>> 4) % 6)}" r="1.3" fill="${p.accent}" opacity="0.8"/>`;
  return wrapAssetSvg(`${bg}${body}${flourish}${rivet}`, size, 'ws-icon', name);
}
