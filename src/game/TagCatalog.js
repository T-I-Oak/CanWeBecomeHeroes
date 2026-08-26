export const TAGS = Object.freeze({
  valor: { group: 'status', stat: 'power', weight: 3, price: 2 },
  iron: { group: 'status', stat: 'power', weight: 5, price: 2 },
  arcane: { group: 'status', stat: 'magic', weight: 2, price: 3 },
  cloth: { group: 'status', stat: 'magic', weight: 1, price: 1 },
  dexterity: { group: 'status', stat: 'speed', weight: 1, price: 2 },
  feather: { group: 'status', stat: 'speed', weight: 1, price: 2 },
  reputation: { group: 'status', stat: 'negotiation', weight: 2, price: 3 },
  gem: { group: 'status', stat: 'negotiation', weight: 5, price: 5 },
  blessing: { group: 'status', stat: 'luck', weight: 1, price: 3 },
  fortune: { group: 'status', stat: 'luck', weight: 1, price: 3 },
  fire: { group: 'attribute', weight: 2, price: 2 },
  water: { group: 'attribute', weight: 2, price: 2 },
  lightning: { group: 'attribute', weight: 2, price: 3 },
  vitality: { group: 'attribute', weight: 1, price: 3 },
  area: { group: 'attribute', weight: 3, price: 3 },
});

export const STATUS_TAGS = Object.freeze({
  power: Object.freeze(['valor', 'iron']),
  magic: Object.freeze(['arcane', 'cloth']),
  speed: Object.freeze(['dexterity', 'feather']),
  negotiation: Object.freeze(['reputation', 'gem']),
  luck: Object.freeze(['blessing', 'fortune']),
});

const TAG_FRAME_PATHS = Object.freeze({
  power: '/assets/tags/frames/power.png',
  magic: '/assets/tags/frames/magic.png',
  speed: '/assets/tags/frames/speed.png',
  negotiation: '/assets/tags/frames/negotiation.png',
  luck: '/assets/tags/frames/luck.png',
  attribute: '/assets/tags/frames/attribute.png',
});

export function getStatusValue(tags, stat, maximum) {
  const sources = STATUS_TAGS[stat];
  if (!sources) return 0;
  const sourceMaximum = Math.max(...sources.map((tag) => Math.min(7, tags.filter((current) => current === tag).length)));
  return Math.min(maximum, sourceMaximum);
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

export function getTagFramePaths(tags) {
  return tags.map((tag) => {
    const definition = TAGS[tag];
    const frameKey = definition.group === 'attribute' ? 'attribute' : definition.stat;
    return TAG_FRAME_PATHS[frameKey];
  });
}
