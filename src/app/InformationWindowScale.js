export const DEFAULT_WINDOW_SCALE = 1;
export const COMPACT_WINDOW_SCALE = 0.5;
export const MIN_WINDOW_SCALE = 0.4;
export const MAX_WINDOW_SCALE = 2;

const CORNERS = Object.freeze({
  nw: { x: -1, y: -1 },
  ne: { x: 1, y: -1 },
  sw: { x: -1, y: 1 },
  se: { x: 1, y: 1 },
});

export function isDefaultWindowScale(scale) {
  return Math.abs(scale - DEFAULT_WINDOW_SCALE) < 0.001;
}

export function nextToggleScale(scale) {
  return isDefaultWindowScale(scale) ? COMPACT_WINDOW_SCALE : DEFAULT_WINDOW_SCALE;
}

function roundScale(scale) {
  return Math.round(scale * 1000) / 1000;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function resizeInformationWindow({
  layoutWidth,
  layoutHeight,
  left,
  top,
  scale,
  corner,
  pointerX,
  pointerY,
  viewportWidth,
  viewportHeight,
  margin = 12,
}) {
  const direction = CORNERS[corner];
  if (!direction || !(layoutWidth > 0) || !(layoutHeight > 0)) return { scale, left, top };
  const fixedX = direction.x > 0 ? left : left + layoutWidth * scale;
  const fixedY = direction.y > 0 ? top : top + layoutHeight * scale;
  const scaleX = direction.x * (pointerX - fixedX) / layoutWidth;
  const scaleY = direction.y * (pointerY - fixedY) / layoutHeight;
  const roomX = direction.x > 0 ? viewportWidth - margin - fixedX : fixedX - margin;
  const roomY = direction.y > 0 ? viewportHeight - margin - fixedY : fixedY - margin;
  const viewportScale = Math.min(roomX / layoutWidth, roomY / layoutHeight);
  const upper = clamp(viewportScale, MIN_WINDOW_SCALE, MAX_WINDOW_SCALE);
  const nextScale = roundScale(clamp((scaleX + scaleY) / 2, MIN_WINDOW_SCALE, upper));
  return {
    scale: nextScale,
    left: direction.x > 0 ? fixedX : fixedX - layoutWidth * nextScale,
    top: direction.y > 0 ? fixedY : fixedY - layoutHeight * nextScale,
  };
}
