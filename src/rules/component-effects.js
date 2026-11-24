import { componentByName } from './rw3.js';
import { pick } from '../data/bestiary.js';

const RECURRING_INTERVALS = {
  'Lost Ring': 1, 'Stormglass Eye': 6, 'Frost Core': 6, 'Raven Eye': 12, 'Voltaic Ash': 6,
  'Hag Heart': 1, 'Relocator Beacon': 3, 'Astral Phylactery': 6, 'Nacreous Cysts': 1,
};

const SUMMON_COUNTS = {
  Incense: 3, Drakentooth: 2, Hellbloom: 9, 'Mycelial Ooze': 5, 'Slime Core': 3, "Arbiter's Lens": 3, 'Starfire Ingot': 2,
};

const BOOST_COMPONENTS = {
  'Rift Residue': [['Translocation'], 'max_charges', 1],
  'Ancient Inscription': [['Sorcery', 'Word'], 'max_charges', 2],
  'Scripted Cortex': [['Arcane', 'Word'], 'max_charges', 2],
  'Warped Dragon Egg': [['Conjuration'], 'minion_damage', 3],
  'Oozing Oculite': [[], 'range', 1],
};

export function resolvePickup(game, name, api, repeated = false) {
  const c = componentByName.get(name);
  if (!c?.on_pickup) return;
  const { rng, spells, visible, nearby, heal, hurt, summon, act, cast, convert, cloud, relocate, afflict } = api;
  const setStatus = (u, st, dur) => afflict ? afflict(u, st, dur) : (u.statuses[st] = Math.max(dur, u.statuses[st] || 0));
  const buff = (type, duration, args = {}) => {
    if (game.enemies.length || name === 'Relocator Beacon') game.buffs.push({ name, type, duration, ...args });
  };
  const resistance = (type, amount, duration = -1) => buff('resist', duration, { damageType: type, amount });
  const regen = (amount, duration = -1) => buff('selfRegen', duration, { amount });
  const maxHp = amount => { game.bonusMaxHp += amount; game.player.hp += amount; };

  if (RECURRING_INTERVALS[name] && !repeated) {
    buff('component', -1, { interval: RECURRING_INTERVALS[name], next: game.turn + RECURRING_INTERVALS[name], pulses: 0 });
  }
  if (c.summons?.length && name !== 'Nacreous Cysts') {
    if (!game.enemies.length) return;
    const count = SUMMON_COUNTS[name] || 1;
    const duration = name === "Arbiter's Lens" ? 12 : name === "Archfiend's Bone" ? 16 : 0;
    for (let i = 0; i < count; i++) {
      const ally = summon(c.summons[0], game.player, { duration });
      if (ally && name === 'Ball Lightning') for (let n = 0; n < 24 && ally.hp > 0; n++) act(ally);
      if (ally && name === 'Mycelial Ooze') ally.deathSummons = ['Green Slime', 3];
    }
    return;
  }
  if (BOOST_COMPONENTS[name]) {
    const [tags, stat, amount] = BOOST_COMPONENTS[name];
    const spell = pick(spells.filter(s => (!tags.length || s.tags.some(t => tags.includes(t))) && s.stats[stat] > 0), rng);
    if (spell) {
      const boost = game.spellBoosts[spell.id] ??= {};
      boost[stat] = (boost[stat] || 0) + amount;
      if (stat === 'max_charges') game.charges[spell.id] += amount;
    }
    return;
  }

  switch (name) {
    case 'Arcane Mote': case 'Voidstone Shard':
      for (const s of spells) game.charges[s.id] = name === 'Arcane Mote' ? Math.min(s.maxCharges, game.charges[s.id] + 1) : s.maxCharges;
      break;
    case 'Burning Ember': buff('aura', 15, { damage: 6, damageType: 'Fire', radius: 5 }); break;
    case 'Elemental Ice': game.player.shields += 7; break;
    case 'Heart Fragment': maxHp(10); break;
    case 'Wildflower': delete game.player.statuses.poison; heal(50); break;
    case 'Lightning Jar': buff('quickstep', 25, { quickstep: true }); break;
    case 'Magic Rune': buff('bonus', 15, { tag: 'Sorcery', stat: 'damage', amount: 6 }); break;
    case 'Shielding Shard': buff('shields', 15, { amount: 1 }); break;
    case 'Shadeweave': regen(api.mastery('Dark')); break;
    case 'Sacrificial Brand': maxHp(api.mastery('Blood')); break;
    case 'Beastblood Fungus': regen(2); break;
    case 'Votive Candle': regen(10, 12); break;
    case 'Frostpetal': regen(3, 25); resistance('Ice', 75, 25); break;
    case 'Holy Water': game.player.statuses = {}; resistance('Dark', 75); resistance('Fire', 75); break;
    case 'Silver Dragonscale': resistance('Physical', 50); resistance('Ice', 100); break;
    case 'Umbral Resin': resistance('Dark', 100); resistance('Poison', 100); break;
    case 'Dragontongue Tablet': if (spells.some(s => s.tags.includes('Dragon'))) { game.points++; game.progress.pointsEarned++; } break;
    case 'Mirror Stone': game.rw3Components.push(name); break;
    case 'Runed Vellum': for (const b of game.buffs) if (b.duration > 0) b.duration *= 3; break;
    case "Seer's Orb": buff('bonus', 10, { stat: 'range', amount: 6, noLos: true }); break;
    case 'Shimmersteel': for (const stat of ['range', 'damage']) buff('bonus', -1, { tag: 'Metallic', stat, amount: 100, percent: true }); break;
    case 'Planar Keystone':
      if (!game.portals.some(p => p.x === game.player.x && p.y === game.player.y)) {
        game.portals.push({ x: game.player.x, y: game.player.y, theme: 1 - game.theme });
      }
      break;
    case 'Binding Ring': {
      const e = nearby.find(e => e.tags?.some(t => t === 'Demon' || t === 'Arcane'));
      if (e) convert(e);
      break;
    }
    case "Thundergod's Fang":
      for (const e of nearby.filter(e => e.tags?.includes('Lightning') && e.hp < game.player.hp)) convert(e);
      break;
    case "Devil's Blood":
      for (const e of visible.filter(e => e.tags?.includes('Demon'))) {
        const amount = Math.min(2, e.maxHp - 1);
        e.maxHp -= amount;
        e.hp = Math.min(e.hp, e.maxHp);
        maxHp(amount);
      }
      break;
    case 'Blood Basin': cast('Pain Mirror', game.player); break;
    case 'Crimson Sigil': cast('Drain Pulse', game.player); break;
    case 'Cursed Dice': {
      const n = 2 + Math.floor(rng() * 6) + Math.floor(rng() * 6);
      for (let i = 0; i < n; i++) cast('Wheel of Death', game.player);
      break;
    }
    case 'Cursed Seal': for (const e of visible) cast('Seal Fate', e); break;
    case 'Dreamthorn Vine': if (nearby[0]) { setStatus(nearby[0], 'stun', 6); cast('Prison of Thorns', nearby[0]); } break;
    case 'Glacial Script': for (const s of spells.filter(s => !s.range && s.tags.includes('Ice'))) cast(s.name, game.player); break;
    case 'Sanctified Locket': for (const e of visible.filter(e => e.tags?.some(t => t === 'Demon' || t === 'Undead' || t === 'Dark'))) setStatus(e, 'fear', 8); break;
    case "Eidolon's Strings": for (const e of nearby.filter(e => e.tags?.includes('Arcane'))) setStatus(e, 'berserk', 12); break;
    case 'Lost Ring': for (const e of nearby.filter(e => api.distance(e) <= 1)) setStatus(e, 'berserk', 3); break;
    case 'Raven Eye': for (const e of nearby) setStatus(e, 'blind', 6); break;
    case 'Stormglass Eye': for (const e of visible) cloud(e, 'storm', 5, 25); break;
    case 'Voltaic Ash': for (const e of visible) hurt(e, 16, pick(['Fire', 'Lightning'], rng)); break;
    case 'Hag Heart': for (const e of visible.filter(e => e.tags?.includes('Living'))) heal(hurt(e, 1, 'Dark')); break;
    case 'Frost Core': case 'Frozen Heartwood': {
      const core = name === 'Frost Core', r = core ? 2 + (api.pulses || 0) : 5;
      for (const e of nearby.filter(e => api.distance(e) <= r)) { hurt(e, core ? 10 : 50, 'Ice'); setStatus(e, 'freeze', core ? 3 : 6); }
      if (!core) for (const a of game.allies.filter(a => api.distance(a) <= r)) a.hp = Math.min(a.maxHp, a.hp + 50);
      break;
    }
    case 'Relocator Beacon': relocate(); break;
    case 'Astral Phylactery': {
      const ally = pick(game.allies.filter(a => !a.soulbound), rng);
      if (ally) ally.soulbound = true;
      break;
    }
    case 'Nacreous Cysts': if (game.enemies.length && rng() < 0.5) summon('Green Slime', game.player); break;
    case 'Runic Fetish': for (const e of visible) e.sharedPain = true; break;
    case 'Fulminite Shard': case 'Golden Dragonscale': buff('retaliation', -1); break;
    case 'Timelost Inscription': buff('rechargeSorcery', 6); break;
  }
}
