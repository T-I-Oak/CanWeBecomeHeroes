const AREA_VISUALS = Object.freeze({
  preparation: Object.freeze({ iconPath: '/assets/areas/preparation.png' }),
  warehouse: Object.freeze({ iconPath: '/assets/areas/warehouse.png' }),
  battle: Object.freeze({ iconPath: '/assets/areas/battle.png' }),
  shop: Object.freeze({ iconPath: '/assets/areas/shop.png' }),
  guild: Object.freeze({ iconPath: '/assets/areas/guild.png' }),
  training: Object.freeze({ iconPath: '/assets/areas/training.png' }),
});

export function getAreaVisual(area) {
  const visual = AREA_VISUALS[area];
  if (!visual) throw new RangeError(`Unknown area visual: ${area}`);
  return visual;
}

export { AREA_VISUALS };
