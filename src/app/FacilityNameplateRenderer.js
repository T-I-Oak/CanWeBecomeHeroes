import { getFacilityNameplateBounds } from '../game/FacilityLayout.js';
import { getAreaVisual } from '../game/AreaVisualCatalog.js';

const FACILITIES = Object.freeze(['shop', 'guild', 'training']);
const NAMEPLATE_PATH = '/assets/ui/facility-nameplate.png';

function drawContainedIcon(context, image, x, y, size) {
  const scale = Math.min(size / image.naturalWidth, size / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  context.drawImage(image, x + (size - width) / 2, y + (size - height) / 2, width, height);
}

export function drawFacilityNameplates(context, assets, textRepository) {
  const image = assets.load(NAMEPLATE_PATH);
  if (!image.complete || image.naturalWidth <= 0) return;

  context.save();
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = 'bold 18px Georgia, serif';
  FACILITIES.forEach((areaName) => {
    const label = textRepository.getName('facility', areaName, 'nameplate');
    const bounds = getFacilityNameplateBounds(areaName);
    context.drawImage(image, bounds.x, bounds.y, bounds.width, bounds.height);
    const icon = assets.load(getAreaVisual(areaName).iconPath);
    const iconSize = 24;
    if (icon.complete && icon.naturalWidth > 0) drawContainedIcon(context, icon, bounds.x - iconSize - 2, bounds.y + (bounds.height - iconSize) / 2, iconSize);
    context.textAlign = 'center';
    context.font = 'bold 18px Georgia, serif';
    context.fillStyle = '#f4df9b';
    context.shadowColor = '#1a0f08';
    context.shadowBlur = 2;
    context.shadowOffsetY = 1;
    context.fillText(label, bounds.x + bounds.width / 2, bounds.y + bounds.height / 2 + 1);
  });
  context.restore();
}
