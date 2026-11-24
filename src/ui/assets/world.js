// Unique 64x64 visual assets for Shrines, Clouds, Vaults, Mutators, Outfits (Wardrobe), Portals & World entities.

import { outfitColor } from '../../data/campaign.js';
import { hashString, resolvePalette, uniqueBackdrop, wrapAssetSvg } from './palette.js';

// ==================== 10 UNIQUE SHRINES ====================
const SHRINE_ART = {
  transmutation: `
    <circle cx="32" cy="32" r="28" fill="#0c2538" fill-opacity="0.5"/>
    <path d="M14 54H50L45 44H19L14 54Z" fill="#1e2d29" stroke="#e5c27b" stroke-width="2" stroke-linejoin="round"/>
    <path d="M18 44L14 34H50L46 44Z" fill="#164e63" fill-opacity="0.55" stroke="#7bd0ff" stroke-width="2" stroke-linejoin="round"/>
    <ellipse cx="32" cy="34" rx="16" ry="3.5" fill="#38bdf8" fill-opacity="0.45" stroke="#bae6fd" stroke-width="1.4"/>
    <path d="M32 10L35.5 18.5L44 22L35.5 25.5L32 34L28.5 25.5L20 22L28.5 18.5Z" fill="#ffdf9f" stroke="#ffffff" stroke-width="1.2"/>
    <path d="M15 24A18 18 0 0 1 25 11M49 24A18 18 0 0 0 39 11" stroke="#7bd0ff" stroke-width="1.8" stroke-linecap="round" stroke-dasharray="3 3"/>
    <circle cx="18" cy="28" r="2.2" fill="#c084fc"/><circle cx="46" cy="28" r="2.2" fill="#4ade80"/>`,

  duplication: `
    <circle cx="32" cy="32" r="28" fill="#2b124c" fill-opacity="0.45"/>
    <path d="M14 55H50L46 47H18L14 55Z" fill="#1e242b" stroke="#e5c27b" stroke-width="2" stroke-linejoin="round"/>
    <polygon points="23,11 35,29 23,46 11,29" fill="#c084fc" fill-opacity="0.38" stroke="#e9d5ff" stroke-width="2" stroke-linejoin="round"/>
    <polygon points="41,11 53,29 41,46 29,29" fill="#38bdf8" fill-opacity="0.38" stroke="#bae6fd" stroke-width="2" stroke-linejoin="round"/>
    <polygon points="32,20 38,29 32,38 26,29" fill="#ffffff" fill-opacity="0.7"/>
    <path d="M23 11V46M41 11V46" stroke="#ffffff" stroke-opacity="0.35" stroke-width="1.2"/>`,

  empowerment: `
    <circle cx="32" cy="32" r="28" fill="#422006" fill-opacity="0.45"/>
    <path d="M14 56H50L46 48H18L14 56Z" fill="#2c2418" stroke="#e5c27b" stroke-width="2"/>
    <path d="M22 48V22L32 8L42 22V48Z" fill="#78350f" fill-opacity="0.65" stroke="#ffdf9f" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M32 42V18M25 26L32 17L39 26" stroke="#fef08a" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M13 30L18 27M51 30L46 27M15 19L20 20M49 19L44 20" stroke="#fbbf24" stroke-width="1.8" stroke-linecap="round"/>`,

  chronomancy: `
    <circle cx="32" cy="32" r="28" fill="#083344" fill-opacity="0.5"/>
    <line x1="17" y1="10" x2="47" y2="10" stroke="#e5c27b" stroke-width="3" stroke-linecap="round"/>
    <line x1="17" y1="54" x2="47" y2="54" stroke="#e5c27b" stroke-width="3" stroke-linecap="round"/>
    <path d="M20 11C20 25 32 28 32 32C32 36 20 39 20 53M44 11C44 25 32 28 32 32C32 36 44 39 44 53" fill="#38bdf8" fill-opacity="0.16" stroke="#7bd0ff" stroke-width="2.2"/>
    <polygon points="24,15 40,15 32,26" fill="#ffdf9f" fill-opacity="0.55"/>
    <polygon points="23,51 41,51 32,38" fill="#e5c27b"/>
    <line x1="32" y1="27" x2="32" y2="39" stroke="#fef08a" stroke-width="1.6" stroke-dasharray="2 2"/>
    <circle cx="32" cy="32" r="23" stroke="#22d3ee" stroke-opacity="0.28" stroke-width="1.2" stroke-dasharray="4 4"/>`,

  calling: `
    <circle cx="32" cy="32" r="28" fill="#064e3b" fill-opacity="0.48"/>
    <path d="M15 46H49L44 55H20L15 46Z" fill="#233128" stroke="#e5c27b" stroke-width="2" stroke-linejoin="round"/>
    <ellipse cx="32" cy="46" rx="15" ry="3.5" fill="#10b981" fill-opacity="0.4" stroke="#86efac" stroke-width="1.4"/>
    <path d="M32 10C32 10 45 21 45 31C45 38.5 39.2 44 32 44C24.8 44 19 38.5 19 31C19 21 32 10 32 10Z" fill="#4ade80" fill-opacity="0.32" stroke="#86efac" stroke-width="2.2"/>
    <path d="M32 19C32 19 38 25 38 31C38 35 35.3 38 32 38C28.7 38 26 35 26 31C26 25 32 19 32 19Z" fill="#d1fae5" fill-opacity="0.7"/>
    <circle cx="28" cy="30" r="1.5" fill="#064e3b"/><circle cx="36" cy="30" r="1.5" fill="#064e3b"/>`,

  haste: `
    <circle cx="32" cy="32" r="28" fill="#422006" fill-opacity="0.45"/>
    <path d="M16 55H48L44 48H20L16 55Z" fill="#27241c" stroke="#e5c27b" stroke-width="1.8"/>
    <path d="M37 8L18 33H30L26 51L47 26H34L37 8Z" fill="#facc15" fill-opacity="0.4" stroke="#fef08a" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M8 20H18M6 29H15M48 35H58M46 43H55" stroke="#fde047" stroke-width="2.2" stroke-linecap="round"/>`,

  offering: `
    <circle cx="32" cy="32" r="28" fill="#431407" fill-opacity="0.5"/>
    <path d="M14 38H50L44 53H20L14 38Z" fill="#7c2d12" fill-opacity="0.7" stroke="#e5c27b" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M18 38H46" stroke="#ffdf9f" stroke-width="2"/>
    <path d="M32 10C32 10 43 19 43 28C43 34 38 38 32 38C26 38 21 34 21 28C21 23 25 19 27 16C27 20 29 21 30 21C29 16 30.5 13 32 10Z" fill="#f97316" fill-opacity="0.7" stroke="#fed7aa" stroke-width="2" stroke-linejoin="round"/>
    <path d="M32 23C32 23 37 27 37 31C37 34 34.8 36 32 36C29.2 36 27 34 27 31C27 27 32 23 32 23Z" fill="#fef08a"/>`,

  knowledge: `
    <circle cx="32" cy="32" r="28" fill="#3b0764" fill-opacity="0.48"/>
    <path d="M22 55H42L38 45H26L22 55Z" fill="#1e242b" stroke="#e5c27b" stroke-width="1.8"/>
    <path d="M9 19C17 16 25 18 32 24C39 18 47 16 55 19V44C47 41 39 43 32 49C25 43 17 41 9 44V19Z" fill="#7c3aed" fill-opacity="0.4" stroke="#e9d5ff" stroke-width="2.2" stroke-linejoin="round"/>
    <line x1="32" y1="24" x2="32" y2="49" stroke="#ffdf9f" stroke-width="2"/>
    <path d="M15 26H26M15 32H25M15 38H23M38 26H49M39 32H49M41 38H49" stroke="#f5d0fe" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M32 8L34 13L39 15L34 17L32 22L30 17L25 15L30 13Z" fill="#ffdf9f"/>`,

  reformation: `
    <circle cx="32" cy="32" r="28" fill="#0f2940" fill-opacity="0.5"/>
    <path d="M21 47H43L47 54H17L21 47Z" fill="#334155" stroke="#cbd5e1" stroke-width="2" stroke-linejoin="round"/>
    <path d="M16 24A16 16 0 0 1 48 24" stroke="#38bdf8" stroke-width="2.6" stroke-linecap="round"/>
    <polyline points="42,18 48.5,24 41.5,28" stroke="#7dd3fc" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M48 39A16 16 0 0 1 16 39" stroke="#e5c27b" stroke-width="2.6" stroke-linecap="round"/>
    <polyline points="22,45 15.5,39 22.5,35" stroke="#ffdf9f" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    <polygon points="32,23 39,31.5 32,40 25,31.5" fill="#7bd0ff" fill-opacity="0.45" stroke="#ffffff" stroke-width="1.6"/>`,

  spellgraft: `
    <circle cx="32" cy="32" r="28" fill="#3b0764" fill-opacity="0.45"/>
    <circle cx="24" cy="32" r="14" fill="#f0abfc" fill-opacity="0.26" stroke="#f0abfc" stroke-width="2.2"/>
    <circle cx="40" cy="32" r="14" fill="#38bdf8" fill-opacity="0.26" stroke="#7bd0ff" stroke-width="2.2"/>
    <path d="M32 20C36 24 36 40 32 44C28 40 28 24 32 20Z" fill="#ffffff" fill-opacity="0.55" stroke="#ffdf9f" stroke-width="1.6"/>
    <circle cx="32" cy="32" r="3.5" fill="#ffdf9f"/>
    <path d="M16 26L20 32L16 38M48 26L44 32L48 38" stroke="#ffffff" stroke-opacity="0.65" stroke-width="1.6" stroke-linecap="round"/>`,
};

export function shrineAssetSvg(type, size = 28) {
  const inner = SHRINE_ART[type] || SHRINE_ART.transmutation;
  return wrapAssetSvg(inner, size, 'ws-icon', `Shrine of ${type}`);
}

// ==================== 6 UNIQUE CLOUDS ====================
const CLOUD_ART = {
  fire: `
    <circle cx="32" cy="32" r="27" fill="#7c2d12" fill-opacity="0.42"/>
    <path d="M16 42H48C53 42 56 38 56 33C56 28.5 52.8 25 48.5 24.4C47 17.5 41 13 33.5 13C25.5 13 19.2 18.5 18.2 26C13.5 26.8 10 30.8 10 35.2C10 39.2 12.6 42 16 42Z" fill="#ea580c" fill-opacity="0.45" stroke="#fb923c" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M25 36C25 31 28 27 30 23C32 27 35 30 35 35C35 38 33 40 30 40C27 40 25 38 25 36Z" fill="#fef08a"/>
    <path d="M38 35C38 31 40 29 41.5 26C43 29 45 31 45 35C45 37.5 43.5 39 41.5 39C39.5 39 38 37.5 38 35Z" fill="#fdba74"/>
    <circle cx="20" cy="49" r="2" fill="#f97316"/><circle cx="33" cy="52" r="2.2" fill="#fde047"/><circle cx="45" cy="48" r="1.8" fill="#fb923c"/>`,

  storm: `
    <circle cx="32" cy="32" r="27" fill="#1e293b" fill-opacity="0.52"/>
    <path d="M16 37H48C53 37 56 33.5 56 29C56 24.8 52.8 21.5 48.5 21C47 14.5 41 10 33.5 10C25.5 10 19.2 15.2 18.2 22.4C13.5 23.2 10 26.8 10 31C10 34.5 12.6 37 16 37Z" fill="#334155" fill-opacity="0.82" stroke="#facc15" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M34 32L24 44H32L28 56L42 41H34L38 32Z" fill="#facc15" stroke="#fef9c3" stroke-width="1.4" stroke-linejoin="round"/>
    <polyline points="17,39 14,45 18,45 15,51" stroke="#fde047" stroke-width="1.8" stroke-linecap="round"/>`,

  blizzard: `
    <circle cx="32" cy="32" r="27" fill="#0c4a6e" fill-opacity="0.48"/>
    <path d="M15 36H49C53.5 36 56 32.5 56 28.5C56 24.5 53 21.2 48.8 20.6C47.2 14.2 41 10 33.5 10C25.5 10 19.2 15 18.2 22C13.5 22.8 10 26.4 10 30.6C10 33.8 12.2 36 15 36Z" fill="#38bdf8" fill-opacity="0.34" stroke="#bae6fd" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M22 41V53M17 44L27 50M27 44L17 50" stroke="#e0f2fe" stroke-width="1.7" stroke-linecap="round"/>
    <path d="M42 40V52M37 43L47 49M47 43L37 49" stroke="#7dd3fc" stroke-width="1.7" stroke-linecap="round"/>
    <path d="M14 28Q32 23 50 28" stroke="#ffffff" stroke-opacity="0.65" stroke-width="1.5" stroke-linecap="round"/>`,

  rain: `
    <circle cx="32" cy="32" r="27" fill="#172554" fill-opacity="0.48"/>
    <path d="M16 36H48C52.8 36 56 32.6 56 28.2C56 24.2 52.8 21 48.5 20.4C47 14.2 41 10 33.5 10C25.5 10 19.2 15 18.2 22C13.5 22.8 10 26.4 10 30.6C10 33.8 12.6 36 16 36Z" fill="#3b82f6" fill-opacity="0.42" stroke="#93c5fd" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M21 41L18 49M32 41L29 52M43 41L40 49M26 48L24 54M37 48L35 54" stroke="#60a5fa" stroke-width="2.3" stroke-linecap="round"/>`,

  poison: `
    <circle cx="32" cy="32" r="27" fill="#1a2e05" fill-opacity="0.52"/>
    <path d="M16 42H48C53 42 56 38.2 56 33.5C56 29 52.8 25.5 48.5 24.8C47 17.8 41 13 33.5 13C25.5 13 19.2 18.5 18.2 26C13.5 26.8 10 30.8 10 35.4C10 39.2 12.6 42 16 42Z" fill="#65a30d" fill-opacity="0.45" stroke="#a3e635" stroke-width="2.2" stroke-linejoin="round"/>
    <circle cx="27" cy="29" r="3" fill="#ecfccb"/><circle cx="37" cy="29" r="3" fill="#ecfccb"/>
    <path d="M28 36H36M30 34V38M34 34V38" stroke="#ecfccb" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="19" cy="49" r="3" fill="#84cc16" fill-opacity="0.55" stroke="#bef264" stroke-width="1.2"/>
    <circle cx="44" cy="48" r="2.2" fill="#a3e635" fill-opacity="0.7"/>`,

  web: `
    <circle cx="32" cy="32" r="27" fill="#1e293b" fill-opacity="0.42"/>
    <path d="M32 7V57M7 32H57M14 14L50 50M50 14L14 50" stroke="#cbd5e1" stroke-width="1.7" stroke-linecap="round"/>
    <polygon points="32,14 45,19 50,32 45,45 32,50 19,45 14,32 19,19" stroke="#e2e8f0" stroke-width="1.5" fill="none"/>
    <polygon points="32,22 39,25 42,32 39,39 32,42 25,39 22,32 25,25" stroke="#cbd5e1" stroke-width="1.4" fill="none"/>
    <circle cx="32" cy="32" r="3.5" fill="#94a3b8" stroke="#ffffff" stroke-width="1.2"/>`,
};

export function cloudAssetSvg(cloudOrColor, size = 28) {
  let id = typeof cloudOrColor === 'string' ? cloudOrColor : cloudOrColor?.id || cloudOrColor?.type;
  if (!CLOUD_ART[id]) {
    const colorMap = {
      '#f97316': 'fire', '#facc15': 'storm', '#7dd3fc': 'blizzard',
      '#60a5fa': 'rain', '#84cc16': 'poison', '#cbd5e1': 'web',
    };
    id = colorMap[String(cloudOrColor || '').toLowerCase()] || 'blizzard';
  }
  return wrapAssetSvg(CLOUD_ART[id], size, 'ws-icon', `${id} cloud`);
}

// ==================== 10 UNIQUE VAULTS ====================
const VAULT_ART = {
  Goblins: `
    <circle cx="32" cy="32" r="28" fill="#1a2e05" fill-opacity="0.5"/>
    <path d="M13 54V26C13 15 21 9 32 9C43 9 51 15 51 26V54Z" fill="#2c3a1e" stroke="#84cc16" stroke-width="2.2"/>
    <path d="M13 24L5 18L14 31M51 24L59 18L50 31" fill="#65a30d" stroke="#bef264" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M21 54V32C21 26 26 22 32 22C38 22 43 26 43 32V54Z" fill="#09100d" stroke="#e5c27b" stroke-width="1.8"/>
    <circle cx="27" cy="34" r="2.2" fill="#facc15"/><circle cx="37" cy="34" r="2.2" fill="#facc15"/>
    <path d="M27 42L29 39L32 42L35 39L37 42" stroke="#d9f99d" stroke-width="1.6"/>`,

  Arachnea: `
    <circle cx="32" cy="32" r="28" fill="#2e1065" fill-opacity="0.5"/>
    <path d="M13 54V25C13 15 21 9 32 9C43 9 51 15 51 25V54Z" fill="#1f1635" stroke="#c4b5fd" stroke-width="2.2"/>
    <path d="M20 54V30C20 24 25 20 32 20C39 20 44 24 44 30V54Z" fill="#0a0714" stroke="#a78bfa" stroke-width="1.6"/>
    <path d="M20 28L44 28M32 20V54M22 22L42 42M42 22L22 42" stroke="#c4b5fd" stroke-opacity="0.4" stroke-width="1.1"/>
    <circle cx="32" cy="36" r="5" fill="#7c3aed" stroke="#ede9fe" stroke-width="1.5"/>
    <circle cx="32" cy="30" r="2.8" fill="#a78bfa"/>
    <path d="M27 34L20 30M27 37L19 38M28 40L21 45M37 34L44 30M37 37L45 38M36 40L43 45" stroke="#ede9fe" stroke-width="1.5" stroke-linecap="round"/>`,

  Slime: `
    <circle cx="32" cy="32" r="28" fill="#1a2e05" fill-opacity="0.5"/>
    <path d="M12 54V26C12 15 20 9 32 9C44 9 52 15 52 26V54Z" fill="#365314" stroke="#a3e635" stroke-width="2.2"/>
    <path d="M15 22C19 28 23 20 27 27C31 21 35 28 39 21C43 27 47 22 49 26" stroke="#bef264" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M20 54V34C20 28 25 25 32 25C39 25 44 28 44 34V54Z" fill="#65a30d" fill-opacity="0.55" stroke="#d9f99d" stroke-width="1.8"/>
    <circle cx="27" cy="40" r="2.6" fill="#ecfccb"/><circle cx="37" cy="37" r="3.2" fill="#ecfccb"/><circle cx="33" cy="47" r="2" fill="#ecfccb"/>`,

  Glaciers: `
    <circle cx="32" cy="32" r="28" fill="#0c4a6e" fill-opacity="0.5"/>
    <polygon points="12,54 15,20 25,11 32,7 39,11 49,20 52,54" fill="#0e3a5c" stroke="#7dd3fc" stroke-width="2.2" stroke-linejoin="round"/>
    <polygon points="21,54 22,28 32,19 42,28 43,54" fill="#051929" stroke="#bae6fd" stroke-width="1.8"/>
    <polygon points="24,25 27,36 30,25" fill="#e0f2fe"/><polygon points="34,25 37,37 40,25" fill="#bae6fd"/><polygon points="29,22 32,33 35,22" fill="#ffffff"/>`,

  Flame: `
    <circle cx="32" cy="32" r="28" fill="#431407" fill-opacity="0.52"/>
    <path d="M12 54V25C12 15 20 9 32 9C44 9 52 15 52 25V54Z" fill="#3a170e" stroke="#f97316" stroke-width="2.2"/>
    <path d="M20 54V31C20 24 25 20 32 20C39 20 44 24 44 31V54Z" fill="#7c2d12" stroke="#fdba74" stroke-width="1.8"/>
    <path d="M32 25C32 25 40 33 40 41C40 46 36.5 50 32 50C27.5 50 24 46 24 41C24 33 32 25 32 25Z" fill="#f97316" stroke="#fef08a" stroke-width="1.6"/>
    <path d="M32 34C32 34 36 38 36 42.5C36 45 34.2 47 32 47C29.8 47 28 45 28 42.5C28 38 32 34 32 34Z" fill="#fef08a"/>`,

  Souls: `
    <circle cx="32" cy="32" r="28" fill="#2e1065" fill-opacity="0.5"/>
    <path d="M13 54V25C13 15 21 9 32 9C43 9 51 15 51 25V54Z" fill="#1e1b2e" stroke="#a78bfa" stroke-width="2.2"/>
    <path d="M21 54V31C21 25 26 21 32 21C38 21 43 25 43 31V54Z" fill="#0d0a17" stroke="#ddd6fe" stroke-width="1.6"/>
    <circle cx="32" cy="34" r="7" fill="#c4b5fd" fill-opacity="0.35" stroke="#ede9fe" stroke-width="1.8"/>
    <circle cx="29.5" cy="33" r="1.8" fill="#ffffff"/><circle cx="34.5" cy="33" r="1.8" fill="#ffffff"/>
    <path d="M28 44Q32 40 36 44Q32 49 28 44Z" fill="#a78bfa" fill-opacity="0.55"/>`,

  Tempests: `
    <circle cx="32" cy="32" r="28" fill="#1e293b" fill-opacity="0.52"/>
    <path d="M12 54V24C12 14 21 9 32 9C43 9 52 14 52 24V54Z" fill="#1e293b" stroke="#facc15" stroke-width="2.2"/>
    <path d="M20 54V30C20 24 25 20 32 20C39 20 44 24 44 30V54Z" fill="#0f172a" stroke="#7dd3fc" stroke-width="1.8"/>
    <path d="M35 23L25 37H32L29 50L40 35H33L35 23Z" fill="#facc15" stroke="#fef9c3" stroke-width="1.4" stroke-linejoin="round"/>`,

  'the Fettered Fae': `
    <circle cx="32" cy="32" r="28" fill="#4c0519" fill-opacity="0.5"/>
    <path d="M14 54V26C14 16 22 10 32 10C42 10 50 16 50 26V54Z" fill="#31102a" stroke="#f0abfc" stroke-width="2.2"/>
    <path d="M32 33C25 24 16 24 17 32C18 38 25 38 32 36C39 38 46 38 47 32C48 24 39 24 32 33Z" fill="#f472b6" fill-opacity="0.45" stroke="#fbcfe8" stroke-width="1.6"/>
    <path d="M13 38L51 24M13 24L51 38" stroke="#cbd5e1" stroke-width="2.2" stroke-dasharray="5 3"/>
    <circle cx="32" cy="31" r="3" fill="#ffdf9f"/>`,

  'the Sculptor': `
    <circle cx="32" cy="32" r="28" fill="#1e293b" fill-opacity="0.5"/>
    <rect x="12" y="13" width="40" height="6" rx="1.5" fill="#94a3b8" stroke="#e2e8f0" stroke-width="1.8"/>
    <rect x="15" y="19" width="7" height="35" fill="#64748b" stroke="#cbd5e1" stroke-width="1.6"/>
    <rect x="42" y="19" width="7" height="35" fill="#64748b" stroke="#cbd5e1" stroke-width="1.6"/>
    <rect x="22" y="23" width="20" height="31" fill="#0f172a"/>
    <rect x="25" y="27" width="14" height="16" rx="2" fill="#475569" stroke="#e5c27b" stroke-width="1.8"/>
    <circle cx="29" cy="33" r="1.6" fill="#7bd0ff"/><circle cx="35" cy="33" r="1.6" fill="#7bd0ff"/>
    <line x1="28" y1="39" x2="36" y2="39" stroke="#cbd5e1" stroke-width="1.6"/>`,

  Torment: `
    <circle cx="32" cy="32" r="28" fill="#450a0a" fill-opacity="0.56"/>
    <path d="M13 54V25C13 15 21 9 32 9C43 9 51 15 51 25V54Z" fill="#3b0d0d" stroke="#ef4444" stroke-width="2.2"/>
    <path d="M12 20L7 15M52 20L57 15M12 34L6 34M52 34L58 34M32 9V4" stroke="#fca5a5" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M21 54V31C21 25 26 21 32 21C38 21 43 25 43 31V54Z" fill="#140404" stroke="#f87171" stroke-width="1.6"/>
    <path d="M26 23V54M32 21V54M38 23V54" stroke="#991b1b" stroke-width="2.2"/>
    <circle cx="28" cy="35" r="2" fill="#fef08a"/><circle cx="36" cy="35" r="2" fill="#fef08a"/>`,
};

export function vaultAssetSvg(name, size = 28) {
  const inner = VAULT_ART[name] || VAULT_ART.Souls;
  return wrapAssetSvg(inner, size, 'ws-icon', `Vault of ${name}`);
}

// ==================== 4 UNIQUE MUTATORS ====================
const MUTATOR_ART = {
  enemyResistance: `
    <circle cx="32" cy="32" r="27" fill="#3b1d0a" fill-opacity="0.48"/>
    <path d="M32 8L51 16V32C51 44 43 52 32 56C21 52 13 44 13 32V16L32 8Z" fill="#94a3b8" fill-opacity="0.32" stroke="#f87171" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M32 16L44 21V31C44 39 39 45 32 48C25 45 20 39 20 31V21L32 16Z" fill="#ef4444" fill-opacity="0.28" stroke="#ffdf9f" stroke-width="1.6"/>
    <path d="M32 24V40M25 32H39" stroke="#fef08a" stroke-width="2.6" stroke-linecap="round"/>`,

  vulnerability: `
    <circle cx="32" cy="32" r="27" fill="#450a0a" fill-opacity="0.5"/>
    <path d="M32 52C32 52 13 40 13 25C13 17.5 18.5 12 25 12C29 12 31 14 32 16.5C33 14 35 12 39 12C45.5 12 51 17.5 51 25C51 40 32 52 32 52Z" fill="#ef4444" fill-opacity="0.32" stroke="#f87171" stroke-width="2.2" stroke-linejoin="round"/>
    <polyline points="34,15 28,25 36,31 27,41 33,50" stroke="#fef08a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`,

  weather: `
    <circle cx="32" cy="32" r="27" fill="#0c2538" fill-opacity="0.52"/>
    <path d="M16 33H46C51 33 54 29.8 54 25.5C54 21.5 51 18.5 47 18C45.5 12.2 40 8 33 8C25.5 8 19.5 13 18.6 19.6C14 20.4 10.5 23.8 10.5 27.6C10.5 30.8 12.8 33 16 33Z" fill="#475569" stroke="#7dd3fc" stroke-width="2.2"/>
    <path d="M24 36L19 46H25L22 55L32 43H26L28 36Z" fill="#facc15"/>
    <path d="M40 38C40 38 46 43 46 48C46 51.5 43.3 54 40 54C36.7 54 34 51.5 34 48C34 43 40 38 40 38Z" fill="#f97316" stroke="#fed7aa" stroke-width="1.4"/>`,

  damageDebuff: `
    <circle cx="32" cy="32" r="27" fill="#3b0764" fill-opacity="0.48"/>
    <path d="M16 48L28 36M34 30L48 16L50 11L45 13L31 27" stroke="#cbd5e1" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M18 39L25 46" stroke="#e5c27b" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M27 25L39 37M39 25L27 37" stroke="#f87171" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M46 37V52M41 47L46 53L51 47" stroke="#fb7185" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
};

export function mutatorAssetSvg(id, size = 28) {
  const inner = MUTATOR_ART[id] || MUTATOR_ART.vulnerability;
  return wrapAssetSvg(inner, size, 'ws-icon', `Mutator ${id}`);
}

// ==================== 81 UNIQUE OUTFITS (WARDROBE) & DYNAMIC WIZARD PORTRAIT ====================
function outfitMotif(name, robe, hat, accent) {
  const n = name.toLowerCase();
  if (n.includes('pyro') || n.includes('flaming') || n.includes('hellfire') || n.includes('molten') || n.includes('unquenchable')) {
    return `<path d="M32 6C32 6 39 12 39 17C39 20 36 22 32 22C28 22 25 20 25 17C25 12 32 6 32 6Z" fill="#f97316" stroke="#fef08a" stroke-width="1.3"/><circle cx="27" cy="34" r="2.2" fill="#fef08a"/><circle cx="37" cy="34" r="2.2" fill="#fef08a"/>`;
  }
  if (n.includes('cryo') || n.includes('snow queen')) {
    return `<polygon points="22,22 25,10 30,19 32,7 34,19 39,10 42,22" fill="#bae6fd" stroke="#e0f2fe" stroke-width="1.4"/><circle cx="27" cy="34" r="2.1" fill="#7dd3fc"/><circle cx="37" cy="34" r="2.1" fill="#7dd3fc"/>`;
  }
  if (n.includes('electro') || n.includes('galvanic') || n.includes('body electric')) {
    return `<polyline points="35,7 27,18 33,18 29,26" stroke="#facc15" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="27" cy="34" r="2.2" fill="#fef08a"/><circle cx="37" cy="34" r="2.2" fill="#fef08a"/>`;
  }
  if (n.includes('plague')) {
    return `<path d="M25 32C25 28 39 28 39 32L32 46Z" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.4"/><circle cx="28" cy="33" r="2.4" fill="#0f172a" stroke="#a3e635" stroke-width="1.2"/><circle cx="36" cy="33" r="2.4" fill="#0f172a" stroke="#a3e635" stroke-width="1.2"/>`;
  }
  if (n.includes('clown')) {
    return `<path d="M18 24C14 14 22 10 28 19M46 24C50 14 42 10 36 19" stroke="#facc15" stroke-width="2.2" stroke-linecap="round"/><circle cx="15" cy="14" r="2.4" fill="#f87171"/><circle cx="49" cy="14" r="2.4" fill="#38bdf8"/><circle cx="32" cy="37" r="3" fill="#ef4444"/>`;
  }
  if (n.includes('pumpkin')) {
    return `<ellipse cx="32" cy="35" rx="11" ry="9.5" fill="#ea580c" stroke="#fed7aa" stroke-width="1.5"/><path d="M32 23V26" stroke="#4ade80" stroke-width="2.4" stroke-linecap="round"/><polygon points="26,32 29,35 25,35" fill="#fef08a"/><polygon points="38,32 39,35 35,35" fill="#fef08a"/><path d="M26 39L29 41L32 39L35 41L38 39" stroke="#fef08a" stroke-width="1.5"/>`;
  }
  if (n.includes('skull') || n.includes('skele') || n.includes('necro') || n.includes('death') || n.includes('soulbound')) {
    return `<circle cx="32" cy="34" r="9" fill="#e4e4e7" stroke="#a1a1aa" stroke-width="1.4"/><circle cx="28.5" cy="33" r="2.4" fill="#18181b"/><circle cx="35.5" cy="33" r="2.4" fill="#18181b"/><circle cx="28.5" cy="33" r="1" fill="#c084fc"/><circle cx="35.5" cy="33" r="1" fill="#c084fc"/><path d="M29 40V43M32 40V43M35 40V43" stroke="#52525b" stroke-width="1.4"/>`;
  }
  if (n.includes('goblin')) {
    return `<path d="M22 33L11 28L20 38M42 33L53 28L44 38" fill="#4ade80" stroke="#bbf7d0" stroke-width="1.4"/><circle cx="28" cy="34" r="2" fill="#facc15"/><circle cx="36" cy="34" r="2" fill="#facc15"/>`;
  }
  if (n.includes('spider') || n.includes('scuttler')) {
    return `<circle cx="27" cy="32" r="1.8" fill="#f87171"/><circle cx="31" cy="31" r="1.4" fill="#f87171"/><circle cx="33" cy="31" r="1.4" fill="#f87171"/><circle cx="37" cy="32" r="1.8" fill="#f87171"/><path d="M16 44L8 39M16 50L7 51M48 44L56 39M48 50L57 51" stroke="#c4b5fd" stroke-width="1.8" stroke-linecap="round"/>`;
  }
  if (n.includes('slime') || n.includes('ooz')) {
    return `<path d="M21 36C21 28 26 24 32 24C38 24 43 28 43 36C43 42 38 44 32 44C26 44 21 42 21 36Z" fill="#a3e635" fill-opacity="0.7" stroke="#ecfccb" stroke-width="1.5"/><circle cx="28" cy="34" r="2" fill="#1a2e05"/><circle cx="36" cy="34" r="2" fill="#1a2e05"/>`;
  }
  if (n.includes('dragon') || n.includes('wyrm') || n.includes('amaru')) {
    return `<path d="M22 25L14 11L27 21M42 25L50 11L37 21" fill="#fb923c" stroke="#fed7aa" stroke-width="1.5" stroke-linejoin="round"/><ellipse cx="28" cy="34" rx="2.4" ry="1.5" fill="#fef08a"/><ellipse cx="36" cy="34" rx="2.4" ry="1.5" fill="#fef08a"/>`;
  }
  if (n.includes('archangel') || n.includes('sanctu') || n.includes('ophan') || n.includes('virtuous')) {
    return `<ellipse cx="32" cy="11" rx="12" ry="3.2" stroke="#fde68a" stroke-width="2.2"/><path d="M16 42C8 35 8 24 16 22M48 42C56 35 56 24 48 22" stroke="#fffbeb" stroke-width="2" stroke-linecap="round"/><circle cx="28" cy="34" r="2" fill="#fffbeb"/><circle cx="36" cy="34" r="2" fill="#fffbeb"/>`;
  }
  if (n.includes('observer') || n.includes('gazing') || n.includes('eldritch')) {
    return `<circle cx="32" cy="34" r="8.5" fill="#e0f2fe" stroke="#38bdf8" stroke-width="1.8"/><circle cx="32" cy="34" r="4.5" fill="#38bdf8"/><circle cx="32" cy="34" r="2" fill="#0f172a"/><circle cx="33.5" cy="32.5" r="1" fill="#ffffff"/>`;
  }
  if (n.includes('moth') || n.includes('faery')) {
    return `<path d="M18 44C8 36 8 23 19 26M46 44C56 36 56 23 45 26" fill="${accent}" fill-opacity="0.35" stroke="${accent}" stroke-width="1.8"/><path d="M28 20L24 11M36 20L40 11" stroke="#fef08a" stroke-width="1.5" stroke-linecap="round"/><circle cx="28" cy="34" r="2" fill="#fef08a"/><circle cx="36" cy="34" r="2" fill="#fef08a"/>`;
  }
  if (n.includes('chess')) {
    return `<rect x="24" y="45" width="5" height="5" fill="#f8fafc"/><rect x="34" y="45" width="5" height="5" fill="#f8fafc"/><rect x="29" y="50" width="5" height="5" fill="#f8fafc"/><path d="M26 14H38M32 9V19" stroke="#ffdf9f" stroke-width="2" stroke-linecap="round"/><circle cx="28" cy="34" r="2" fill="#7bd0ff"/><circle cx="36" cy="34" r="2" fill="#7bd0ff"/>`;
  }
  if (n.includes('mordred') || n.includes('bafflement') || n.includes('prince') || n.includes('warlord') || n.includes('insanity')) {
    return `<path d="M20 24L23 12L28 19L32 10L36 19L41 12L44 24" stroke="#f87171" stroke-width="2.2" stroke-linejoin="round" fill="none"/><circle cx="28" cy="34" r="2.2" fill="#f87171"/><circle cx="36" cy="34" r="2.2" fill="#f87171"/>`;
  }
  if (n.includes('pope')) {
    return `<path d="M23 25L32 7L41 25Z" fill="#fffbeb" stroke="#e5c27b" stroke-width="1.8"/><path d="M32 13V21M29 17H35" stroke="#e5c27b" stroke-width="1.6"/><circle cx="28" cy="34" r="2.3" fill="#4ade80"/><circle cx="36" cy="34" r="2.3" fill="#4ade80"/>`;
  }
  if (n.includes('split')) {
    return `<line x1="32" y1="9" x2="32" y2="57" stroke="#7bd0ff" stroke-width="2" stroke-dasharray="3 2"/><circle cx="27" cy="34" r="2.1" fill="#f97316"/><circle cx="37" cy="34" r="2.1" fill="#38bdf8"/>`;
  }
  if (n.includes('prism')) {
    return `<polygon points="32,12 42,26 22,26" fill="#e0f2fe" fill-opacity="0.5" stroke="#ffffff" stroke-width="1.6"/><line x1="40" y1="22" x2="54" y2="17" stroke="#f87171" stroke-width="1.5"/><line x1="41" y1="24" x2="55" y2="24" stroke="#facc15" stroke-width="1.5"/><line x1="40" y1="26" x2="54" y2="31" stroke="#38bdf8" stroke-width="1.5"/><circle cx="28" cy="34" r="2" fill="#ffffff"/><circle cx="36" cy="34" r="2" fill="#ffffff"/>`;
  }
  if (n.includes('dagger')) {
    return `<path d="M13 18L21 26M51 18L43 26" stroke="#e2e8f0" stroke-width="2.2" stroke-linecap="round"/><circle cx="28" cy="34" r="2" fill="#f87171"/><circle cx="36" cy="34" r="2" fill="#f87171"/>`;
  }
  if (n.includes('yggdrasil') || n.includes('gaia') || n.includes('gardener') || n.includes('phyto')) {
    return `<path d="M22 22C17 16 20 9 27 12C29 7 35 7 37 12C44 9 47 16 42 22" fill="#22c55e" fill-opacity="0.45" stroke="#86efac" stroke-width="1.6"/><circle cx="28" cy="34" r="2" fill="#86efac"/><circle cx="36" cy="34" r="2" fill="#86efac"/>`;
  }
  if (n.includes('turtle')) {
    return `<path d="M17 48C17 38 47 38 47 48" stroke="#4ade80" stroke-width="2"/><polygon points="32,44 38,48 35,54 29,54 26,48" fill="#15803d" stroke="#86efac" stroke-width="1.3"/><circle cx="28" cy="34" r="2" fill="#bef264"/><circle cx="36" cy="34" r="2" fill="#bef264"/>`;
  }
  if (n.includes('spikeball')) {
    return `<path d="M32 6V12M18 14L22 18M46 14L42 18M12 30H18M52 30H46" stroke="#cbd5e1" stroke-width="2.2" stroke-linecap="round"/><circle cx="28" cy="34" r="2" fill="#facc15"/><circle cx="36" cy="34" r="2" fill="#facc15"/>`;
  }
  if (n.includes('friendship')) {
    return `<path d="M32 52C32 52 24 47 24 42.5C24 40 26 38.5 28 38.5C29.8 38.5 31 39.5 32 40.8C33 39.5 34.2 38.5 36 38.5C38 38.5 40 40 40 42.5C40 47 32 52 32 52Z" fill="#f472b6" stroke="#fbcfe8" stroke-width="1.2"/><circle cx="28" cy="34" r="2" fill="#fbcfe8"/><circle cx="36" cy="34" r="2" fill="#fbcfe8"/>`;
  }
  return `<circle cx="28" cy="34" r="2.1" fill="${accent}"/><circle cx="36" cy="34" r="2.1" fill="${accent}"/><circle cx="28" cy="33.5" r="0.8" fill="#ffffff"/><circle cx="36" cy="33.5" r="0.8" fill="#ffffff"/>`;
}

export function outfitAssetSvg(name = 'Wizard', size = 32) {
  const colors = outfitColor(name);
  const pal = resolvePalette(name, [], 'Arcane');
  const robe = colors?.robe || '#254235';
  const hat = colors?.hat || '#335746';
  const trim = '#e5c27b';
  const h = hashString(`outfit:${name}`);
  const hatTilt = ((h % 7) - 3) * 1.4;
  const buckleShape = h % 3 === 0
    ? `<polygon points="32,21 35,24.5 32,28 29,24.5" fill="${pal.accent}" stroke="#ffdf9f" stroke-width="1"/>`
    : h % 3 === 1
      ? `<circle cx="32" cy="24.5" r="2.8" fill="${pal.accent}" stroke="#ffdf9f" stroke-width="1"/>`
      : `<rect x="29.5" y="22.2" width="5" height="4.6" rx="1" fill="#0d1512" stroke="#ffdf9f" stroke-width="1.1"/>`;
  const inner = `
    ${uniqueBackdrop(`outfit:${name}`, pal)}
    <path d="M13 58C15 44 22 40 32 40C42 40 49 44 51 58Z" fill="${robe}" stroke="${trim}" stroke-width="1.7" stroke-linejoin="round"/>
    <path d="M23 41L32 51L41 41" stroke="${trim}" stroke-width="1.9" stroke-linejoin="round"/>
    <ellipse cx="32" cy="34.5" rx="9.5" ry="9" fill="#0d1512" stroke="${hat}" stroke-width="1.4"/>
    <ellipse cx="32" cy="26" rx="19" ry="4.8" fill="${robe}" stroke="${trim}" stroke-width="1.4"/>
    <path d="M19 25.5L${(30 + hatTilt).toFixed(1)} 9L${(36 + hatTilt * 0.6).toFixed(1)} 13L45 25.5Z" fill="${hat}" stroke="${trim}" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M21 24.5Q32 28 43 24.5" stroke="${trim}" stroke-width="2.4" stroke-linecap="round"/>
    ${buckleShape}
    ${outfitMotif(name, robe, hat, pal.accent)}`;
  return wrapAssetSvg(inner, size, 'ws-icon', name);
}

export function wizardPortraitAssetSvg(outfitName = 'Wizard') {
  const colors = outfitColor(outfitName);
  const pal = resolvePalette(outfitName, [], 'Arcane');
  const robe = colors?.robe || '#254235';
  const hat = colors?.hat || '#335746';
  const eyeCol = outfitName === 'Wizard' ? '#7bd0ff' : pal.accent;
  const uid = `wp${hashString(outfitName).toString(36)}`;
  return `<svg class="wizard-portrait-svg" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${String(outfitName).replace(/"/g, '&quot;')}">
    <defs>
      <radialGradient id="${uid}-bg" cx="50%" cy="42%" r="58%">
        <stop offset="0%" stop-color="${pal.dark}"/>
        <stop offset="65%" stop-color="#131e19"/>
        <stop offset="100%" stop-color="#090f0c"/>
      </radialGradient>
      <radialGradient id="${uid}-orb" cx="40%" cy="35%" r="65%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="40%" stop-color="${eyeCol}"/>
        <stop offset="100%" stop-color="${pal.dark}"/>
      </radialGradient>
      <linearGradient id="${uid}-gold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffdf9f"/>
        <stop offset="50%" stop-color="#e5c27b"/>
        <stop offset="100%" stop-color="#9e762f"/>
      </linearGradient>
    </defs>
    <rect width="80" height="80" fill="url(#${uid}-bg)"/>
    <circle cx="38" cy="40" r="32" stroke="#e5c27b" stroke-opacity="0.18" stroke-width="1" stroke-dasharray="3 3"/>
    <circle cx="38" cy="40" r="25" stroke="${eyeCol}" stroke-opacity="0.14" stroke-width="0.9"/>
    <circle cx="14" cy="20" r="1.4" fill="#ffdf9f" opacity="0.8"/>
    <circle cx="66" cy="14" r="1.2" fill="${eyeCol}" opacity="0.9"/>
    <path d="M14 78 C15 58 24 51 38 51 C52 51 60 58 62 78 Z" fill="${robe}" stroke="#e5c27b" stroke-opacity="0.55" stroke-width="1.3"/>
    <path d="M24 53 L38 66 L52 53" stroke="url(#${uid}-gold)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="M38 66 L38 78" stroke="url(#${uid}-gold)" stroke-width="1.5" opacity="0.8"/>
    <ellipse cx="38" cy="43" rx="11.5" ry="11" fill="#0d1512" stroke="${hat}" stroke-width="1.2"/>
    <ellipse cx="33.5" cy="42.5" rx="2.5" ry="1.9" fill="${eyeCol}"/>
    <ellipse cx="42.5" cy="42.5" rx="2.5" ry="1.9" fill="${eyeCol}"/>
    <circle cx="33.5" cy="42.2" r="0.9" fill="#ffffff"/>
    <circle cx="42.5" cy="42.2" r="0.9" fill="#ffffff"/>
    <path d="M28 50 Q38 58 48 50 Q45 56 38 59 Q31 56 28 50Z" fill="#cbd5c8" opacity="0.86"/>
    <ellipse cx="38" cy="34" rx="23" ry="6.2" fill="${robe}" stroke="#e5c27b" stroke-width="1.2"/>
    <path d="M21 34 L34 11 C36 8 40 7 44 10 L51 16 L44 18 L54 34 Z" fill="${hat}" stroke="#e5c27b" stroke-opacity="0.65" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M23 32 Q38 36 53 32" stroke="url(#${uid}-gold)" stroke-width="3" fill="none" stroke-linecap="round"/>
    <rect x="35" y="30.5" width="6" height="5" rx="1" fill="#0e1512" stroke="#ffdf9f" stroke-width="1.2"/>
    <circle cx="38" cy="33" r="1.2" fill="${eyeCol}"/>
    <line x1="63" y1="27" x2="60" y2="78" stroke="#9e762f" stroke-width="3.2" stroke-linecap="round"/>
    <line x1="63" y1="27" x2="60" y2="78" stroke="#e5c27b" stroke-width="1.2" stroke-linecap="round" opacity="0.8"/>
    <path d="M58 26 C58 20 68 20 68 26 C68 30 63 32 63 32 C63 32 58 30 58 26Z" stroke="#e5c27b" stroke-width="1.5" fill="none"/>
    <circle cx="63" cy="24" r="5.2" fill="url(#${uid}-orb)"/>
  </svg>`;
}

// ==================== WORLD ENTITIES (PORTALS, CHASM, LAIR, EMPTY) ====================
export const WORLD_ENTITY_ART = {
  'portal-moss': `
    <circle cx="32" cy="32" r="28" fill="#064e3b" fill-opacity="0.45"/>
    <ellipse cx="32" cy="32" rx="17" ry="23" fill="#10b981" fill-opacity="0.24" stroke="#34d399" stroke-width="2.6"/>
    <ellipse cx="32" cy="32" rx="11" ry="16" fill="#6ee7b7" fill-opacity="0.32" stroke="#a7f3d0" stroke-width="1.8" stroke-dasharray="5 3"/>
    <path d="M26 24A9 13 0 0 1 38 40M38 24A9 13 0 0 0 26 40" stroke="#d1fae5" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="32" cy="32" r="4.5" fill="#ecfdf5"/>`,
  'portal-ember': `
    <circle cx="32" cy="32" r="28" fill="#431407" fill-opacity="0.5"/>
    <ellipse cx="32" cy="32" rx="17" ry="23" fill="#f97316" fill-opacity="0.28" stroke="#fb923c" stroke-width="2.6"/>
    <ellipse cx="32" cy="32" rx="11" ry="16" fill="#fdba74" fill-opacity="0.34" stroke="#fed7aa" stroke-width="1.8" stroke-dasharray="5 3"/>
    <path d="M26 24A9 13 0 0 1 38 40M38 24A9 13 0 0 0 26 40" stroke="#fef08a" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="32" cy="32" r="4.5" fill="#fffbeb"/>`,
  chasm: `
    <rect x="8" y="8" width="48" height="48" rx="6" fill="#020617" stroke="#38bdf8" stroke-opacity="0.55" stroke-width="2"/>
    <path d="M14 14L24 32L18 50M50 14L40 32L46 50" stroke="#1e3a5f" stroke-width="2"/>
    <path d="M20 22L32 42L44 22" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="23" cy="45" r="1.4" fill="#bae6fd"/><circle cx="42" cy="38" r="1.2" fill="#7dd3fc"/><circle cx="32" cy="18" r="1.5" fill="#e0f2fe"/>`,
  lair: `
    <circle cx="32" cy="32" r="28" fill="#3b0764" fill-opacity="0.5"/>
    <polygon points="32,7 51,22 46,54 18,54 13,22" fill="#4c1d95" fill-opacity="0.7" stroke="#c084fc" stroke-width="2.2" stroke-linejoin="round"/>
    <ellipse cx="32" cy="34" rx="8.5" ry="13.5" fill="#db2777" fill-opacity="0.55" stroke="#fbcfe8" stroke-width="1.8"/>
    <ellipse cx="32" cy="34" rx="3.5" ry="7" fill="#fdf2f8"/>
    <path d="M18 17L24 22M46 17L40 22M14 40L21 38M50 40L43 38" stroke="#f0abfc" stroke-width="1.8" stroke-linecap="round"/>`,
  empty: `
    <circle cx="32" cy="32" r="19" stroke="#998f80" stroke-width="2" stroke-dasharray="4 4"/>
    <path d="M32 9V18M32 46V55M9 32H18M46 32H55" stroke="#e5c27b" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="32" cy="32" r="4" fill="#e5c27b"/>`,
};
