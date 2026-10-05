const INFORMATION_KINDS = Object.freeze([
  'area',
  'facility',
  'status',
  'tag',
  'term',
  'item',
  'enemy',
  'unique-skill',
  'hero',
  'profession',
]);

export const TEXT_RESOURCE_PARTS = Object.freeze([
  Object.freeze({ path: '/data/text/ui.json', group: 'ui' }),
  Object.freeze({ path: '/data/text/log.json', group: 'ui', log: true }),
  ...INFORMATION_KINDS.map((kind) => Object.freeze({ path: `/data/text/information/${kind}.json`, group: 'information', kind })),
  Object.freeze({ path: '/data/text/nameplate.json', group: 'nameplate' }),
  Object.freeze({ path: '/data/text/vignette.json', group: 'vignette' }),
  Object.freeze({ path: '/data/text/tutorial.json', group: 'tutorial' }),
]);

export function isLogLabel(id) {
  return id.startsWith('log') && id !== 'logs';
}

export function createTextResource() {
  return { ui: null, information: {}, nameplate: null, vignette: null };
}

export function assignTextPart(resource, part, value) {
  if (part.group === 'information') resource.information[part.kind] = value;
  else if (part.log) Object.assign(resource.ui, value);
  else resource[part.group] = value;
}

export function textPart(resource, requestPath) {
  const part = TEXT_RESOURCE_PARTS.find((item) => requestPath.endsWith(item.path.slice(1)));
  if (!part) throw new RangeError(`Unknown text resource: ${requestPath}`);
  if (part.group === 'information') return resource.information?.[part.kind];
  if (part.group === 'ui') {
    return Object.fromEntries(Object.entries(resource.ui ?? {}).filter(([id]) => isLogLabel(id) === Boolean(part.log)));
  }
  return resource[part.group];
}
