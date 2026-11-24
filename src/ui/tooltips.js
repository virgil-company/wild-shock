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
    if (!active) return;
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
    if (target !== active) {
      active?.removeAttribute('aria-describedby');
      observer.disconnect();
      active = target;
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
  document.addEventListener('focusin', update);
  document.addEventListener('focusout', () => show(hovered?.isConnected ? hovered : null));
  document.addEventListener('localechange', update);
  document.addEventListener('scroll', position, true);
  window.addEventListener('resize', position);
}
