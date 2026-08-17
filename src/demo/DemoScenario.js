import { CHIP_RADIUS } from '../chips/Chip.js';
import HeroFactory from '../game/HeroFactory.js';
import ItemFactory, { DESTINATION_TYPES } from '../game/ItemFactory.js';
import { GAME_AREAS, getPreparationSubareaBounds } from '../game/GameAreas.js';
import { PREPARATION_LAYOUT } from '../game/PreparationLayout.js';
import { HERO_SLOT_SIZE } from '../game/HeroSlotLayout.js';
import ShopState from '../game/ShopState.js';
import { getShopLayout } from '../game/ShopLayout.js';
import EnemyFactory from '../game/EnemyFactory.js';

const PREPARATION_PANEL_WIDTH = PREPARATION_LAYOUT.panelWidth;
const FACILITY_SLOT_COLORS = Object.freeze({ shop: '#b58c59', guild: '#8d78b8', training: '#5d9b7a' });

function randomWarehousePosition(radius = CHIP_RADIUS.item) {
  return {
    x: GAME_AREAS.warehouse.x + radius + Math.random() * (GAME_AREAS.warehouse.width - radius * 2),
    y: GAME_AREAS.warehouse.y + radius + Math.random() * (GAME_AREAS.warehouse.height - radius * 2),
  };
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

export function createDemoScenario() {
  const heroFactory = new HeroFactory();
  const itemFactory = new ItemFactory();
  const enemyFactory = new EnemyFactory({ itemFactory });
  return Object.freeze({
    initialize({ controller }) {
      const preparationHeroes = Array.from({ length: 4 }, (_, index) => {
        const bounds = getPreparationSubareaBounds(index);
        const hero = heroFactory.createRandom({
          x: bounds.x + PREPARATION_PANEL_WIDTH - PREPARATION_LAYOUT.bottomPadding - PREPARATION_LAYOUT.equipmentSlotSize * 1.5 - PREPARATION_LAYOUT.equipmentGap + (Math.random() - 0.5) * 20,
          y: bounds.y + PREPARATION_LAYOUT.topPadding + PREPARATION_LAYOUT.equipmentSlotSize * 1.5 + PREPARATION_LAYOUT.equipmentGap + (Math.random() - 0.5) * 12,
          bounds,
          stamina: 0,
        });
        hero.chip.tilt = (Math.random() - 0.5) * 0.16;
        controller.add(hero);
        return hero;
      });
      DESTINATION_TYPES.forEach((destination) => {
        const { x, y } = randomWarehousePosition();
        controller.addToWarehouse(itemFactory.createDestination({ destination, x, y }));
      });
      const enemy = enemyFactory.createInitialEncounter();
      enemy.chip.beginDrop();
      controller.add(enemy);
      return Object.freeze({ preparationHeroes, shop: ShopState.createRandom(), enemies: [enemy] });
    },
    addItem({ controller }) {
      const { x, y } = randomWarehousePosition();
      controller.addToWarehouse(itemFactory.createRandomEquipment({ x, y }));
    },
    drawGuides: drawDemoGuides,
  });
}
