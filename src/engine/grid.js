import { SIZE } from '../data/constants.js';
import { covers } from '../data/bestiary.js';

export { SIZE };

const CELL_COUNT = SIZE * SIZE;
// Reusable flat typed arrays for zero-allocation BFS pathfinding (safe because BFS is synchronous & non-reentrant).
const bfsVisited = new Uint32Array(CELL_COUNT);
const bfsParent = new Int16Array(CELL_COUNT);
const bfsQueue = new Int16Array(CELL_COUNT);
let bfsEpoch = 0;

function nextEpoch() {
  if (++bfsEpoch === 0xffffffff) {
    bfsVisited.fill(0);
    bfsEpoch = 1;
  }
  return bfsEpoch;
}

export const distance = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

export function random(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let n = state;
    n = Math.imul(n ^ (n >>> 15), n | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

export function isPassable(game, x, y, flying = false) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return false;
  const tile = game.tiles[y][x];
  return tile === 0 || (flying && tile === 2);
}

export function hasSight(game, from, to, allowWallEndpoint = false) {
  let x = from.x;
  let y = from.y;
  const tx = to.x;
  const ty = to.y;
  const dx = Math.abs(tx - x);
  const sx = x < tx ? 1 : -1;
  const dy = -Math.abs(ty - y);
  const sy = y < ty ? 1 : -1;
  let error = dx + dy;
  const tiles = game.tiles;
  while (x !== tx || y !== ty) {
    const e = 2 * error;
    if (e >= dy) { error += dy; x += sx; }
    if (e <= dx) { error += dx; y += sy; }
    if (allowWallEndpoint && x === tx && y === ty) return true;
    const tile = tiles[y]?.[x];
    // Chasms (2) do NOT block line of sight; only walls (1) and out-of-bounds block sight.
    if (tile !== 0 && tile !== 2) return false;
  }
  return true;
}

const CARDINAL_DIRS = [[0, -1], [-1, 0], [1, 0], [0, 1]];
const ENEMY_BFS_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function shortestPath(game, from, target, flying = false) {
  if (!Number.isInteger(target?.x) || !Number.isInteger(target?.y) || !isPassable(game, target.x, target.y, flying)) return null;
  if (from.x === target.x && from.y === target.y) return [];

  const epoch = nextEpoch();
  const startIdx = from.y * SIZE + from.x;
  const targetIdx = target.y * SIZE + target.x;
  let head = 0;
  let tail = 0;
  bfsQueue[tail++] = startIdx;
  bfsVisited[startIdx] = epoch;
  bfsParent[startIdx] = -1;

  const tiles = game.tiles;
  while (head < tail) {
    const curr = bfsQueue[head++];
    const cx = curr % SIZE;
    const cy = (curr - cx) / SIZE;
    for (let d = 0; d < 4; d++) {
      const nx = cx + CARDINAL_DIRS[d][0];
      const ny = cy + CARDINAL_DIRS[d][1];
      if (nx < 0 || ny < 0 || nx >= SIZE || ny >= SIZE) continue;
      const tile = tiles[ny][nx];
      if (tile !== 0 && !(flying && tile === 2)) continue;
      const nIdx = ny * SIZE + nx;
      if (bfsVisited[nIdx] === epoch) continue;
      bfsVisited[nIdx] = epoch;
      bfsParent[nIdx] = curr;
      if (nIdx === targetIdx) {
        const path = [];
        for (let idx = nIdx; idx !== startIdx; idx = bfsParent[idx]) {
          const px = idx % SIZE;
          path.push({ x: px, y: (idx - px) / SIZE });
        }
        path.reverse();
        return path;
      }
      bfsQueue[tail++] = nIdx;
    }
  }
  return null;
}

// Fast flat-array BFS from target outward to pick the first reachable move among candidate adjacent tiles.
export function findBestStepToward(game, target, moves, flying = false) {
  if (!moves.length) return null;
  const epoch = nextEpoch();
  const startIdx = target.y * SIZE + target.x;
  let head = 0;
  let tail = 0;
  bfsQueue[tail++] = startIdx;
  bfsVisited[startIdx] = epoch;

  // Map move cell indices for O(1) lookup (at most 4 moves).
  const moveIndices = moves.map(m => m.y * SIZE + m.x);
  const tiles = game.tiles;
  while (head < tail) {
    const curr = bfsQueue[head++];
    for (let m = 0; m < moveIndices.length; m++) {
      if (moveIndices[m] === curr) return moves[m];
    }
    const cx = curr % SIZE;
    const cy = (curr - cx) / SIZE;
    for (let d = 0; d < 4; d++) {
      const nx = cx + ENEMY_BFS_DIRS[d][0];
      const ny = cy + ENEMY_BFS_DIRS[d][1];
      if (nx < 0 || ny < 0 || nx >= SIZE || ny >= SIZE) continue;
      const tile = tiles[ny][nx];
      if (tile !== 0 && !(flying && tile === 2)) continue;
      const nIdx = ny * SIZE + nx;
      if (bfsVisited[nIdx] === epoch) continue;
      bfsVisited[nIdx] = epoch;
      bfsQueue[tail++] = nIdx;
    }
  }
  return null;
}

export function areaCells(center, radius) {
  const cells = [];
  const yMin = Math.max(1, center.y - radius);
  const yMax = Math.min(SIZE - 2, center.y + radius);
  const xMin = Math.max(1, center.x - radius);
  const xMax = Math.min(SIZE - 2, center.x + radius);
  for (let y = yMin; y <= yMax; y++) {
    for (let x = xMin; x <= xMax; x++) cells.push({ x, y });
  }
  return cells;
}

export function onSegment(from, to, p) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const px = p.x - from.x;
  const py = p.y - from.y;
  const dot = px * dx + py * dy;
  return dot > 0 && dot <= dx * dx + dy * dy && Math.abs(px * dy - py * dx) <= 0.55 * Math.hypot(dx, dy);
}

export function isTileOccupied(game, x, y, except = null) {
  if (game.player !== except && game.player.x === x && game.player.y === y) return true;
  const enemies = game.enemies;
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (e !== except && e.hp > 0 && Math.max(Math.abs(e.x - x), Math.abs(e.y - y)) <= (e.radius || 0)) return true;
  }
  const allies = game.allies;
  if (allies) {
    for (let i = 0; i < allies.length; i++) {
      const a = allies[i];
      if (a !== except && a.hp > 0 && Math.max(Math.abs(a.x - x), Math.abs(a.y - y)) <= (a.radius || 0)) return true;
    }
  }
  return false;
}

export function canStand(game, unit, pos) {
  const radius = unit.radius || 0;
  const flying = !!unit.flying;
  for (let y = pos.y - radius; y <= pos.y + radius; y++) {
    for (let x = pos.x - radius; x <= pos.x + radius; x++) {
      if (!isPassable(game, x, y, flying) || isTileOccupied(game, x, y, unit)) return false;
    }
  }
  return true;
}

export function findOpenTileNear(game, origin, maxDist = 2, flying = false, unit = null) {
  for (let r = 0; r <= maxDist; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = origin.x + dx;
        const y = origin.y + dy;
        if (isPassable(game, x, y, flying) && !isTileOccupied(game, x, y) && (!unit?.radius || canStand(game, unit, { x, y }))) {
          return { x, y };
        }
      }
    }
  }
  return null;
}

export { covers };
