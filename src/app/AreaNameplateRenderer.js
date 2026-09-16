import { getAreaNameplateOrigin } from '../game/AreaNameplateLayout.js';
import { drawLocationNameplate } from './LocationNameplateRenderer.js';

const AREAS = Object.freeze(['preparation', 'warehouse', 'battle']);

export function drawAreaNameplates(context, assets, textRepository, nameplateBounds) {
  AREAS.forEach((areaName) => {
    const label = textRepository.getName('area', areaName, 'nameplate');
    nameplateBounds.setArea(areaName, drawLocationNameplate(context, assets, areaName, getAreaNameplateOrigin(areaName), label));
  });
}
