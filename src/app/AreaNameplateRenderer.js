import { getAreaNameplateBounds } from '../game/AreaNameplateLayout.js';

const STANDARD_AREA_LABELS = Object.freeze({
  preparation: 'Home',
  warehouse: 'Warehouse',
});
const NAMEPLATE_PATH = '/assets/ui/facility-nameplate.png';

function drawPlaqueLabel(context, image, bounds, label) {
  context.drawImage(image, bounds.x, bounds.y, bounds.width, bounds.height);
  context.fillStyle = '#f4df9b';
  context.shadowColor = '#1a0f08';
  context.shadowBlur = 2;
  context.shadowOffsetY = 1;
  context.fillText(label, bounds.x + bounds.width / 2, bounds.y + bounds.height / 2 + 1);
}

function drawBattleBanner(context) {
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
  context.fillStyle = '#ffe7ae';
  context.shadowColor = '#26110e';
  context.shadowBlur = 2;
  context.shadowOffsetY = 1;
  context.fillText('Battle', x + (width - 16) / 2, y + height / 2 + 1);
  context.restore();
}

export function drawAreaNameplates(context, assets) {
  context.save();
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = 'bold 18px Georgia, serif';
  const image = assets.load(NAMEPLATE_PATH);
  if (image.complete && image.naturalWidth > 0) {
    Object.entries(STANDARD_AREA_LABELS).forEach(([areaName, label]) => {
      drawPlaqueLabel(context, image, getAreaNameplateBounds(areaName), label);
    });
  }
  context.restore();
  drawBattleBanner(context);
}
