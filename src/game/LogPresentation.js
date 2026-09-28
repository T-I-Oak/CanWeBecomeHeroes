import { getEnemyDefinitionById } from './EnemyCatalog.js';
import { getHeroDefinitionAssetPath } from './HeroFactory.js';
import { getItemDefinitionAssetPath } from './ItemFactory.js';
import { getLocationVisual } from './LocationVisualCatalog.js';
import { STATUS_VISUALS } from './StatusVisualCatalog.js';
import { getUniqueSkillDetail } from './UniqueSkillCatalog.js';

const PLACEHOLDER = /\{(\w+)\}/g;

function iconPathFor(kind, id) {
  if (kind === 'hero') return getHeroDefinitionAssetPath(id);
  if (kind === 'enemy') return getEnemyDefinitionById(id).assetPath;
  if (kind === 'item') return getItemDefinitionAssetPath(id);
  if (kind === 'unique-skill') return `/assets/tags/${getUniqueSkillDetail(id).affinityTag}.png`;
  if (kind === 'tag') return `/assets/tags/${id}.png`;
  if (kind === 'status') return STATUS_VISUALS[id].iconPath;
  if (kind === 'area' || kind === 'facility') return getLocationVisual(id).iconPath;
  if (kind === 'term') return null;
  throw new RangeError(`Unknown log reference: ${kind}`);
}

function createValuePart(textRepository, value) {
  if (!value || typeof value !== 'object' || value.kind === 'label') {
    const text = value?.kind === 'label' ? textRepository.getLabel(value.id, value.values) : value;
    return { type: 'text', value: String(text) };
  }
  const id = value.kind === 'hero' ? value.heroId : value.id;
  const label = value.kind === 'hero' ? textRepository.getHeroLabel(value) : textRepository.getName(value.kind, id);
  return { type: 'reference', kind: value.kind, id, label, iconPath: iconPathFor(value.kind, id) };
}

/** Splits a stored log into text and static references. History can turn the references into links. */
export function createLogMessageParts(textRepository, { key, values = {} }) {
  const template = textRepository.getLabelTemplate(key);
  const parts = [];
  let cursor = 0;
  for (const match of template.matchAll(PLACEHOLDER)) {
    if (!(match[1] in values)) throw new RangeError(`Missing label parameter: ${match[1]}`);
    if (match.index > cursor) parts.push({ type: 'text', value: template.slice(cursor, match.index) });
    parts.push(createValuePart(textRepository, values[match[1]]));
    cursor = match.index + match[0].length;
  }
  if (cursor < template.length) parts.push({ type: 'text', value: template.slice(cursor) });
  return parts;
}
