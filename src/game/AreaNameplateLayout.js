import { GAME_AREAS } from './GameAreas.js';
import { FACILITY_LAYOUT } from './FacilityLayout.js';

const AREA_NAMEPLATE_AREAS = Object.freeze(['preparation', 'warehouse', 'battle']);
export const AREA_NAMEPLATE_GAP = FACILITY_LAYOUT.heroSlotTop
  - FACILITY_LAYOUT.nameplateTop
  - FACILITY_LAYOUT.nameplateHeight;

export function getAreaNameplateBounds(areaName) {
  if (!AREA_NAMEPLATE_AREAS.includes(areaName)) throw new Error(`Unknown area nameplate: ${areaName}`);
  const area = GAME_AREAS[areaName];
  return Object.freeze({
    x: area.x + FACILITY_LAYOUT.nameplateLeft,
    y: areaName === 'preparation'
      ? area.y - FACILITY_LAYOUT.nameplateHeight - AREA_NAMEPLATE_GAP
      : area.y + FACILITY_LAYOUT.nameplateTop,
    width: FACILITY_LAYOUT.nameplateWidth,
    height: FACILITY_LAYOUT.nameplateHeight,
  });
}

export function getAreaNameplateAtPoint(point) {
  return AREA_NAMEPLATE_AREAS.find((areaName) => {
    const bounds = getAreaNameplateBounds(areaName);
    return point.x >= bounds.x && point.x <= bounds.x + bounds.width
      && point.y >= bounds.y && point.y <= bounds.y + bounds.height;
  }) ?? null;
}
