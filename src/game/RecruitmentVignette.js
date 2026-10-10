import { createObservedVictoryScenario } from './RecruitmentVignetteScenarios.js';

export const BASIC_RECRUITMENT_SCENARIOS = Object.freeze([createObservedVictoryScenario]);
export function createRecruitmentVignette({ cast, enemies, textRepository, random = Math.random }) {
  if (!cast.A || !cast.B || !cast.X || ![3, 4].includes(Object.keys(cast).length)) throw new RangeError('A recruitment vignette requires A, B, X and optional C.');
  const createScenario = BASIC_RECRUITMENT_SCENARIOS[Math.floor(random() * BASIC_RECRUITMENT_SCENARIOS.length)];
  return createScenario({ cast, enemies, textRepository });
}
