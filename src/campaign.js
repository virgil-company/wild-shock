import { rw3Equipment, rw3Spells, wardrobe } from './rw3-catalog.js';
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

export const mutators = ['enemyResistance', 'vulnerability', 'weather', 'damageDebuff'];

export function weekSeed(now) {
  const day = new Date(now);
  const utcDate = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
  return Math.floor(utcDate / 86400000) - (day.getUTCDay() + 6) % 7;
}

export function chooseMutators(mode, selected, rng) {
  if (mode === 'custom') return mutators.filter(m => selected.includes(m));
  if (!['weekly', 'mutated'].includes(mode)) return [];
  const first = pick(mutators, rng);
  return [first, pick(mutators.filter(m => m !== first), rng)];
}

export function outfitUnlocks(game) {
  const defeated = new Set(game.defeatedSpecies || []), cleared = new Set(game.clearedVaults || []);
  const win = game.status === 'won';
  const worn = new Set(Object.values(game.equipment).map(e => e.name));
  return wardrobe.filter(({ name, unlock }) => {
    if (!unlock) return true;
    if (name === 'Dagger') return game.largestDaggerVolley > 1000;
    if (name === 'Friendship') return !!game.befriendedMordred;
    if (name === 'Clown') return !!game.castChainCapped;
    if (name === 'Split Wizard') return !!game.mutualDestruction;
    if (unlock.startsWith('Defeat the') || unlock.startsWith('Defeat The') || unlock.startsWith('Defeat ')) {
      if (name === 'Vault Seeker') return cleared.size === Object.keys(vaults).length;
      const target = unlock.slice(7);
      return [...defeated].some(n => n === target || n.startsWith(target + ','));
    }
    if (unlock.startsWith('Complete the Vault of ')) return cleared.has(unlock.slice(22));
    if (!win) return false;
    if (unlock.endsWith(' trial')) return game.mode === 'trial-' + name.toLowerCase();
    if (name === 'Memory') return game.points === 1;
    if (name === 'Wizard Rift') return game.rerolledRealms?.length >= game.realm - 1;
    if (unlock.startsWith('Win with a fully upgraded ')) {
      const spell = rw3Spells.find(s => s.name === unlock.slice(26));
      return spell && spell.upgrades.every(u => game.rw3Upgrades[spell.id]?.includes(u.sp_id));
    }
    if (unlock.includes('every piece')) {
      const set = rw3Equipment.filter(e => e.name.includes(name));
      return set.length > 0 && set.every(e => worn.has(e.name));
    }
    if (unlock.startsWith('Win while wearing ')) {
      const items = rw3Equipment.filter(item => unlock.includes(item.name));
      return items.length > 0 && items.every(item => worn.has(item.name));
    }
    return false;
  }).map(entry => entry.name);
}

export function outfitColor(name) {
  if (!name || name === 'Wizard') return null;
  const hue = Array.from(name).reduce((n, ch) => (31 * n + ch.codePointAt(0)) % 360, 7);
  return { robe: `hsl(${hue} 48% 33%)`, hat: `hsl(${hue} 52% 48%)` };
}
