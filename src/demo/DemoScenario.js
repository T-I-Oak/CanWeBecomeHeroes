import { CHIP_RADIUS } from '../chips/Chip.js';
import HeroFactory, { HERO_PROFESSION_IDS } from '../game/HeroFactory.js';
import ItemFactory, { DESTINATION_TYPES } from '../game/ItemFactory.js';
import { GAME_AREAS, getPreparationSubareaBounds } from '../game/GameAreas.js';
import { PREPARATION_LAYOUT, PREPARATION_PANEL_WIDTH } from '../game/PreparationLayout.js';
import ShopState from '../game/ShopState.js';
import { createTrendEquipmentSet } from '../game/TrendEquipmentGenerator.js';

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

export function createDemoScenario({ random = Math.random } = {}) {
  const heroFactory = new HeroFactory();
  const itemFactory = new ItemFactory();
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
      return Object.freeze({ preparationHeroes, shop: ShopState.createRandom(), random });
    },
  });
}
