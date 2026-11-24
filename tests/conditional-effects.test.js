import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame, generateRealm, availableSpells, cast, move, wait,
  learnRw3Spell, learnRw3Upgrade, deploy, restore, serialize, SIZE, tagMastery,
} from '../src/engine.js';
import { spellByName, effectiveRw3Spell } from '../src/rw3.js';
import { units, unitStats } from '../src/bestiary.js';

function arena(mode = 'rw3') {
  const game = createGame(31, { mode });
  game.tiles = Array.from({ length: SIZE }, (_, y) => Array.from({ length: SIZE }, (_, x) => Number(!x || !y || x === SIZE - 1 || y === SIZE - 1)));
  game.enemies = []; game.allies = []; game.items = []; game.clouds = []; game.buffs = [];
  game.points = 20000;
  game.player.x = 3; game.player.y = 11;
  game.player.shields = 0;
  game.player.hp = 500; game.bonusMaxHp = 445;
  game.deploying = false;
  return game;
}

function addEnemy(game, x, y, opts = {}) {
  const base = opts.species ? unitStats(units.get(opts.species)) : unitStats(units.get('Goblin'));
  const e = {
    ...base,
    id: 1000 + game.enemies.length + (game._testSeq = (game._testSeq || 0) + 1),
    x, y, school: 1,
    hp: opts.hp ?? 600, maxHp: opts.maxHp ?? opts.hp ?? 600,
    stationary: opts.stationary ?? true,
    ...opts,
  };
  game.enemies.push(e);
  return e;
}

function addAlly(game, x, y, species, opts = {}) {
  const base = unitStats(units.get(species));
  const a = {
    ...base,
    id: `ally-test-${(game._testSeq = (game._testSeq || 0) + 1)}`,
    x, y, duration: 0,
    ...opts,
  };
  game.allies.push(a);
  return a;
}

function learn(game, name, upgrades = []) {
  const s = spellByName.get(name);
  if (!availableSpells(game).some(e => e.rw3Id === s.id)) assert.ok(learnRw3Spell(game, s.id), name);
  for (const up of upgrades) {
    const found = s.upgrades.find(u => u.name === up);
    assert.ok(found, `${name} -> ${up}`);
    assert.ok(learnRw3Upgrade(game, s.id, found.sp_id), `${name} -> ${up}`);
  }
  return 'rw3-' + s.id;
}

// ============================================================================
// PRIORITY 1: Effect attribution & Chaos Scale Crown cast origin
// ============================================================================
test('1. Effect attribution distinguishes caster, target, source, damage type, actual dealt, and manual vs automatic', () => {
  const g = arena();
  const target = addEnemy(g, 6, 11, { hp: 200, maxHp: 200, shields: 1, resistances: {} });
  const missile = learn(g, 'Magic Missile');

  // Blocked by shield: dealt === 0, manual === true
  assert.ok(cast(g, missile, target));
  assert.equal(target.shields, 0);
  assert.equal(target.hp, 200);
  assert.equal(g.lastEffect.casterKind, 'player');
  assert.equal(g.lastEffect.targetId, target.id);
  assert.equal(g.lastEffect.sourceKind, 'spell');
  assert.equal(g.lastEffect.sourceName, 'Magic Missile');
  assert.equal(g.lastEffect.damageType, 'Arcane');
  assert.equal(g.lastEffect.dealt, 0);
  assert.equal(g.lastEffect.manual, true);
  assert.equal(target.lastHit, undefined);

  // Actual damage dealt
  assert.ok(cast(g, missile, target));
  assert.ok(g.lastEffect.dealt > 0);
  assert.equal(target.lastHit.casterKind, 'player');
  assert.equal(target.lastHit.sourceName, 'Magic Missile');
  assert.equal(target.lastHit.manual, true);
});

test('1. Chaos Scale Crown casts Annihilate from the allied dragon (LOS from dragon + kill attribution to dragon)', () => {
  // Positive case: wall blocks wizard -> enemy, but dragon has clear LOS -> enemy
  const g = arena();
  g.equipment.Head = { name: 'Chaos Scale Crown', components: [] };
  g.tiles[11][5] = 1; // Wall directly between wizard (3,11) and enemy (8,11)
  const dragon = addAlly(g, 8, 8, 'Fire Drake', { stationary: true, range: 1, cooldowns: { 'Fire Breath': 999 } });
  const target = addEnemy(g, 8, 11, { hp: 30, maxHp: 30, resistances: {} });
  // Keep a second enemy far behind walls so realm does not clear and wipe allies/enemies before inspection
  g.tiles[5][15] = 1; g.tiles[6][15] = 1; g.tiles[7][15] = 1;
  g.tiles[5][16] = 1; g.tiles[7][16] = 1; g.tiles[5][17] = 1; g.tiles[6][17] = 1; g.tiles[7][17] = 1;
  addEnemy(g, 16, 6, { hp: 500, maxHp: 500 });

  assert.ok(wait(g));
  assert.equal(target.hp, 0);
  assert.equal(target.killedBy.casterKind, 'ally');
  assert.equal(target.killedBy.casterId, dragon.id);
  assert.equal(target.killedBy.sourceKind, 'spell');
  assert.equal(target.killedBy.sourceName, 'Annihilate');
  assert.equal(target.killedBy.sourceEquipment, 'Chaos Scale Crown');
  assert.equal(target.killedBy.manual, false);
  assert.equal(dragon.kills, 1);

  // Negative case: wizard has clear LOS -> enemy, but dragon is walled off from enemy
  const g2 = arena();
  g2.equipment.Head = { name: 'Chaos Scale Crown', components: [] };
  // Box in the dragon at (15, 5) with walls
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (dx || dy) g2.tiles[5 + dy][15 + dx] = 1;
  }
  const walledDragon = addAlly(g2, 15, 5, 'Fire Drake', { stationary: true });
  const visibleToWizard = addEnemy(g2, 7, 11, { hp: 200, maxHp: 200, resistances: {} });
  assert.ok(wait(g2));
  assert.equal(visibleToWizard.hp, 200);
  assert.equal(walledDragon.kills || 0, 0);
});

// ============================================================================
// PRIORITY 2: Equipment counters, turn/realm limits, 2 copies, shields, chain kills
// ============================================================================
test('2. The Lodestar counts Metallic spells and equipment, preserves surplus, ignores shields/non-Metallic, and resets on realm clear', () => {
  const g = arena();
  g.equipment.Weapon = { name: 'The Lodestar', components: [] };
  g.equipment.Head = { name: 'Razoreye', components: [] }; // Metallic equipment dealing 27 Physical per cast level
  const bullet = learn(g, 'Blood Bullet'); // level 1 Metallic Sorcery, 10 Physical
  const missile = learn(g, 'Magic Missile'); // Arcane Sorcery (NOT Metallic)

  const target = addEnemy(g, 6, 11, { hp: 1000, maxHp: 1000, shields: 1, resistances: {} });
  const far = addEnemy(g, 10, 11, { hp: 1000, maxHp: 1000, resistances: {} });

  // Non-Metallic spell does NOT increment The Lodestar
  assert.ok(cast(g, missile, far));
  assert.equal(g.equipment.Weapon.stored || 0, 0);

  // Shield-blocked Metallic spell hit does NOT increment The Lodestar
  const gShield = arena();
  gShield.equipment.Weapon = { name: 'The Lodestar', components: [] };
  const shieldBullet = learn(gShield, 'Blood Bullet');
  const shielded = addEnemy(gShield, 6, 11, { hp: 500, maxHp: 500, shields: 1, resistances: {} });
  assert.ok(cast(gShield, shieldBullet, shielded));
  assert.equal(shielded.shields, 0);
  assert.equal(gShield.equipment.Weapon.stored || 0, 0);

  // Surplus preservation + equipment damage counting:
  // Blood Bullet deals 10 (Metallic spell) + Razoreye deals 27 (Metallic equipment) = 37 per cast!
  // Let's also give Blood Bullet +100 damage via spellBoosts so 1 cast = 110 + 27 = 137 -> triggers 1 Black Hole and keeps 17 surplus!
  const g2 = arena();
  g2.equipment.Weapon = { name: 'The Lodestar', components: [] };
  g2.equipment.Head = { name: 'Razoreye', components: [] };
  const b2 = learn(g2, 'Blood Bullet');
  g2.spellBoosts[b2] = { damage: 100 }; // 10 + 100 = 110 Metallic spell dmg + 27 Metallic equipment dmg = 137
  const a = addEnemy(g2, 6, 11, { hp: 1000, maxHp: 1000, resistances: {} });
  const b = addEnemy(g2, 16, 11, { hp: 1000, maxHp: 1000, resistances: {} });
  const distBefore = Math.abs(a.x - b.x);
  assert.ok(cast(g2, b2, a));
  // Black Hole pulled enemies closer together AND preserved surplus 137 - 120 = 17!
  assert.equal(g2.equipment.Weapon.stored, 17);
  assert.ok(Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) < distBefore);

  // Clearing realm resets The Lodestar stored counter to 0
  a.x = 6; a.y = 11; a.hp = 1; b.hp = 0;
  assert.ok(cast(g2, b2, a));
  assert.equal(g2.enemies.length, 0);
  assert.equal(g2.equipment.Weapon.stored, 0);
});

test('2. Ghostfire Scepter triggers on Fire+Dark same enemy same turn, fails on different enemies / different turns / shielded hits, and stacks with two copies', () => {
  // Negative 1: Fire and Dark on DIFFERENT enemies in the SAME turn -> NEVER triggers
  const gDiff = arena();
  gDiff.equipment.Weapon = { name: 'Ghostfire Scepter', components: [] };
  const fb = learn(gDiff, 'Fireball');
  const db = learn(gDiff, 'Death Bolt');
  gDiff.spellBoosts[fb] = { quickCast: true };
  const e1 = addEnemy(gDiff, 6, 6, { hp: 500, maxHp: 500, resistances: {} });
  const e2 = addEnemy(gDiff, 6, 16, { hp: 500, maxHp: 500, resistances: {} });
  assert.ok(cast(gDiff, fb, e1));
  assert.ok(cast(gDiff, db, e2));
  assert.equal(gDiff.allies.filter(a => a.name === 'Burning Ghost').length, 0);

  // Negative 2: Fire on turn 0 and Dark on turn 1 on SAME enemy -> NEVER triggers
  const gTurns = arena();
  gTurns.equipment.Weapon = { name: 'Ghostfire Scepter', components: [] };
  const fb2 = learn(gTurns, 'Fireball');
  const db2 = learn(gTurns, 'Death Bolt');
  const eSame = addEnemy(gTurns, 6, 11, { hp: 500, maxHp: 500, resistances: {} });
  assert.ok(cast(gTurns, fb2, eSame));
  assert.ok(cast(gTurns, db2, eSame));
  assert.equal(gTurns.allies.filter(a => a.name === 'Burning Ghost').length, 0);

  // Negative 3: Fire blocked by shield + Dark on same enemy same turn -> NEVER triggers
  const gShield = arena();
  gShield.equipment.Weapon = { name: 'Ghostfire Scepter', components: [] };
  const fb3 = learn(gShield, 'Fireball');
  const db3 = learn(gShield, 'Death Bolt');
  gShield.spellBoosts[fb3] = { quickCast: true };
  const eSh = addEnemy(gShield, 6, 11, { hp: 500, maxHp: 500, shields: 1, resistances: {} });
  assert.ok(cast(gShield, fb3, eSh));
  assert.ok(cast(gShield, db3, eSh));
  assert.equal(gShield.allies.filter(a => a.name === 'Burning Ghost').length, 0);

  // Positive 1: Fire + Dark on SAME enemy in SAME turn -> summons 1 Burning Ghost (and extra Fire+Dark same turn does not double-proc)
  const gPos = arena();
  gPos.equipment.Weapon = { name: 'Ghostfire Scepter', components: [] };
  const fb4 = learn(gPos, 'Fireball');
  const db4 = learn(gPos, 'Death Bolt');
  gPos.spellBoosts[fb4] = { quickCast: true };
  gPos.spellBoosts[db4] = { quickCast: true };
  const eHit = addEnemy(gPos, 6, 11, { hp: 500, maxHp: 500, resistances: {} });
  assert.ok(cast(gPos, fb4, eHit));
  assert.ok(cast(gPos, db4, eHit));
  assert.equal(gPos.allies.filter(a => a.name === 'Burning Ghost').length, 1);
  // Hitting Fire + Dark again on same enemy same turn does NOT summon another ghost from the same copy
  assert.ok(cast(gPos, fb4, eHit));
  assert.ok(cast(gPos, db4, eHit));
  assert.equal(gPos.allies.filter(a => a.name === 'Burning Ghost').length, 1);

  // Positive 2: Fire during cast + Dark from endTurn curse (Shadow Hex) in SAME turn -> triggers!
  const gEndTurn = arena();
  gEndTurn.equipment.Weapon = { name: 'Ghostfire Scepter', components: [] };
  const fb5 = learn(gEndTurn, 'Fireball');
  const eCurse = addEnemy(gEndTurn, 6, 11, { hp: 500, maxHp: 500, resistances: {}, curses: { 'Shadow Hex': { duration: 5, damage: 5 } } });
  assert.ok(cast(gEndTurn, fb5, eCurse));
  assert.equal(gEndTurn.allies.filter(a => a.name === 'Burning Ghost').length, 1);

  // Positive 3: TWO equipped copies of Ghostfire Scepter -> summon 2 Burning Ghosts
  const gTwo = arena();
  gTwo.equipment.Weapon = { name: 'Ghostfire Scepter', components: [] };
  gTwo.equipment['Weapon-2'] = { name: 'Ghostfire Scepter', components: [] };
  const tod = learn(gTwo, 'Touch of Death', ['Flametouch']); // Dark + Fire in one cast
  const eAdj = addEnemy(gTwo, 4, 11, { hp: 600, maxHp: 600, resistances: {} });
  assert.ok(cast(gTwo, tod, eAdj));
  assert.equal(gTwo.allies.filter(a => a.name === 'Burning Ghost').length, 2);
});

test('2. Two equipped copies of The Lodestar and chain kills via Orb of Infinite Slaughter / Chaos Links resolve cleanly', () => {
  // Two copies of The Lodestar each count independently
  const gLodestar = arena();
  gLodestar.equipment.Weapon = { name: 'The Lodestar', components: [] };
  gLodestar.equipment['Weapon-2'] = { name: 'The Lodestar', components: [] };
  const b = learn(gLodestar, 'Blood Bullet');
  gLodestar.spellBoosts[b] = { damage: 120 }; // 130 total Metallic damage
  const e = addEnemy(gLodestar, 6, 11, { hp: 1000, maxHp: 1000, resistances: {} });
  assert.ok(cast(gLodestar, b, e));
  assert.equal(gLodestar.equipment.Weapon.stored, 10);
  assert.equal(gLodestar.equipment['Weapon-2'].stored, 10);

  // Chain kills: A dies -> Orb of Infinite Slaughter kills adjacent B -> B's explosion kills adjacent C
  const gChain = arena();
  gChain.equipment.Trinket = { name: 'Orb of Infinite Slaughter', components: [] };
  learn(gChain, 'Blood Bullet'); // Blood mastery 1
  learn(gChain, 'Drain Pulse'); // Blood mastery +3 = 4
  const c1 = addEnemy(gChain, 5, 11, { hp: 5, maxHp: 5, resistances: {} });
  const c2 = addEnemy(gChain, 6, 11, { hp: 3, maxHp: 3, resistances: {} });
  const c3 = addEnemy(gChain, 7, 11, { hp: 3, maxHp: 3, resistances: {} });
  const survivor = addEnemy(gChain, 15, 11, { hp: 500, maxHp: 500, resistances: {} });
  const mm = learn(gChain, 'Magic Missile');
  assert.ok(cast(gChain, mm, c1));
  assert.equal(c1.hp, 0);
  assert.equal(c2.hp, 0);
  assert.equal(c3.hp, 0);
  assert.equal(survivor.hp, 500);
  assert.equal(gChain.kills, 3);
  assert.deepEqual(restore(serialize(gChain)), gChain);
});

// ============================================================================
// PRIORITY 3: History-dependent upgrades (Sniper's Trance & Stinging Rebuke)
// ============================================================================
test("3. Blood Bullet -> Sniper's Trance stacks range & damage on wait, ignores LOS while stacked, and resets on move", () => {
  // Negative: without Sniper's Trance, waiting does NOT grant stacks or bypass LOS
  const gNoUp = arena();
  const bbBase = learn(gNoUp, 'Blood Bullet');
  gNoUp.tiles[11][5] = 1; // wall between player (3,11) and enemy (7,11)
  const walled = addEnemy(gNoUp, 7, 11, { hp: 200, maxHp: 200, resistances: {} });
  assert.ok(wait(gNoUp));
  assert.equal(effectiveRw3Spell(gNoUp, 10).range, 10);
  assert.equal(effectiveRw3Spell(gNoUp, 10).damage, 10);
  assert.equal(effectiveRw3Spell(gNoUp, 10).requiresLos, true);
  assert.equal(cast(gNoUp, bbBase, walled), false);

  // Positive: with Sniper's Trance, waiting accumulates stacks (+1 range, +10 damage, no LOS)
  const g = arena();
  const bb = learn(g, 'Blood Bullet', ["Sniper's Trance"]);
  g.tiles[11][5] = 1; // wall between player (3,11) and enemy (14,11) -> distance 11 (> base range 10)
  const farWalled = addEnemy(g, 14, 11, { hp: 200, maxHp: 200, resistances: {} });
  assert.equal(cast(g, bb, farWalled), false); // out of range AND blocked by wall

  assert.ok(wait(g)); // 1 stack: range 11, damage 20, no LOS
  assert.equal(effectiveRw3Spell(g, 10).range, 11);
  assert.equal(effectiveRw3Spell(g, 10).damage, 20);
  assert.equal(effectiveRw3Spell(g, 10).requiresLos, false);

  assert.ok(wait(g)); // 2 stacks: range 12, damage 30, no LOS
  assert.equal(effectiveRw3Spell(g, 10).range, 12);
  assert.equal(effectiveRw3Spell(g, 10).damage, 30);

  // Failed move into a wall does NOT clear stacks
  g.tiles[10][3] = 1;
  assert.equal(move(g, 0, -1), false);
  assert.equal(effectiveRw3Spell(g, 10).damage, 30);

  // Casting through wall succeeds and deals 30 damage without clearing stacks
  assert.ok(cast(g, bb, farWalled));
  assert.equal(farWalled.hp, 170);
  assert.equal(effectiveRw3Spell(g, 10).damage, 30);

  // Stepping to an open tile clears ALL stacks and restores LOS requirement
  assert.ok(move(g, 0, 1));
  assert.equal(effectiveRw3Spell(g, 10).range, 10);
  assert.equal(effectiveRw3Spell(g, 10).damage, 10);
  assert.equal(effectiveRw3Spell(g, 10).requiresLos, true);
  // Put wall back on new sightline and verify cast is blocked again
  g.tiles[12][5] = 1;
  const walledAgain = addEnemy(g, 7, 12, { hp: 200, maxHp: 200, resistances: {} });
  assert.equal(cast(g, bb, walledAgain), false);
});

test('3. Poison Sting -> Stinging Rebuke retaliates against up to 2 visible enemies that actually hurt the wizard this turn', () => {
  // Positive + cap of 2 + visibility filter: 3 visible melee attackers + 1 passive enemy
  const g = arena();
  learn(g, 'Poison Sting', ['Stinging Rebuke']);
  const a1 = addEnemy(g, 4, 11, { hp: 200, maxHp: 200, damage: 5, range: 1, resistances: {} });
  const a2 = addEnemy(g, 3, 10, { hp: 200, maxHp: 200, damage: 5, range: 1, resistances: {} });
  const a3 = addEnemy(g, 3, 12, { hp: 200, maxHp: 200, damage: 5, range: 1, resistances: {} });
  const innocent = addEnemy(g, 8, 11, { hp: 200, maxHp: 200, damage: 5, range: 1, resistances: {} });

  assert.ok(wait(g));
  const retaliated = [a1, a2, a3].filter(e => e.hp < 200 && e.statuses.poison > 0);
  assert.equal(retaliated.length, 2); // capped at 2
  assert.equal(innocent.hp, 200);
  assert.equal(innocent.statuses.poison || 0, 0);

  // Negative 1: damage blocked by player shield -> does NOT trigger Stinging Rebuke
  const gShield = arena();
  learn(gShield, 'Poison Sting', ['Stinging Rebuke']);
  gShield.player.shields = 2;
  const attacker = addEnemy(gShield, 4, 11, { hp: 200, maxHp: 200, damage: 10, range: 1, resistances: {} });
  assert.ok(wait(gShield));
  assert.equal(gShield.player.shields, 1);
  assert.equal(attacker.hp, 200);
  assert.equal(attacker.statuses.poison || 0, 0);

  // Negative 2: next turn when attacker is stunned (does not damage wizard) -> does NOT re-trigger from previous turn
  const gNext = arena();
  learn(gNext, 'Poison Sting', ['Stinging Rebuke']);
  const foe = addEnemy(gNext, 4, 11, { hp: 200, maxHp: 200, damage: 5, range: 1, resistances: {} });
  assert.ok(wait(gNext));
  assert.ok(foe.hp < 200);
  const hpAfterTurn1 = foe.hp;
  foe.statuses.poison = 0;
  foe.statuses.stun = 3;
  assert.ok(wait(gNext));
  assert.equal(foe.hp, hpAfterTurn1);
  assert.equal(foe.statuses.poison || 0, 0);

  // Negative 3: without Stinging Rebuke upgrade -> does NOT retaliate
  const gNoUp = arena();
  learn(gNoUp, 'Poison Sting');
  const foe2 = addEnemy(gNoUp, 4, 11, { hp: 200, maxHp: 200, damage: 5, range: 1, resistances: {} });
  assert.ok(wait(gNoUp));
  assert.equal(foe2.hp, 200);
  assert.equal(foe2.statuses.poison || 0, 0);
});

// ============================================================================
// PRIORITY 4: On-summon & realm-entry bonuses (Iron Legion's Banner, Dragon Tutor, Glasya's Bite)
// ============================================================================
test("4. Iron Legion's Banner grants 2 SH and 10 turns of Quickstep to eligible Metallic/Construct allies on summon only", () => {
  const g = arena();
  g.equipment.Trinket = { name: "Iron Legion's Banner", components: [] };
  const bladeSpell = learn(g, 'Summon Blade'); // Dancing Blade (Metallic, Construct)
  const wolfSpell = learn(g, 'Wolf'); // Wolf (Living, Nature)
  const target = addEnemy(g, 12, 11, { hp: 500, maxHp: 500, resistances: {} });

  // Eligible ally summoned
  assert.ok(cast(g, bladeSpell, { x: 4, y: 11 }));
  const blade = g.allies.find(a => a.species === 'Dancing Blade');
  assert.ok(blade);
  assert.equal(blade.shields, (units.get('Dancing Blade').shields || 0) + 2);
  // Note: cast() called endTurn(), so quickstep ticked down 1 turn from 10 -> 9 AND blade took 2 steps on its turn!
  assert.equal(blade.statuses.quickstep, 9);
  assert.ok(blade.x >= 6, `expected quickstepped blade to move 2 tiles from x=4, got x=${blade.x}`);

  // Non-eligible ally summoned (Wolf is neither Metallic nor Construct)
  assert.ok(cast(g, wolfSpell, { x: 4, y: 12 }));
  const wolf = g.allies.find(a => a.species === 'Wolf');
  assert.ok(wolf);
  assert.equal(wolf.shields, 0);
  assert.equal(wolf.statuses.quickstep || 0, 0);
  assert.equal(target.hp, 500);
});

test('4. Dragon Tutor replaces normal melee attack of newly summoned allied dragons with Dragon Claw', () => {
  const g = arena();
  learn(g, 'Dragon Claw', ['Dragon Tutor', 'Serrated Steel Claws', 'Frenzied Swipes']); // 20 dmg x 3 swipes + 6 turns bleed!
  const drakeSpell = learn(g, 'Fire Drake');
  const wolfSpell = learn(g, 'Wolf');

  // Pre-existing dragon before summon does NOT get dragonTutor retroactively if not summoned with it
  const oldDrake = addAlly(g, 2, 11, 'Fire Drake', { stationary: true });
  assert.equal(oldDrake.dragonTutor, undefined);

  // Place enemy adjacent to where new Fire Drake will be summoned
  const foe = addEnemy(g, 6, 11, { hp: 500, maxHp: 500, resistances: {} });
  assert.ok(cast(g, drakeSpell, { x: 5, y: 11 }));
  const newDrake = g.allies.find(a => a !== oldDrake && a.species === 'Fire Drake');
  assert.ok(newDrake);
  assert.equal(newDrake.dragonTutor, true);

  // Put Fire Breath on cooldown so the drake must use its melee attack (now replaced by Dragon Claw!)
  newDrake.cooldowns['Fire Breath'] = 999;
  const hpBefore = foe.hp;
  assert.ok(wait(g));
  // Dragon Claw with Frenzied Swipes deals 20 * 3 = 60 Physical + 6 turns bleed (then enemy bleed ticks 3 -> total 63)
  assert.ok(hpBefore - foe.hp >= 60, `expected >=60 damage from Dragon Claw swipes, got ${hpBefore - foe.hp}`);
  assert.ok(foe.statuses.bleed > 0, 'expected Serrated Steel Claws bleed from Dragon Tutor');

  // Non-dragon ally (Wolf) does NOT get dragonTutor
  assert.ok(cast(g, wolfSpell, { x: 4, y: 12 }));
  const wolf = g.allies.find(a => a.species === 'Wolf');
  assert.equal(wolf.dragonTutor, undefined);
});

test("4. Glasya's Bite inflicts bleed on realm entry equal to Blood mastery * Chaos mastery (and 0 when either mastery is 0)", () => {
  // Negative case: Blood mastery > 0, Chaos mastery === 0 -> NO bleed applied
  const gZero = arena('standard');
  gZero.equipment.Trinket = { name: "Glasya's Bite", components: [] };
  learn(gZero, 'Blood Bullet'); // Blood lvl 1, no Chaos
  assert.equal(tagMastery(gZero, 'Blood'), 1);
  assert.equal(tagMastery(gZero, 'Chaos'), 0);
  generateRealm(gZero);
  assert.ok(gZero.enemies.length > 0);
  assert.ok(gZero.enemies.every(e => !e.statuses.bleed));

  // Positive case: Blood mastery 5 * Chaos mastery 2 = 10 turns of bleed on realm entry
  const gPos = arena('standard');
  gPos.equipment.Trinket = { name: "Glasya's Bite", components: [] };
  learn(gPos, 'Blood Bullet'); // Blood lvl 1
  learn(gPos, 'Drain Pulse'); // Blood lvl 4 -> Blood mastery = 5
  learn(gPos, 'Annihilate'); // Chaos lvl 2 -> Chaos mastery = 2
  assert.equal(tagMastery(gPos, 'Blood'), 5);
  assert.equal(tagMastery(gPos, 'Chaos'), 2);
  generateRealm(gPos);
  const nonMirrors = gPos.enemies.filter(e => e.species !== 'Gelid Mirror');
  assert.ok(nonMirrors.length > 0);
  assert.ok(nonMirrors.every(e => e.statuses.bleed === 10));

  // Deployment timing in rw3 mode: not applied until deploy()
  const gDeploy = arena('rw3');
  gDeploy.equipment.Trinket = { name: "Glasya's Bite", components: [] };
  learn(gDeploy, 'Blood Bullet'); // Blood 1
  learn(gDeploy, 'Annihilate'); // Chaos 2 -> product 2
  gDeploy.deploying = true;
  generateRealm(gDeploy);
  assert.ok(gDeploy.enemies.every(e => !e.statuses.bleed));
  assert.ok(deploy(gDeploy, { x: 3, y: 11 }));
  assert.ok(gDeploy.enemies.filter(e => e.species !== 'Gelid Mirror').every(e => e.statuses.bleed === 2));
});

// ============================================================================
// PRIORITY 5: Gelid Mirror debuff reflection & Ice Phoenix death + reincarnation order
// ============================================================================
test('5. Gelid Mirror intercepts debuffs and delivers them once on its next attack', () => {
  const g = arena();
  const mirror = addEnemy(g, 5, 11, { species: 'Gelid Mirror', hp: 285, maxHp: 285 });
  const sting = learn(g, 'Poison Sting');
  const freeze = learn(g, 'Freeze');
  g.spellBoosts[freeze] = { quickCast: true };

  // Apply Freeze and Poison to Gelid Mirror
  assert.ok(cast(g, freeze, mirror));
  assert.equal(mirror.statuses.freeze || 0, 0); // NOT frozen!
  assert.ok(mirror.reflectedDebuffs.freeze > 0);

  // Cast Poison Sting (ends turn -> Gelid Mirror is NOT frozen, so it immediately attacks the wizard with Ice Beam!)
  assert.ok(cast(g, sting, mirror));
  assert.equal(mirror.statuses.poison || 0, 0);
  // Wizard received the reflected freeze & poison!
  assert.ok(g.player.statuses.freeze > 0);
  assert.ok(g.player.statuses.poison > 0);
  // Stored debuffs were consumed and cleared after delivering!
  assert.equal(mirror.reflectedDebuffs, undefined);

  // Cleanse player and verify subsequent attack does NOT re-deliver old debuffs
  g.player.statuses = {};
  assert.ok(wait(g));
  assert.equal(g.player.statuses.freeze || 0, 0);
  assert.equal(g.player.statuses.poison || 0, 0);
});

test('5. Ice Phoenix death burst deals 25 Ice + 4 freeze to foes in radius 4 and +2 SH to allies in radius 4 BEFORE reincarnating', () => {
  const g = arena();
  const phoenix = addAlly(g, 10, 11, 'Ice Phoenix', { hp: 10, maxHp: 125, lives: 2, stationary: true, cooldowns: { 'Ice Bolt': 999 } });
  const nearAlly = addAlly(g, 12, 11, 'Wolf', { hp: 50, maxHp: 50, shields: 0, stationary: true });
  const farAlly = addAlly(g, 16, 11, 'Wolf', { hp: 50, maxHp: 50, shields: 0, stationary: true });
  const nearFoe = addEnemy(g, 10, 15, { hp: 100, maxHp: 100, resistances: {} }); // distance 4
  const farFoe = addEnemy(g, 10, 16, { hp: 100, maxHp: 100, resistances: {} }); // distance 5

  // Kill the allied Ice Phoenix while it still has 2 reincarnations
  phoenix.hp = 0;
  assert.ok(wait(g));

  // Death burst fired BEFORE reincarnation:
  // - nearFoe (dist 4) took 25 Ice damage and got frozen (4 turns -> decremented 1 on enemy turn = 3)
  assert.equal(nearFoe.hp, 75);
  assert.equal(nearFoe.statuses.freeze, 3);
  // - farFoe (dist 5) was untouched
  assert.equal(farFoe.hp, 100);
  assert.equal(farFoe.statuses.freeze || 0, 0);
  // - nearAlly (dist 2) gained +2 SH; farAlly (dist 6) gained 0 SH
  assert.equal(nearAlly.shields, 2);
  assert.equal(farAlly.shields, 0);
  // - Phoenix itself did NOT receive +2 SH from its own death burst, and reincarnated with lives 2 -> 1 at full HP!
  assert.equal(phoenix.shields, 0);
  assert.equal(phoenix.lives, 1);
  assert.equal(phoenix.hp, 125);

  // Final death (lives === 0): burst fires again and phoenix is permanently removed
  phoenix.lives = 0;
  phoenix.hp = 0;
  assert.ok(wait(g));
  assert.equal(nearFoe.hp, 50);
  assert.equal(nearAlly.shields, 4);
  assert.ok(!g.allies.includes(phoenix));
});

// ============================================================================
// PRIORITY 6: Boss real abilities (The Body Electric retaliation & Perfect Procession)
// ============================================================================
test('6. The Body Electric retaliates with Chain Lightning against whoever targeted it (wizard OR ally), chains within 3 tiles, and ignores untargeted casts', () => {
  // Case A: Wizard targets The Body Electric -> Chain Lightning hits wizard AND chains to nearby ally within 3 tiles, NOT far ally
  const g1 = arena();
  const boss1 = addEnemy(g1, 10, 11, { species: 'The Body Electric', hp: 2000, maxHp: 2000, cooldowns: { 'Electric Engirth': 999, 'Perfect Procession': 999 } });
  const nearAlly = addAlly(g1, 5, 11, 'Wolf', { hp: 100, maxHp: 100, stationary: true }); // dist 2 from player
  const farAlly = addAlly(g1, 3, 17, 'Wolf', { hp: 100, maxHp: 100, stationary: true }); // dist 6 from player
  const mm = learn(g1, 'Magic Missile');
  g1.spellBoosts[mm] = { quickCast: true };
  const playerHpBefore = g1.player.hp;
  assert.ok(cast(g1, mm, boss1));
  assert.equal(g1.player.hp, playerHpBefore - 10);
  assert.equal(nearAlly.hp, 90);
  assert.equal(farAlly.hp, 100);

  // Case B: Negative — spell targets an empty tile (not The Body Electric) -> NO retaliation
  const playerHpAfter = g1.player.hp;
  assert.ok(cast(g1, mm, { x: 6, y: 11 }));
  assert.equal(g1.player.hp, playerHpAfter);

  // Case C: Allied dragon targets The Body Electric via Chaos Scale Crown -> Chain Lightning hits the DRAGON, NOT the far wizard!
  const g2 = arena();
  g2.equipment.Head = { name: 'Chaos Scale Crown', components: [] };
  const boss2 = addEnemy(g2, 12, 11, { species: 'The Body Electric', hp: 2000, maxHp: 2000, stationary: true, cooldowns: { 'Electric Engirth': 999, 'Perfect Procession': 999, 'Chain Lightning': 999 } });
  const dragon = addAlly(g2, 12, 6, 'Fire Drake', { hp: 100, maxHp: 100, stationary: true, range: 1, cooldowns: { 'Fire Breath': 999 } }); // dist 10 from player (3,11)
  const wizHpBefore = g2.player.hp;
  assert.ok(wait(g2));
  assert.equal(dragon.hp, 90); // Chain Lightning hit the dragon!
  assert.equal(g2.player.hp, wizHpBefore); // Wizard was >3 tiles from dragon, untouched!
  assert.ok(boss2.hp < 2000);
});

test('6. Perfect Procession grants a real extra turn to boss allies (movement, summoning, and attack) while respecting incapacitation', () => {
  const g = arena();
  // Place The Body Electric with Electric Engirth on cooldown so it casts Perfect Procession!
  const boss = addEnemy(g, 15, 11, {
    species: 'The Body Electric', hp: 2000, maxHp: 2000, stationary: true,
    cooldowns: { 'Electric Engirth': 999 },
  });
  // 1. Out-of-range melee ally (should move TWICE in one turn: normal turn + Perfect Procession extra turn!)
  const walker = addEnemy(g, 9, 11, { species: 'Goblin', hp: 50, maxHp: 50, stationary: false });
  // 2. Adjacent melee ally (should attack TWICE in one turn: normal turn + Perfect Procession extra turn!)
  const striker = addEnemy(g, 4, 11, { species: 'Goblin', hp: 50, maxHp: 50, damage: 7, range: 1, stationary: true });
  // 3. Summoning ally (Witch with summon ability ready after first turn, AND Rift Lair spawner)
  const spawner = addEnemy(g, 11, 16, {
    name: 'Rift Lair', species: null, isSpawner: true, spawnCooldown: 2, maxCooldown: 5,
    spawnType: 0, spawnSpecies: 'Goblin', hp: 100, maxHp: 100, damage: 0, range: 0, stationary: true,
  });
  const summoner = addEnemy(g, 11, 6, { species: 'Witch', hp: 50, maxHp: 50, stationary: true });
  // 4. Frozen ally (should NOT move or attack during Perfect Procession!)
  const frozen = addEnemy(g, 4, 12, { species: 'Goblin', hp: 50, maxHp: 50, damage: 7, range: 1, stationary: false, statuses: { freeze: 3 } });

  const playerHpBefore = g.player.hp;
  const countBefore = g.enemies.length;
  assert.ok(wait(g));

  // Boss cast Perfect Procession and put it on cooldown
  assert.ok(boss.cooldowns['Perfect Procession'] > g.turn);
  // Walker moved 2 tiles closer (from x=9 to x=7)
  assert.equal(walker.x, 7);
  // Striker attacked twice (Goblin melee ability deals 2 damage per hit -> 2 hits = 4 damage)
  assert.equal(playerHpBefore - g.player.hp, 4);
  // Spawner decremented cooldown twice (2 -> 1 -> 0) and Witch summoned on its turn!
  assert.ok(g.enemies.length >= countBefore + 2, 'expected both spawner and summoner to summon');
  assert.equal(spawner.spawnCooldown, 5);
  assert.ok(Object.values(summoner.cooldowns).some(cd => cd > g.turn));
  // Frozen enemy stayed put and did not attack
  assert.equal(frozen.x, 4);
  assert.equal(frozen.y, 12);
});
