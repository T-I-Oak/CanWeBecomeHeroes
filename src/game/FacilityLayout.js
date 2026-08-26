import { GAME_AREAS } from './GameAreas.js';

export const FACILITY_LAYOUT = Object.freeze({
  slotLeft: 24,
  nameplateLeft: 24,
  nameplateTop: 16,
  nameplateWidth: 144,
  nameplateHeight: 48,
  namedSlotTop: 80,
  shopSlotTop: 96,
});

export function getFacilitySlotOrigin(areaName) {
  const area = GAME_AREAS[areaName];
  if (!area) throw new Error(`Unknown facility area: ${areaName}`);
  return Object.freeze({
    x: area.x + FACILITY_LAYOUT.slotLeft,
    y: area.y + (areaName === 'shop' ? FACILITY_LAYOUT.shopSlotTop : FACILITY_LAYOUT.namedSlotTop),
  });
}

export function getFacilityNameplateBounds(areaName) {
  const area = GAME_AREAS[areaName];
  if (!area) throw new Error(`Unknown facility area: ${areaName}`);
  return Object.freeze({
    x: area.x + FACILITY_LAYOUT.nameplateLeft,
    y: area.y + FACILITY_LAYOUT.nameplateTop,
    width: FACILITY_LAYOUT.nameplateWidth,
    height: FACILITY_LAYOUT.nameplateHeight,
  });
}
