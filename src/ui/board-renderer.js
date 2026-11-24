import { SIZE, availableSpells, distance, hasSight, threateningEnemies } from '../engine/index.js';
import {
  drawCanvasAlly, drawCanvasCloud, drawCanvasEffect, drawCanvasEnemy,
  drawCanvasItem, drawCanvasPortal, drawCanvasShrine, drawCanvasWizard,
  drawChasmTwinkle, drawStaticDungeonTile,
} from './canvas-sprites.js';

function computeTileSignature(game) {
  // Fast FNV-1a hash over the 23x23 tile grid + seed + theme so terrain redraws only when tiles mutate.
  let hash = 2166136261 ^ (game.seed || 0) ^ ((game.theme || 0) << 16);
  const tiles = game.tiles;
  for (let y = 0; y < SIZE; y++) {
    const row = tiles[y];
    for (let x = 0; x < SIZE; x++) {
      hash = Math.imul(hash ^ row[x], 16777619);
    }
  }
  return hash >>> 0;
}

export function createBoardRenderer(canvas, state) {
  const ctx = canvas.getContext('2d');
  const tile = canvas.width / SIZE;

  // Offscreen static terrain cache (eliminates 529 tile redraws + chasm radial gradients per frame).
  const terrainCanvas = document.createElement('canvas');
  terrainCanvas.width = canvas.width;
  terrainCanvas.height = canvas.height;
  const terrainCtx = terrainCanvas.getContext('2d');

  let lastTerrainSig = null;
  let chasms = [];
  let cachedRangeKey = null;
  let cachedSpell = null;
  let cachedRangeTiles = [];
  let cachedThreatKey = null;
  let cachedThreatTiles = [];

  function ensureTerrainCache(game) {
    const sig = computeTileSignature(game);
    if (sig === lastTerrainSig) return sig;
    lastTerrainSig = sig;
    chasms = [];
    terrainCtx.fillStyle = '#09100d';
    terrainCtx.fillRect(0, 0, terrainCanvas.width, terrainCanvas.height);
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const n = ((x * 73 + y * 137 + game.seed) % 97) / 97;
        const tVal = game.tiles[y][x];
        drawStaticDungeonTile(terrainCtx, x, y, tile, tVal, game.theme, n);
        if (tVal === 2) chasms.push({ x, y, n });
      }
    }
    return sig;
  }

  function ensureRangeOverlay(game, terrainSig) {
    const sel = state.selected;
    if (!sel) {
      cachedSpell = null;
      cachedRangeTiles = [];
      cachedRangeKey = null;
      return;
    }
    const key = `${terrainSig}:${game.turn}:${game.player.x},${game.player.y}:${sel}:${game.buffs.length}:${Object.keys(game.equipment).length}`;
    if (key === cachedRangeKey) return;
    cachedRangeKey = key;
    cachedSpell = availableSpells(game).find(s => s.id === sel) || null;
    cachedRangeTiles = [];
    if (!cachedSpell) return;
    const sp = cachedSpell;
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        if (game.tiles[y][x] === 0 && (sp.range === 0 || (distance(game.player, { x, y }) <= sp.range && (!sp.requiresLos || hasSight(game, game.player, { x, y }))))) {
          cachedRangeTiles.push({ x, y });
        }
      }
    }
  }

  function ensureThreatCache(game, terrainSig) {
    if (!state.showThreats) return;
    const key = `${terrainSig}:${game.turn}:${game.enemies.length}:${game.enemies.map(e => `${e.id}@${e.x},${e.y}:${e.hp > 0 ? 1 : 0}`).join('|')}`;
    if (key === cachedThreatKey) return;
    cachedThreatKey = key;
    cachedThreatTiles = [];
    for (let y = 1; y < SIZE - 1; y++) {
      for (let x = 1; x < SIZE - 1; x++) {
        if (game.tiles[y][x] === 0 && threateningEnemies(game, { x, y }).length) {
          cachedThreatTiles.push({ x, y });
        }
      }
    }
  }

  function draw(time = performance.now()) {
    const game = state.game;
    time *= state.profile.speed || 1;
    const terrainSig = ensureTerrainCache(game);

    // 1. Blit cached static dungeon terrain in a single drawImage call
    ctx.drawImage(terrainCanvas, 0, 0);

    // 2. Subtle animated void stars on chasm tiles only
    for (let i = 0; i < chasms.length; i++) {
      const c = chasms[i];
      drawChasmTwinkle(ctx, c.x, c.y, tile, c.n, time);
    }

    // 3. Cached spell targeting range overlay
    ensureRangeOverlay(game, terrainSig);
    const spell = cachedSpell;
    if (spell && cachedRangeTiles.length) {
      ctx.fillStyle = `${spell.color}1c`;
      for (let i = 0; i < cachedRangeTiles.length; i++) {
        const p = cachedRangeTiles[i];
        ctx.fillRect(p.x * tile + 1, p.y * tile + 1, tile - 2, tile - 2);
      }
    }

    // 4. Elemental Clouds
    for (const cloud of game.clouds || []) drawCanvasCloud(ctx, cloud, tile, time);

    // 5. Cached Enemy Threat Zones
    if (state.showThreats) {
      ensureThreatCache(game, terrainSig);
      ctx.fillStyle = 'rgba(248, 113, 113, 0.24)';
      ctx.strokeStyle = 'rgba(248, 113, 113, 0.5)';
      ctx.lineWidth = 1;
      for (let i = 0; i < cachedThreatTiles.length; i++) {
        const p = cachedThreatTiles[i];
        ctx.fillRect(p.x * tile + 1, p.y * tile + 1, tile - 2, tile - 2);
        ctx.strokeRect(p.x * tile + 1.5, p.y * tile + 1.5, tile - 3, tile - 3);
      }
    }

    // 6. Shrine, Portals & Items
    if (game.shrine) drawCanvasShrine(ctx, game.shrine, tile, time);
    const portalsOpen = game.enemies.length === 0;
    for (const portal of game.portals) drawCanvasPortal(ctx, portal, tile, portalsOpen, time);
    for (const item of game.items) drawCanvasItem(ctx, item, tile, time);

    // 7. Allied Minions
    for (const ally of game.allies || []) {
      drawCanvasAlly(ctx, ally, tile, time);
      if (ally.hp < ally.maxHp) {
        ctx.fillStyle = '#14261c';
        ctx.fillRect(ally.x * tile + 4, ally.y * tile + 27, 24, 3);
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(ally.x * tile + 4, ally.y * tile + 27, 24 * Math.max(0, ally.hp / ally.maxHp), 3);
      }
      if (ally.shields > 0) {
        ctx.fillStyle = '#09100d';
        ctx.fillRect(ally.x * tile + 1, ally.y * tile + 1, 11, 10);
        ctx.fillStyle = '#7bd0ff';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.fillText(String(ally.shields), ally.x * tile + 3, ally.y * tile + 9);
      }
    }

    // 8. Enemies & Spawners
    const threatening = state.showThreats && state.hover ? new Set(threateningEnemies(game, state.hover)) : null;
    for (const enemy of game.enemies) {
      if (enemy.radius) {
        const side = (enemy.radius * 2 + 1) * tile;
        ctx.fillStyle = 'rgba(248, 113, 113, 0.16)';
        ctx.fillRect((enemy.x - enemy.radius) * tile, (enemy.y - enemy.radius) * tile, side, side);
        ctx.strokeStyle = '#c58a66';
        ctx.strokeRect((enemy.x - enemy.radius) * tile, (enemy.y - enemy.radius) * tile, side, side);
      }
      if (threatening?.has(enemy)) {
        ctx.strokeStyle = '#ffdf9f';
        ctx.lineWidth = 2;
        ctx.strokeRect(enemy.x * tile + 1, enemy.y * tile + 1, tile - 2, tile - 2);
      }
      drawCanvasEnemy(ctx, enemy, tile, time);
      if (enemy.isSpawner) {
        ctx.fillStyle = 'rgba(9, 16, 13, 0.85)';
        ctx.fillRect(enemy.x * tile + 19, enemy.y * tile + 1, 12, 11);
        ctx.fillStyle = '#f472b6';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.fillText(String(enemy.spawnCooldown), enemy.x * tile + 22, enemy.y * tile + 10);
      }
      if (enemy.hp < enemy.maxHp) {
        ctx.fillStyle = '#2e1616';
        ctx.fillRect(enemy.x * tile + 4, enemy.y * tile + 27, 24, 3);
        ctx.fillStyle = '#f87171';
        ctx.fillRect(enemy.x * tile + 4, enemy.y * tile + 27, 24 * Math.max(0, enemy.hp / enemy.maxHp), 3);
      }
      if (enemy.shields > 0) {
        ctx.fillStyle = 'rgba(9, 16, 13, 0.85)';
        ctx.fillRect(enemy.x * tile + 1, enemy.y * tile + 1, 11, 10);
        ctx.fillStyle = '#7bd0ff';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.fillText(String(enemy.shields), enemy.x * tile + 3, enemy.y * tile + 9);
      }
      if (Object.values(enemy.statuses || {}).some(n => n > 0)) {
        ctx.fillStyle = enemy.statuses.freeze ? '#7bd0ff' : enemy.statuses.stun || enemy.statuses.petrify ? '#facc15' : '#fb923c';
        ctx.beginPath();
        ctx.arc(enemy.x * tile + 27, enemy.y * tile + 5, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!enemy.isSpawner && distance(enemy, game.player) <= enemy.range && hasSight(game, enemy, game.player)) {
        ctx.fillStyle = '#f87171';
        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        ctx.fillText('!', enemy.x * tile + 24, enemy.y * tile + 17);
      }
    }

    // 9. Player Wizard & VFX
    drawCanvasWizard(ctx, game.player, tile, time);
    for (const effect of game.effects || []) drawCanvasEffect(ctx, effect, tile);

    // 10. Hover Reticle & AoE Preview
    const hover = state.hover;
    if (hover) {
      if (spell) {
        const r = spell.radius || 0;
        ctx.fillStyle = `${spell.color}30`;
        for (let y = Math.max(0, hover.y - r); y <= Math.min(SIZE - 1, hover.y + r); y++) {
          for (let x = Math.max(0, hover.x - r); x <= Math.min(SIZE - 1, hover.x + r); x++) {
            ctx.fillRect(x * tile + 1, y * tile + 1, tile - 2, tile - 2);
          }
        }
      }
      ctx.strokeStyle = spell ? spell.color : '#ffdf9f';
      ctx.lineWidth = 1.8;
      ctx.strokeRect(hover.x * tile + 1.5, hover.y * tile + 1.5, tile - 3, tile - 3);
    }
  }

  function invalidate() {
    cachedRangeKey = null;
    cachedThreatKey = null;
  }

  let lastFrame = 0;
  function startAnimationLoop() {
    function animate(now) {
      if (state.view === 'realm' && !document.hidden && now - lastFrame > 50) {
        lastFrame = now;
        draw(now);
      }
      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }

  return { draw, invalidate, startAnimationLoop };
}
