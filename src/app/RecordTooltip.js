let nextTooltipId = 0;

/** A top-layer tooltip avoids clipping inside the record's scrolling tables. */
export function attachRecordTooltip(target, text) {
  const tooltip = document.createElement('span');
  tooltip.className = 'RecordTooltip';
  tooltip.id = `record-tooltip-${++nextTooltipId}`;
  tooltip.setAttribute('role', 'tooltip');
  tooltip.setAttribute('popover', 'manual');
  tooltip.textContent = text;
  target.setAttribute('aria-describedby', tooltip.id);
  target.append(tooltip);
  const hide = () => tooltip.hidePopover();
  const show = () => {
    tooltip.showPopover();
    const bounds = target.getBoundingClientRect();
    const size = tooltip.getBoundingClientRect();
    const margin = 8;
    tooltip.style.left = `${Math.max(margin, Math.min(innerWidth - size.width - margin, bounds.x + (bounds.width - size.width) / 2))}px`;
    tooltip.style.top = `${bounds.top >= size.height + margin ? bounds.top - size.height - margin : bounds.bottom + margin}px`;
  };
  target.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') show(); });
  target.addEventListener('pointerleave', hide);
  target.addEventListener('click', show);
}
