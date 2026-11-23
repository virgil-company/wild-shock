// Rules whose targets or timing differ from a standard beam, burst or summon.
function connected(origin, units, distance) {
  if (!origin) return [];
  const group = [origin], seen = new Set(group);
  for (let i = 0; i < group.length; i++) for (const next of units) {
    if (!seen.has(next) && distance(group[i], next) <= 1) { group.push(next); seen.add(next); }
  }
  return group;
}

export function resolveSpellEffect(game, spell, target, api) {
  const { name, damage, damageTypes, duration, radius, stats, upgradeNames } = spell;
  const { hurt, hurtAlly, summon, cast, see, dist, heal, roll, act, openNear, cells, floor, moveUnit } = api;
  const visible = game.enemies.filter(e => e.hp > 0 && see(game.player, e));
  const living = game.enemies.filter(e => e.hp > 0);
  const inBurst = living.filter(e => dist(e, target) <= radius);
  const victim = api.enemy, ally = api.ally;
  const has = up => upgradeNames.includes(up);
  const buff = (type, details = {}) => {
    game.buffs = game.buffs.filter(b => !(b.name === name && b.type === type && b.stat === details.stat && b.damageType === details.damageType));
    game.buffs.push({ name, type, duration: duration || -1, ...details });
  };
  const ailment = (e, status, turns = duration) => { e.statuses[status] = Math.max(turns, e.statuses[status] || 0); };
  const bonus = (stat, amount, extra = {}) => buff('bonus', { stat, amount, ...extra });
  const resist = (damageType, amount) => buff('resist', { damageType, amount });
  switch (name) {
    case 'Freeze': {
      const group = has('Mass Freeze') ? connected(victim, living, dist) : victim ? [victim] : [];
      for (const e of group) {
        ailment(e, 'freeze');
        if (has('Refreezing')) ailment(e, 'refreezing');
      }
      return group.length;
    }
    case 'Petrify': {
      if (!victim) return 0;
      ailment(victim, has('Glassify') ? 'glassed' : 'petrify');
      if (has('Arcane Conductivity')) (victim.conductivity ??= []).push(duration);
      if (has('Rocky Servitude')) victim.golemDamage = stats.minion_damage;
      if (has('Panic')) for (const e of living.filter(e => e !== victim && see(victim, e))) ailment(e, 'fear', 2);
      return 1;
    }
    case 'Poison Sting': {
      const targets = new Set(victim ? [victim] : []);
      if (has('Stinger Barrage')) for (const e of inBurst.filter(e => e.statuses.poison)) targets.add(e);
      if (has('Silk Shot')) {
        for (const p of cells(game.player, spell.range).filter(p => api.onSegment(game.player, target, p))) api.cloud(p, 'web', 3);
        for (const e of living.filter(e => api.onSegment(game.player, target, e))) ailment(e, 'immobilized', 3);
      }
      for (const e of targets) {
        hurt(e, damage, 'Physical'); ailment(e, 'poison');
        if (has('Acidity')) ailment(e, 'acidified');
      }
      return targets.size;
    }
    case 'Blood Bullet': {
      const path = [...living, ...game.allies].filter(e => api.onSegment(game.player, target, e)).sort((a,b) => dist(game.player,a) - dist(game.player,b));
      let hits = 0;
      for (let i = 0; i < Math.max(1, stats.num_targets); i++) for (const e of path.filter(e => e.hp > 0)) {
        for (const type of damageTypes) (game.allies.includes(e) ? hurtAlly : hurt)(e, damage, type);
        hits++;
        if (!has('Blessed Blood') || !e.tags.some(t => ['Dark','Demon','Undead'].includes(t))) break;
      }
      return hits;
    }
    case 'Dread Lash': {
      const targets = has('Web of Fear') && !dist(game.player,target) ? living.filter(e => e.statuses.fear) : victim ? [victim] : [];
      for (const e of targets) {
        for (const t of damageTypes) hurt(e, damage, t);
        ailment(e, 'fear');
        if (has('Razor Lash')) ailment(e, 'bleed');
        for (let i = 0; i < spell.range && dist(game.player,e) > 1; i++) {
          const p = { x: e.x + Math.sign(game.player.x - e.x), y: e.y + Math.sign(game.player.y - e.y) };
          if (!api.free(p)) break;
          moveUnit(e,p);
        }
        if (has('Dreadful Secret') && dist(e,game.player) === 1) cast('Seal Fate',e);
      }
      return targets.length;
    }
    case 'Cantrip Cascade': {
      const dx = target.x - game.player.x, dy = target.y - game.player.y;
      const targets = has('Cantrip Burst') ? inBurst : visible.filter(e => {
        const ex = e.x - game.player.x, ey = e.y - game.player.y;
        return dist(game.player,e) <= spell.range && ex * dx + ey * dy >= .7 * Math.hypot(dx,dy) * Math.hypot(ex,ey);
      });
      const sorceries = api.spells().filter(s => s.tags.includes('Sorcery') && s.range > 0 && s.id !== spell.id);
      const cantrips = sorceries.filter(s => s.level === 1), triple = has('Triple Tap') && roll(cantrips);
      for (const e of targets) {
        for (const s of cantrips) for (let i = 0; i < (s === triple ? 3 : 1) && e.hp > 0; i++) cast(s.name, e);
        const extra = has('Evocation Amalgamation') && roll(sorceries.filter(s => s.level === 2));
        if (extra && e.hp > 0) cast(extra.name,e);
      }
      return targets.length;
    }
    case 'Prison of Thorns': {
      const group = connected(victim, living, dist);
      const ring = new Map();
      for (const e of group) for (const p of cells(e,1)) if (api.free(p)) ring.set(p.x + ',' + p.y, p);
      for (const p of ring.values()) summon(has('Rot Growth') ? 'Rot Sprouts' : 'Fae Thorn', p, {
        hp: stats.minion_health, damage: stats.minion_damage, duration: stats.minion_duration, range: stats.minion_range,
      });
      return group.length;
    }
    case 'Slimeshot': {
      const sacrificed = new Set(ally?.tags.includes('Slime') ? [ally] : []);
      if (has('Slime Chucker')) for (const a of game.allies.filter(a => a.tags.includes('Slime') && dist(a,game.player) <= 1)) sacrificed.add(a);
      let power = damage;
      for (const a of sacrificed) { power += a.maxHp; a.hp = 0; }
      for (const e of inBurst) {
        for (const t of damageTypes) hurt(e, power, t);
        if (!e.tags.includes('Slime')) {
          ailment(e, 'soaked');
          if (has('Slime Rust')) e.slimeRust = (e.slimeRust || 0) + 10;
        }
        if (has('Slimification Shot')) cast('Slimify', e);
      }
      if (has('Storm Transmutation')) {
        const forms = { storm: 'Electric Slime', blizzard: 'Ice Slime', rain: 'Green Slime' };
        for (const c of game.clouds.filter(c => forms[c.type] && dist(c,target) <= radius)) {
          game.clouds = game.clouds.filter(other => other !== c); summon(forms[c.type], c);
        }
      }
      return inBurst.length;
    }
    case 'Fireball': case 'Iceball': {
      const fire = name === 'Fireball';
      const cloud = game.clouds.find(c => c.type === 'blizzard' && !dist(target, c));
      const combust = !fire && has('Cloud Combustion') && cloud;
      if (combust) game.clouds = game.clouds.filter(c => c !== cloud);
      const r = radius + (has('Shaped Blast') ? Math.floor(dist(game.player, target) / 4) : 0) + (combust ? 2 : 0);
      const targets = living.filter(e => dist(e, target) <= r);
      let hits = 0;
      for (const e of targets) {
        const type = has('Chaos Ball') ? ['Fire', 'Lightning', 'Physical'].sort((a, b) => (e.resistances[a] || 0) - (e.resistances[b] || 0))[0] : fire ? 'Fire' : 'Ice';
        if (has('Ice Crush') && e.statuses.freeze) hurt(e, damage, 'Physical');
        if (hurt(e, damage * (combust ? 2 : 1), type)) hits++;
        if (!fire) { if (has('Subzero Ice')) cast('Freeze', e); else ailment(e, 'freeze'); }
        if (has('Ash Ball')) { ailment(e, 'blind'); ailment(e, 'poison'); }
        if (has('Meteor') && e === victim) { hurt(e, damage, 'Physical'); ailment(e, 'stun'); }
      }
      if (has('Fae Ball')) for (let i = 0; i < Math.floor(hits / 3); i++) summon('Ice Faery', target, { hp: stats.minion_health, damage: stats.minion_damage, range: stats.minion_range });
      return targets.length;
    }
    case 'Ruinous Offering': {
      const candidates = api.spells().filter(s => s.id !== spell.id && s.tags.some(t => t === 'Chaos' || t === 'Blood'));
      const chosen = roll(candidates);
      if (chosen) for (const [stat, n] of Object.entries(chosen.stats)) {
        if (n > 0 && stat !== 'hp_cost') game.buffs.push({ name, type: 'bonus', spellId: chosen.rw3Id, stat, percent: true, amount: spell.hpCost, duration });
      }
      return chosen ? 1 : 0;
    }
    case 'Wheel of Death': if (living.length) hurt(roll(living), damage, 'Dark'); return Math.min(living.length, 1);
    case 'Blazerip': case 'Chill Wind': case 'Soul Wind': case 'Wall of Flame': {
      const horizontal = Math.abs(target.y - game.player.y) >= Math.abs(target.x - game.player.x);
      const width = name === 'Chill Wind' || name === 'Soul Wind' ? 1 : 0;
      const r = name === 'Wall of Flame' || name === 'Blazerip' ? radius : 30;
      const affected = p => Math.abs(horizontal ? p.y - target.y : p.x - target.x) <= width && Math.abs(horizontal ? p.x - target.x : p.y - target.y) <= r;
      if (name === 'Wall of Flame') {
        game.clouds = game.clouds.filter(c => !c.wallOfFlame);
        for (const p of cells(target, r).filter(affected)) { const c = api.cloud(p, 'fire', duration, damage); if (c) c.wallOfFlame = true; }
      } else {
        if (name === 'Blazerip') for (const p of cells(target, radius).filter(affected)) if (game.tiles[p.y][p.x] === 1) floor(p);
        for (const e of living.filter(affected)) {
          const types = name === 'Soul Wind' ? [e.tags.some(t => ['Dark', 'Demon', 'Undead'].includes(t)) ? 'Holy' : 'Dark'] : damageTypes;
          for (const t of types) hurt(e, damage, t);
          if (name === 'Chill Wind') ailment(e, 'freeze');
          if (name === 'Soul Wind' && e.tags.includes('Living')) summon('Ghost', e);
        }
      }
      return living.filter(affected).length;
    }
    case 'Shrapnel Blast': {
      if (game.tiles[target.y][target.x] !== 1) return 0;
      floor(target);
      for (const e of living.filter(e => dist(target, e) <= 1)) hurt(e, damage, 'Fire');
      const tiles = cells(target, radius);
      for (let i = 0; i < stats.num_targets; i++) {
        const tile = roll(tiles), e = living.find(e => !dist(tile, e));
        if (e) hurt(e, damage, 'Physical');
      }
      return inBurst.length;
    }
    case 'Chain Lightning': case 'Bouncing Slimeball': {
      const visited = new Set();
      let prev = game.player, e = victim;
      const chain = name === 'Chain Lightning', limit = chain ? living.length : stats.num_targets;
      while (e && visited.size < limit) {
        if (chain) for (const other of living.filter(other => api.onSegment(prev, e, other))) hurt(other, damage, 'Lightning');
        else hurt(e, limit - visited.size, 'Physical');
        visited.add(e); prev = e;
        e = roll(living.filter(other => other.hp > 0 && !visited.has(other) && (!chain || dist(prev, other) <= spell.range) && (!spell.requiresLos || see(prev, other))));
      }
      if (!chain && visited.size) summon(roll(['Green Slime', 'Ice Slime', 'Red Slime', 'Void Slime']), prev);
      return visited.size;
    }
    case 'Moon Glaive': {
      for (const e of living.filter(e => api.onSegment(game.player, target, e))) for (const t of damageTypes) hurt(e, damage, t);
      game.buffs.push({ name, type: 'returnBeam', from: target, to: { x: game.player.x, y: game.player.y }, damage, types: damageTypes, duration: 2 });
      return living.filter(e => api.onSegment(game.player, target, e)).length;
    }
    case 'Ion Tentacles': buff('tentacles', { base: stats.num_targets, total: duration, damage }); return 0;
    case 'Faehaunt Garden': buff('garden', { stored: 0, threshold: stats.minion_health, minionDuration: stats.minion_duration }); return 0;
    case 'Magnetize':
      if (victim || ally) game.buffs.push({ name, type: 'magnet', targetId: (victim || ally).id, radius, damage, duration });
      return victim || ally ? 1 : 0;
    case 'Litany of Curses': {
      const sequence = ['poison', 'bleed', 'necrosis', 'berserk', 'bleed', 'silence'];
      const step = game.channel?.spellId === spell.id ? game.channel.totalTurns - game.channel.turnsLeft : 0;
      for (const e of living) for (const st of sequence.slice(0, step + 1)) e.statuses[st] = (e.statuses[st] || 0) + duration;
      return living.length;
    }
    case 'Ritual of the Opening Eye':
      for (const b of game.buffs.filter(b => b.type === 'eye')) for (let i = 0; i < stats.num_targets && visible.length; i++) {
        const e = roll(visible); hurt(e, b.damage, b.damageType); if (b.status) ailment(e, b.status, 2);
      }
      return visible.length;
    case 'Ritual of Flying Daggers': game.daggers = (game.daggers || 0) + stats.num_targets; return 0;
    case 'Mystic Power': bonus('damage', 7); return 0;
    case 'Mystic Vision': bonus('range', has('Superior Sight') ? 10 : 5, { noLos: has('Truesight') }); return 0;
    case 'Permanence': bonus('minion_duration', 5); bonus('duration', 5); return 0;
    case 'Ride Drake':
      buff('mount', { flying: true, quickstep: true }); game.player.shields += stats.shields;
      if (has('Armored Drake')) resist('Physical', 50);
      if (has('Flight of the Dragons') && api.manual) for (const s of api.spells().filter(s => s.tags.includes('Dragon') && s.tags.includes('Conjuration'))) cast(s.name, game.player);
      return 0;
    case 'Demon Form': buff('demon', { flying: true }); for (const [t, n] of Object.entries({ Dark: 100, Fire: 50, Physical: 50, Lightning: 50 })) resist(t, n); return 0;
    case 'Lightning Form': buff('lightningForm'); resist('Lightning', 100); resist('Physical', 100); return 0;
    case 'Purity': game.player.statuses = {}; buff('purity'); return 0;
    case 'Multicast': case 'Death Cleave': case 'Pain Mirror': case 'The Restless Dead': case 'Flame Gate':
      buff(name); return 0;
    case 'Searing Seal': buff('searing', { stored: 0 }); return 0;
    case 'Carnival of Pain': buff('carnival', { targets: stats.num_targets }); return 0;
    case 'Watcher Form': buff('watcher'); for (const t of ['Physical', 'Lightning', 'Poison', 'Fire']) resist(t, t === 'Fire' ? 75 : 100); return 0;
    case 'Slime Form': buff('produce', { species: 'Green Slime', count: 1 }); resist('Physical', 50); resist('Poison', 100); return 0;
    case 'Imp Swarm': buff('produce', { species: 'Imp', count: stats.num_summons }); return 0;
    case 'Arcane Warding': buff('shields', { amount: stats.shields, reflect: true }); return 0;
    case 'Boiling Blood': buff('boiling', { amount: has('Escalating Fury') ? 8 : 6 }); return 0;
    case 'Darkness': buff('darkness'); return 0;
    case 'Dispersion Field': buff('dispersion', { radius, targets: stats.num_targets }); return 0;
    case 'Petrification Aura': buff('petrification', { radius, targets: stats.num_targets, turns: duration }); return 0;
    case 'Lightning Halo': buff('aura', { radius, damage, damageType: 'Lightning', ring: true }); return 0;
    case 'Nightmare Aura': buff('aura', { radius, damage: 2, damageType: 'Dark' }); return 0;
    case 'Siphon Shields':
      for (const e of visible) { const n = Math.min(e.shields, stats.shields); game.player.shields += n; e.shields -= n; }
      return visible.length;
    case 'Twilight Gaze':
      for (const e of visible) ailment(e, 'twilight', duration);
      return visible.length;
    case 'Ironize':
      for (const a of game.allies) { a.statuses.ironize = duration; if (!a.tags.includes('Metallic')) { a.tags.push('Metallic'); a.ironTag = true; } }
      return game.allies.length;
    case 'Mass Calcification':
      for (const a of [...game.allies].filter(a => !a.tags.includes('Undead'))) { a.hp = 0; summon('Bone Shambler', a, { hp: a.maxHp, damage: Math.max(1, Math.floor(a.maxHp / 4)) }); }
      return game.allies.length;
    case 'Black Hole':
      for (const e of living.filter(e => see(target, e))) { const dest = openNear(target, 5, e.flying); if (dest) moveUnit(e, dest); }
      return living.length;
    case 'Combust Poison': {
      const affected = living.filter(e => e.statuses.poison > 0);
      for (const e of affected) { const n = e.statuses.poison; delete e.statuses.poison; for (const other of living.filter(other => dist(e, other) <= radius)) hurt(other, n, 'Fire'); }
      return affected.length;
    }
    case 'Blinding Light': case 'Rot Gaze':
      for (const e of visible) {
        ailment(e, name === 'Rot Gaze' ? 'poison' : 'blind');
        if (name === 'Rot Gaze' || e.tags.some(t => ['Undead', 'Demon'].includes(t))) hurt(e, damage, name === 'Rot Gaze' ? 'Dark' : 'Holy');
      }
      return visible.length;
    case "Heaven's Wrath": case 'Hatebolts': case 'Ritual of Revelation': {
      const pool = name === 'Ritual of Revelation' ? [...visible] : [...living];
      const count = Math.min(stats.num_targets, pool.length);
      pool.sort((a, b) => b.hp - a.hp);
      for (let i = 0; i < count; i++) {
        const e = name === "Heaven's Wrath" ? pool.shift() : pool.splice(pool.indexOf(roll(pool)), 1)[0];
        if (name === 'Ritual of Revelation') cast('Holy Fire', e);
        else for (const type of name === 'Hatebolts' ? [roll(damageTypes)] : damageTypes) hurt(e, damage, type);
      }
      return count;
    }
    case 'Invoke Savagery': case 'Vampiric Gaze':
      for (const a of game.allies) {
        const melee = name === 'Invoke Savagery';
        if (melee && !a.tags.includes('Living')) continue;
        const e = roll(living.filter(e => e.hp > 0 && see(a, e) && (!melee || dist(a, e) <= 1)));
        if (!e) continue;
        const dealt = hurt(e, damage, melee ? 'Physical' : 'Dark');
        if (melee) ailment(e, 'stun'); else a.hp = Math.min(a.maxHp, a.hp + dealt);
      }
      return game.allies.length;
    case 'Devour Flesh': if (ally) { heal(ally.hp); ally.hp = 0; } return ally ? 1 : 0;
    case 'Suspend Mortality': if (ally) ally.lives = (ally.lives || 0) + 1; return ally ? 1 : 0;
    case 'Vampiricism': if (ally) { ally.vampiric = true; ally.flying = true; } return ally ? 1 : 0;
    case 'Temporal Transfusion': if (ally && has('Chrono Boost')) ally.cooldowns = {}; if (ally) for (let i = 0; i < (has('Temporal Mastery') ? 5 : 3); i++) act(ally); return ally ? 1 : 0;
    case 'Armageddon Blade': if (ally) ally.armageddon = true; return ally ? 1 : 0;
    case 'Soul Tax':
      if (victim) for (const t of ['Holy', 'Dark']) heal(hurt(victim, Math.floor(victim.hp / 3), t));
      return victim ? 1 : 0;
    case 'Bone Barrage':
      if (victim) for (const a of game.allies.filter(a => see(a, target))) { const n = Math.floor(a.hp / 2); hurtAlly(a, n, 'Physical'); hurt(victim, n, 'Physical'); }
      return victim ? 1 : 0;
    case 'Essence Flux':
      for (const e of [...inBurst, ...game.allies.filter(a => dist(a, target) <= radius)]) {
        for (const [a, b] of [['Ice', 'Fire'], ['Dark', 'Holy'], ['Physical', 'Lightning'], ['Poison', 'Arcane']]) {
          [e.resistances[a], e.resistances[b]] = [e.resistances[b] || 0, e.resistances[a] || 0];
        }
      }
      return inBurst.length;
    case 'Seal Fate': case 'Mercurize': case 'Slimify': case 'Death Chill': case 'Scourge': case 'Shadow Hex': case 'Sanction': case 'Pyrostatic Curse': {
      const targets = ['Shadow Hex', 'Pyrostatic Curse'].includes(name) ? inBurst : victim ? [victim] : [];
      for (const e of targets) {
        e.curses ??= {};
        e.curses[name] = { duration: name === 'Seal Fate' ? 4 : duration || -1, damage, radius, targets: stats.num_targets };
        if (name === 'Pyrostatic Curse' && has('Resistance Melting')) ailment(e, 'pyrostatic', duration);
        if (name === 'Scourge') ailment(e, 'stun');
      }
      return targets.length;
    }
    case 'Earthquake': case 'Stonewake':
      for (const p of cells(target, radius)) {
        if (name === 'Earthquake' && !roll([true, false])) continue;
        if (game.tiles[p.y][p.x] === 1) { floor(p); if (name === 'Stonewake') summon('Golem', p, { duration: stats.minion_duration }); }
        if (name === 'Earthquake') for (const e of inBurst.filter(e => e.x === p.x && e.y === p.y)) hurt(e, damage, 'Physical');
      }
      return inBurst.length;
    case 'Thunder Strike':
      if (victim) hurt(victim, damage, 'Lightning');
      for (const e of inBurst) ailment(e, 'stun');
      return inBurst.length;
    case 'Pillar of Fire':
      for (const e of inBurst) hurt(e, damage * (victim === e ? 2 : 1), 'Fire');
      return inBurst.length;
    case 'Drain Pulse': case 'Bloodshift':
      for (const e of inBurst) for (const type of damageTypes) heal(Math.floor(hurt(e, damage, type) / 2));
      return inBurst.length;
    case 'Holy Fire': case 'Blood Meridian': {
      let hits = 0;
      for (const e of living) {
        if (name === 'Holy Fire' && (e.x === target.x || e.y === target.y)) {
          if (e.x === target.x) hurt(e, damage, 'Fire');
          if (e.y === target.y) hurt(e, damage, 'Holy');
          if (e.tags.some(t => ['Demon', 'Undead'].includes(t))) ailment(e, 'stun');
        } else if (name === 'Blood Meridian') {
          if (e.x === target.x) { hurt(e, damage, 'Physical'); ailment(e, 'bleed'); }
          else ailment(e, e.x < target.x ? 'sleep' : 'berserk');
        } else continue;
        hits++;
      }
      return hits;
    }
    case 'Ghostball':
      for (const e of inBurst) hurt(e, damage, 'Dark');
      for (const p of cells(target, radius)) if (api.free(p)) summon('Ghost', p, { duration: stats.minion_duration, damage: stats.minion_damage });
      return inBurst.length;
    case 'Devour Mind':
      if (!victim) return 0;
      for (const type of damageTypes) hurt(victim, damage, type);
      if (victim.hp < victim.maxHp / 2) for (const type of damageTypes) hurt(victim, damage, type);
      if (!victim.hp) summon('Rotting Zombie', victim, { damage: stats.minion_damage });
      return 1;
    case 'Heavenly Blast': {
      const affected = e => dist(target, e) <= radius || api.onSegment(game.player, target, e);
      for (const e of living.filter(affected)) hurt(e, damage * (has('Judgement') && e.hp === e.maxHp ? 3 : 1), 'Holy');
      for (const a of game.allies.filter(affected)) { a.hp = Math.min(a.maxHp, a.hp + damage); if (has('Shield')) a.shields += 3; }
      if (victim && has('Immolating Blast')) cast('Immolate', victim);
      return living.filter(affected).length;
    }
    case 'Storm Burst':
      for (const e of inBurst) { const type = roll(['Ice', 'Lightning']); hurt(e, damage, type); ailment(e, type === 'Ice' ? 'freeze' : 'stun'); }
      return inBurst.length;
    case 'Rain of Fire':
      for (let i = 0; i < stats.num_targets; i++) cast('Fireball', roll(cells(target, radius)));
      return inBurst.length;
    case 'Rain of Thunderbolts': {
      const clouds = game.clouds.filter(c => c.type === 'storm' && !game.allies.some(a => !dist(a, c)) && dist(game.player, c) > 0);
      for (const c of clouds.slice(0, stats.num_targets)) cast('Thunder Strike', c);
      return Math.min(clouds.length, stats.num_targets);
    }
    default: return null;
  }
}
