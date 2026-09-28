export const CONDITION_ICON_SIZE = 49;
export const CONDITION_ICON_GAP = 4;
export const CONDITION_ICON_PADDING = 8;
export const CONDITION_ICON_CORNER_RATIO = 6 / 27;
export const CONDITION_GLYPH_SCALE = (1 - 2 * CONDITION_ICON_CORNER_RATIO * (1 - Math.SQRT1_2));
export const CONDITION_MINIMUM_COLOR = Object.freeze([0, 51, 255]);
export const CONDITION_MAXIMUM_COLOR = Object.freeze([230, 0, 0]);

const PHYSICAL_DEFENSE_MAXIMUM = 0.7;

export function getConditionIconEntries(chip) {
  const attributes = chip.attributeValues ?? {};
  const entries = [];
  if (attributes.fire > 0) entries.push({ id: 'fire', value: attributes.fire, minimum: 0, maximum: 7 });
  if (attributes.water > 0) entries.push({ id: 'water', value: attributes.water, minimum: 0, maximum: 7 });
  if (attributes.lightning > 0) entries.push({ id: 'lightning', value: attributes.lightning, minimum: 0, maximum: 7 });
  if (chip.physicalDamageReduction > 0) entries.push({ id: 'physical-defense', value: chip.physicalDamageReduction, minimum: 0, maximum: PHYSICAL_DEFENSE_MAXIMUM });
  if (chip.twoEdgedSwordMultiplier > 1) entries.push({ id: 'two-edged-sword', value: chip.twoEdgedSwordMultiplier, minimum: 2, maximum: 4 });
  if (chip.bewildered) entries.push({ id: 'bewilderment', value: 1, minimum: 1, maximum: 1 });
  if (chip.misfortuneDamageRate > 0) entries.push({ id: 'misfortune', value: chip.misfortuneDamageRate, minimum: 0.5, maximum: 1 });
  if (chip.nightFamiliarCount > 0) entries.push({ id: 'night-familiar', value: chip.nightFamiliarCount, minimum: 1, maximum: 6 });
  return entries;
}

export function getConditionIconColor(value, minimum, maximum) {
  const ratio = maximum === minimum ? 0 : Math.max(0, Math.min(1, (value - minimum) / (maximum - minimum)));
  return CONDITION_MINIMUM_COLOR.map((channel, index) => Math.round(channel + (CONDITION_MAXIMUM_COLOR[index] - channel) * ratio));
}

const CONDITION_ICON_INFORMATION = Object.freeze({
  fire: Object.freeze({ type: 'tag', data: Object.freeze({ tag: 'fire' }) }),
  water: Object.freeze({ type: 'tag', data: Object.freeze({ tag: 'water' }) }),
  lightning: Object.freeze({ type: 'tag', data: Object.freeze({ tag: 'lightning' }) }),
  'physical-defense': Object.freeze({ type: 'term', data: Object.freeze({ term: 'physical-defense' }) }),
  'two-edged-sword': Object.freeze({ type: 'term', data: Object.freeze({ term: 'two-edged-sword' }) }),
  bewilderment: Object.freeze({ type: 'term', data: Object.freeze({ term: 'bewilderment' }) }),
  misfortune: Object.freeze({ type: 'term', data: Object.freeze({ term: 'misfortune' }) }),
  'night-familiar': Object.freeze({ type: 'term', data: Object.freeze({ term: 'familiar' }) }),
});

export function getConditionIconInformationTarget(icon) {
  if (!icon || icon.ellipsis) return null;
  return CONDITION_ICON_INFORMATION[icon.id] ?? null;
}

export function getConditionIconAtPoint(chip, point) {
  if (!chip?.bounds || !point) return null;
  const icons = layoutConditionIcons(getConditionIconEntries(chip), chip.bounds.width);
  const top = chip.bounds.y + chip.bounds.height;
  return icons.find((icon) => {
    const left = chip.bounds.x + icon.x;
    return point.x >= left && point.x < left + CONDITION_ICON_SIZE && point.y >= top && point.y < top + CONDITION_ICON_SIZE;
  }) ?? null;
}

export function layoutConditionIcons(entries, width, size = CONDITION_ICON_SIZE, gap = CONDITION_ICON_GAP, padding = CONDITION_ICON_PADDING) {
  const stride = size + gap;
  const capacity = Math.floor((width - padding + gap) / stride);
  if (capacity <= 0 || entries.length === 0) return [];
  if (entries.length <= capacity) {
    return entries.map((entry, index) => ({ ...entry, x: padding + index * stride, ellipsis: false }));
  }
  const visibleCount = Math.max(0, capacity - 1);
  const icons = entries.slice(0, visibleCount).map((entry, index) => ({ ...entry, x: padding + index * stride, ellipsis: false }));
  icons.push({ id: 'ellipsis', x: padding + visibleCount * stride, ellipsis: true });
  return icons;
}
