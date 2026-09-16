function containsPoint(bounds, point) {
  return point.x >= bounds.x && point.x <= bounds.x + bounds.width
    && point.y >= bounds.y && point.y <= bounds.y + bounds.height;
}

export default function createLocationNameplateBoundsRegistry() {
  const areaBounds = new Map();
  const facilityBounds = new Map();

  return Object.freeze({
    setArea(areaName, bounds) {
      areaBounds.set(areaName, Object.freeze({ ...bounds }));
    },
    setFacility(facilityName, bounds) {
      facilityBounds.set(facilityName, Object.freeze({ ...bounds }));
    },
    getAreaAtPoint(point) {
      return [...areaBounds].find(([, bounds]) => containsPoint(bounds, point))?.[0] ?? null;
    },
    getFacilityAtPoint(point) {
      return [...facilityBounds].find(([, bounds]) => containsPoint(bounds, point))?.[0] ?? null;
    },
  });
}
