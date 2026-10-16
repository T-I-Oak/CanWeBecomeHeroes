export const STAGE_LEVEL_OFFSET = 2;
export const STAGE_LEVEL_VARIATION = 2;

export function getStageBaseLevel(stageNumber) {
  if (!Number.isInteger(stageNumber) || stageNumber < 1) throw new RangeError('Stage number must be a positive integer.');
  return stageNumber + STAGE_LEVEL_OFFSET;
}

export function rollStageLevel(stageNumber, random = Math.random) {
  const variation = Math.floor(random() * (STAGE_LEVEL_VARIATION * 2 + 1)) - STAGE_LEVEL_VARIATION;
  return Math.max(1, getStageBaseLevel(stageNumber) + variation);
}
