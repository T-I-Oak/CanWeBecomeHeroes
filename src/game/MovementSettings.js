export const HERO_STEP_DISTANCE_LIGHT = 96;
export const HERO_WEIGHT_SCALE = 25;

export function getHeroStepDistance(carriedWeight) {
  const weight = Math.max(0, carriedWeight);
  return HERO_STEP_DISTANCE_LIGHT / (1 + (weight / HERO_WEIGHT_SCALE) ** 2);
}
