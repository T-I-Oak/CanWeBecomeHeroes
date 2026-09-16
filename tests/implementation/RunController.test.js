import test from 'node:test';
import assert from 'node:assert/strict';
import RunController, { TRIAL_FINAL_STAGE_NUMBER } from '../../src/game/RunController.js';

test('trial run expires when its remaining time reaches zero before final-boss victory', () => {
  const run = new RunController();

  run.update({ remainingHours: 0, stage: null, stageState: 'battle' });

  assert.equal(run.state, 'expired');
  assert.deepEqual(run.getOutcome(), { state: 'expired', stageNumber: null, stageKind: null });
});

test('final-boss victory clears the trial even when the deadline reaches zero', () => {
  const run = new RunController();
  const finalBossStage = { number: TRIAL_FINAL_STAGE_NUMBER, kind: 'boss' };

  run.update({ remainingHours: 0, stage: finalBossStage, stageState: 'victory' });

  assert.equal(run.state, 'cleared');
  assert.deepEqual(run.getOutcome(), {
    state: 'cleared',
    stageNumber: TRIAL_FINAL_STAGE_NUMBER,
    stageKind: 'boss',
  });
});

test('trial run remains active after a non-final victory while time remains', () => {
  const run = new RunController();

  run.update({ remainingHours: 1, stage: { number: 6, kind: 'boss' }, stageState: 'victory' });

  assert.equal(run.state, 'active');
  assert.equal(run.getOutcome(), null);
});

test('a completed run keeps its first outcome when later updates arrive', () => {
  const run = new RunController();
  const finalBossStage = { number: TRIAL_FINAL_STAGE_NUMBER, kind: 'boss' };

  run.update({ remainingHours: 3, stage: finalBossStage, stageState: 'victory' });
  run.update({ remainingHours: 0, stage: null, stageState: 'battle' });

  assert.deepEqual(run.getOutcome(), {
    state: 'cleared',
    stageNumber: TRIAL_FINAL_STAGE_NUMBER,
    stageKind: 'boss',
  });
});
