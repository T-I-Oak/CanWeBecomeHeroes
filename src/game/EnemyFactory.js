import Chip from '../chips/Chip.js';
import { GAME_AREAS } from './GameAreas.js';
import { AREA_THEME } from './AreaTheme.js';
import { BATTLE_ENEMY_AREA_HEIGHT, ENEMY_CHIP_DIAMETER, HERO_SLOT_SIZE } from './HeroSlotLayout.js';
import { getEnemyDefinition, getEnemyDefinitionById } from './EnemyCatalog.js';
import Enemy from './Enemy.js';
import ItemFactory from './ItemFactory.js';
import { getTagBaseColors, getTagGlyphScales, getTagPaths, getTagWeight } from './TagCatalog.js';
import { createTrendEquipmentItem, createTrendProductTags, reduceTagCounts } from './TrendEquipmentGenerator.js';

export const ENEMY_CONTRIBUTION_POINTS = Object.freeze({ regular: 10, midBoss: 50, boss: 250 });
const RANK_BY_SIZE = Object.freeze({ small: 'regular', medium: 'midBoss', large: 'boss' });

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

  create({ size, tagAffinity, slotPosition, maximumHp, totalTagCount, maximums, rank = 'regular', contributionPoints = ENEMY_CONTRIBUTION_POINTS[rank], contributionMultiplier = 1, mainTag = tagAffinity, subTags = [], weaponCount = 2, random = Math.random }) {
    const definition = getEnemyDefinition({ size, tagAffinity: mainTag });
    if (!definition) throw new Error(`Missing enemy definition: ${size}-${tagAffinity}`);
    const slot = getSlot(slotPosition);
    const radius = ENEMY_CHIP_DIAMETER[size] / 2;
    const tags = [mainTag, ...subTags];
    const chip = new Chip({
      id: 0,
      type: 'enemy',
      radius,
      x: slot.x,
      y: slot.y,
      weight: getTagWeight(tags),
      centerPath: definition.assetPath,
      tagPaths: getTagPaths(tags),
      tagBaseColors: getTagBaseColors(tags),
      tagGlyphScales: getTagGlyphScales(tags),
      bounds: slot.bounds,
      fillColor: AREA_THEME.battle.chipFill,
    });
    const equipmentParts = ['head', 'torso', 'feet', ...Array.from({ length: weaponCount }, () => 'weapon')];
    const tagCounts = reduceTagCounts(totalTagCount, random, equipmentParts);
    const equipment = equipmentParts.map((part, index) => createTrendEquipmentItem({
      part, count: tagCounts[index], productTags: createTrendProductTags(mainTag, random), itemFactory: this.itemFactory, random,
    }));
    return new Enemy({ definition, tags, chip, maximumHp, contributionPoints, equipment, maximums, rank, mainTag, subTags, slotPosition, totalTagCount, weaponCount, contributionMultiplier });
  }

  createFromDefinition({ enemyDefinitionId, slotPosition, weaponCount, totalTagCount, maximumHp, maximums, contributionMultiplier = 1, random = Math.random }) {
    const definition = getEnemyDefinitionById(enemyDefinitionId);
    if (!definition) throw new Error(`Missing enemy definition: ${enemyDefinitionId}`);
    const [mainTag, ...subTags] = definition.intrinsicTags;
    return this.create({
      size: definition.size,
      tagAffinity: definition.tagAffinity,
      slotPosition,
      maximumHp: maximumHp ?? definition.baseHp,
      totalTagCount,
      maximums,
      rank: RANK_BY_SIZE[definition.size],
      contributionPoints: Math.ceil(definition.baseContributionPoints * contributionMultiplier),
      contributionMultiplier,
      mainTag,
      subTags,
      weaponCount,
      random,
    });
  }

  createInitialEncounter(options = {}) {
    return this.create({ size: 'small', tagAffinity: 'valor', slotPosition: 3, maximumHp: 2, totalTagCount: 0, ...options });
  }

  createInitialLivingArmor(options = {}) {
    return this.create({ size: 'small', tagAffinity: 'iron', slotPosition: 4, maximumHp: 2, totalTagCount: 0, ...options });
  }

  createInitialWisp(options = {}) {
    return this.create({ size: 'small', tagAffinity: 'arcane', slotPosition: 2, maximumHp: 2, totalTagCount: 0, ...options });
  }
}
