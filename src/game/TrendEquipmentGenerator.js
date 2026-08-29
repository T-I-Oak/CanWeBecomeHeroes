import { ATTRIBUTE_TAGS, TAGS, sortTags } from './TagCatalog.js';

// 装備グリッドの描画順: 上段=頭、中段=右手・胴・左手、下段=脚。
export const EQUIPMENT_PARTS = Object.freeze(['head', 'weapon', 'torso', 'weapon', 'feet']);
const WEAPON_FOR_STATUS = Object.freeze({ valor: 'sword', iron: 'shield', arcane: 'staff', cloth: 'holy-book', dexterity: 'claw', feather: 'bow', reputation: 'banner', gem: 'orb', blessing: 'holy-symbol', fortune: 'tarot-cards' });
const TAG_KEYS = Object.freeze(Object.keys(TAGS));
const STATUS_TAG_KEYS = Object.freeze(TAG_KEYS.filter((tag) => TAGS[tag].group === 'status'));

export function randomFrom(values, random) {
  return values[Math.floor(random() * values.length)];
}

export function createTrendProductTags(trendTag, random) {
  if (!TAGS[trendTag]) throw new RangeError(`Unknown trend tag: ${trendTag}`);
  const statusTag = TAGS[trendTag].group === 'status' ? trendTag : randomFrom(STATUS_TAG_KEYS, random);
  const attributeTag = randomFrom(ATTRIBUTE_TAGS, random);
  return sortTags([trendTag, statusTag, attributeTag]);
}

function pickTags(tags, count, random) {
  const pool = [...tags];
  return sortTags(Array.from({ length: Math.min(count, pool.length) }, () => pool.splice(Math.floor(random() * pool.length), 1)[0]));
}

export function reduceTagCounts(tagBudget, random, parts = EQUIPMENT_PARTS) {
  const counts = Array(parts.length).fill(3);
  const removalCount = Math.max(0, counts.length * 3 - Math.max(0, tagBudget));
  for (let index = 0; index < removalCount; index += 1) {
    const eligible = counts.map((count, position) => ({ count, position })).filter(({ count }) => count > 0);
    counts[randomFrom(eligible, random).position] -= 1;
  }
  return counts;
}

export function createTrendEquipmentItem({ part, count, productTags, itemFactory, random, x = 0, y = 0 }) {
  if (part === 'weapon') {
    const statusTag = productTags.find((tag) => WEAPON_FOR_STATUS[tag]);
    const weapon = statusTag ? WEAPON_FOR_STATUS[statusTag] : 'sword';
    const allowedTags = productTags.filter((tag) => TAGS[tag]?.group === 'attribute' || tag === statusTag);
    const tags = pickTags(allowedTags, count, random);
    return itemFactory.createWeapon({ weapon, tags, x, y });
  }
  const tags = pickTags(productTags, count, random);
  return itemFactory.createBodyItem({ part, tags, x, y, random });
}

export function createTrendEquipmentSet({ trendTag, tagBudget, itemFactory, random = Math.random, placePart = () => ({}), modifyTagCount = ({ count }) => ({ count }) }) {
  const counts = reduceTagCounts(tagBudget, random);
  return EQUIPMENT_PARTS.map((part, index) => {
    const productTags = createTrendProductTags(trendTag, random);
    const adjustment = modifyTagCount({ part, index, count: counts[index], productTags });
    const position = placePart({ part, index });
    return {
      part,
      ...adjustment,
      item: createTrendEquipmentItem({ part, count: adjustment.count, productTags, itemFactory, random, ...position }),
    };
  });
}
