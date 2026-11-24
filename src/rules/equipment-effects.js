// Equipment events receive the equipped copy so craft ingredients and counters
// stay with that item and survive a saved journey.

const INGREDIENT_BONUSES = [
  ['Mithril Ore', 'damage', 9],
  ['Worldstone Socket', 'radius', 2],
  ['Broken Stopwatch', 'duration', 3],
  ['Discarded Homunculi', 'num_summons', 2],
];

const CAGE_MASTERY_TAGS = {
  'Arbiter Cage': ['Eye', 'Holy'],
  'Knight Cage': ['Arcane', 'Metallic'],
  'Lava Cage': ['Fire', 'Slime'],
};

const CHALICE_TAGS = {
  'Chalice of Light': 'Holy',
  'Chalice of Warp': 'Translocation',
  'Chalice of Dragons': 'Dragon',
  'Chalice of Iron': 'Metallic',
};

const PERIODIC_STATUS_DAMAGE = {
  'Dowsing Spark': ['soaked', 'Lightning'],
  'Hemlock Needle': ['bleed', 'Dark'],
  'Fae Toxin Pouch': ['poison', 'Arcane'],
  'Icy Cruciform': ['freeze', 'Holy'],
  'Nightmare Hexbag': ['sleep', 'Dark'],
  'The Boiler': ['soaked', 'Fire'],
};

const BEACON_MASTERY = {
  'Rain Beacon': ['Nature', 'rain'],
  'Storm Beacon': ['Lightning', 'storm'],
  'Blizzard Beacon': ['Ice', 'blizzard'],
};

const CROWN_CASTS = {
  'Chaos Scale Crown': ['Dragon', 'Annihilate'],
  'Moon Crown': ['Holy', 'Void Beam'],
  'Crown of Bony Fingers': ['Undead', 'Touch of Death'],
};

// Pre-parse regex rules per equipment definition so hot triggers avoid re-running RegExp.
const itemRuleCache = new WeakMap();
function getItemRules(item) {
  let rules = itemRuleCache.get(item);
  if (rules) return rules;
  const desc = item.desc || '';
  const everyMatch = desc.match(/^Every (\d+) steps, (summon|cast) (.+?)(?:\n|$)/);
  const procMatch = desc.match(/^When an enemy takes \[(\w+)(?::\w+)?\] damage, it has a (\d+)% chance to be afflicted with \[\d+:duration\] turns? of \[(\w+)\]/i);
  const triggerMatch = desc.match(/^For every (\d+) damage dealt (?:to enemies )?by \[(\w+)(?::\w+)?\] spells( or equipment)?.*?, cast (.+?) on a random enemy/);
  const sigilMatch = desc.match(/^For every \[(\w+):\w+\] unit that dies, one of your \[(\w+)\] spells regains/);
  rules = {
    every: everyMatch ? { interval: Number(everyMatch[1]), action: everyMatch[2], target: everyMatch[3] } : null,
    proc: procMatch ? { damageType: procMatch[1], chance: Number(procMatch[2]), status: procMatch[3] === 'frozen' ? 'freeze' : procMatch[3] } : null,
    trigger: triggerMatch ? { threshold: Number(triggerMatch[1]), tag: triggerMatch[2], allowEquipment: !!triggerMatch[3], spellName: triggerMatch[4] } : null,
    sigil: sigilMatch ? { victimTag: sigilMatch[1], spellTag: sigilMatch[2] } : null,
    linksPrefix: item.name.endsWith(' Links') ? desc.split('damage,')[0] : null,
    hasResistBonus: (item.bonuses || []).some(line => line.includes('Resist')),
  };
  itemRuleCache.set(item, rules);
  return rules;
}

export function equipmentEvent(event, game, item, entry, ctx) {
  const name = item.name;
  const rules = getItemRules(item);
  const stats = { ...item.attributes };
  const ingredients = entry.components;
  for (const [component, stat, value] of INGREDIENT_BONUSES) {
    if (stats[stat]) {
      let count = 0;
      for (let i = 0; i < ingredients.length; i++) if (ingredients[i] === component) count++;
      if (count) stats[stat] += count * value;
    }
  }
  if (stats.damage) stats.damage += entry.growth || 0;

  const { enemies, visible, spell, target, victim, rng, roll, summon, cast, hurt, dist, heal, act, afflict, pickup } = ctx;
  const livingEnemies = () => game.enemies.filter(e => e.hp > 0);
  const species = item.summons?.[0];
  const hasFamiliarCollar = ingredients.includes("Familiar's Collar");

  const conjure = (n, pos = game.player, count = stats.num_summons || 1, extraSpec = {}) => {
    for (let i = 0; i < count; i++) {
      const ally = summon(n, pos, { hp: stats.minion_health, damage: stats.minion_damage, range: stats.minion_range, duration: stats.minion_duration, ...extraSpec });
      if (ally && hasFamiliarCollar && game.player.hp > 3) { game.player.hp -= 3; ally.soulbound = true; }
    }
  };
  const randomCharge = candidates => {
    const s = roll(candidates.filter(s => game.charges[s.id] < s.maxCharges));
    if (s) game.charges[s.id]++;
  };

  if (event === 'enter') {
    entry.steps = 0;
    entry.stored = 0;
    entry.hits = {};
    entry.turn = -1;
    if (name === 'Cage of Chimerae') for (const n of item.summons) conjure(n);
    if (name === 'Armor of Nanuk') conjure(species);
    if (CAGE_MASTERY_TAGS[name]) {
      const [t1, t2] = CAGE_MASTERY_TAGS[name];
      const bonusHp = ctx.mastery(t1) * ctx.mastery(t2);
      conjure(species, game.player, stats.num_summons || 1, bonusHp > 0 ? { bonusHp } : {});
    }
    if (name === 'Dwarf Hat' && ctx.spells().length >= 7) conjure(species, game.player, 7);
    if (name === 'Timestriders') for (const e of enemies) afflict(e, 'stun', stats.duration);
    if (name === 'Brisingamen') for (const e of visible) afflict(e, 'berserk', stats.duration);
    if (name === "Glasya's Bite") {
      const bleedDuration = ctx.mastery('Blood') * ctx.mastery('Chaos');
      if (bleedDuration > 0) for (const e of enemies) afflict(e, 'bleed', bleedDuration);
    }
    if (name === 'Crimson Torc') {
      const bonusPct = ctx.mastery('Fire') * ctx.mastery('Blood');
      if (bonusPct > 0) {
        for (const tag of ['Fire', 'Blood']) {
          game.buffs.push({ name, type: 'bonus', tag, stat: 'damage', percent: true, amount: bonusPct, duration: stats.duration || 3 });
        }
      }
    }
    if (name === 'Boots of Imminent Doom') for (const e of enemies.filter(e => dist(game.player, e) <= stats.radius)) cast('Seal Fate', e);
    if (name === "Rod of Heaven's Assault") for (const e of visible.filter(e => e.tags.some(tag => tag === 'Demon' || tag === 'Undead'))) cast('Heavenly Blast', e);
    if (name === 'Codex of Chaotic Evolution') ctx.giveUpgrade(roll(ctx.spells().filter(s => s.upgrades.length > s.learnedUpgrades.length)));
    if (ingredients.includes("Odin's Eye")) {
      const spells = ctx.spells();
      for (const tag of item.tags) {
        const s = roll(spells.filter(s => s.tags.includes(tag) && s.tags.includes('Eye') && !s.range));
        if (s) cast(s.name, game.player);
      }
    }
    if (ingredients.includes('Luminous Threads') && rules.hasResistBonus) game.player.shields += ctx.mastery('Holy');
  } else if (event === 'clear') {
    entry.stored = 0;
    entry.hits = {};
    entry.turn = -1;
    if (stats.damage && ingredients.includes('Quipu Saga')) entry.growth = (entry.growth || 0) + 1;
  } else if (event === 'summon') {
    const ally = ctx.ally;
    if (!ally) return;
    if (name === "Iron Legion's Banner" && ally.tags?.some(t => t === 'Metallic' || t === 'Construct')) {
      ally.shields = (ally.shields || 0) + 2;
      afflict(ally, 'quickstep', stats.duration || 10);
    }
    if (name === 'Jaculus Idol' && ally.tags?.includes('Dragon')) {
      afflict(ally, 'quickstep', Number.MAX_SAFE_INTEGER);
    }
    if (name === 'Magic Minion Shield') {
      ally.shields = (ally.shields || 0) + (ally.tags?.includes('Arcane') ? 3 : 1);
    }
    if (name === 'Artificial Heart' && ally.tags?.includes('Construct') && !ally.tags.includes('Living')) {
      ally.tags.push('Living');
    }
    if (name === 'The North Pole' && ally.tags?.includes('Metallic')) {
      cast('Magnetize', ally);
    }
  } else if (event === 'shard') {
    const tag = CHALICE_TAGS[name];
    if (tag) {
      for (const s of ctx.spells().filter(s => s.tags.includes(tag))) game.charges[s.id] = s.maxCharges;
    }
  } else if (event === 'pickup' || event === 'forge') {
    if ((event === 'pickup' && name === "Artificer's Mirror") || (event === 'forge' && name === "Artificer's Hammer")) {
      const used = entry.usedAtRealm === game.realm ? entry.used || [] : [];
      const choices = ingredients.map((c, i) => ({ c, i })).filter(({ c, i }) => ctx.pickupEligible(c) && (event !== 'forge' || !used.includes(i)));
      const chosen = roll(choices);
      if (chosen) {
        if (event === 'forge') { entry.usedAtRealm = game.realm; entry.used = [...used, chosen.i]; }
        pickup(chosen.c);
      }
    }
  } else if (event === 'step') {
    if (rules.every && ((entry.steps = (entry.steps || 0) + 1) % rules.every.interval === 0)) {
      if (rules.every.action === 'summon' && species) conjure(species);
      else if (rules.every.action === 'cast') cast(rules.every.target, game.player);
    }
  } else if (event === 'payHP') {
    if (name === 'Bloodletter Bracers') {
      entry.spent = (entry.spent || 0) + ctx.amount;
      while (entry.spent >= 50) { entry.spent -= 50; randomCharge(ctx.spells().filter(s => s.tags.includes('Blood'))); }
    }
  } else if (event === 'damage') {
    if (rules.proc && ctx.type === rules.proc.damageType && rng() * 100 < rules.proc.chance) {
      afflict(victim, rules.proc.status, stats.duration);
    }
    if (rules.trigger && ctx.tags.includes(rules.trigger.tag) && (ctx.sourceKind === 'spell' || (rules.trigger.allowEquipment && ctx.sourceKind === 'equipment'))) {
      entry.stored = (entry.stored || 0) + ctx.amount;
      while (entry.stored >= rules.trigger.threshold) {
        entry.stored -= rules.trigger.threshold;
        const e = roll(livingEnemies());
        if (e) cast(rules.trigger.spellName, e, { sourceEquipment: item.name });
      }
    }
    if (ctx.sourceKind === 'spell' && ((name === 'Disintegrator' && ctx.tags.includes('Sorcery')) || (name === 'Amulet of Emerald Flame' && ctx.tags.includes('Enchantment')))) {
      const threshold = name === 'Disintegrator' ? 40 : 50;
      entry.stored = (entry.stored || 0) + ctx.amount;
      while (entry.stored >= threshold) {
        entry.stored -= threshold;
        const alive = livingEnemies();
        if (name === 'Disintegrator') for (const e of alive) hurt(e, 1, 'Physical');
        else { const e = alive.sort((a, b) => dist(game.player, a) - dist(game.player, b))[0]; if (e) hurt(e, stats.damage, 'Fire'); }
      }
    }
    if (name === 'Pyrophilia Locket' && ctx.type === 'Fire') {
      for (const a of game.allies.filter(a => a.hp > 0 && ctx.see(a, victim))) a.hp = Math.min(a.maxHp, a.hp + Math.floor(ctx.amount / 2));
    }
    if (name === "Conciliator's Claw" && dist(victim, game.player) <= 1) {
      heal(3);
      for (const a of game.allies.filter(a => a.hp > 0 && ctx.see(a, game.player))) a.hp = Math.min(a.maxHp, a.hp + 3);
    }
    if ((name === 'Crackledarkener' && ctx.type === 'Dark') || (name === 'Cracklevoid' && ctx.type === 'Arcane')) {
      for (const e of livingEnemies().filter(e => e !== victim && ctx.see(victim, e) && dist(victim, e) <= stats.radius).slice(0, stats.num_targets)) {
        hurt(e, ctx.amount, 'Lightning');
      }
    }
    if (name === 'Scepter of Sorrows' || name === 'Ghostfire Scepter') {
      const element = name === 'Scepter of Sorrows' ? 'Ice' : 'Fire';
      if (ctx.type === 'Dark' || ctx.type === element) {
        const turnId = ctx.turnId;
        if (entry.turn !== turnId) { entry.turn = turnId; entry.hits = {}; }
        const rec = entry.hits[victim.id] ??= { types: [], triggered: false };
        if (!rec.types.includes(ctx.type)) rec.types.push(ctx.type);
        if (!rec.triggered && rec.types.includes('Dark') && rec.types.includes(element)) {
          rec.triggered = true;
          conjure(species, victim);
        }
      }
    }
  } else if (event === 'allyHit') {
    if (name === 'Flaming Claw Staff' || name === 'Icy Claw Staff') {
      hurt(victim, Math.floor(ctx.amount / 2), name === 'Flaming Claw Staff' ? 'Fire' : 'Ice');
    }
  } else if (event === 'allyDeath') {
    if (name === 'Cannibal Mask') {
      const a = roll(game.allies.filter(a => a.hp > 0));
      if (a) { const n = Math.floor(victim.maxHp / 2); a.maxHp += n; a.hp += n; }
    }
    if (name === 'Icy Vengeance Icon') {
      for (const e of livingEnemies().filter(e => dist(e, victim) <= stats.radius).slice(0, stats.num_targets)) {
        hurt(e, Math.floor(victim.maxHp / 2), 'Ice');
      }
    }
  } else if (event === 'kill') {
    const type = victim.lastDamageType;
    if (rules.sigil && victim.tags?.includes(rules.sigil.victimTag)) {
      randomCharge(ctx.spells().filter(s => s.tags.includes(rules.sigil.spellTag)));
    }
    if (name === 'Orb of Infinite Slaughter') {
      const turnId = ctx.turnId;
      if (entry.explosionTurn !== turnId) { entry.explosionTurn = turnId; entry.explosions = 0; }
      if (entry.explosions++ >= 1000) return;
      const amount = ctx.mastery('Blood');
      for (const e of livingEnemies().filter(e => dist(e, victim) <= 1)) heal(hurt(e, amount, 'Dark'));
    }
    if (name === 'Robe of Storms' && (type === 'Ice' || type === 'Lightning')) game.player.shields++;
    if (name === 'Spawning Venom' && type === 'Poison') conjure('Giant Spider', victim);
    if (name === 'Soul Harvester' && rng() < 0.1) {
      for (const s of ctx.spells().filter(s => s.tags.some(t => t === 'Holy' || t === 'Dark'))) {
        game.charges[s.id] = Math.min(s.maxCharges, game.charges[s.id] + 1);
      }
    }
    if (rules.linksPrefix && rules.linksPrefix.includes('[' + type)) {
      const other = roll(livingEnemies().filter(e => dist(e, victim) <= stats.radius && ctx.see(e, victim)));
      if (other) hurt(other, stats.damage, type);
    }
  } else if (event === 'cast') {
    const tag = t => spell.tags.includes(t);
    if (name === 'Pulse Accelerator' && tag('Blood')) {
      game.buffs = game.buffs.filter(b => b.name !== name);
      game.buffs.push({ name, duration: stats.duration, quickstep: true, quickcastAll: true });
    }
    if (name.endsWith(' Frenzy Mask') && tag(item.tags[0])) {
      game.buffs.push({ name, type: 'bonus', tag: item.tags[0], stat: 'damage', amount: 2, duration: stats.duration });
    }
    if (name === 'Echo Staff') {
      if (entry.last === spell.id && tag('Sorcery')) randomCharge([spell]);
      entry.last = spell.id;
    }
    if (name === 'Eye Helm' && tag('Eye') && game.player.shields < 20) game.player.shields = Math.min(20, game.player.shields + 3);
    if (name === 'Blood Shield' && game.player.hp > 3) { game.player.hp -= 3; game.player.shields++; }
    if (name === "Titan's Bane" && tag('Sorcery') && victim?.radius) cast(spell.name, target);
    if (name === 'Keraunos' && tag('Lightning') && victim) for (let i = 0; i < stats.num_targets; i++) cast(spell.name, target);
    if (name === 'Horn of the Wild Hunt' && tag('Nature')) {
      for (const a of [...game.allies].filter(a => a.tags.some(t => t === 'Nature' || t === 'Living'))) act(a);
    }
    if (name === 'Fae Thorn Staff' && (tag('Arcane') || tag('Nature'))) conjure(species, target);
    if ((name === 'Treelord Staff' && tag('Nature') && spell.level >= 3) || (name === 'Aetherlord Staff' && tag('Arcane') && spell.level >= 4)) {
      conjure(species, target);
    }
    if (name === 'Stormbrood Trickshoes' && tag('Translocation')) conjure(species, ctx.origin);
    if (name === 'Wild Healing Staff' && tag('Nature')) {
      heal(5);
      for (const a of game.allies.filter(a => a.tags.includes('Living'))) a.hp = Math.min(a.maxHp, a.hp + 5);
    }
    if (name === 'Chill Staff' && tag('Ice')) {
      const e = enemies.filter(e => !e.statuses.freeze).sort((a, b) => dist(a, target) - dist(b, target))[0];
      if (e) afflict(e, 'freeze', stats.duration);
    }
    if (name === 'Chelation Claw' && (tag('Blood') || tag('Metallic')) && victim) afflict(victim, 'bleed', stats.duration);
    if (name === 'Razoreye' && tag('Metallic')) for (const e of visible.slice(0, spell.level)) hurt(e, stats.damage, 'Physical');
    if ((name === 'Icy Chill Mask' && tag('Ice')) || (name === 'Searing Eye Stone' && tag('Fire'))) {
      for (const e of enemies.filter(e => ctx.see(e, target))) hurt(e, 1, name === 'Icy Chill Mask' ? 'Ice' : 'Fire');
    }
    if (ingredients.includes('Phoenix Feather')) {
      for (const t of ['Holy', 'Fire']) if (tag(t) && item.tags.includes(t)) heal(1);
    }
    if (ingredients.includes('Stormsong Note')) {
      for (const t of ['Ice', 'Lightning']) if (tag(t) && item.tags.includes(t)) {
        for (let i = 0; i < spell.level; i++) ctx.weather(t === 'Ice' ? 'blizzard' : 'storm');
      }
    }
    if (name === "Artificer's Abacus" && game.realmTurn < game.realm) {
      entry.beads = (entry.beads || 0) + (spell.level % 2 ? -spell.level : spell.level);
      if (entry.beads === game.realm) {
        entry.beads = 0;
        const c = roll(ingredients.filter(ctx.pickupEligible));
        if (c) pickup(c);
      }
    }
  } else if (event === 'turn' && enemies.length) {
    if (name === 'Explosive Spore Manual') cast('Combust Poison', game.player);
    if (name === 'Fanged Amulet') {
      const e = roll(livingEnemies().filter(e => dist(game.player, e) <= 1));
      if (e) heal(hurt(e, ctx.mastery('Blood'), 'Physical'));
    }
    if (name === 'Galvanic Blade') {
      const dmg = ctx.mastery('Lightning') * ctx.mastery('Metallic');
      const e = dmg > 0 && roll(livingEnemies().filter(e => dist(game.player, e) <= 1));
      if (e) { hurt(e, dmg, 'Physical'); hurt(e, dmg, 'Lightning'); }
    }
    if (name === 'Shattering Frost Manual') cast('Shatter', game.player);
    if (name === 'Crown of Ragnarok' && game.realmTurn === 9) {
      for (let i = 0; i < stats.num_targets; i++) {
        for (const s of ['Earthquake', 'Flame Burst', 'Storm Burst']) cast(s, game.player);
      }
    }
    if (name === 'Earthmeld Boots' && game.movedAt !== game.turn) heal(3);
    if (name === 'Earthtroll Armor' || name === 'Stormtroll Armor') heal(5);
    if (name === 'Minion Regeneration Amulet' || name === 'Amulet of Undeath') {
      const amt = name === 'Amulet of Undeath' ? 3 : 2;
      for (const a of game.allies) {
        if (name !== 'Amulet of Undeath' || a.tags.includes('Undead')) a.hp = Math.min(a.maxHp, a.hp + amt);
      }
    }
    if (name === "Archangel's Halo") {
      for (const a of game.allies.filter(a => a.tags.includes('Holy') && dist(game.player, a) <= stats.radius)) act(a);
    }
    const periodic = PERIODIC_STATUS_DAMAGE[name];
    if (periodic) {
      const pool = enemies.filter(e => e.statuses[periodic[0]] > 0);
      for (let i = 0; pool.length && i < (stats.num_targets || Infinity); i++) {
        hurt(pool.splice(Math.floor(rng() * pool.length), 1)[0], stats.damage, periodic[1]);
      }
    }
    if (name === 'Tundra Mantle') {
      for (const e of enemies.filter(e => dist(e, game.player) <= stats.radius && e.statuses.soaked)) afflict(e, 'freeze', stats.duration);
    }
    if (name === 'Stone Mask' && visible.length) afflict(roll(visible), 'petrify', stats.duration);
    const beacon = BEACON_MASTERY[name];
    if (beacon) {
      const count = Math.floor(rng() * (1 + ctx.mastery(beacon[0])));
      for (let i = 0; i < count; i++) ctx.weather(beacon[1]);
    }
    if (name === 'Arcane Accelerator') {
      for (const a of game.allies.filter(a => ctx.see(a, game.player))) {
        for (const k in a.cooldowns) a.cooldowns[k]--;
      }
    }
    const crown = CROWN_CASTS[name];
    if (crown) {
      const [tag, s] = crown;
      const a = roll(game.allies.filter(a => a.hp > 0 && a.tags.includes(tag)));
      const sp = ctx.spellInfo ? ctx.spellInfo(s) : null;
      const e = a && roll(livingEnemies().filter(e => !sp?.requiresLos || ctx.see(a, e)));
      if (e) cast(s, e, { caster: a, sourceEquipment: item.name, enforceLos: true });
    }
    if (name === "Hex Specialist's Ring") {
      for (const e of enemies) hurt(e, Object.values(e.statuses).filter(n => n > 0).length * stats.damage, 'Arcane');
    }
    if (name === 'Hellfire Mantle') {
      for (const e of enemies.filter(e => dist(game.player, e) <= stats.radius)) hurt(e, stats.damage, 'Fire');
    }
    if (name === 'Jade Shard' || name === 'Ankh' || name === 'Red Obsidian Shard') {
      const tags = name === 'Jade Shard' ? ['Living', 'Nature'] : ['Demon', 'Undead'];
      for (const e of enemies.filter(e => game.allies.some(a => dist(e, a) <= 1 && (name === 'Ankh' || a.tags.some(t => tags.includes(t)))))) {
        if (name === 'Jade Shard') afflict(e, 'poison', stats.duration);
        else hurt(e, stats.damage, name === 'Ankh' ? 'Holy' : 'Fire');
      }
    }
  }
}
