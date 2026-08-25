import { CHIP_RADIUS } from '../chips/Chip.js';
import HeroFactory, { HERO_PROFESSION_IDS } from '../game/HeroFactory.js';
import ItemFactory, { DESTINATION_TYPES } from '../game/ItemFactory.js';
import { GAME_AREAS, getPreparationSubareaBounds } from '../game/GameAreas.js';
import { PREPARATION_LAYOUT } from '../game/PreparationLayout.js';
import { HERO_SLOT_SIZE } from '../game/HeroSlotLayout.js';
import ShopState from '../game/ShopState.js';
import { getShopLayout } from '../game/ShopLayout.js';
import EnemyFactory from '../game/EnemyFactory.js';
import { createTrendEquipmentSet } from '../game/TrendEquipmentGenerator.js';

const PREPARATION_PANEL_WIDTH = PREPARATION_LAYOUT.panelWidth;
const FACILITY_SLOT_COLORS = Object.freeze({ shop: '#b58c59', guild: '#8d78b8', training: '#5d9b7a' });
const DEMO_ENEMY_TYPES = Object.freeze([
  Object.freeze({ size: 'small', tagAffinity: 'valor' }),
  Object.freeze({ size: 'small', tagAffinity: 'iron' }),
  Object.freeze({ size: 'small', tagAffinity: 'arcane' }),
]);

function randomWarehousePosition(radius = CHIP_RADIUS.item, random = Math.random) {
  return {
    x: GAME_AREAS.warehouse.x + radius + random() * (GAME_AREAS.warehouse.width - radius * 2),
    y: GAME_AREAS.warehouse.y + radius + random() * (GAME_AREAS.warehouse.height - radius * 2),
  };
}

function selectRandomProfessions(random) {
  const candidates = [...HERO_PROFESSION_IDS];
  return Array.from({ length: 2 }, () => candidates.splice(Math.floor(random() * candidates.length), 1)[0]);
}

function drawSlot(context, x, y, color) {
  context.fillStyle = `${color}22`;
  context.strokeStyle = color;
  context.beginPath();
  context.roundRect(x + 5, y + 5, HERO_SLOT_SIZE - 10, HERO_SLOT_SIZE - 10, 18);
  context.fill();
  context.stroke();
}

function drawDemoGuides(context) {
  context.save();
  context.lineWidth = 3;
  ['shop', 'guild', 'training'].forEach((name) => {
    const area = GAME_AREAS[name];
    const slot = name === 'shop'
      ? getShopLayout(area).heroSlot
      : { x: area.x + (area.width / 2 - HERO_SLOT_SIZE) / 2, y: area.y + (area.height - HERO_SLOT_SIZE) / 2 };
    drawSlot(context, slot.x, slot.y, FACILITY_SLOT_COLORS[name]);
  });
  context.restore();
}

export function createDemoScenario({ random = Math.random } = {}) {
  const heroFactory = new HeroFactory();
  const itemFactory = new ItemFactory();
  const enemyFactory = new EnemyFactory({ itemFactory });
  return Object.freeze({
    initialize({ controller }) {
      const preparationHeroes = selectRandomProfessions(random).map((profession, index) => {
        const bounds = getPreparationSubareaBounds(index);
        const hero = heroFactory.create({
          profession,
          x: bounds.x + PREPARATION_PANEL_WIDTH - PREPARATION_LAYOUT.bottomPadding - PREPARATION_LAYOUT.equipmentSlotSize * 1.5 - PREPARATION_LAYOUT.equipmentGap + (random() - 0.5) * 20,
          y: bounds.y + PREPARATION_LAYOUT.topPadding + PREPARATION_LAYOUT.equipmentSlotSize * 1.5 + PREPARATION_LAYOUT.equipmentGap + (random() - 0.5) * 12,
          bounds,
          stamina: 0,
        });
        hero.chip.tilt = (random() - 0.5) * 0.16;
        controller.add(hero);
        return hero;
      });
      preparationHeroes.forEach((hero) => {
        Array.from({ length: 2 }, () => createTrendEquipmentSet({
          trendTag: hero.tags[0],
          tagBudget: 5,
          itemFactory,
          random,
          placePart: () => randomWarehousePosition(CHIP_RADIUS.item, random),
        })).flat().forEach(({ item }) => controller.addToWarehouse(item));
      });
      DESTINATION_TYPES.forEach((destination) => {
        const { x, y } = randomWarehousePosition(CHIP_RADIUS.item, random);
        controller.addToWarehouse(itemFactory.createDestination({ destination, x, y }));
      });
      const enemyType = DEMO_ENEMY_TYPES[Math.floor(random() * DEMO_ENEMY_TYPES.length)];
      const enemies = [3, 4].map((slotPosition) => enemyFactory.create({
        ...enemyType, slotPosition, maximumHp: 2, contributionPoints: 2, totalTagCount: 0, random,
      }));
      return Object.freeze({ preparationHeroes, shop: ShopState.createRandom(), enemies });
    },
    addItem({ controller }) {
      const { x, y } = randomWarehousePosition();
      controller.addToWarehouse(itemFactory.createRandomEquipment({ x, y }));
    },
    drawGuides: drawDemoGuides,
  });
}
