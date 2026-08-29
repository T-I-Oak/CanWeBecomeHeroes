export const TAG_GLYPH_SCALE = 0.72;

export const TAGS = Object.freeze({
  valor: { group: 'status', stat: 'power', weight: 3, price: 2 },
  arcane: { group: 'status', stat: 'magic', weight: 2, price: 3 },
  dexterity: { group: 'status', stat: 'speed', weight: 1, price: 2 },
  reputation: { group: 'status', stat: 'negotiation', weight: 2, price: 3 },
  blessing: { group: 'status', stat: 'luck', weight: 1, price: 3 },
  iron: { group: 'status', stat: 'power', weight: 5, price: 2 },
  cloth: { group: 'status', stat: 'magic', weight: 1, price: 1 },
  feather: { group: 'status', stat: 'speed', weight: 1, price: 2 },
  gem: { group: 'status', stat: 'negotiation', weight: 5, price: 5 },
  fortune: { group: 'status', stat: 'luck', weight: 1, price: 3 },
  fire: { group: 'attribute', weight: 2, price: 2 },
  water: { group: 'attribute', weight: 2, price: 2 },
  lightning: { group: 'attribute', weight: 2, price: 3 },
  area: { group: 'attribute', weight: 3, price: 3 },
  vitality: { group: 'attribute', weight: 1, price: 3 },
});

export const STATUS_KEYS = Object.freeze(['power', 'magic', 'speed', 'negotiation', 'luck']);
export const TAG_ORDER = Object.freeze(Object.keys(TAGS));
export const ATTRIBUTE_TAGS = Object.freeze(['fire', 'water', 'lightning', 'area', 'vitality']);

export const STATUS_TAGS = Object.freeze(Object.fromEntries(STATUS_KEYS.map((status, index) => [
  status,
  Object.freeze([TAG_ORDER[index], TAG_ORDER[index + STATUS_KEYS.length]]),
])));

const ATTRIBUTE_TAG_BASE_COLOR = '#e1e8f0';

export function getStatusValue(tags, stat, maximum) {
  const sources = STATUS_TAGS[stat];
  if (!sources) return 0;
  const sourceMaximum = Math.max(...sources.map((tag) => Math.min(7, tags.filter((current) => current === tag).length)));
  return Math.min(maximum, sourceMaximum);
}

export function getTagIndex(tag) {
  const index = TAG_ORDER.indexOf(tag);
  if (index < 0) throw new RangeError(`Unknown tag: ${tag}`);
  return index;
}

export function sortTags(tags) {
  return [...tags].sort((left, right) => getTagIndex(left) - getTagIndex(right));
}

export function getEffectiveTagCount(tags, tag, maximums) {
  const rawCount = Math.min(7, tags.filter((current) => current === tag).length);
  const maximum = maximums?.[STATUS_KEYS[getTagIndex(tag) % STATUS_KEYS.length]];
  return Number.isFinite(maximum) ? Math.min(rawCount, maximum) : rawCount;
}

export function getTagWeight(tags) {
  return tags.reduce((total, tag) => total + TAGS[tag].weight, 0);
}

export function getTagPrice(tags) {
  if (tags.length === 0) return 1;
  return tags.reduce((total, tag) => total + TAGS[tag].price, 0) * tags.length;
}

export function getTagPaths(tags) {
  return tags.map((tag) => `/assets/tags/${tag}.png`);
}

export function getTagBaseColors(tags) {
  return tags.map((tag) => {
    const definition = TAGS[tag];
    return definition.group === 'attribute' ? ATTRIBUTE_TAG_BASE_COLOR : STATUS_VISUALS[definition.stat].tagBaseColor;
  });
}

export function getTagGlyphScales(tags) {
  return tags.map(() => TAG_GLYPH_SCALE);
}
import { STATUS_VISUALS } from './StatusVisualCatalog.js';
