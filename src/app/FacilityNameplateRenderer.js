import { getFacilityNameplateBounds } from '../game/FacilityLayout.js';

const FACILITY_LABELS = Object.freeze({
  shop: 'Shop',
  guild: 'Guild',
  training: 'Training',
});
const NAMEPLATE_PATH = '/assets/ui/facility-nameplate.png';

export function drawFacilityNameplates(context, assets) {
  const image = assets.load(NAMEPLATE_PATH);
  if (!image.complete || image.naturalWidth <= 0) return;

  context.save();
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = 'bold 18px Georgia, serif';
  Object.entries(FACILITY_LABELS).forEach(([areaName, label]) => {
    const bounds = getFacilityNameplateBounds(areaName);
    context.drawImage(image, bounds.x, bounds.y, bounds.width, bounds.height);
    context.fillStyle = '#f4df9b';
    context.shadowColor = '#1a0f08';
    context.shadowBlur = 2;
    context.shadowOffsetY = 1;
    context.fillText(label, bounds.x + bounds.width / 2, bounds.y + bounds.height / 2 + 1);
  });
  context.restore();
}
