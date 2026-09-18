import test from 'node:test';
import assert from 'node:assert/strict';
import RunController, { TRIAL_FINAL_STAGE_NUMBER } from '../../src/game/RunController.js';
import { unlockClearedTrialMembers } from '../../src/game/TrialCompletionProgress.js';

test('試験ゲームランは第7試験のボス勝利で合格となり、その時点の仲間を解放する', () => {
  const run = new RunController();
  const members = [{ profession: 'swordfighter' }, { profession: 'mage' }, { profession: 'guard' }];
  const unlocked = [];

  run.update({
    remainingHours: 0,
    stage: { number: TRIAL_FINAL_STAGE_NUMBER, kind: 'boss' },
    stageState: 'victory',
  });

  assert.deepEqual(run.getOutcome(), { state: 'cleared', stageNumber: 7, stageKind: 'boss' });
  assert.equal(unlockClearedTrialMembers({
    wasRunActive: true,
    runController: run,
    members,
    heroProgress: { unlockMany: (professions) => unlocked.push(...professions) },
  }), true);
  assert.deepEqual(unlocked, ['swordfighter', 'mage', 'guard']);
});

test('試験ゲームランは最終ボス勝利前に期限切れなら不合格となる', () => {
  const run = new RunController();

  run.update({ remainingHours: 0, stage: { number: 6, kind: 'boss' }, stageState: 'victory' });

  assert.deepEqual(run.getOutcome(), { state: 'expired', stageNumber: 6, stageKind: 'boss' });
});
