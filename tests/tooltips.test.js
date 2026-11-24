import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setLocale } from '../src/i18n/i18n.js';
import { availableSpells, createGame, learnSpell, learnUpgrade } from '../src/engine/index.js';
import { equipItem, equipmentByName, spellByName } from '../src/rules/core.js';
import { formatEquipmentSlotTooltip, formatSpellTooltip } from '../src/ui/tooltips.js';

test('formatEquipmentSlotTooltip describes empty slots and equipped gear details across locales', () => {
  const game = createGame(42);
  setLocale('en');
  assert.match(formatEquipmentSlotTooltip(game, 'Weapon'), /Empty Weapon slot/);

  const staff = equipmentByName.get('Arcane Staff');
  equipItem(game, staff, ['Arcane Mote', 'Arcane Mote', 'Burning Ember']);
  const weaponEn = formatEquipmentSlotTooltip(game, 'Weapon');
  assert.match(weaponEn, /Arcane Staff · Weapon/);
  assert.match(weaponEn, /Type: Arcane/);
  assert.match(weaponEn, /6 Damage/);
  assert.match(weaponEn, /Forged with: 2× Arcane Mote, Burning Ember/);

  const acidifier = equipmentByName.get('Acidifier');
  equipItem(game, acidifier, []);
  const trinketEn = formatEquipmentSlotTooltip(game, 'Trinket');
  assert.match(trinketEn, /Acidifier · Trinket/);
  assert.match(trinketEn, /Type: Dark · Nature/);
  assert.match(trinketEn, /acidified/i);
  assert.doesNotMatch(trinketEn, /Forged with:/);

  setLocale('pt-BR');
  assert.match(formatEquipmentSlotTooltip(game, 'Head'), /Espaço de Cabeça vazio/);
  const weaponPt = formatEquipmentSlotTooltip(game, 'Weapon');
  assert.match(weaponPt, /Tipo: Arcano/);
  assert.match(weaponPt, /Forjado com:/);

  setLocale('es');
  assert.match(formatEquipmentSlotTooltip(game, 'Head'), /Ranura de Cabeza vacía/);
  const weaponEs = formatEquipmentSlotTooltip(game, 'Weapon');
  assert.match(weaponEs, /Tipo: Arcano/);
  assert.match(weaponEs, /Forjado con:/);

  setLocale('en');
});

test('formatEquipmentSlotTooltip includes multiple items in the same slot in non-standard modes', () => {
  const game = createGame(42, { mode: 'classic' });
  setLocale('en');
  equipItem(game, equipmentByName.get('Quickstep Boots'), []);
  equipItem(game, equipmentByName.get('Bishop Boots'), []);
  const feetTip = formatEquipmentSlotTooltip(game, 'Feet');
  assert.match(feetTip, /Quickstep Boots · Feet/);
  assert.match(feetTip, /Bishop Boots · Feet/);
});

test('formatSpellTooltip includes spell type, damage type, applied upgrade level, and description', () => {
  const game = createGame(42);
  game.points = 30;
  const bullet = spellByName.get('Blood Bullet');
  const blink = spellByName.get('Blink');
  assert.ok(learnSpell(game, bullet.id));
  assert.ok(learnSpell(game, blink.id));

  setLocale('en');
  let effBullet = availableSpells(game).find(s => s.spellId === bullet.id);
  const tipBefore = formatSpellTooltip(effBullet);
  assert.match(tipBefore, /Blood Bullet · LVL 1/);
  assert.match(tipBefore, /Type: Blood · Metallic · Sorcery \(SINGLE\)/);
  assert.match(tipBefore, /Damage: Physical/);
  assert.match(tipBefore, /Upgrade level: 0\/4/);
  assert.match(tipBefore, /Shoot a projectile/);

  // Apply two upgrades: Rime Coated Rounds (adds Ice tag & Ice damage) + Double Tap
  const rime = bullet.upgrades.find(u => u.name === 'Rime Coated Rounds');
  const doubleTap = bullet.upgrades.find(u => u.name === 'Double Tap');
  assert.ok(learnUpgrade(game, bullet.id, rime.sp_id));
  assert.ok(learnUpgrade(game, bullet.id, doubleTap.sp_id));

  effBullet = availableSpells(game).find(s => s.spellId === bullet.id);
  const tipAfter = formatSpellTooltip(effBullet);
  assert.match(tipAfter, /Type: Blood · Metallic · Sorcery · Ice \(SINGLE\)/);
  assert.match(tipAfter, /Damage: Physical \/ Ice/);
  assert.match(tipAfter, /Upgrade level: 2\/4 \(Rime Coated Rounds, Double Tap\)/);

  // Utility spell (0 damage) omits Damage line but still shows Type and Upgrade level
  const effBlink = availableSpells(game).find(s => s.spellId === blink.id);
  const blinkTip = formatSpellTooltip(effBlink);
  assert.match(blinkTip, /Blink · LVL 3/);
  assert.match(blinkTip, /Type: Arcane · Sorcery · Translocation \(TELEPORT\)/);
  assert.doesNotMatch(blinkTip, /Damage:/);
  assert.match(blinkTip, /Upgrade level: 0\/4/);

  setLocale('pt-BR');
  const tipPt = formatSpellTooltip(effBullet);
  assert.match(tipPt, /Tipo: Sangue · Metálico · Feitiçaria · Gelo \(ALVO\)/);
  assert.match(tipPt, /Dano: Físico \/ Gelo/);
  assert.match(tipPt, /Nível de aprimoramento: 2\/4 \(/);

  setLocale('es');
  const tipEs = formatSpellTooltip(effBullet);
  assert.match(tipEs, /Tipo: Sangre · Metálico · Hechicería · Hielo \(ÚNICO\)/);
  assert.match(tipEs, /Daño: Físico \/ Hielo/);
  assert.match(tipEs, /Nivel de mejora: 2\/4 \(/);

  setLocale('en');
});
