import { equipment, spells, wardrobe } from './catalog.js';
import { pick } from './bestiary.js';

export const vaults = {
  Goblins: ['Goblin Wizard', 'Goblin', 'Goblin Shaman'],
  Arachnea: ['Mother of Spiders', 'Giant Spider', 'Ossuary Spider'],
  Slime: ['Rainbow Slime', 'Green Slime', 'Slime Brewer'],
  Glaciers: ['Ice Lich', 'Ice Hound', 'Ice Faery'],
  Flame: ['Fire Drake', 'Fire Spirit', 'Fire Elemental'],
  Souls: ['Idol of Souls', 'Ghost', 'Skeleton'],
  Tempests: ['Storm Archon', 'Storm Spirit', 'Storm Troll'],
  'the Fettered Fae': ['Infernal Demon Prince', 'Chaos Fiend', 'Ash Fiend'],
  'the Sculptor': ['Idol of Piety', 'Golem', 'Concussive Idol'],
  Torment: ['Infernal Demon Prince', 'Fiery Tormentor', 'Frosty Tormentor'],
};

const VAULT_COUNT = Object.keys(vaults).length;
const spellByName = new Map(spells.map(s => [s.name, s]));

// Precompute equipment lists needed for win-unlock checks so outfitUnlocks avoids O(81 * 375) scans.
const wardrobeMeta = wardrobe.map(entry => {
  const { name, unlock } = entry;
  let requiredItems = null;
  let requiredSpell = null;
  if (unlock?.startsWith('Win with a fully upgraded ')) {
    requiredSpell = spellByName.get(unlock.slice(26)) || null;
  } else if (unlock?.includes('every piece')) {
    requiredItems = equipment.filter(e => e.name.includes(name)).map(e => e.name);
  } else if (unlock?.startsWith('Win while wearing ')) {
    requiredItems = equipment.filter(item => unlock.includes(item.name)).map(e => e.name);
  }
  return { name, unlock, requiredItems, requiredSpell };
});

export const mutators = ['enemyResistance', 'vulnerability', 'weather', 'damageDebuff'];

export function weekSeed(now) {
  const day = new Date(now);
  const utcDate = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
  return Math.floor(utcDate / 86400000) - (day.getUTCDay() + 6) % 7;
}

export function chooseMutators(mode, selected, rng) {
  if (mode === 'custom') return mutators.filter(m => selected.includes(m));
  if (mode !== 'weekly' && mode !== 'mutated') return [];
  const first = pick(mutators, rng);
  return [first, pick(mutators.filter(m => m !== first), rng)];
}

export function outfitUnlocks(game) {
  const defeated = game.defeatedSpecies || [];
  const cleared = new Set(game.clearedVaults || []);
  const win = game.status === 'won';
  const worn = win ? new Set(Object.values(game.equipment).map(e => e.name)) : null;
  const unlocked = [];

  for (const { name, unlock, requiredItems, requiredSpell } of wardrobeMeta) {
    if (!unlock) { unlocked.push(name); continue; }
    if (name === 'Dagger') { if (game.largestDaggerVolley > 1000) unlocked.push(name); continue; }
    if (name === 'Friendship') { if (game.befriendedMordred) unlocked.push(name); continue; }
    if (name === 'Clown') { if (game.castChainCapped) unlocked.push(name); continue; }
    if (name === 'Split Wizard') { if (game.mutualDestruction) unlocked.push(name); continue; }
    if (unlock.startsWith('Defeat ')) {
      if (name === 'Vault Seeker') {
        if (cleared.size === VAULT_COUNT) unlocked.push(name);
      } else {
        const target = unlock.slice(7);
        const prefix = target + ',';
        if (defeated.some(n => n === target || n.startsWith(prefix))) unlocked.push(name);
      }
      continue;
    }
    if (unlock.startsWith('Complete the Vault of ')) {
      if (cleared.has(unlock.slice(22))) unlocked.push(name);
      continue;
    }
    if (!win) continue;
    if (unlock.endsWith(' trial')) {
      if (game.mode === 'trial-' + name.toLowerCase()) unlocked.push(name);
    } else if (name === 'Memory') {
      if (game.points === 1) unlocked.push(name);
    } else if (name === 'Wizard Rift') {
      if (game.rerolledRealms?.length >= game.realm - 1) unlocked.push(name);
    } else if (requiredSpell) {
      const owned = game.spellUpgrades[requiredSpell.id];
      if (owned && requiredSpell.upgrades.every(u => owned.includes(u.sp_id))) unlocked.push(name);
    } else if (requiredItems?.length) {
      if (requiredItems.every(itemName => worn.has(itemName))) unlocked.push(name);
    }
  }
  return unlocked;
}

const outfitColorCache = new Map();
export function outfitColor(name) {
  if (!name || name === 'Wizard') return null;
  let cached = outfitColorCache.get(name);
  if (!cached) {
    const hue = Array.from(name).reduce((n, ch) => (31 * n + ch.codePointAt(0)) % 360, 7);
    cached = { robe: `hsl(${hue} 48% 33%)`, hat: `hsl(${hue} 52% 48%)` };
    outfitColorCache.set(name, cached);
  }
  return cached;
}
