import { outfitColor } from '../data/campaign.js';
import { units } from '../data/bestiary.js';
import { componentByName } from '../rules/core.js';
import {
  cloudIconSvg, componentIconSvg, entityIconSvg,
  pickupIconSvg, shrineIconSvg, unitIconSvg,
} from './svg-icons.js';

// Cached SVG-to-Image sprite bridge so every monster, boss, companion, shrine, item, component,
// and cloud on the 2D board renders its exact unique visual asset crisply with zero per-frame SVG overhead.
const spriteImgCache = new Map();

function getSvgSpriteImage(key, svgBuilder) {
  if (typeof Image === 'undefined') return null;
  let entry = spriteImgCache.get(key);
  if (!entry) {
    entry = { img: new Image(), ready: false };
    const svg = svgBuilder();
    entry.img.onload = () => { entry.ready = true; };
    entry.img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    spriteImgCache.set(key, entry);
  }
  return entry.ready ? entry.img : null;
}

// High-Detail Canvas 2D Tileset & Sprite Renderer (32x32 per tile)

export function drawStaticDungeonTile(ctx, x, y, tile, tVal, theme, n) {
  const px = x * tile;
  const py = y * tile;
  if (tVal === 2) {
    const grad = ctx.createRadialGradient(px + tile / 2, py + tile / 2, 2, px + tile / 2, py + tile / 2, tile * 0.72);
    grad.addColorStop(0, '#020408');
    grad.addColorStop(0.7, '#060c14');
    grad.addColorStop(1, '#112230');
    ctx.fillStyle = grad;
    ctx.fillRect(px, py, tile, tile);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 1.5, py + 1.5, tile - 3, tile - 3);
    return;
  }

  const isEmber = theme === 1;
  if (tVal === 1) {
    const baseColors = isEmber ? ['#2b211f', '#312522', '#261d1b'] : ['#1f2d25', '#24342b', '#1c2921'];
    ctx.fillStyle = baseColors[Math.floor(n * 3)];
    ctx.fillRect(px + 0.5, py + 0.5, tile - 1, tile - 1);

    ctx.fillStyle = isEmber ? 'rgba(251, 146, 60, 0.14)' : 'rgba(134, 239, 172, 0.12)';
    ctx.fillRect(px + 1, py + 1, tile - 2, 3);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.fillRect(px + 1, py + tile - 4, tile - 2, 3.5);

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 1, py + tile * 0.52);
    ctx.lineTo(px + tile - 1, py + tile * 0.52);
    ctx.moveTo(px + tile * 0.5, py + 1);
    ctx.lineTo(px + tile * 0.5, py + tile * 0.52);
    ctx.stroke();

    if (n > 0.62) {
      ctx.fillStyle = isEmber ? 'rgba(249, 115, 22, 0.45)' : 'rgba(74, 222, 128, 0.32)';
      ctx.fillRect(px + 6 + Math.floor(n * 10), py + 6, 5, 2.5);
      ctx.fillRect(px + 9 + Math.floor(n * 8), py + 8.5, 3, 2);
    }
    return;
  }

  const floorColors = isEmber ? ['#161211', '#181413', '#141110'] : ['#111a15', '#131d17', '#0f1713'];
  ctx.fillStyle = floorColors[Math.floor(n * 3)];
  ctx.fillRect(px + 0.5, py + 0.5, tile - 1, tile - 1);

  ctx.strokeStyle = isEmber ? 'rgba(255, 223, 159, 0.035)' : 'rgba(134, 239, 172, 0.04)';
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 0.5, py + 0.5, tile - 1, tile - 1);

  if (n > 0.78) {
    ctx.fillStyle = isEmber ? 'rgba(251, 146, 60, 0.16)' : 'rgba(134, 239, 172, 0.16)';
    ctx.beginPath();
    ctx.arc(px + 10 + n * 8, py + 21, 1.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (n < 0.16) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.fillRect(px + 18, py + 11, 3, 2);
  }
}

export function drawChasmTwinkle(ctx, x, y, tile, n, time) {
  const px = x * tile;
  const py = y * tile;
  const twinkle = 0.25 + 0.35 * Math.sin(time * 0.002 + x * 1.7 + y * 2.3);
  ctx.fillStyle = `rgba(125, 211, 252, ${twinkle})`;
  ctx.beginPath();
  ctx.arc(px + 8 + (n * 16), py + 8 + (((n * 7) % 1) * 16), 1.2, 0, Math.PI * 2);
  ctx.fill();
}

export function drawCanvasCloud(ctx, cloud, tile, time) {
  const cx = cloud.x * tile + tile / 2;
  const cy = cloud.y * tile + tile / 2;
  const pulse = 1 + 0.06 * Math.sin(time * 0.004 + cloud.x + cloud.y);
  const drift = Math.sin(time * 0.003 + cloud.x * 2) * 1.4;
  ctx.save();
  const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, tile * 0.56 * pulse);
  grad.addColorStop(0, `${cloud.color}44`);
  grad.addColorStop(0.65, `${cloud.color}22`);
  grad.addColorStop(1, `${cloud.color}00`);
  ctx.fillStyle = grad;
  ctx.fillRect(cloud.x * tile, cloud.y * tile, tile, tile);

  const sprite = getSvgSpriteImage(`cloud:${cloud.type}`, () => cloudIconSvg(cloud.type, 64));
  if (sprite) {
    ctx.globalAlpha = 0.86;
    const sz = tile * 0.92 * pulse;
    ctx.drawImage(sprite, cx - sz / 2 + drift, cy - sz / 2, sz, sz);
  } else {
    ctx.fillStyle = `${cloud.color}55`;
    ctx.beginPath();
    ctx.arc(cx - 5 + drift, cy + 2, 5.5, 0, Math.PI * 2);
    ctx.arc(cx + 4 + drift, cy + 1, 6, 0, Math.PI * 2);
    ctx.arc(cx + drift, cy - 3, 5.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawCanvasPortal(ctx, portal, tile, isOpen, time) {
  const cx = portal.x * tile + tile / 2;
  const cy = portal.y * tile + tile / 2;
  const primary = portal.theme ? '#fb923c' : '#34d399';
  const secondary = portal.theme ? '#fef08a' : '#7bd0ff';
  const pulse = 0.88 + 0.12 * Math.sin(time * 0.005 + portal.y);

  ctx.save();
  if (isOpen) {
    const glow = ctx.createRadialGradient(cx, cy, 3, cx, cy, tile * 0.65);
    glow.addColorStop(0, `${primary}99`);
    glow.addColorStop(0.6, `${primary}33`);
    glow.addColorStop(1, `${primary}00`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, tile * 0.65, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = isOpen ? primary : '#526358';
  ctx.lineWidth = isOpen ? 2.4 : 1.8;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 10.5 * pulse, 13.5 * pulse, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = isOpen ? `${primary}55` : '#1a241f';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 7.5 * pulse, 10.5 * pulse, 0, 0, Math.PI * 2);
  ctx.fill();

  if (isOpen) {
    const rot = time * 0.003;
    ctx.strokeStyle = secondary;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(cx, cy, 5.5, rot, rot + Math.PI * 1.1);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 2.3 * pulse, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = '#64746b';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy - 4); ctx.lineTo(cx + 4, cy + 4);
    ctx.moveTo(cx + 4, cy - 4); ctx.lineTo(cx - 4, cy + 4);
    ctx.stroke();
  }
  ctx.restore();
}

const SHRINE_COLORS = {
  transmutation: '#7bd0ff',
  duplication: '#c084fc',
  empowerment: '#ffdf9f',
  chronomancy: '#38bdf8',
  calling: '#4ade80',
};

export function drawCanvasShrine(ctx, shrine, tile, time) {
  const cx = shrine.x * tile + tile / 2;
  const cy = shrine.y * tile + tile / 2;
  const active = shrine.uses > 0;
  const sType = shrine.type || 'transmutation';
  const col = active ? (SHRINE_COLORS[sType] || '#7bd0ff') : '#4b5a52';
  const bob = active ? Math.sin(time * 0.004) * 1.4 : 0;

  ctx.save();
  if (active) {
    const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, tile * 0.6);
    glow.addColorStop(0, `${col}55`);
    glow.addColorStop(1, `${col}00`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, tile * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  const sprite = getSvgSpriteImage(`shrine:${sType}`, () => shrineIconSvg(sType, 64));
  if (sprite) {
    if (!active) ctx.globalAlpha = 0.42;
    const sz = tile * 0.96;
    ctx.drawImage(sprite, cx - sz / 2, cy - sz / 2 + bob * 0.6, sz, sz);
  } else {
    ctx.fillStyle = '#25312b';
    ctx.strokeStyle = active ? '#e5c27b' : '#3d4c44';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(cx - 9, cy + 4, 18, 7, 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 11 + bob);
    ctx.lineTo(cx + 7, cy - 2 + bob);
    ctx.lineTo(cx, cy + 4 + bob);
    ctx.lineTo(cx - 7, cy - 2 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

const PROP_COLORS = { chest: '#bb783e', scroll: '#fae4ac', tome: '#8861bf', companion: '#459b8c' };

export function drawCanvasItem(ctx, item, tile, time) {
  const cx = item.x * tile + tile / 2;
  const cy = item.y * tile + tile / 2;
  const bob = Math.sin(time * 0.005 + item.x * 1.3 + item.y) * 1.4;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 10, 7, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  const spriteKey = item.type === 'component' && item.name ? `comp:${item.name}`
    : item.type === 'component' && item.material ? `pickup:${item.material}`
    : item.type === 'companion' && item.name ? `unit:${item.name}`
    : `pickup:${item.type}`;
  const sprite = getSvgSpriteImage(spriteKey, () => {
    if (item.type === 'component' && item.name) return componentIconSvg(componentByName.get(item.name) || { name: item.name }, 64);
    if (item.type === 'component' && item.material) return pickupIconSvg(item.material, 64);
    if (item.type === 'companion' && item.name) return unitIconSvg(units.get(item.name) || { name: item.name, is_companion: true }, 64);
    return pickupIconSvg(item.type, 64);
  });
  if (sprite) {
    const sz = tile * 0.88;
    ctx.drawImage(sprite, cx - sz / 2, cy - sz / 2 + bob, sz, sz);
    ctx.restore();
    return;
  }

  if (PROP_COLORS[item.type]) {
    ctx.translate(cx, cy + bob);
    ctx.fillStyle = PROP_COLORS[item.type];
    if (item.type === 'companion') {
      ctx.fillRect(-6, 0, 12, 10);
      ctx.fillStyle = '#f5dbad'; ctx.fillRect(-4, -8, 8, 8);
      ctx.fillStyle = '#a7f3d0'; ctx.fillRect(6, -4, 2, 13);
    } else if (item.type === 'chest') {
      ctx.fillRect(-9, -5, 18, 13);
      ctx.fillStyle = '#55341e'; ctx.fillRect(-9, 0, 18, 2);
      ctx.fillStyle = '#ffde84'; ctx.fillRect(-2, -1, 4, 5);
    } else {
      ctx.fillRect(-7, -9, 14, 18);
      ctx.fillStyle = item.type === 'scroll' ? '#927044' : '#ebcbff';
      ctx.fillRect(-5, -4, 9, 2); ctx.fillRect(-5, 1, 7, 2);
      if (item.type === 'tome') ctx.fillRect(-6, -9, 2, 18);
    }
  } else if (item.type === 'potion') {
    ctx.fillStyle = '#d4a373';
    ctx.fillRect(cx - 2.5, cy - 10 + bob, 5, 3);
    ctx.fillStyle = '#f43f5e';
    ctx.strokeStyle = '#fecdd3';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(cx, cy + 1 + bob, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - 2.5, cy - 1 + bob, 1.8, 0, Math.PI * 2);
    ctx.fill();
  } else if (item.type === 'shard') {
    const glow = ctx.createRadialGradient(cx, cy + bob, 1, cx, cy + bob, 11);
    glow.addColorStop(0, 'rgba(255, 223, 159, 0.55)');
    glow.addColorStop(1, 'rgba(255, 223, 159, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(cx, cy + bob, 11, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#e5c27b';
    ctx.strokeStyle = '#fffbeb';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 10 + bob);
    ctx.lineTo(cx + 6.5, cy + bob);
    ctx.lineTo(cx, cy + 9 + bob);
    ctx.lineTo(cx - 6.5, cy + bob);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    const glow = ctx.createRadialGradient(cx, cy + bob, 1, cx, cy + bob, 11);
    glow.addColorStop(0, 'rgba(192, 132, 252, 0.5)');
    glow.addColorStop(1, 'rgba(192, 132, 252, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(cx, cy + bob, 11, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#c084fc';
    ctx.strokeStyle = '#f5d0fe';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      const rx = cx + Math.cos(a) * 7.2, ry = cy + bob + Math.sin(a) * 7.2;
      if (i === 0) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy + bob, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawCanvasWizard(ctx, player, tile, time) {
  const cx = player.x * tile + tile / 2;
  const cy = player.y * tile + tile / 2;
  const bob = Math.sin(time * 0.004) * 1.1;

  ctx.save();
  const aura = ctx.createRadialGradient(cx, cy + 2, 3, cx, cy + 2, tile * 0.62);
  aura.addColorStop(0, 'rgba(229, 194, 123, 0.34)');
  aura.addColorStop(0.65, 'rgba(123, 208, 255, 0.14)');
  aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(cx, cy + 2, tile * 0.62, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 12, 9, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  const outfit = outfitColor(player.outfit);
  ctx.fillStyle = outfit?.robe || '#254235';
  ctx.strokeStyle = '#e5c27b';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy + 11);
  ctx.quadraticCurveTo(cx - 7, cy - 1 + bob, cx, cy - 2 + bob);
  ctx.quadraticCurveTo(cx + 7, cy - 1 + bob, cx + 8, cy + 11);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#0d1512';
  ctx.beginPath();
  ctx.arc(cx, cy - 2 + bob, 5.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7bd0ff';
  ctx.fillRect(cx - 3, cy - 3 + bob, 2.2, 1.8);
  ctx.fillRect(cx + 0.8, cy - 3 + bob, 2.2, 1.8);

  ctx.fillStyle = outfit?.hat || '#2e4e3f';
  ctx.strokeStyle = '#ffdf9f';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 6 + bob, 10.5, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - 6.5, cy - 6.5 + bob);
  ctx.lineTo(cx + 1, cy - 16 + bob);
  ctx.lineTo(cx + 6.5, cy - 6.5 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#d4a373';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx + 9.5, cy - 5 + bob);
  ctx.lineTo(cx + 9, cy + 11);
  ctx.stroke();

  const orbPulse = 3.2 + Math.sin(time * 0.007) * 0.5;
  ctx.fillStyle = '#7bd0ff';
  ctx.beginPath();
  ctx.arc(cx + 9.5, cy - 7 + bob, orbPulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx + 9.2, cy - 7.5 + bob, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawCanvasAlly(ctx, ally, tile, time) {
  const cx = ally.x * tile + tile / 2;
  const cy = ally.y * tile + tile / 2;
  const bob = Math.sin(time * 0.005 + ally.x) * 1.2;
  const col = ally.color || '#4ade80';

  ctx.save();
  ctx.strokeStyle = 'rgba(74, 222, 128, 0.78)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 10.5, 10, 3.8, 0, 0, Math.PI * 2);
  ctx.stroke();

  const allyDef = units.get(ally.species || ally.name) || { name: ally.name || 'Ally', tags: ally.tags || ['Living'], is_companion: true };
  const sprite = getSvgSpriteImage(`unit:${allyDef.name}`, () => unitIconSvg(allyDef, 64));
  if (sprite) {
    const sz = tile * 0.96;
    ctx.drawImage(sprite, cx - sz / 2, cy - sz / 2 + bob - 1, sz, sz);
    ctx.restore();
    return;
  }

  ctx.fillStyle = `${col}cc`;
  ctx.strokeStyle = '#ecfdf5';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 10 + bob);
  ctx.lineTo(cx + 8, cy - 2 + bob);
  ctx.lineTo(cx + 6, cy + 9 + bob);
  ctx.lineTo(cx - 6, cy + 9 + bob);
  ctx.lineTo(cx - 8, cy - 2 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx - 2.6, cy - 1.5 + bob, 1.5, 0, Math.PI * 2);
  ctx.arc(cx + 2.6, cy - 1.5 + bob, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawCanvasEnemy(ctx, enemy, tile, time) {
  const cx = enemy.x * tile + tile / 2;
  const cy = enemy.y * tile + tile / 2;
  const bob = Math.sin(time * 0.0045 + enemy.id * 1.1) * 1.1;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.48)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 11.5, enemy.boss ? 11.5 : 8.5, 3.6, 0, 0, Math.PI * 2);
  ctx.fill();

  if (enemy.isFinalBoss || enemy.boss) {
    const glow = ctx.createRadialGradient(cx, cy, 3, cx, cy, tile * 0.68);
    glow.addColorStop(0, enemy.isFinalBoss ? 'rgba(248, 113, 113, 0.5)' : 'rgba(255, 223, 159, 0.35)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, tile * 0.68, 0, Math.PI * 2);
    ctx.fill();
  }

  const spriteKey = enemy.isSpawner ? 'world:lair' : `unit:${enemy.species || (enemy.isFinalBoss ? 'Mordred' : enemy.name || enemy.type)}`;
  const sprite = getSvgSpriteImage(spriteKey, () => {
    if (enemy.isSpawner) return entityIconSvg('lair', 64);
    const def = units.get(enemy.species) || (enemy.isFinalBoss ? units.get('Mordred') : null) || enemy;
    return unitIconSvg(def, 64);
  });
  if (sprite) {
    const scale = enemy.isFinalBoss ? 1.12 : enemy.boss ? 1.06 : 0.96;
    const sz = tile * scale;
    ctx.drawImage(sprite, cx - sz / 2, cy - sz / 2 + bob - 1, sz, sz);
    ctx.restore();
    return;
  }

  if (enemy.isSpawner) {
    const pulse = 1 + 0.08 * Math.sin(time * 0.006 + enemy.id);
    ctx.fillStyle = '#4c1d95';
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 13);
    ctx.lineTo(cx + 9, cy - 4);
    ctx.lineTo(cx + 7, cy + 11);
    ctx.lineTo(cx - 7, cy + 11);
    ctx.lineTo(cx - 9, cy - 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 3.5 * pulse, 5.5 * pulse, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.isFinalBoss) {
    const glow = ctx.createRadialGradient(cx, cy, 3, cx, cy, tile * 0.65);
    glow.addColorStop(0, 'rgba(248, 113, 113, 0.55)');
    glow.addColorStop(1, 'rgba(248, 113, 113, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(cx, cy, tile * 0.65, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#7f1d1d';
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy + bob, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#ffdf9f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 7 + bob); ctx.lineTo(cx - 5, cy - 14 + bob);
    ctx.lineTo(cx, cy - 9 + bob); ctx.lineTo(cx + 5, cy - 14 + bob); ctx.lineTo(cx + 8, cy - 7 + bob);
    ctx.stroke();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(cx - 3.5, cy - 1 + bob, 2.2, 0, Math.PI * 2);
    ctx.arc(cx + 3.5, cy - 1 + bob, 2.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.boss) {
    ctx.fillStyle = '#4a3a18';
    ctx.strokeStyle = '#ffdf9f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy + 1 + bob, 9.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#ffdf9f';
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy - 7 + bob); ctx.lineTo(cx - 4, cy - 13 + bob);
    ctx.lineTo(cx, cy - 8 + bob); ctx.lineTo(cx + 4, cy - 13 + bob); ctx.lineTo(cx + 7, cy - 7 + bob);
    ctx.stroke();
    ctx.fillStyle = '#f87171';
    ctx.beginPath();
    ctx.arc(cx - 3.2, cy + bob, 2, 0, Math.PI * 2);
    ctx.arc(cx + 3.2, cy + bob, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.type === 0) {
    ctx.strokeStyle = '#fb923c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy - 6 + bob); ctx.lineTo(cx - 9, cy - 12 + bob);
    ctx.moveTo(cx + 5, cy - 6 + bob); ctx.lineTo(cx + 9, cy - 12 + bob);
    ctx.stroke();

    ctx.fillStyle = '#ea580c';
    ctx.strokeStyle = '#fdba74';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(cx, cy + 1 + bob, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(cx - 3, cy - 0.5 + bob, 1.8, 0, Math.PI * 2);
    ctx.arc(cx + 3, cy - 0.5 + bob, 1.8, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.type === 1) {
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cx - 7.5, cy - 9 + bob, 15, 18, [6, 6, 3, 3]);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx - 5.5, cy - 2 + bob, 11, 3.5);
    ctx.fillStyle = '#7bd0ff';
    ctx.fillRect(cx - 4, cy - 1 + bob, 8, 1.6);
  } else if (enemy.type === 2) {
    ctx.strokeStyle = '#86efac';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i + time * 0.001;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 7, cy + bob + Math.sin(a) * 7);
      ctx.lineTo(cx + Math.cos(a) * 11, cy + bob + Math.sin(a) * 11);
      ctx.stroke();
    }
    ctx.fillStyle = '#3b0764';
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy + bob, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(cx, cy + bob, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx + 1, cy - 1 + bob, 1.2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const flap = Math.sin(time * 0.012 + enemy.id) * 2.5;
    ctx.fillStyle = 'rgba(250, 204, 21, 0.72)';
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.ellipse(cx - 6.5, cy - 1 + bob, 6, 4.5 + flap * 0.3, -0.35, 0, Math.PI * 2);
    ctx.ellipse(cx + 6.5, cy - 1 + bob, 6, 4.5 + flap * 0.3, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#86efac';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 1 + bob, 2.5, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawCanvasEffect(ctx, effect, tile) {
  const cx = effect.x * tile + tile / 2;
  const cy = effect.y * tile + tile / 2;
  ctx.save();
  const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, tile * 0.65);
  grad.addColorStop(0, `${effect.color}bb`);
  grad.addColorStop(0.6, `${effect.color}44`);
  grad.addColorStop(1, `${effect.color}00`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, tile * 0.65, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = effect.color;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(cx, cy, tile * 0.38, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
