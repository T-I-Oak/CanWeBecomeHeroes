export const TRIAL_RUN_RESULT_TYPE = Object.freeze({
  certificate: 'certificate',
  failureNotice: 'failure-notice',
});

function getResultType(outcome) {
  if (outcome?.state === 'cleared') return TRIAL_RUN_RESULT_TYPE.certificate;
  if (outcome?.state === 'expired') return TRIAL_RUN_RESULT_TYPE.failureNotice;
  throw new RangeError('A trial result requires a completed run outcome.');
}

function snapshotMember({ heroId, profession }) {
  return Object.freeze({ heroId, profession });
}

/**
 * Snapshots the outcome of one trial run for presentation.
 * Achievement records are intentionally part of the result now so the result
 * screen can render them when their separate specification is introduced.
 */
export function createTrialRunResult({ outcome, members, issuedAt = new Date() }) {
  return Object.freeze({
    type: getResultType(outcome),
    members: Object.freeze(members.map(snapshotMember)),
    issuedAt: new Date(issuedAt),
    achievements: Object.freeze([]),
  });
}
