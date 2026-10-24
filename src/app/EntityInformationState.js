import { STATUS_KEYS } from '../game/TagCatalog.js';
import { TAG_DISPLAY_GRID } from '../game/TagDisplayLayout.js';

export function readEntityInformationState(entity, texts) {
  const item = entity.chip.type === 'item';
  const enemy = entity.chip.type === 'enemy';
  const chip = entity.chip;
  const preview = JSON.stringify([chip.radius, chip.centerPath, chip.tagPaths, chip.tagBaseColors, chip.tagGlyphScales,
    chip.fillColor, chip.fillColors, chip.borderColor, chip.borderColors, chip.flipped, chip.attributeValues,
    chip.physicalDamageReduction, chip.twoEdgedSwordMultiplier, chip.bewildered, chip.bewildermentLevel,
    chip.misfortuneDamageRate, chip.nightFamiliarCount, chip.storageCount, chip.storageCapacity, globalThis.devicePixelRatio]);
  if (item) return { item, preview, previewRadius: chip.radius, name: texts.getInformationDetail('item', entity.type)?.name ?? entity.type,
    badges: JSON.stringify([entity.tags, chip.weight, entity.value]), profile: JSON.stringify([entity.type, entity.category]) };
  const statuses = [...STATUS_KEYS, enemy ? 'hp' : 'stamina'].map(status => ({ status,
    current: status === 'hp' ? entity.hp : status === 'stamina' ? entity.stamina : entity.getStatus(status),
    maximum: status === 'hp' ? entity.maximumHp : entity.maximums[status] }));
  const equipment = enemy ? entity.equipment.map((value, index) => [String(index), value]) : Object.entries(entity.equipment);
  return { item, enemy, preview, previewRadius: chip.radius, name: enemy ? texts.getName('enemy', entity.definition.id) : `【${texts.getHeroLabel(entity)}】`,
    profile: enemy ? entity.definition.id : entity.heroId, statuses,
    tags: TAG_DISPLAY_GRID.flat().map(tag => entity.getTagCount(tag)), weight: entity.getCarriedWeight(),
    skill: entity.uniqueSkill, equipment: equipment.flatMap(([slot, value]) => [slot, value,
      value && JSON.stringify([value.tags, value.chip.centerPath, value.category, value.destination])]) };
}

export function sameInformationValues(first, second) {
  return first.length === second.length && first.every((value, index) => value === second[index]);
}
