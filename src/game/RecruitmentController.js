import { HERO_PROFESSION_IDS } from './HeroFactory.js';
import { MAX_RECRUITED_HERO_COUNT } from './RecruitmentLimits.js';

export { MAX_RECRUITED_HERO_COUNT } from './RecruitmentLimits.js';

function createResult({ candidateProfession = null, recruited = false, reason }) {
  return Object.freeze({ candidateProfession, recruited, reason });
}

export function selectRecruitmentCandidate(professions, random = Math.random) {
  return professions[Math.floor(random() * professions.length)];
}

export default class RecruitmentController {
  constructor({ professions = HERO_PROFESSION_IDS, random = Math.random, onRecruit = () => {} } = {}) {
    this.professions = Object.freeze([...professions]);
    this.random = random;
    this.onRecruit = onRecruit;
    this.joinedCount = 0;
    this.processedEliteStageIds = new Set();
  }

  processCompletedStage({ stage, stageState, heroes }) {
    if (stageState !== 'complete' || stage?.kind !== 'elite') return null;
    if (this.processedEliteStageIds.has(stage.id)) return createResult({ reason: 'already-processed' });
    this.processedEliteStageIds.add(stage.id);
    if (this.joinedCount >= MAX_RECRUITED_HERO_COUNT) return createResult({ reason: 'recruitment-capacity-reached' });
    const candidateProfession = selectRecruitmentCandidate(this.professions, this.random);
    if (heroes.some((hero) => hero.profession === candidateProfession)) {
      return createResult({ candidateProfession, reason: 'already-joined' });
    }
    this.onRecruit(candidateProfession);
    this.joinedCount += 1;
    return createResult({ candidateProfession, recruited: true, reason: 'recruited' });
  }
}
