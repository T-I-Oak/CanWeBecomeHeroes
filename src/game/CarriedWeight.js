import { getTagWeight } from './TagCatalog.js';

export function getCarriedWeight(intrinsicTags, equipment) {
  const equipmentWeight = equipment.reduce((total, item) => total + (item?.chip?.weight ?? 0), 0);
  return getTagWeight(intrinsicTags) + equipmentWeight;
}
