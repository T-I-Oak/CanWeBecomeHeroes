export function isPointInRect(point, x, y, width, height) {
  return point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + height;
}
