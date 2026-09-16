export const LOCATION_ICON_SOURCE_SIZE = 1024;
export const LOCATION_ICON_SAFE_SIZE = 832;

export const LOCATION_VISUALS = Object.freeze({
  preparation: Object.freeze({ iconPath: '/assets/areas/preparation.png' }),
  warehouse: Object.freeze({ iconPath: '/assets/areas/warehouse.png' }),
  battle: Object.freeze({ iconPath: '/assets/areas/battle.png' }),
  shop: Object.freeze({ iconPath: '/assets/areas/shop.png' }),
  guild: Object.freeze({ iconPath: '/assets/areas/guild.png' }),
  training: Object.freeze({ iconPath: '/assets/areas/training.png' }),
});

export function getLocationVisual(location) {
  const visual = LOCATION_VISUALS[location];
  if (!visual) throw new RangeError(`Unknown location visual: ${location}`);
  return visual;
}
