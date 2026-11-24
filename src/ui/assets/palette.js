// Shared color palette, deterministic hashing, and 64x64 SVG composition helpers for Wild Shock assets.

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
  Construct: '#94a3b8',
  Demon: '#ef4444',
  Glass: '#a5f3fc',
  Living: '#86efac',
  Spider: '#c4b5fd',
  Undead: '#d4d4d8',
};

export const ELEMENT_PALETTES = {
  Fire: { main: '#f97316', light: '#fed7aa', dark: '#7c2d12', glow: '#fb923c', accent: '#fef08a' },
  Ice: { main: '#38bdf8', light: '#e0f2fe', dark: '#0c4a6e', glow: '#7dd3fc', accent: '#bae6fd' },
  Lightning: { main: '#facc15', light: '#fef9c3', dark: '#713f12', glow: '#fde047', accent: '#7dd3fc' },
  Dark: { main: '#a78bfa', light: '#ede9fe', dark: '#3b0764', glow: '#8b5cf6', accent: '#f472b6' },
  Holy: { main: '#fde68a', light: '#fffbeb', dark: '#78350f', glow: '#fbbf24', accent: '#ffffff' },
  Arcane: { main: '#c084fc', light: '#f3e8ff', dark: '#4c1d95', glow: '#a855f7', accent: '#67e8f9' },
  Nature: { main: '#4ade80', light: '#dcfce7', dark: '#14532d', glow: '#22c55e', accent: '#bef264' },
  Blood: { main: '#ef4444', light: '#fecaca', dark: '#7f1d1d', glow: '#f87171', accent: '#fca5a5' },
  Metallic: { main: '#cbd5e1', light: '#f8fafc', dark: '#334155', glow: '#94a3b8', accent: '#7bd0ff' },
  Chaos: { main: '#fb7185', light: '#ffe4e6', dark: '#881337', glow: '#f43f5e', accent: '#facc15' },
  Dragon: { main: '#fb923c', light: '#ffedd5', dark: '#7c2d12', glow: '#f97316', accent: '#fde047' },
  Slime: { main: '#a3e635', light: '#ecfccb', dark: '#365314', glow: '#84cc16', accent: '#bef264' },
  Eye: { main: '#38bdf8', light: '#e0f2fe', dark: '#1e3a5f', glow: '#0ea5e9', accent: '#f472b6' },
  Orb: { main: '#818cf8', light: '#e0e7ff', dark: '#312e81', glow: '#6366f1', accent: '#a5f3fc' },
  Poison: { main: '#84cc16', light: '#ecfccb', dark: '#365314', glow: '#65a30d', accent: '#d9f99d' },
  Glass: { main: '#67e8f9', light: '#ecfeff', dark: '#164e63', glow: '#22d3ee', accent: '#ffffff' },
  Undead: { main: '#d4d4d8', light: '#f4f4f5', dark: '#27272a', glow: '#a1a1aa', accent: '#a78bfa' },
  Demon: { main: '#dc2626', light: '#fecaca', dark: '#450a0a', glow: '#ef4444', accent: '#facc15' },
  Construct: { main: '#94a3b8', light: '#e2e8f0', dark: '#1e293b', glow: '#64748b', accent: '#7bd0ff' },
  Spider: { main: '#a78bfa', light: '#ede9fe', dark: '#2e1065', glow: '#8b5cf6', accent: '#f87171' },
  Living: { main: '#86efac', light: '#dcfce7', dark: '#14532d', glow: '#4ade80', accent: '#fde68a' },
  Translocation: { main: '#22d3ee', light: '#cffafe', dark: '#164e63', glow: '#06b6d4', accent: '#c084fc' },
  Ritual: { main: '#fbbf24', light: '#fef3c7', dark: '#78350f', glow: '#f59e0b', accent: '#f87171' },
  Word: { main: '#fda4af', light: '#ffe4e6', dark: '#881337', glow: '#fb7185', accent: '#fde68a' },
  Conjuration: { main: '#34d399', light: '#d1fae5', dark: '#064e3b', glow: '#10b981', accent: '#fef08a' },
  Enchantment: { main: '#f0abfc', light: '#fae8ff', dark: '#701a75', glow: '#e879f9', accent: '#7dd3fc' },
  Sorcery: { main: '#93c5fd', light: '#eff6ff', dark: '#1e3a8a', glow: '#60a5fa', accent: '#ffdf9f' },
  Physical: { main: '#d6d3d1', light: '#f5f5f4', dark: '#44403c', glow: '#a8a29e', accent: '#e5c27b' },
};

const NAME_COLOR_HINTS = [
  [/\b(fire|flame|flaming|ember|cinder|lava|magma|molten|volcan|pyro|hellfire|blaz|sear|burn|ash|furnace|solar|sun|charred|red)\b/i, 'Fire'],
  [/\b(ice|icy|frost|frozen|glaci|snow|winter|blizzard|rime|boreal|tundra|cold|chill|gelid|subzero|cryo)\b/i, 'Ice'],
  [/\b(lightning|storm|thunder|spark|voltaic|galvanic|electro|electric|shock|ion|dynamo|static|tempest)\b/i, 'Lightning'],
  [/\b(blood|crimson|sanguine|vampir|hemo|flesh|gory|scarlet|ruby|carnage)\b/i, 'Blood'],
  [/\b(poison|venom|toxic|acid|rot|rotting|plague|miasma|blight|caustic|spore|myco)\b/i, 'Poison'],
  [/\b(holy|heaven|angel|seraph|archon|saint|purif|sanct|blessed|golden|gold|light|radiant|sunforged|purity|divine)\b/i, 'Holy'],
  [/\b(slime|ooze|oozing|goo|plasm|gelatin)\b/i, 'Slime'],
  [/\b(void|abyss|dark|shadow|umbral|night|dread|death|necro|grave|cursed|twilight|soul|ghost|spectral|wraith|skull|bone|undead|lich|helheim)\b/i, 'Dark'],
  [/\b(glass|crystal|prism|diamond|mirror|quartz)\b/i, 'Glass'],
  [/\b(iron|steel|copper|silver|mithril|tungsten|brass|quicksilver|mercury|mercurial|metal|gear|cog|clock|anvil|armor|plate)\b/i, 'Metallic'],
  [/\b(chaos|chaotic|entrop|ruin|warp|bedlam|madness|insanity|ragnarok|annihilat)\b/i, 'Chaos'],
  [/\b(nature|earth|stone|rock|tree|oak|thorn|vine|bark|moss|wood|druid|forest|wild|green|emerald|jade|amber|petal|bloom|flower|seed|leaf)\b/i, 'Nature'],
  [/\b(rift|blink|warp|portal|time|chrono|astral|star|moon|space|planar|aether)\b/i, 'Translocation'],
  [/\b(arcane|mystic|mana|psychic|dream|mind|illusion|spell)\b/i, 'Arcane'],
];

export function hashString(str) {
  let h = 2166136261;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function resolvePalette(name = '', tags = [], fallback = 'Arcane') {
  let primaryKey = null;
  for (const [re, key] of NAME_COLOR_HINTS) {
    if (re.test(name)) {
      primaryKey = key;
      break;
    }
  }
  const tagOrder = [
    'Fire', 'Ice', 'Lightning', 'Blood', 'Poison', 'Holy', 'Slime', 'Glass',
    'Chaos', 'Dark', 'Demon', 'Dragon', 'Nature', 'Metallic', 'Translocation',
    'Arcane', 'Eye', 'Orb', 'Undead', 'Spider', 'Construct', 'Ritual', 'Word',
    'Enchantment', 'Conjuration', 'Sorcery', 'Living', 'Physical',
  ];
  if (!primaryKey) {
    for (const tg of tagOrder) {
      if (tags.includes(tg)) { primaryKey = tg; break; }
    }
  }
  primaryKey = primaryKey || fallback;
  let secondaryKey = null;
  for (const tg of tags) {
    if (tg !== primaryKey && ELEMENT_PALETTES[tg]) { secondaryKey = tg; break; }
  }
  if (!secondaryKey) {
    for (const [re, key] of NAME_COLOR_HINTS) {
      if (key !== primaryKey && re.test(name)) { secondaryKey = key; break; }
    }
  }
  const p = ELEMENT_PALETTES[primaryKey] || ELEMENT_PALETTES.Arcane;
  const s = ELEMENT_PALETTES[secondaryKey] || p;
  return {
    key: primaryKey,
    secondaryKey: secondaryKey || primaryKey,
    main: p.main,
    light: p.light,
    dark: p.dark,
    glow: p.glow,
    accent: secondaryKey ? s.main : p.accent,
    accentLight: secondaryKey ? s.light : p.light,
  };
}

export function hslShift(seed, sat = 58, light = 56) {
  const hue = seed % 360;
  return `hsl(${hue} ${sat}% ${light}%)`;
}

// Subtle per-object ambient frame + deterministic micro-constellation so every asset has a distinct, cohesive signature without cluttering the subject.
export function uniqueBackdrop(id, palette, style = 'aura') {
  const h = hashString(id);
  const a1 = ((h % 360) * Math.PI) / 180;
  const a2 = (((h >>> 8) % 360) * Math.PI) / 180;
  const r1 = 23 + (h % 5);
  const r2 = 21 + ((h >>> 4) % 6);
  const x1 = (32 + Math.cos(a1) * r1).toFixed(1);
  const y1 = (32 + Math.sin(a1) * r1).toFixed(1);
  const x2 = (32 + Math.cos(a2) * r2).toFixed(1);
  const y2 = (32 + Math.sin(a2) * r2).toFixed(1);
  const x3 = (32 + Math.cos(a1 + 2.2) * (r1 - 2)).toFixed(1);
  const y3 = (32 + Math.sin(a1 + 2.2) * (r1 - 2)).toFixed(1);
  const dash = `${2 + (h % 4)} ${3 + ((h >>> 3) % 4)}`;
  const rot = h % 90;
  const ringOpacity = (0.14 + ((h >>> 12) % 9) * 0.01).toFixed(2);
  const bg = `<circle cx="32" cy="32" r="28" fill="${palette.dark}" fill-opacity="0.42"/><circle cx="32" cy="32" r="21" fill="${palette.glow}" fill-opacity="0.14"/>`;
  if (style === 'boss') {
    return `${bg}<circle cx="32" cy="32" r="28" stroke="${palette.main}" stroke-opacity="0.42" stroke-width="1.3" stroke-dasharray="${dash}" transform="rotate(${rot} 32 32)"/><circle cx="32" cy="32" r="24" stroke="${palette.accent}" stroke-opacity="0.28" stroke-width="0.9"/><circle cx="${x1}" cy="${y1}" r="1.4" fill="${palette.accent}" opacity="0.85"/><circle cx="${x2}" cy="${y2}" r="1.1" fill="${palette.light}" opacity="0.7"/>`;
  }
  if (style === 'conjuration') {
    return `${bg}<circle cx="32" cy="32" r="26.5" stroke="${palette.main}" stroke-opacity="0.38" stroke-width="1.2" stroke-dasharray="${dash}" transform="rotate(${rot} 32 32)"/><polygon points="32,7 54,46 10,46" stroke="${palette.accent}" stroke-opacity="0.22" stroke-width="1" fill="none"/><circle cx="${x1}" cy="${y1}" r="1.3" fill="${palette.light}" opacity="0.75"/><circle cx="${x2}" cy="${y2}" r="1.0" fill="${palette.accent}" opacity="0.65"/>`;
  }
  if (style === 'none') {
    return `<circle cx="${x1}" cy="${y1}" r="1.0" fill="${palette.light}" opacity="0.5"/><circle cx="${x2}" cy="${y2}" r="0.9" fill="${palette.accent}" opacity="0.45"/>`;
  }
  return `${bg}<circle cx="32" cy="32" r="27" stroke="${palette.main}" stroke-opacity="${ringOpacity}" stroke-width="1" stroke-dasharray="${dash}" transform="rotate(${rot} 32 32)"/><circle cx="${x1}" cy="${y1}" r="1.2" fill="${palette.light}" opacity="0.7"/><circle cx="${x2}" cy="${y2}" r="1.0" fill="${palette.accent}" opacity="0.6"/><circle cx="${x3}" cy="${y3}" r="0.8" fill="${palette.main}" opacity="0.5"/>`;
}

// Elemental visual flourish overlays that make elemental variants immediately distinct.
export function elementalFlourish(key, palette) {
  switch (key) {
    case 'Fire':
      return `<path d="M11 49C10 44 13 42 13 38C15 41 17 44 15 49Z" fill="#f97316" opacity="0.8"/><path d="M51 47C50 42 54 39 53 35C56 39 57 44 54 48Z" fill="#fb923c" opacity="0.8"/>`;
    case 'Ice':
      return `<path d="M11 16L14 11L17 16L14 21Z" fill="#bae6fd" fill-opacity="0.7" stroke="#38bdf8" stroke-width="1"/><path d="M49 46L52 40L55 46L52 52Z" fill="#e0f2fe" fill-opacity="0.75" stroke="#38bdf8" stroke-width="1"/>`;
    case 'Lightning':
      return `<polyline points="12,14 9,21 13,21 10,28" stroke="#fef08a" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><polyline points="52,36 49,43 53,43 50,50" stroke="#facc15" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
    case 'Blood':
      return `<path d="M13 44C13 44 16 48 16 50A3 3 0 0 1 10 50C10 48 13 44 13 44Z" fill="#ef4444" stroke="#fecaca" stroke-width="0.9"/><path d="M51 15C51 15 53.5 18.5 53.5 20A2.5 2.5 0 0 1 48.5 20C48.5 18.5 51 15 51 15Z" fill="#dc2626"/>`;
    case 'Poison':
      return `<circle cx="13" cy="18" r="2.6" fill="#84cc16" fill-opacity="0.5" stroke="#d9f99d" stroke-width="1"/><circle cx="51" cy="46" r="3" fill="#84cc16" fill-opacity="0.45" stroke="#bef264" stroke-width="1"/><circle cx="16" cy="12" r="1.4" fill="#ecfccb"/>`;
    case 'Holy':
      return `<path d="M13 13V19M10 16H16" stroke="#fffbeb" stroke-width="1.5" stroke-linecap="round"/><path d="M51 13V19M48 16H54" stroke="#fde68a" stroke-width="1.5" stroke-linecap="round"/>`;
    case 'Dark':
      return `<path d="M15 19A5 5 0 1 1 11 11A4 4 0 1 0 15 19Z" fill="#c084fc" opacity="0.8"/><path d="M47 48Q52 44 54 39" stroke="#a78bfa" stroke-width="1.6" stroke-linecap="round" opacity="0.7"/>`;
    case 'Chaos':
      return `<path d="M11 14L15 18M15 14L11 18" stroke="#facc15" stroke-width="1.6" stroke-linecap="round"/><path d="M49 46L54 50M54 46L49 50" stroke="#fb7185" stroke-width="1.6" stroke-linecap="round"/>`;
    case 'Slime':
      return `<circle cx="13" cy="48" r="2.6" fill="#a3e635" fill-opacity="0.7"/><circle cx="51" cy="49" r="2.1" fill="#bef264" fill-opacity="0.75"/>`;
    case 'Nature':
      return `<path d="M10 49C10 43 14 40 18 41C17 46 14 49 10 49Z" fill="#4ade80" fill-opacity="0.65" stroke="#86efac" stroke-width="1"/><path d="M54 17C54 12 50 10 46 11C47 15 50 17 54 17Z" fill="#22c55e" fill-opacity="0.65"/>`;
    case 'Metallic':
      return `<circle cx="12" cy="14" r="1.6" fill="#e2e8f0" stroke="#475569" stroke-width="0.9"/><circle cx="52" cy="50" r="1.6" fill="#e2e8f0" stroke="#475569" stroke-width="0.9"/>`;
    case 'Glass':
      return `<polygon points="12,12 15,17 12,22 9,17" fill="#ecfeff" fill-opacity="0.65" stroke="#67e8f9" stroke-width="1"/><polygon points="52,42 55,47 52,52 49,47" fill="#a5f3fc" fill-opacity="0.6"/>`;
    case 'Translocation':
      return `<path d="M10 17A6 6 0 0 1 17 11" stroke="#22d3ee" stroke-width="1.5" stroke-linecap="round"/><path d="M54 47A6 6 0 0 1 47 53" stroke="#c084fc" stroke-width="1.5" stroke-linecap="round"/>`;
    default:
      return `<path d="M12 16L14 13L16 16L14 19Z" fill="${palette.light}" opacity="0.6"/>`;
  }
}

export function wrapAssetSvg(inner, size = 32, cls = 'ws-icon', label = '') {
  const aria = label ? `role="img" aria-label="${String(label).replace(/"/g, '&quot;')}"` : 'aria-hidden="true"';
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" ${aria}>${inner}</svg>`;
}
