import { CHIP_RADIUS } from '../chips/Chip.js';
import ItemFactory, { DESTINATION_TYPES } from './ItemFactory.js';
import { GAME_AREAS } from './GameAreas.js';
import PreparationHeroProvisioner from './PreparationHeroProvisioner.js';
import ShopState from './ShopState.js';

export const STARTING_HERO_COUNT = 2;

function randomWarehousePosition(radius, random) {
  return { x: GAME_AREAS.warehouse.x + radius + random() * (GAME_AREAS.warehouse.width - radius * 2), y: GAME_AREAS.warehouse.y + radius + random() * (GAME_AREAS.warehouse.height - radius * 2) };
}

export function createRunScenario({ professionIds, random = Math.random } = {}) {
  if (professionIds.length !== STARTING_HERO_COUNT) throw new RangeError(`A run requires ${STARTING_HERO_COUNT} starting heroes.`);
  const itemFactory = new ItemFactory();
  return Object.freeze({
    initialize({ controller }) {
      const provisioner = new PreparationHeroProvisioner({ controller, random });
      const preparationHeroes = professionIds.map((profession, index) => provisioner.provision({ profession, preparationIndex: index }));
      DESTINATION_TYPES.forEach((destination) => controller.addToWarehouse(itemFactory.createDestination({ destination, ...randomWarehousePosition(CHIP_RADIUS.item, random) })));
      return Object.freeze({ preparationHeroes, shop: ShopState.createRandom(), random });
    },
  });
}
