import { getFacilityNameplateOrigin } from '../game/FacilityLayout.js';
import { drawLocationNameplate } from './LocationNameplateRenderer.js';

const FACILITIES = Object.freeze(['shop', 'guild', 'training']);

export function drawFacilityNameplates(context, assets, textRepository, nameplateBounds) {
  FACILITIES.forEach((facilityName) => {
    const label = textRepository.getName('facility', facilityName, 'nameplate');
    nameplateBounds.setFacility(facilityName, drawLocationNameplate(context, assets, facilityName, getFacilityNameplateOrigin(facilityName), label));
  });
}
