import {
  behaviorName, componentName, damageTypeName, equipmentBonusText,
  equipmentDesc, equipmentName, grimoireSpellDesc, grimoireSpellName,
  tagName, upgradeName,
} from '../i18n/game-text.js';
import { t } from '../i18n/i18n.js';
import { equipmentByName } from '../rules/core.js';

function formatComponentCounts(components) {
  const counts = new Map();
  for (const name of components) counts.set(name, (counts.get(name) || 0) + 1);
  return [...counts.entries()].map(([name, count]) => (count > 1 ? `${count}× ${componentName(name)}` : componentName(name))).join(', ');
}

export function formatEquipmentSlotTooltip(game, slot) {
  const slotLabel = t(`slots.${slot.toLowerCase()}`);
  const wornList = Object.values(game?.equipment || {}).filter(e => equipmentByName.get(e.name)?.slot === slot);
  if (!wornList.length) return t('tooltip.equipmentEmpty', { slot: slotLabel });

  return wornList.map(worn => {
    const item = equipmentByName.get(worn.name);
    if (!item) return equipmentName(worn.name);
    const lines = [`${equipmentName(item.name)} · ${slotLabel}`];
    if (item.tags?.length) {
      lines.push(t('tooltip.equipmentTags', { tags: item.tags.map(tagName).join(' · ') }));
    }
    const details = [...(item.bonuses || []).map(equipmentBonusText), equipmentDesc(item)].filter(Boolean);
    if (details.length) lines.push('', ...details);
    if (worn.components?.length) {
      lines.push('', t('tooltip.equipmentComponents', { components: formatComponentCounts(worn.components) }));
    }
    return lines.join('\n');
  }).join('\n\n');
}

export function formatSpellTooltip(spell) {
  if (!spell) return '';
  const name = grimoireSpellName(spell);
  const levelLabel = spell.level != null ? t('compendium.levelEyebrow', { level: spell.level }) : '';
  const lines = [levelLabel ? `${name} · ${levelLabel}` : name];

  const tagsText = (spell.tags || []).map(tagName).join(' · ');
  const behaviorText = behaviorName(spell.behavior);
  if (tagsText) {
    lines.push(t('tooltip.spellType', { tags: tagsText, behavior: behaviorText }));
  } else if (behaviorText) {
    lines.push(behaviorText);
  }

  if (spell.damage > 0 && spell.damageTypes?.length) {
    lines.push(t('tooltip.spellDamageType', { types: spell.damageTypes.map(damageTypeName).join(' / ') }));
  }

  const allUpgrades = spell.upgrades || [];
  const learnedSet = new Set(spell.learnedUpgrades || []);
  const applied = allUpgrades.filter(u => learnedSet.has(u.sp_id));
  if (allUpgrades.length || applied.length) {
    lines.push(applied.length
      ? t('tooltip.spellUpgradeLevelWithList', {
        current: applied.length,
        max: allUpgrades.length,
        list: applied.map(upgradeName).join(', '),
      })
      : t('tooltip.spellUpgradeLevel', { current: 0, max: allUpgrades.length }));
  }

  const desc = grimoireSpellDesc(spell);
  if (desc) lines.push('', desc);
  return lines.join('\n');
}

export function bindTooltips() {
  const tooltip = document.createElement('div');
  tooltip.id = 'game-tooltip';
  tooltip.className = 'tooltip';
  tooltip.setAttribute('role', 'tooltip');
  tooltip.hidden = true;
  document.body.append(tooltip);

  let hovered = null;
  let active = null;
  const observer = new ResizeObserver(position);

  function position() {
    if (!active || !active.isConnected) {
      tooltip.hidden = true;
      return;
    }
    const rect = active.getBoundingClientRect();
    const { clientWidth, clientHeight } = document.documentElement;
    tooltip.hidden = !rect.width || !rect.height || rect.bottom <= 0 || rect.top >= clientHeight;
    if (tooltip.hidden) return;

    const margin = 8;
    const gap = 9;
    const { width, height } = tooltip.getBoundingClientRect();
    const spaceAbove = rect.top - gap - margin;
    const spaceBelow = clientHeight - rect.bottom - gap - margin;
    const placeAbove = height <= spaceAbove || (height > spaceBelow && spaceAbove >= spaceBelow);
    const top = placeAbove ? rect.top - gap - height : rect.bottom + gap;
    const left = rect.left + (rect.width - width) / 2;
    tooltip.style.left = Math.max(margin, Math.min(left, clientWidth - width - margin)) + 'px';
    tooltip.style.top = Math.max(margin, Math.min(top, clientHeight - height - margin)) + 'px';
  }

  function show(target) {
    const next = target?.dataset?.tooltip ? target : null;
    if (next !== active) {
      active?.removeAttribute('aria-describedby');
      observer.disconnect();
      active = next;
      if (active) {
        active.setAttribute('aria-describedby', tooltip.id);
        observer.observe(active);
        observer.observe(tooltip);
      }
    }
    if (!active) {
      tooltip.hidden = true;
      return;
    }
    tooltip.textContent = active.dataset.tooltip;
    position();
  }

  function update() {
    const focused = document.querySelector('[data-tooltip]:focus-visible');
    show(hovered?.isConnected ? hovered : focused);
  }

  function trackHover(element) {
    const target = element?.closest?.('[data-tooltip]') ?? null;
    if (target === hovered) return;
    hovered = target;
    update();
  }

  document.addEventListener('pointerover', event => trackHover(event.target));
  document.addEventListener('pointerout', event => trackHover(event.relatedTarget));
  document.addEventListener('click', update);
  document.addEventListener('focusin', update);
  document.addEventListener('focusout', () => show(hovered?.isConnected ? hovered : null));
  document.addEventListener('localechange', update);
  document.addEventListener('scroll', position, true);
  window.addEventListener('resize', position);
}
