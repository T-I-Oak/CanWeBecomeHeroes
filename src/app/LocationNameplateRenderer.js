import { LOCATION_NAMEPLATE_LAYOUT } from '../game/LocationNameplateLayout.js';
import { getLocationVisual, LOCATION_ICON_SAFE_SIZE, LOCATION_ICON_SOURCE_SIZE } from '../game/LocationVisualCatalog.js';

const LOCATION_NAMEPLATE_FILL_COLOR = '#fff4d6';
const LOCATION_NAMEPLATE_BORDER_COLOR = '#d5a64c';
const LOCATION_NAMEPLATE_INNER_BORDER_COLOR = '#6f4a20';
const LOCATION_NAMEPLATE_TEXT_COLOR = '#1f382b';
const LOCATION_NAMEPLATE_TEXT_SHADOW_COLOR = 'rgba(255, 255, 255, 0.5)';
const LOCATION_NAMEPLATE_CORNER_RADIUS = 10;

function drawRoundedRectangle(context, x, y, width, height, radius) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function drawLocationIcon(context, assets, location, x, y) {
  const icon = assets.load(getLocationVisual(location).iconPath);
  if (!icon.complete || icon.naturalWidth <= 0) return;
  const size = LOCATION_NAMEPLATE_LAYOUT.iconSize;
  context.drawImage(icon, x, y, size, size);
}

function getIconVisualInset() {
  return LOCATION_NAMEPLATE_LAYOUT.iconSize
    * (LOCATION_ICON_SOURCE_SIZE - LOCATION_ICON_SAFE_SIZE)
    / (LOCATION_ICON_SOURCE_SIZE * 2);
}

function getLabelInkBounds(context, label) {
  const metrics = context.measureText(label);
  const left = metrics.actualBoundingBoxLeft ?? 0;
  const right = metrics.actualBoundingBoxRight ?? metrics.width;
  return Object.freeze({ left, right, width: left + right });
}

export function drawLocationNameplate(context, assets, location, origin, label) {
  context.save();
  context.font = 'bold 18px Georgia, serif';
  const iconVisualInset = getIconVisualInset();
  const iconVisualSize = LOCATION_NAMEPLATE_LAYOUT.iconSize - iconVisualInset * 2;
  const labelInkBounds = getLabelInkBounds(context, label);
  const width = LOCATION_NAMEPLATE_LAYOUT.visualPadding * 2
    + iconVisualSize
    + LOCATION_NAMEPLATE_LAYOUT.contentGap
    + labelInkBounds.width;
  const bounds = {
    x: origin.x,
    y: origin.y,
    width,
    height: LOCATION_NAMEPLATE_LAYOUT.height,
  };
  drawRoundedRectangle(context, bounds.x, bounds.y, bounds.width, bounds.height, LOCATION_NAMEPLATE_CORNER_RADIUS);
  context.fillStyle = LOCATION_NAMEPLATE_FILL_COLOR;
  context.fill();
  context.lineWidth = 3;
  context.strokeStyle = LOCATION_NAMEPLATE_BORDER_COLOR;
  context.stroke();
  drawRoundedRectangle(context, bounds.x + 3, bounds.y + 3, bounds.width - 6, bounds.height - 6, LOCATION_NAMEPLATE_CORNER_RADIUS - 3);
  context.lineWidth = 1;
  context.strokeStyle = LOCATION_NAMEPLATE_INNER_BORDER_COLOR;
  context.stroke();
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = LOCATION_NAMEPLATE_TEXT_COLOR;
  context.shadowColor = LOCATION_NAMEPLATE_TEXT_SHADOW_COLOR;
  context.shadowBlur = 2;
  context.shadowOffsetY = 1;
  const iconX = bounds.x + LOCATION_NAMEPLATE_LAYOUT.visualPadding - iconVisualInset;
  const iconY = bounds.y + (bounds.height - LOCATION_NAMEPLATE_LAYOUT.iconSize) / 2;
  context.textAlign = 'left';
  context.fillText(label, bounds.x + LOCATION_NAMEPLATE_LAYOUT.visualPadding + iconVisualSize + LOCATION_NAMEPLATE_LAYOUT.contentGap - labelInkBounds.left, bounds.y + bounds.height / 2 + 1);
  context.restore();
  drawLocationIcon(context, assets, location, iconX, iconY);
  return Object.freeze(bounds);
}
