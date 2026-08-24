import Chip from '../chips/Chip.js';
import { GAME_AREAS } from './GameAreas.js';
import { AREA_THEME } from './AreaTheme.js';
import { BATTLE_ENEMY_AREA_HEIGHT, ENEMY_CHIP_DIAMETER, HERO_SLOT_SIZE } from './HeroSlotLayout.js';
import { getEnemyDefinition } from './EnemyCatalog.js';
import Enemy from './Enemy.js';
import ItemFactory from './ItemFactory.js';
import { getTagPaths, getTagWeight } from './TagCatalog.js';
import { EQUIPMENT_PARTS, createTrendEquipmentItem, createTrendProductTags, distributeTagCounts } from './TrendEquipmentGenerator.js';


function getSlot(slotPosition) {
  const area = GAME_AREAS.battle;
  const startX = area.x + (area.width - HERO_SLOT_SIZE * 6) / 2;
  const top = area.y + (BATTLE_ENEMY_AREA_HEIGHT - HERO_SLOT_SIZE) / 2;
  return Object.freeze({
    x: startX + (slotPosition - 1) * HERO_SLOT_SIZE + HERO_SLOT_SIZE / 2,
    y: top + HERO_SLOT_SIZE / 2,
    bounds: { x: startX + (slotPosition - 1) * HERO_SLOT_SIZE, y: top, width: HERO_SLOT_SIZE, height: HERO_SLOT_SIZE },
  });
}

export default class EnemyFactory {
  constructor({ itemFactory = new ItemFactory() } = {}) {
    this.itemFactory = itemFactory;
  }

  create({ size, tagAffinity, slotPosition, maximumHp, contributionPoints, totalTagCount, maximums, random = Math.random }) {
    const definition = getEnemyDefinition({ size, tagAffinity });
    if (!definition) throw new Error(`Missing enemy definition: ${size}-${tagAffinity}`);
    const slot = getSlot(slotPosition);
    const radius = ENEMY_CHIP_DIAMETER[size] / 2;
    const tags = [tagAffinity];
    const chip = new Chip({
      id: 0,
      type: 'enemy',
      radius,
      x: slot.x,
      y: slot.y,
      weight: getTagWeight(tags),
      centerPath: definition.assetPath,
      tagPaths: getTagPaths(tags),
      bounds: slot.bounds,
      fillColor: AREA_THEME.battle.chipFill,
    });
    const productTags = createTrendProductTags(tagAffinity, random);
    const tagCounts = distributeTagCounts(totalTagCount, random);
    const equipment = EQUIPMENT_PARTS.map((part, index) => createTrendEquipmentItem({
      part, count: tagCounts[index], productTags, itemFactory: this.itemFactory, random,
    }));
    return new Enemy({ definition, tags, chip, maximumHp, contributionPoints, equipment, maximums });
  }

  createInitialEncounter(options = {}) {
    return this.create({ size: 'small', tagAffinity: 'valor', slotPosition: 3, maximumHp: 2, contributionPoints: 2, totalTagCount: 0, ...options });
  }
}
