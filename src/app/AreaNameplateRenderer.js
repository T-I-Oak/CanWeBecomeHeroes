import { getAreaNameplateBounds } from '../game/AreaNameplateLayout.js';
import { getAreaVisual } from '../game/AreaVisualCatalog.js';

const STANDARD_AREAS = Object.freeze(['preparation', 'warehouse']);
const NAMEPLATE_PATH = '/assets/ui/facility-nameplate.png';

function drawContainedIcon(context, image, x, y, size) {
  const scale = Math.min(size / image.naturalWidth, size / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  context.drawImage(image, x + (size - width) / 2, y + (size - height) / 2, width, height);
}

function drawPlaqueLabel(context, image, bounds, label, areaName, assets) {
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
}

function drawBattleBanner(context, assets, textRepository) {
  const bounds = getAreaNameplateBounds('battle');
  const { x, y, width, height } = bounds;
  context.save();
  context.fillStyle = '#63262a';
  context.strokeStyle = '#d1a34d';
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(x + 6, y + 3);
  context.lineTo(x + width - 28, y + 3);
  context.lineTo(x + width - 8, y + height / 2);
  context.lineTo(x + width - 28, y + height - 3);
  context.lineTo(x + 6, y + height - 3);
  context.closePath();
  context.fill();
  context.stroke();
  context.strokeStyle = '#4a2816';
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(x + 6, y - 5);
  context.lineTo(x + 6, y + height + 7);
  context.stroke();
  context.strokeStyle = '#d1a34d';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(x + 6, y - 5);
  context.lineTo(x + 6, y + height + 7);
  context.stroke();
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = 'bold 18px Georgia, serif';
  const icon = assets.load(getAreaVisual('battle').iconPath);
  const iconSize = 24;
  const label = textRepository.getName('area', 'battle', 'nameplate');
  if (icon.complete && icon.naturalWidth > 0) {
    drawContainedIcon(context, icon, x - iconSize - 2, y + (height - iconSize) / 2, iconSize);
  }
  context.textAlign = 'center';
  context.fillStyle = '#ffe7ae';
  context.shadowColor = '#26110e';
  context.shadowBlur = 2;
  context.shadowOffsetY = 1;
  context.fillText(label, x + (width - 16) / 2, y + height / 2 + 1);
  context.restore();
}

export function drawAreaNameplates(context, assets, textRepository) {
  context.save();
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = 'bold 18px Georgia, serif';
  const image = assets.load(NAMEPLATE_PATH);
  if (image.complete && image.naturalWidth > 0) {
    STANDARD_AREAS.forEach((areaName) => {
      const label = textRepository.getName('area', areaName, 'nameplate');
      drawPlaqueLabel(context, image, getAreaNameplateBounds(areaName), label, areaName, assets);
    });
  }
  context.restore();
  drawBattleBanner(context, assets, textRepository);
}
