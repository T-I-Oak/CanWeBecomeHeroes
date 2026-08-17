import { TAGS } from './TagCatalog.js';

// 装備グリッドの描画順: 上段=頭、中段=右手・胴・左手、下段=脚。
export const EQUIPMENT_PARTS = Object.freeze(['head', 'weapon', 'torso', 'weapon', 'feet']);
const WEAPON_FOR_STATUS = Object.freeze({ valor: 'sword', iron: 'shield', arcane: 'staff', cloth: 'holy-book', dexterity: 'claw', feather: 'bow', reputation: 'banner', gem: 'orb', blessing: 'holy-symbol', fortune: 'tarot-cards' });
const TAG_KEYS = Object.freeze(Object.keys(TAGS));

export function randomFrom(values, random) {
  return values[Math.floor(random() * values.length)];
}

export function createTrendProductTags(trendTag, random) {
  return [trendTag, randomFrom(TAG_KEYS, random), randomFrom(TAG_KEYS, random)];
}

export function distributeTagCounts(tagBudget, random) {
  const counts = Array(EQUIPMENT_PARTS.length).fill(0);
  for (let index = 0; index < tagBudget; index += 1) {
    const eligible = counts.map((count, position) => ({ count, position })).filter(({ count }) => count < 3);
    counts[randomFrom(eligible, random).position] += 1;
  }
  return counts;
}

export function createTrendEquipmentItem({ part, count, productTags, itemFactory, random, x = 0, y = 0 }) {
  if (part === 'weapon') {
    const statusTag = productTags.find((tag) => WEAPON_FOR_STATUS[tag]);
    const weapon = statusTag ? WEAPON_FOR_STATUS[statusTag] : 'sword';
    const allowedTags = productTags.filter((tag) => TAGS[tag]?.group === 'attribute' || tag === statusTag);
    const tags = Array.from({ length: count }, () => randomFrom(allowedTags, random));
    return itemFactory.createWeapon({ weapon, tags, x, y });
  }
  const tags = Array.from({ length: count }, () => randomFrom(productTags, random));
  return itemFactory.createBodyItem({ part, tags, x, y, random });
}
