import { GAME_MODES, SAVE_VERSION, SIZE, getModeConfig } from '../data/constants.js';
import { nodeMap } from '../data/catalog.js';
import { mutators } from '../data/campaign.js';
import { componentByName, effectiveRw3Spell, spellById } from '../rules/rw3.js';
import { migrateLogEntry } from '../i18n/log-migration.js';
import { finalRealmOf, log } from './context.js';

export function serialize(game) {
  return JSON.stringify(game);
}

export function restore(value) {
  try {
    const game = JSON.parse(value);
    const maxRealm = finalRealmOf(game);
    if (game.version !== SAVE_VERSION || !Number.isInteger(game.seed) || !Number.isInteger(game.realm) || game.realm < 1 || game.realm > maxRealm
      || !Array.isArray(game.learned) || !game.learned.every(id => nodeMap.has(id)) || new Set(game.learned).size !== game.learned.length
      || !['playing', 'dead', 'won'].includes(game.status)
      || !Array.isArray(game.tiles) || game.tiles.length !== SIZE || !game.tiles.every(row => Array.isArray(row) && row.length === SIZE && row.every(t => t === 0 || t === 1 || t === 2))
      || !Number.isFinite(game.player?.hp) || !Number.isInteger(game.player.x) || !Number.isInteger(game.player.y)
      || (game.tiles[game.player.y]?.[game.player.x] !== 0 && game.tiles[game.player.y]?.[game.player.x] !== 2)
      || !Array.isArray(game.enemies) || !Array.isArray(game.items) || !Array.isArray(game.portals) || !Array.isArray(game.log)
      || !game.charges || !Number.isFinite(game.points)) return null;

    const defaults = { damageDealt: 0, pointsEarned: 0, pointsSpent: 0, spellsCast: 0, staffStrikes: 0, potionsUsed: 0, realmsCleared: 0 };
    game.progress = { ...defaults, ...game.progress };
    if (!Object.values(game.progress).every(val => Number.isInteger(val) && val >= 0)) return null;

    game.mutators ??= []; game.vault ??= null; game.defeatedSpecies ??= []; game.clearedVaults ??= [];
    game.riftRoll ??= 0; game.rerolls ??= 1; game.rerolledRealms ??= []; game.pendingReward ??= null;
    if (!Array.isArray(game.mutators) || !game.mutators.every(m => mutators.includes(m))) return null;

    game.realmTurn ??= 0; game.offeringTags ??= []; game.lastCast ??= null;
    game.lastEffect ??= null; game.damagedPlayerBy ??= null;
    game.mode ??= 'standard';
    if (!Object.hasOwn(GAME_MODES, game.mode)) return null;

    game.rw3Spells ??= []; game.rw3Upgrades ??= {}; game.spellBoosts ??= {};
    if (!game.rw3Spells.length) {
      game.rw3Spells = [...getModeConfig(game.mode).starterRw3];
      for (const id of game.rw3Spells) {
        const eff = effectiveRw3Spell(game, id);
        if (eff && !(eff.id in game.charges)) game.charges[eff.id] = eff.maxCharges;
      }
    }
    game.allies ??= []; game.clouds ??= []; game.buffs ??= []; game.channel ??= null;
    game.quickstepUsed ??= false; game.bonusMaxHp ??= 0;
    game.player.shields ??= 0; game.player.resistances ??= {}; game.player.statuses ??= {};
    game.rw3Components ??= []; game.equipment ??= {};
    game.shrine ??= null;
    delete game.bigBangEnabled;
    delete game.charges['dev-big-bang'];
    delete game.spellBoosts['dev-big-bang'];

    if (!Array.isArray(game.rw3Components) || !game.rw3Components.every(name => componentByName.has(name))
      || !Array.isArray(game.rw3Spells) || !game.rw3Spells.every(id => spellById.has(id))
      || !Object.values(game.equipment).every(entry => entry && typeof entry.name === 'string' && Array.isArray(entry.components))
      || (game.shrine && (!Number.isInteger(game.shrine.x) || !Number.isInteger(game.shrine.y)
        || game.tiles[game.shrine.y]?.[game.shrine.x] !== 0 || !Number.isInteger(game.shrine.uses) || game.shrine.uses < 0 || game.shrine.uses > 3))) return null;

    if (game.status === 'won' && game.realm === 24 && game.mode === 'standard') {
      game.status = 'playing';
      game.progress.realmsCleared = Math.max(0, game.progress.realmsCleared - 1);
      log(game, 'log.expanded', {}, 'gold');
    }
    game.log = game.log.map(migrateLogEntry);
    return game;
  } catch {
    return null;
  }
}
