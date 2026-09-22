const ENTITY_KIND_BY_CHIP_TYPE = Object.freeze({ hero: 'hero', enemy: 'enemy', item: 'item' });
const DEFINITION_INFORMATION_KINDS = new Set(['hero', 'enemy', 'item', 'unique-skill']);

function getDefinitionId(entity, kind) {
  if (kind === 'hero') return entity.heroId;
  if (kind === 'enemy') return entity.definition.id;
  if (kind === 'item') return entity.type;
  throw new RangeError(`Unsupported information target kind: ${kind}`);
}

export function createInstanceInformationTarget(entity, entityRegistry) {
  const kind = ENTITY_KIND_BY_CHIP_TYPE[entity?.chip?.type];
  if (!kind) throw new RangeError('Information targets require a Hero, Enemy, or Item instance.');
  const instanceId = entityRegistry.getInstanceId(entity);
  if (!instanceId) throw new RangeError('Information targets require a registered instance.');
  return Object.freeze({ kind, definitionId: getDefinitionId(entity, kind), instanceId });
}

export function createDefinitionInformationTarget(kind, definitionId) {
  if (!DEFINITION_INFORMATION_KINDS.has(kind) || !definitionId) throw new RangeError('Information definition targets require a supported kind and definition ID.');
  return Object.freeze({ kind, definitionId });
}
