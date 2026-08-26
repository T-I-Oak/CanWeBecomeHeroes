import Chip from '../chips/Chip.js';
import Item from './Item.js';
import { TAGS, getTagBaseColors, getTagFramePaths, getTagGlyphScales, getTagPaths, getTagPrice, getTagWeight } from './TagCatalog.js';
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
const SLOT_BY_STAT = Object.freeze({ power: 1, magic: 2, speed: 3, negotiation: 4, luck: 5 });
const SLOT_BY_ATTRIBUTE = Object.freeze({ fire: 1, water: 2, lightning: 3, vitality: 4, area: 5 });
const TAG_PATTERNS = Object.freeze([[0, 0], [1, 0], [0, 1], [2, 0], [1, 1], [0, 2], [1, 2], [2, 1]]);
const ATTRIBUTE_TAGS = Object.freeze(['fire', 'water', 'lightning', 'vitality', 'area']);
const STATUS_TAGS = Object.freeze(Object.keys(TAGS).filter((tag) => TAGS[tag].group === 'status'));

function assetPaths(tags) {
  const statusTag = tags.find((tag) => TAGS[tag].group === 'status');
  const attributeTag = tags.find((tag) => TAGS[tag].group === 'attribute');
  const slot = statusTag ? SLOT_BY_STAT[TAGS[statusTag].stat] : attributeTag ? SLOT_BY_ATTRIBUTE[attributeTag] : 1;
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
    const chip = new Chip({ id: 0, type: 'item', x, y, weight: Math.max(1, getTagWeight(tags)), centerPath: `/assets/items/hand-${weapon}.png`, tagPaths: getTagPaths(tags), tagFramePaths: getTagFramePaths(tags), tagBaseColors: getTagBaseColors(tags), tagGlyphScales: getTagGlyphScales(tags), bounds: GAME_AREAS.warehouse });
    const item = new Item({ type: weapon, category: 'weapon', tags, chip, equipmentAssets: assetPaths(tags) });
    item.price = getTagPrice(tags);
    item.fixedStatusTag = WEAPONS[weapon];
    return item;
  }

  createDestination({ destination, x, y }) {
    const tags = [];
    const chip = new Chip({ id: 0, type: 'item', x, y, weight: 1, centerPath: `/assets/items/hand-${destination}.png`, tagPaths: [], tagFramePaths: [], tagBaseColors: [], tagGlyphScales: [], bounds: GAME_AREAS.warehouse, fillColor: AREA_THEME[DESTINATIONS[destination]].chipFill });
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
    const imageNumber = tags.length === 0 ? 1 + Math.floor(random() * 5) : Number(assetPaths(tags)[part].match(/-(\d+)\.png$/)[1]);
    const chip = new Chip({ id: 0, type: 'item', x, y, weight: Math.max(1, getTagWeight(tags)), centerPath: `/assets/items/${part}-${imageNumber}.png`, tagPaths: getTagPaths(tags), tagFramePaths: getTagFramePaths(tags), tagBaseColors: getTagBaseColors(tags), tagGlyphScales: getTagGlyphScales(tags), bounds: GAME_AREAS.warehouse });
    const item = new Item({ type: `${part}-${imageNumber}`, category: part, tags, chip, equipmentAssets: assetPaths(tags) });
    item.price = getTagPrice(tags);
    return item;
  }
}
