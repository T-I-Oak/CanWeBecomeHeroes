import { GAME_AREAS } from './GameAreas.js';
import { LOCATION_NAMEPLATE_LAYOUT } from './LocationNameplateLayout.js';

const AREA_NAMEPLATE_AREAS = Object.freeze(['preparation', 'warehouse', 'battle']);
export const AREA_NAMEPLATE_GAP = 16;

export function getAreaNameplateOrigin(areaName) {
  if (!AREA_NAMEPLATE_AREAS.includes(areaName)) throw new Error(`Unknown area nameplate: ${areaName}`);
  const area = GAME_AREAS[areaName];
  return Object.freeze({
    x: area.x + LOCATION_NAMEPLATE_LAYOUT.left,
    y: areaName === 'preparation'
      ? area.y - LOCATION_NAMEPLATE_LAYOUT.height - AREA_NAMEPLATE_GAP
      : area.y + LOCATION_NAMEPLATE_LAYOUT.top,
  });
}
