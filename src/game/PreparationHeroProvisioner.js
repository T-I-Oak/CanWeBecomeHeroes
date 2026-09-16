import { CHIP_RADIUS } from '../chips/Chip.js';
import HeroFactory from './HeroFactory.js';
import ItemFactory from './ItemFactory.js';
import { GAME_AREAS, getPreparationSubareaBounds } from './GameAreas.js';
import { PREPARATION_LAYOUT, PREPARATION_PANEL_WIDTH } from './PreparationLayout.js';
import { createTrendEquipmentSet } from './TrendEquipmentGenerator.js';

export const HERO_PROVISION_EQUIPMENT_SET_COUNT = 2;
export const HERO_PROVISION_EQUIPMENT_TAG_BUDGET = 5;

function createPreparationHeroPosition(bounds, random) {
  return {
    x: bounds.x + PREPARATION_PANEL_WIDTH - PREPARATION_LAYOUT.bottomPadding - PREPARATION_LAYOUT.equipmentSlotSize * 1.5 - PREPARATION_LAYOUT.equipmentGap + (random() - 0.5) * 20,
    y: bounds.y + PREPARATION_LAYOUT.topPadding + PREPARATION_LAYOUT.equipmentSlotSize * 1.5 + PREPARATION_LAYOUT.equipmentGap + (random() - 0.5) * 12,
  };
}

function createWarehouseItemPosition(radius, random) {
  return {
    x: GAME_AREAS.warehouse.x + radius + random() * (GAME_AREAS.warehouse.width - radius * 2),
    y: GAME_AREAS.warehouse.y + radius + random() * (GAME_AREAS.warehouse.height - radius * 2),
  };
}

export default class PreparationHeroProvisioner {
  constructor({ controller, heroFactory = new HeroFactory(), itemFactory = new ItemFactory(), random = Math.random } = {}) {
    if (!controller) throw new Error('Preparation hero provisioner requires an interaction controller.');
    Object.assign(this, { controller, heroFactory, itemFactory, random });
  }

  provision({ profession, preparationIndex }) {
    const bounds = getPreparationSubareaBounds(preparationIndex);
    const hero = this.heroFactory.create({
      profession,
      ...createPreparationHeroPosition(bounds, this.random),
      bounds,
      stamina: 0,
    });
    hero.chip.beginDrop();
    hero.chip.tilt = (this.random() - 0.5) * 0.16;
    this.controller.add(hero);
    this.provisionEquipment(hero);
    return hero;
  }

  provisionEquipment(hero) {
    return Array.from({ length: HERO_PROVISION_EQUIPMENT_SET_COUNT }, () => createTrendEquipmentSet({
      trendTag: hero.tags[0],
      tagBudget: HERO_PROVISION_EQUIPMENT_TAG_BUDGET,
      itemFactory: this.itemFactory,
      random: this.random,
      placePart: () => createWarehouseItemPosition(CHIP_RADIUS.item, this.random),
    })).flat().map(({ item }) => this.controller.addToWarehouse(item));
  }
}
