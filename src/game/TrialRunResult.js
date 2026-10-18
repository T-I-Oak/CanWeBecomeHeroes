import { selectResultAchievements } from './ResultAchievementSelection.js';
import { createHeroEpithets } from './HeroEpithets.js';

export const TRIAL_RUN_RESULT_TYPE = Object.freeze({
  certificate: 'certificate',
  failureNotice: 'failure-notice',
  challengeNotice: 'challenge-notice',
});

function getResultType(outcome) {
  if (outcome?.state === 'completed') return TRIAL_RUN_RESULT_TYPE.challengeNotice;
  if (outcome?.state === 'cleared') return TRIAL_RUN_RESULT_TYPE.certificate;
  if (outcome?.state === 'expired') return TRIAL_RUN_RESULT_TYPE.failureNotice;
  throw new RangeError('A trial result requires a completed run outcome.');
}

function snapshotMember({ heroId, profession }) {
  return Object.freeze({ heroId, profession });
}

function freezeRecord(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeRecord);
    Object.freeze(value);
  }
  return value;
}

/**
 * Snapshots the outcome of one trial run for presentation.
 * Achievements and hero epithets are selected once from the completed record.
 * Presentation never changes this selection.
 */
export function createTrialRunResult({ outcome, members, issuedAt = new Date(), record = null, random = Math.random, language = 'ja' }) {
  const type = getResultType(outcome);
  const epithets = type !== TRIAL_RUN_RESULT_TYPE.failureNotice && record ? createHeroEpithets(record.statistics, members, { random, language }) : {};
  return Object.freeze({
    type: getResultType(outcome),
    stageNumber: outcome.stageNumber,
    members: Object.freeze(members.map(member => epithets[member.heroId] ? Object.freeze({ ...snapshotMember(member), epithet: epithets[member.heroId] }) : snapshotMember(member))),
    issuedAt: new Date(issuedAt),
    achievements: freezeRecord(structuredClone(selectResultAchievements(record?.achievements?.entries ?? [], 10))),
    record: record === null ? null : freezeRecord(structuredClone(record)),
  });
}
