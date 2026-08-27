import { TAGS } from './TagCatalog.js';

// 装備グリッドの描画順: 上段=頭、中段=右手・胴・左手、下段=脚。
export const EQUIPMENT_PARTS = Object.freeze(['head', 'weapon', 'torso', 'weapon', 'feet']);
const WEAPON_FOR_STATUS = Object.freeze({ valor: 'sword', iron: 'shield', arcane: 'staff', cloth: 'holy-book', dexterity: 'claw', feather: 'bow', reputation: 'banner', gem: 'orb', blessing: 'holy-symbol', fortune: 'tarot-cards' });
const TAG_KEYS = Object.freeze(Object.keys(TAGS));

export function randomFrom(values, random) {
  return values[Math.floor(random() * values.length)];
}

export function createTrendProductTags(trendTag, random) {
  const tags = [trendTag];
  while (tags.length < 3) {
    const statusTags = tags.filter((tag) => TAGS[tag].group === 'status');
    const attributeTags = tags.filter((tag) => TAGS[tag].group === 'attribute');
    const candidates = TAG_KEYS.filter((tag) => {
      if (TAGS[tag].group === 'attribute') return attributeTags.length < 2 && attributeTags.filter((current) => current === tag).length < 2;
      return statusTags.length === 0 || (statusTags.length === 1 && statusTags[0] === tag);
    });
    tags.push(randomFrom(candidates, random));
  }
  return tags;
}

function pickTags(tags, count, random) {
  const pool = [...tags];
  return Array.from({ length: Math.min(count, pool.length) }, () => pool.splice(Math.floor(random() * pool.length), 1)[0]);
}

export function distributeTagCounts(tagBudget, random, parts = EQUIPMENT_PARTS) {
  const counts = Array(parts.length).fill(0);
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
    const tags = pickTags(allowedTags, count, random);
    return itemFactory.createWeapon({ weapon, tags, x, y });
  }
  const tags = pickTags(productTags, count, random);
  return itemFactory.createBodyItem({ part, tags, x, y, random });
}

export function createTrendEquipmentSet({ trendTag, tagBudget, itemFactory, random = Math.random, placePart = () => ({}), modifyTagCount = ({ count }) => ({ count }) }) {
  const productTags = createTrendProductTags(trendTag, random);
  const counts = distributeTagCounts(tagBudget, random);
  return EQUIPMENT_PARTS.map((part, index) => {
    const adjustment = modifyTagCount({ part, index, count: counts[index], productTags });
    const position = placePart({ part, index });
    return {
      part,
      ...adjustment,
      item: createTrendEquipmentItem({ part, count: adjustment.count, productTags, itemFactory, random, ...position }),
    };
  });
}
