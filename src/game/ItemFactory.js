import Chip from '../chips/Chip.js';
import Item from './Item.js';
import { ATTRIBUTE_TAGS, TAGS, getTagBaseColors, getTagGlyphScales, getTagIndex, getTagPaths, getTagPrice, getTagWeight, sortTags } from './TagCatalog.js';
import { GAME_AREAS } from './GameAreas.js';
import { AREA_THEME } from './AreaTheme.js';

const WEAPONS = Object.freeze({
  sword: 'valor', shield: 'iron', staff: 'arcane', 'holy-book': 'cloth', claw: 'dexterity',
  bow: 'feather', orb: 'gem', banner: 'reputation', 'holy-symbol': 'blessing', 'tarot-cards': 'fortune',
});
const DESTINATIONS = Object.freeze({
  'shopping-bag': 'shop', 'hero-license': 'training', 'renewal-form': 'guild',
});
export const DESTINATION_TYPES = Object.freeze(Object.keys(DESTINATIONS));
const TAG_PATTERNS = Object.freeze([[0, 0], [1, 0], [0, 1], [2, 0], [1, 1], [0, 2], [1, 2], [2, 1]]);
const STATUS_TAGS = Object.freeze(Object.keys(TAGS).filter((tag) => TAGS[tag].group === 'status'));

function assetPaths(tags) {
  const firstTag = sortTags(tags)[0];
  const slot = firstTag ? getTagIndex(firstTag) % 5 + 1 : 1;
  return Object.freeze({ head: `/assets/items/head-${slot}.png`, torso: `/assets/items/torso-${slot}.png`, feet: `/assets/items/feet-${slot}.png` });
}

export default class ItemFactory {
  createRandomWeapon({ weapon: requestedWeapon, x, y, random = Math.random }) {
    const weapons = Object.keys(WEAPONS);
    const weapon = requestedWeapon ?? weapons[Math.floor(random() * weapons.length)];
    const [statusCount, attributeCount] = TAG_PATTERNS[Math.floor(random() * TAG_PATTERNS.length)];
    const tags = [
      ...Array.from({ length: statusCount }, () => WEAPONS[weapon]),
      ...Array.from({ length: attributeCount }, () => ATTRIBUTE_TAGS[Math.floor(random() * ATTRIBUTE_TAGS.length)]),
    ];
    return this.createWeapon({ weapon, tags, x, y });
  }

  createRandom({ x, y, random = Math.random }) {
    const entries = [...Object.keys(WEAPONS), ...DESTINATION_TYPES, 'head', 'torso', 'feet'];
    const type = entries[Math.floor(random() * entries.length)];
    return WEAPONS[type]
      ? this.createRandomWeapon({ weapon: type, x, y, random })
      : DESTINATIONS[type]
        ? this.createDestination({ destination: type, x, y })
        : this.createRandomBodyItem({ part: type, x, y, random });
  }

  createRandomEquipment({ x, y, random = Math.random }) {
    const entries = [...Object.keys(WEAPONS), 'head', 'torso', 'feet'];
    const type = entries[Math.floor(random() * entries.length)];
    return WEAPONS[type]
      ? this.createRandomWeapon({ weapon: type, x, y, random })
      : this.createRandomBodyItem({ part: type, x, y, random });
  }

  createWeapon({ weapon, tags, x, y }) {
    const orderedTags = sortTags(tags);
    const chip = new Chip({ id: 0, type: 'item', x, y, weight: Math.max(1, getTagWeight(orderedTags)), centerPath: `/assets/items/hand-${weapon}.png`, tagPaths: getTagPaths(orderedTags), tagBaseColors: getTagBaseColors(orderedTags), tagGlyphScales: getTagGlyphScales(orderedTags), bounds: GAME_AREAS.warehouse });
    const item = new Item({ type: weapon, category: 'weapon', tags: orderedTags, chip, equipmentAssets: assetPaths(orderedTags) });
    item.price = getTagPrice(orderedTags);
    item.fixedStatusTag = WEAPONS[weapon];
    return item;
  }

  createDestination({ destination, x, y }) {
    const tags = [];
    const chip = new Chip({ id: 0, type: 'item', x, y, weight: 1, centerPath: `/assets/items/hand-${destination}.png`, tagPaths: [], tagBaseColors: [], tagGlyphScales: [], bounds: GAME_AREAS.warehouse, fillColor: AREA_THEME[DESTINATIONS[destination]].chipFill });
    const item = new Item({ type: destination, category: 'destination', tags, chip, equipmentAssets: assetPaths(tags) });
    item.price = 1;
    item.destination = DESTINATIONS[destination];
    return item;
  }

  createRandomBodyItem({ part, x, y, random = Math.random }) {
    const [statusCount, attributeCount] = TAG_PATTERNS[Math.floor(random() * TAG_PATTERNS.length)];
    const statusTag = STATUS_TAGS[Math.floor(random() * STATUS_TAGS.length)];
    const tags = [
      ...Array.from({ length: statusCount }, () => statusTag),
      ...Array.from({ length: attributeCount }, () => ATTRIBUTE_TAGS[Math.floor(random() * ATTRIBUTE_TAGS.length)]),
    ];
    return this.createBodyItem({ part, tags, x, y, random });
  }

  createBodyItem({ part, tags = [], x, y, random = Math.random }) {
    const orderedTags = sortTags(tags);
    const imageNumber = orderedTags.length === 0 ? 1 + Math.floor(random() * 5) : Number(assetPaths(orderedTags)[part].match(/-(\d+)\.png$/)[1]);
    const chip = new Chip({ id: 0, type: 'item', x, y, weight: Math.max(1, getTagWeight(orderedTags)), centerPath: `/assets/items/${part}-${imageNumber}.png`, tagPaths: getTagPaths(orderedTags), tagBaseColors: getTagBaseColors(orderedTags), tagGlyphScales: getTagGlyphScales(orderedTags), bounds: GAME_AREAS.warehouse });
    const item = new Item({ type: `${part}-${imageNumber}`, category: part, tags: orderedTags, chip, equipmentAssets: assetPaths(orderedTags) });
    item.price = getTagPrice(orderedTags);
    return item;
  }
}
