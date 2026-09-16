import { GAME_AREAS } from './GameAreas.js';
import { LOCATION_NAMEPLATE_LAYOUT } from './LocationNameplateLayout.js';

export const FACILITY_LAYOUT = Object.freeze({
  slotLeft: 24,
  heroSlotTop: 80,
});

export function getFacilitySlotOrigin(areaName) {
  const area = GAME_AREAS[areaName];
  if (!area) throw new Error(`Unknown facility area: ${areaName}`);
  return Object.freeze({
    x: area.x + FACILITY_LAYOUT.slotLeft,
    y: area.y + FACILITY_LAYOUT.heroSlotTop,
  });
}

export function getFacilityNameplateOrigin(areaName) {
  const area = GAME_AREAS[areaName];
  if (!area) throw new Error(`Unknown facility area: ${areaName}`);
  return Object.freeze({
    x: area.x + LOCATION_NAMEPLATE_LAYOUT.left,
    y: area.y + LOCATION_NAMEPLATE_LAYOUT.top,
  });
}
