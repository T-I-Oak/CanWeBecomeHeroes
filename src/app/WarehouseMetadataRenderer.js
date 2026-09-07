import { APP_COPYRIGHT, APP_VERSION } from '../game/AppMetadata.js';
import { GAME_AREAS } from '../game/GameAreas.js';

const LEFT_PADDING = 24;
const BOTTOM_PADDING = 20;
const TEXT_GAP = 16;
const HIT_PADDING = 4;
const FONT = '700 13px system-ui, sans-serif';

function measure(context, value) {
  context.save();
  context.font = FONT;
  const width = context.measureText(value).width;
  context.restore();
  return width;
}

export function getWarehouseMetadataLayout(context) {
  const area = GAME_AREAS.warehouse;
  const version = `v${APP_VERSION}`;
  const copyrightPrefix = `© ${APP_COPYRIGHT.holder} ${APP_COPYRIGHT.year} | `;
  const x = area.x + LEFT_PADDING;
  const y = area.y + area.height - BOTTOM_PADDING;
  const versionWidth = measure(context, version);
  const prefixWidth = measure(context, copyrightPrefix);
  const portalWidth = measure(context, APP_COPYRIGHT.portal);
  const portalX = x + versionWidth + TEXT_GAP + prefixWidth;
  return Object.freeze({
    version,
    copyrightPrefix,
    portal: APP_COPYRIGHT.portal,
    x,
    y,
    portalBounds: Object.freeze({ x: portalX - HIT_PADDING, y: y - 14 - HIT_PADDING, width: portalWidth + HIT_PADDING * 2, height: 18 + HIT_PADDING * 2 }),
  });
}

export function isWarehousePortalAtPoint(context, point) {
  const { portalBounds } = getWarehouseMetadataLayout(context);
  return point.x >= portalBounds.x && point.x <= portalBounds.x + portalBounds.width
    && point.y >= portalBounds.y && point.y <= portalBounds.y + portalBounds.height;
}

export function drawWarehouseMetadata(context) {
  const layout = getWarehouseMetadataLayout(context);
  context.save();
  context.font = FONT;
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  context.fillStyle = 'rgba(255, 255, 255, 0.74)';
  context.strokeStyle = 'rgba(28, 20, 13, 0.82)';
  context.lineWidth = 3;
  const copyrightX = layout.x + measure(context, layout.version) + TEXT_GAP;
  const portalX = copyrightX + measure(context, layout.copyrightPrefix);
  [
    [layout.version, layout.x, 'rgba(255, 255, 255, 0.74)'],
    [layout.copyrightPrefix, copyrightX, 'rgba(255, 255, 255, 0.74)'],
    [layout.portal, portalX, '#d5ebff'],
  ].forEach(([text, x, color]) => {
    context.fillStyle = color;
    context.strokeText(text, x, layout.y);
    context.fillText(text, x, layout.y);
  });
  context.strokeStyle = '#d5ebff';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(portalX, layout.y + 3);
  context.lineTo(portalX + measure(context, layout.portal), layout.y + 3);
  context.stroke();
  context.restore();
}
