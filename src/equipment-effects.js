// Equipment events receive the equipped copy so craft ingredients and counters
// stay with that item and survive a saved journey.
export function equipmentEvent(event, game, item, entry, ctx) {
  const name = item.name, desc = item.desc;
  const stats = { ...item.attributes };
  const ingredients = entry.components;
  for (const [component, stat, value] of [['Mithril Ore', 'damage', 9], ['Worldstone Socket', 'radius', 2], ['Broken Stopwatch', 'duration', 3], ['Discarded Homunculi', 'num_summons', 2]]) {
    if (stats[stat]) stats[stat] += ingredients.filter(c => c === component).length * value;
  }
  if (stats.damage) stats.damage += entry.growth || 0;
  const { enemies, visible, spell, target, victim, rng, roll, summon, cast, hurt, dist, heal, act, afflict, pickup } = ctx;
  const species = item.summons?.[0];
  const conjure = (n, pos = game.player, count = stats.num_summons || 1) => {
    for (let i = 0; i < count; i++) {
      const ally = summon(n, pos, { hp: stats.minion_health, damage: stats.minion_damage, range: stats.minion_range, duration: stats.minion_duration });
      if (ally && ingredients.includes("Familiar's Collar") && game.player.hp > 3) { game.player.hp -= 3; ally.soulbound = true; }
    }
  };
  const randomCharge = candidates => {
    const s = roll(candidates.filter(s => game.charges[s.id] < s.maxCharges));
    if (s) game.charges[s.id]++;
  };
  if (event === 'enter') {
    entry.steps = 0;
    if (name === 'Cage of Chimerae') for (const n of item.summons) conjure(n);
    if (['Armor of Nanuk', 'Arbiter Cage', 'Knight Cage', 'Lava Cage'].includes(name)) conjure(species);
    if (name === 'Dwarf Hat' && ctx.spells().length >= 7) conjure(species, game.player, 7);
    if (name === 'Timestriders') for (const e of enemies) afflict(e, 'stun', stats.duration);
    if (name === 'Brisingamen') for (const e of visible) afflict(e, 'berserk', stats.duration);
    if (name === 'Boots of Imminent Doom') for (const e of enemies.filter(e => dist(game.player, e) <= stats.radius)) cast('Seal Fate', e);
    if (name === "Rod of Heaven's Assault") for (const e of visible.filter(e => e.tags.some(tag => ['Demon', 'Undead'].includes(tag)))) cast('Heavenly Blast', e);
    if (name === 'Codex of Chaotic Evolution') ctx.giveUpgrade(roll(ctx.spells().filter(s => s.upgrades.length > s.learnedUpgrades.length)));
    if (ingredients.includes("Odin's Eye")) for (const tag of item.tags) {
      const s = roll(ctx.spells().filter(s => s.tags.includes(tag) && s.tags.includes('Eye') && !s.range));
      if (s) cast(s.name, game.player);
    }
    if (ingredients.includes('Luminous Threads') && item.bonuses.some(line => line.includes('Resist'))) game.player.shields += ctx.mastery('Holy');
  } else if (event === 'clear') {
    if (stats.damage && ingredients.includes('Quipu Saga')) entry.growth = (entry.growth || 0) + 1;
  } else if (event === 'shard') {
    if (name.startsWith('Chalice of ')) {
      const tag = { 'Chalice of Light': 'Holy', 'Chalice of Warp': 'Translocation', 'Chalice of Dragons': 'Dragon', 'Chalice of Iron': 'Metallic' }[name];
      for (const s of ctx.spells().filter(s => s.tags.includes(tag))) game.charges[s.id] = s.maxCharges;
    }
  } else if (event === 'pickup' || event === 'forge') {
    if (event === 'pickup' && name === "Artificer's Mirror" || event === 'forge' && name === "Artificer's Hammer") {
      const used = entry.usedAtRealm === game.realm ? entry.used || [] : [];
      const choices = ingredients.map((c, i) => ({ c, i })).filter(({ c, i }) => ctx.pickupEligible(c) && (event !== 'forge' || !used.includes(i)));
      const chosen = roll(choices);
      if (chosen) { if (event === 'forge') { entry.usedAtRealm = game.realm; entry.used = [...used, chosen.i]; } pickup(chosen.c); }
    }
  } else if (event === 'step') {
    const every = desc.match(/^Every (\d+) steps, (summon|cast) (.+?)(?:\n|$)/);
    if (every && ((entry.steps = (entry.steps || 0) + 1) % Number(every[1]) === 0)) {
      if (every[2] === 'summon' && species) conjure(species); else if (every[2] === 'cast') cast(every[3], game.player);
    }
  } else if (event === 'payHP') {
    if (name === 'Bloodletter Bracers') {
      entry.spent = (entry.spent || 0) + ctx.amount;
      while (entry.spent >= 50) { entry.spent -= 50; randomCharge(ctx.spells().filter(s => s.tags.includes('Blood'))); }
    }
  } else if (event === 'damage') {
    const proc = desc.match(/^When an enemy takes \[(\w+)(?::\w+)?\] damage, it has a (\d+)% chance to be afflicted with \[\d+:duration\] turns? of \[(\w+)\]/i);
    if (proc && ctx.type === proc[1] && rng() * 100 < Number(proc[2])) afflict(victim, proc[3] === 'frozen' ? 'freeze' : proc[3], stats.duration);
    const trigger = desc.match(/^For every (\d+) damage dealt (?:to enemies )?by \[(\w+)(?::\w+)?\] spells.*?, cast (.+?) on a random enemy/);
    if (trigger && ctx.tags.includes(trigger[2])) {
      const threshold = Number(trigger[1]);
      entry.stored = (entry.stored || 0) + ctx.amount;
      while (entry.stored >= threshold) {
        entry.stored -= threshold;
        const e = roll(enemies.filter(e => e.hp > 0));
        if (e) cast(trigger[3], e);
      }
    }
    if (name === 'Disintegrator' && ctx.tags.includes('Sorcery') || name === 'Amulet of Emerald Flame' && ctx.tags.includes('Enchantment')) {
      const threshold = name === 'Disintegrator' ? 40 : 50;
      entry.stored = (entry.stored || 0) + ctx.amount;
      while (entry.stored >= threshold) {
        entry.stored -= threshold;
        if (name === 'Disintegrator') for (const e of enemies) hurt(e, 1, 'Physical');
        else { const e = [...enemies].sort((a, b) => dist(game.player, a) - dist(game.player, b))[0]; if (e) hurt(e, stats.damage, 'Fire'); }
      }
    }
    if (name === 'Pyrophilia Locket' && ctx.type === 'Fire') for (const a of game.allies.filter(a => ctx.see(a, victim))) a.hp = Math.min(a.maxHp, a.hp + Math.floor(ctx.amount / 2));
    if (name === "Conciliator's Claw" && dist(victim, game.player) <= 1) { heal(3); for (const a of game.allies.filter(a => ctx.see(a, game.player))) a.hp = Math.min(a.maxHp, a.hp + 3); }
    if (name === 'Crackledarkener' && ctx.type === 'Dark' || name === 'Cracklevoid' && ctx.type === 'Arcane') for (const e of enemies.filter(e => e !== victim && ctx.see(victim, e) && dist(victim, e) <= stats.radius).slice(0, stats.num_targets)) hurt(e, ctx.amount, 'Lightning');
    if (name === 'Scepter of Sorrows' || name === 'Ghostfire Scepter') {
      const element = name === 'Scepter of Sorrows' ? 'Ice' : 'Fire';
      if (ctx.type === 'Dark' || ctx.type === element) {
        if (entry.turn !== game.turn) { entry.turn = game.turn; entry.hits = {}; }
        if (entry.hits[victim.id] && entry.hits[victim.id] !== ctx.type) { conjure(species, victim); delete entry.hits[victim.id]; }
        else entry.hits[victim.id] = ctx.type;
      }
    }
  } else if (event === 'allyHit') {
    if (name === 'Flaming Claw Staff' || name === 'Icy Claw Staff') hurt(victim, Math.floor(ctx.amount / 2), name === 'Flaming Claw Staff' ? 'Fire' : 'Ice');
  } else if (event === 'allyDeath') {
    if (name === 'Cannibal Mask') {
      const a = roll(game.allies.filter(a => a.hp > 0));
      if (a) { const n = Math.floor(victim.maxHp / 2); a.maxHp += n; a.hp += n; }
    }
    if (name === 'Icy Vengeance Icon') for (const e of enemies.filter(e => dist(e, victim) <= stats.radius).slice(0, stats.num_targets)) hurt(e, Math.floor(victim.maxHp / 2), 'Ice');
  } else if (event === 'kill') {
    const type = victim.lastDamageType;
    const sigil = desc.match(/^For every \[(\w+):\w+\] unit that dies, one of your \[(\w+)\] spells regains/);
    if (sigil && victim.tags?.includes(sigil[1])) randomCharge(ctx.spells().filter(s => s.tags.includes(sigil[2])));
    if (name === 'Orb of Infinite Slaughter') {
      if (entry.explosionTurn !== game.turn) { entry.explosionTurn = game.turn; entry.explosions = 0; }
      if (entry.explosions++ >= 1000) return;
      const amount = ctx.mastery('Blood');
      for (const e of enemies.filter(e => dist(e, victim) <= 1)) heal(hurt(e, amount, 'Dark'));
    }
    if (name === 'Robe of Storms' && ['Ice', 'Lightning'].includes(type)) game.player.shields++;
    if (name === 'Spawning Venom' && type === 'Poison') conjure('Giant Spider', victim);
    if (name === 'Soul Harvester' && rng() < .1) for (const s of ctx.spells().filter(s => s.tags.some(t => ['Holy', 'Dark'].includes(t)))) game.charges[s.id] = Math.min(s.maxCharges, game.charges[s.id] + 1);
    if (name.endsWith(' Links') && desc.split('damage,')[0].includes('[' + type)) {
      const other = roll(enemies.filter(e => dist(e, victim) <= stats.radius && ctx.see(e, victim)));
      if (other) hurt(other, stats.damage, type);
    }
  } else if (event === 'cast') {
    const tag = t => spell.tags.includes(t);
    if (name === 'Pulse Accelerator' && tag('Blood')) {
      game.buffs = game.buffs.filter(b => b.name !== name);
      game.buffs.push({ name, duration: stats.duration, quickstep: true, quickcastAll: true });
    }
    if (name.endsWith(' Frenzy Mask') && tag(item.tags[0])) game.buffs.push({ name, type: 'bonus', tag: item.tags[0], stat: 'damage', amount: 2, duration: stats.duration });
    if (name === 'Echo Staff') {
      if (entry.last === spell.id && tag('Sorcery')) randomCharge([spell]);
      entry.last = spell.id;
    }
    if (name === 'Eye Helm' && tag('Eye') && game.player.shields < 20) game.player.shields = Math.min(20, game.player.shields + 3);
    if (name === 'Blood Shield' && game.player.hp > 3) { game.player.hp -= 3; game.player.shields++; }
    if (name === "Titan's Bane" && tag('Sorcery') && victim?.radius) cast(spell.name, target);
    if (name === 'Keraunos' && tag('Lightning') && victim) for (let i = 0; i < stats.num_targets; i++) cast(spell.name, target);
    if (name === 'Horn of the Wild Hunt' && tag('Nature')) for (const a of [...game.allies].filter(a => a.tags.some(t => ['Nature', 'Living'].includes(t)))) act(a);
    if (name === 'Fae Thorn Staff' && (tag('Arcane') || tag('Nature'))) conjure(species, target);
    if (name === 'Treelord Staff' && tag('Nature') && spell.level >= 3 || name === 'Aetherlord Staff' && tag('Arcane') && spell.level >= 4) conjure(species, target);
    if (name === 'Stormbrood Trickshoes' && tag('Translocation')) conjure(species, ctx.origin);
    if (name === 'Wild Healing Staff' && tag('Nature')) { heal(5); for (const a of game.allies.filter(a => a.tags.includes('Living'))) a.hp = Math.min(a.maxHp, a.hp + 5); }
    if (name === 'Chill Staff' && tag('Ice')) {
      const e = enemies.filter(e => !e.statuses.freeze).sort((a, b) => dist(a, target) - dist(b, target))[0];
      if (e) afflict(e, 'freeze', stats.duration);
    }
    if (name === 'Chelation Claw' && (tag('Blood') || tag('Metallic')) && victim) afflict(victim, 'bleed', stats.duration);
    if (name === 'Razoreye' && tag('Metallic')) for (const e of visible.slice(0, spell.level)) hurt(e, stats.damage, 'Physical');
    if (name === 'Icy Chill Mask' && tag('Ice') || name === 'Searing Eye Stone' && tag('Fire')) for (const e of enemies.filter(e => ctx.see(e, target))) hurt(e, 1, name === 'Icy Chill Mask' ? 'Ice' : 'Fire');
    if (ingredients.includes('Phoenix Feather')) for (const t of ['Holy', 'Fire']) if (tag(t) && item.tags.includes(t)) heal(1);
    if (ingredients.includes('Stormsong Note')) for (const t of ['Ice', 'Lightning']) if (tag(t) && item.tags.includes(t)) for (let i = 0; i < spell.level; i++) ctx.weather(t === 'Ice' ? 'blizzard' : 'storm');
    if (name === "Artificer's Abacus" && game.realmTurn < game.realm) {
      entry.beads = (entry.beads || 0) + (spell.level % 2 ? -spell.level : spell.level);
      if (entry.beads === game.realm) { entry.beads = 0; const c = roll(ingredients.filter(ctx.pickupEligible)); if (c) pickup(c); }
    }
  } else if (event === 'turn' && enemies.length) {
    if (name === 'Explosive Spore Manual') cast('Combust Poison', game.player);
    if (name === 'Fanged Amulet') { const e = roll(enemies.filter(e => dist(game.player, e) <= 1)); if (e) heal(hurt(e, ctx.mastery('Blood'), 'Physical')); }
    if (name === 'Shattering Frost Manual') cast('Shatter', game.player);
    if (name === 'Crown of Ragnarok' && game.realmTurn === 9) for (let i = 0; i < stats.num_targets; i++) for (const s of ['Earthquake', 'Flame Burst', 'Storm Burst']) cast(s, game.player);
    if (name === 'Earthmeld Boots' && game.movedAt !== game.turn) heal(3);
    if (['Earthtroll Armor', 'Stormtroll Armor'].includes(name)) heal(5);
    if (name === 'Minion Regeneration Amulet' || name === 'Amulet of Undeath') for (const a of game.allies.filter(a => name !== 'Amulet of Undeath' || a.tags.includes('Undead'))) a.hp = Math.min(a.maxHp, a.hp + (name === 'Amulet of Undeath' ? 3 : 2));
    if (name === "Archangel's Halo") for (const a of game.allies.filter(a => a.tags.includes('Holy') && dist(game.player, a) <= stats.radius)) act(a);
    const periodic = { 'Dowsing Spark': ['soaked', 'Lightning'], 'Hemlock Needle': ['bleed', 'Dark'], 'Fae Toxin Pouch': ['poison', 'Arcane'], 'Icy Cruciform': ['freeze', 'Holy'], 'Nightmare Hexbag': ['sleep', 'Dark'], 'The Boiler': ['soaked', 'Fire'] }[name];
    if (periodic) {
      const pool = enemies.filter(e => e.statuses[periodic[0]] > 0);
      for (let i = 0; pool.length && i < (stats.num_targets || Infinity); i++) hurt(pool.splice(Math.floor(rng() * pool.length), 1)[0], stats.damage, periodic[1]);
    }
    if (name === 'Tundra Mantle') for (const e of enemies.filter(e => dist(e, game.player) <= stats.radius && e.statuses.soaked)) afflict(e, 'freeze', stats.duration);
    if (name === 'Stone Mask' && visible.length) afflict(roll(visible), 'petrify', stats.duration);
    if (['Rain Beacon', 'Storm Beacon', 'Blizzard Beacon'].includes(name)) {
      const count = Math.floor(rng() * (1 + ctx.mastery({ 'Rain Beacon': 'Nature', 'Storm Beacon': 'Lightning', 'Blizzard Beacon': 'Ice' }[name])));
      for (let i = 0; i < count; i++) ctx.weather(name.split(' ')[0].toLowerCase());
    }
    if (name === 'Arcane Accelerator') for (const a of game.allies.filter(a => ctx.see(a, game.player))) for (const k in a.cooldowns) a.cooldowns[k]--;
    if (name === 'Chaos Scale Crown' || name === 'Moon Crown' || name === 'Crown of Bony Fingers') {
      const [tag, s] = { 'Chaos Scale Crown': ['Dragon', 'Annihilate'], 'Moon Crown': ['Holy', 'Void Beam'], 'Crown of Bony Fingers': ['Undead', 'Touch of Death'] }[name];
      const a = roll(game.allies.filter(a => a.tags.includes(tag)));
      const e = a && roll(enemies.filter(e => ctx.see(a, e)));
      if (e) cast(s, e);
    }
    if (name === 'Hex Specialist\'s Ring') for (const e of enemies) hurt(e, Object.values(e.statuses).filter(n => n > 0).length * stats.damage, 'Arcane');
    if (name === 'Hellfire Mantle') for (const e of enemies.filter(e => dist(game.player, e) <= stats.radius)) hurt(e, stats.damage, 'Fire');
    if (name === 'Jade Shard' || name === 'Ankh' || name === 'Red Obsidian Shard') {
      const tags = name === 'Jade Shard' ? ['Living', 'Nature'] : ['Demon', 'Undead'];
      for (const e of enemies.filter(e => game.allies.some(a => dist(e, a) <= 1 && (name === 'Ankh' || a.tags.some(t => tags.includes(t)))))) {
        if (name === 'Jade Shard') afflict(e, 'poison', stats.duration); else hurt(e, stats.damage, name === 'Ankh' ? 'Holy' : 'Fire');
      }
    }
  }
}
