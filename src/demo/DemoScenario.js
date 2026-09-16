import { CHIP_RADIUS } from '../chips/Chip.js';
import { HERO_PROFESSION_IDS } from '../game/HeroFactory.js';
import ItemFactory, { DESTINATION_TYPES } from '../game/ItemFactory.js';
import { GAME_AREAS } from '../game/GameAreas.js';
import PreparationHeroProvisioner from '../game/PreparationHeroProvisioner.js';
import ShopState from '../game/ShopState.js';

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
  const itemFactory = new ItemFactory();
  return Object.freeze({
    initialize({ controller }) {
      const heroProvisioner = new PreparationHeroProvisioner({ controller, random });
      const preparationHeroes = selectRandomProfessions(random).map((profession, index) => heroProvisioner.provision({ profession, preparationIndex: index }));
      DESTINATION_TYPES.forEach((destination) => {
        const { x, y } = randomWarehousePosition(CHIP_RADIUS.item, random);
        controller.addToWarehouse(itemFactory.createDestination({ destination, x, y }));
      });
      return Object.freeze({ preparationHeroes, shop: ShopState.createRandom(), random });
    },
  });
}
