export const HERO_DIRECTION_INDICATOR_RADIUS = 24;
const POINTER_LENGTH = 12;
const EDGE_MARGIN = 12;
const INDICATOR_GAP = 8;

function getScreenPosition(camera, point) {
  return {
    x: (point.x - camera.x) * camera.zoom,
    y: (point.y - camera.y) * camera.zoom,
  };
}

function isOffscreen(position, viewport) {
  return position.x < 0 || position.x > viewport.width || position.y < 0 || position.y > viewport.height;
}

function getEdgePosition(target, viewport) {
  const center = { x: viewport.width / 2, y: viewport.height / 2 };
  const vector = { x: target.x - center.x, y: target.y - center.y };
  const length = Math.hypot(vector.x, vector.y);
  const direction = { x: vector.x / length, y: vector.y / length };
  const inset = EDGE_MARGIN + HERO_DIRECTION_INDICATOR_RADIUS + POINTER_LENGTH;
  const scale = Math.min(
    direction.x > 0 ? (viewport.width - inset - center.x) / direction.x : direction.x < 0 ? (inset - center.x) / direction.x : Infinity,
    direction.y > 0 ? (viewport.height - inset - center.y) / direction.y : direction.y < 0 ? (inset - center.y) / direction.y : Infinity,
  );
  return { x: center.x + direction.x * scale, y: center.y + direction.y * scale, angle: Math.atan2(direction.y, direction.x) };
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function separateAlongEdge(indicator, placed, viewport) {
  const minimumDistance = HERO_DIRECTION_INDICATOR_RADIUS * 2 + INDICATOR_GAP;
  const tangent = { x: -Math.sin(indicator.angle), y: Math.cos(indicator.angle) };
  const bounds = {
    left: EDGE_MARGIN + HERO_DIRECTION_INDICATOR_RADIUS,
    right: viewport.width - EDGE_MARGIN - HERO_DIRECTION_INDICATOR_RADIUS,
    top: EDGE_MARGIN + HERO_DIRECTION_INDICATOR_RADIUS,
    bottom: viewport.height - EDGE_MARGIN - HERO_DIRECTION_INDICATOR_RADIUS,
  };
  for (let attempt = 1; attempt <= placed.length * 2 + 1; attempt += 1) {
    const overlaps = placed.some((other) => Math.hypot(other.x - indicator.x, other.y - indicator.y) < minimumDistance);
    if (!overlaps) return indicator;
    const sign = attempt % 2 === 0 ? -1 : 1;
    const distance = Math.ceil(attempt / 2) * minimumDistance;
    indicator.x = clamp(indicator.x + tangent.x * distance * sign, bounds.left, bounds.right);
    indicator.y = clamp(indicator.y + tangent.y * distance * sign, bounds.top, bounds.bottom);
  }
  return indicator;
}

/** Returns UI-coordinate indicators for Heroes whose centers are outside the current viewport. */
export function getHeroDirectionIndicators(heroes, camera) {
  const indicators = heroes
    .map((hero) => ({ hero, position: getScreenPosition(camera, hero.chip) }))
    .filter(({ position }) => isOffscreen(position, camera.viewport))
    .map(({ hero, position }) => ({
      hero,
      ...getEdgePosition(position, camera.viewport),
      radius: HERO_DIRECTION_INDICATOR_RADIUS,
      color: hero.chip.fillColor,
      staminaReady: hero.currentArea === 'preparation' && hero.stamina >= hero.maximums.stamina,
    }))
    .sort((left, right) => left.angle - right.angle);
  return indicators.reduce((placed, indicator) => [...placed, separateAlongEdge({ ...indicator }, placed, camera.viewport)], []);
}

export function getHeroDirectionIndicatorAtPoint(indicators, point) {
  return indicators.find((indicator) => Math.hypot(point.x - indicator.x, point.y - indicator.y) <= indicator.radius) ?? null;
}
