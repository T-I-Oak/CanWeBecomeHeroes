/**
 * Persists the members of a run only when that run transitions to a cleared
 * trial. Recruitment itself remains temporary until this point.
 */
export function unlockClearedTrialMembers({ wasRunActive, runController, members, heroProgress }) {
  if (!wasRunActive || runController.state !== 'cleared') return false;
  heroProgress.unlockMany(members.map((member) => member.profession));
  return true;
}
