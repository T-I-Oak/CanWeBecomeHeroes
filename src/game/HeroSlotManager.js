import { GAME_AREAS } from './GameAreas.js';
import { BATTLE_ENEMY_AREA_HEIGHT, HERO_SLOT_SIZE } from './HeroSlotLayout.js';
import { getFacilitySlotOrigin } from './FacilityLayout.js';

const BATTLE_ORDER = Object.freeze(['battle-2', 'battle-3', 'battle-1', 'battle-4']);

function facilitySlot(id, areaName) {
  const origin = getFacilitySlotOrigin(areaName);
  return Object.freeze({
    id,
    area: areaName,
    x: origin.x + HERO_SLOT_SIZE / 2,
    y: origin.y + HERO_SLOT_SIZE / 2,
  });
}

function battleSlots() {
  const area = GAME_AREAS.battle;
  const startX = area.x + (area.width - HERO_SLOT_SIZE * 6) / 2;
  const y = area.y + BATTLE_ENEMY_AREA_HEIGHT + HERO_SLOT_SIZE / 2;
  return [1, 2, 3, 4].map((number) => Object.freeze({ id: `battle-${number}`, area: 'battle', x: startX + number * HERO_SLOT_SIZE + HERO_SLOT_SIZE / 2, y }));
}

export default class HeroSlotManager {
  constructor(slots = [...battleSlots(), facilitySlot('shop-1', 'shop'), facilitySlot('guild-1', 'guild'), facilitySlot('training-1', 'training')]) {
    this.slots = new Map(slots.map((slot) => [slot.id, { ...slot, reservedBy: null, occupiedBy: null }]));
  }

  reserve(hero, area) {
    this.release(hero);
    const candidates = area === 'battle'
      ? BATTLE_ORDER
      : [`${area}-1`];
    const slot = candidates.map((id) => this.slots.get(id)).find((candidate) => candidate && !candidate.reservedBy && !candidate.occupiedBy);
    if (!slot) return null;
    slot.reservedBy = hero.chip.id;
    hero.targetSlotId = slot.id;
    hero.currentSlotId = null;
    hero.targetArea = slot.area;
    hero.currentArea = null;
    return Object.freeze({ id: slot.id, area: slot.area, x: slot.x, y: slot.y, bounds: { x: slot.x - HERO_SLOT_SIZE / 2, y: slot.y - HERO_SLOT_SIZE / 2, width: HERO_SLOT_SIZE, height: HERO_SLOT_SIZE } });
  }

  arrive(hero) {
    const slot = this.slots.get(hero.targetSlotId);
    if (!slot || slot.reservedBy !== hero.chip.id) return false;
    slot.reservedBy = null;
    slot.occupiedBy = hero.chip.id;
    hero.chip.bounds = { x: slot.x - HERO_SLOT_SIZE / 2, y: slot.y - HERO_SLOT_SIZE / 2, width: HERO_SLOT_SIZE, height: HERO_SLOT_SIZE };
    hero.currentSlotId = slot.id;
    hero.targetSlotId = null;
    hero.currentArea = slot.area;
    hero.targetArea = null;
    return true;
  }

  release(hero) {
    this.slots.forEach((slot) => {
      if (slot.reservedBy === hero.chip.id) slot.reservedBy = null;
      if (slot.occupiedBy === hero.chip.id) slot.occupiedBy = null;
    });
    hero.targetSlotId = null;
    hero.currentSlotId = null;
    hero.targetArea = null;
    hero.currentArea = null;
  }

  getSlot(id) {
    const slot = this.slots.get(id);
    return slot && Object.freeze({ id: slot.id, area: slot.area, x: slot.x, y: slot.y, bounds: { x: slot.x - HERO_SLOT_SIZE / 2, y: slot.y - HERO_SLOT_SIZE / 2, width: HERO_SLOT_SIZE, height: HERO_SLOT_SIZE } });
  }
}
