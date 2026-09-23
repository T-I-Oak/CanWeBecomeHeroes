export const CHARACTER_STEP_DISTANCE_LIGHT = 96;
export const CHARACTER_WEIGHT_SCALE = 25;

export function getCharacterStepDistance(carriedWeight) {
  const weight = Math.max(0, carriedWeight);
  return CHARACTER_STEP_DISTANCE_LIGHT / (1 + (weight / CHARACTER_WEIGHT_SCALE) ** 2);
}
