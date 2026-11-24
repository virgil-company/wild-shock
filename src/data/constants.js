export const SAVE_VERSION = 2;
export const SIZE = 23;
export const FINAL_REALM = 100;

export const equipmentSlots = ['Weapon', 'Head', 'Body', 'Feet', 'Trinket'];

export const DAMAGE_TYPES = ['Physical', 'Fire', 'Ice', 'Lightning', 'Dark', 'Holy', 'Arcane', 'Poison'];

export const TAG_META = {
  Fire: { color: '#f28b5e', icon: '♨' },
  Ice: { color: '#7dd3fc', icon: '❄' },
  Lightning: { color: '#facc15', icon: 'ϟ' },
  Dark: { color: '#a78bfa', icon: '◈' },
  Holy: { color: '#fde68a', icon: '☼' },
  Arcane: { color: '#c084fc', icon: '✧' },
  Nature: { color: '#86efac', icon: '♧' },
  Blood: { color: '#f87171', icon: '♦' },
  Metallic: { color: '#cbd5e1', icon: '⬡' },
  Chaos: { color: '#fb7185', icon: '✹' },
  Dragon: { color: '#fb923c', icon: '🐉' },
  Slime: { color: '#a3e635', icon: '●' },
  Eye: { color: '#38bdf8', icon: '◉' },
  Orb: { color: '#818cf8', icon: '◎' },
  Sorcery: { color: '#e2e8f0', icon: '⚡' },
  Conjuration: { color: '#4ade80', icon: '♙' },
  Enchantment: { color: '#f0abfc', icon: '✦' },
  Translocation: { color: '#67e8f9', icon: '⇄' },
  Ritual: { color: '#fcd34d', icon: '❂' },
  Word: { color: '#fda4af', icon: '❖' },
};

export const SHRINE_TYPES = [
  'transmutation', 'duplication', 'empowerment', 'chronomancy', 'calling',
  'haste', 'offering', 'knowledge', 'reformation', 'spellgraft',
];

export const GAME_MODES = {
  standard: { id: 'standard', finalRealm: 100, potions: true, allowedTags: null, enemyHpMult: 1, startPoints: 12, starterSpells: [101, 61, 95] },
  classic: { id: 'classic', finalRealm: 21, potions: false, allowedTags: null, enemyHpMult: 1, startPoints: 14, starterSpells: [101, 61] },
  'trial-pyromancer': { id: 'trial-pyromancer', finalRealm: 21, potions: false, allowedTags: ['Fire'], enemyHpMult: 1, startPoints: 14, starterSpells: [61] },
  'trial-necromancer': { id: 'trial-necromancer', finalRealm: 21, potions: false, allowedTags: ['Dark', 'Blood'], enemyHpMult: 1, startPoints: 14, starterSpells: [29] },
  'trial-stormcaller': { id: 'trial-stormcaller', finalRealm: 21, potions: false, allowedTags: ['Lightning', 'Ice'], enemyHpMult: 1, startPoints: 14, starterSpells: [95] },
  'trial-conjurer': { id: 'trial-conjurer', finalRealm: 21, potions: false, allowedTags: ['Conjuration'], enemyHpMult: 1, startPoints: 14, starterSpells: [184] },
  'trial-ironman': { id: 'trial-ironman', finalRealm: 21, potions: false, allowedTags: null, enemyHpMult: 1.5, startPoints: 16, starterSpells: [101] },
};

export const mancerTrials = {
  electromancer: ['Lightning', 95], cryomancer: ['Ice', 86], phytomancer: ['Nature', 122],
  manamancer: ['Arcane', 101], sanctumancer: ['Holy', 77], ferromancer: ['Metallic', 160],
  hemomancer: ['Blood', 10], chronomancer: ['Translocation', 8],
};

for (const [name, [tag, id]] of Object.entries(mancerTrials)) {
  const mode = 'trial-' + name;
  GAME_MODES[mode] = { ...GAME_MODES.classic, id: mode, allowedTags: [tag], starterSpells: [id] };
}
for (const mode of ['weekly', 'custom', 'mutated', 'trial-scavenger', 'trial-improviser']) {
  GAME_MODES[mode] = { ...GAME_MODES.classic, id: mode };
}

export function getModeConfig(mode) {
  return Object.hasOwn(GAME_MODES, mode) ? GAME_MODES[mode] : GAME_MODES.standard;
}

export const STATUS_LIST = [
  'burn', 'immolate', 'poison', 'bleed', 'freeze', 'stun', 'petrify', 'glassed',
  'blind', 'fear', 'berserk', 'silence', 'soaked', 'acidified', 'immobilized', 'regeneration', 'shock',
];

export const DEBUFF_STATUSES = new Set([
  'burn', 'immolate', 'poison', 'bleed', 'freeze', 'refreezing', 'stun', 'petrify', 'glassed',
  'blind', 'fear', 'berserk', 'silence', 'soaked', 'acidified', 'immobilized', 'shock', 'sleep',
  'necrosis', 'armor_melted', 'twilight', 'pyrostatic', 'sharedPain',
]);

export const TICK_DECAY_STATUSES = [
  'blind', 'fear', 'berserk', 'silence', 'soaked', 'acidified', 'glassed',
  'immobilized', 'armor_melted', 'twilight', 'pyrostatic', 'sharedPain',
];

export const CLOUD_TYPES = {
  fire: { name: 'Fire Cloud', color: '#f97316', damageType: 'Fire', damage: 5 },
  storm: { name: 'Storm Cloud', color: '#facc15', damageType: 'Lightning', damage: 6 },
  blizzard: { name: 'Blizzard', color: '#7dd3fc', damageType: 'Ice', damage: 4, status: 'freeze', statusDuration: 1 },
  rain: { name: 'Rain Cloud', color: '#60a5fa', damageType: null, damage: 0, status: 'soaked', statusDuration: 2 },
  poison: { name: 'Poison Cloud', color: '#84cc16', damageType: 'Poison', damage: 4, status: 'poison', statusDuration: 3 },
  web: { name: 'Web', color: '#cbd5e1', damageType: null, damage: 0, status: 'immobilized', statusDuration: 1 },
};

export const ENEMY_ARCHETYPES = [
  { name: 'Cinder imp', tags: ['Demon', 'Fire'], resistances: { Fire: 75, Ice: -50 }, flying: false, shields: 0 },
  { name: 'Hollow knight', tags: ['Undead', 'Metallic'], resistances: { Dark: 50, Poison: 100, Holy: -50 }, flying: false, shields: 1 },
  { name: 'Thorn eye', tags: ['Arcane', 'Nature', 'Eye'], resistances: { Arcane: 50, Poison: 50, Fire: -25 }, flying: true, shields: 1 },
  { name: 'Rift moth', tags: ['Living', 'Lightning'], resistances: { Lightning: 75, Physical: -25 }, flying: true, shields: 0 },
];
