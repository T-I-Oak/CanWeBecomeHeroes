import test from 'node:test';
import assert from 'node:assert/strict';
import RunController, { TRIAL_FINAL_STAGE_NUMBER } from '../../../src/game/RunController.js';
import { GAME_TICKS_PER_HOUR, INITIAL_TRIAL_HOURS, getGuildTimeStatus } from '../../../src/game/GuildTime.js';

test('challenge stays active past seven days when the guild has extended its deadline', () => {
  const run = new RunController({ mode: 'challenge' });
  const stage = { number: 8, kind: 'regular' };
  const remainingAt = hours => getGuildTimeStatus({ tick: hours * GAME_TICKS_PER_HOUR, extensionHours: 24, contributionPoints: 0 }).remainingHours;
  run.update({ remainingHours: remainingAt(INITIAL_TRIAL_HOURS), stage, stageState: 'battle' });
  assert.equal(run.isActive, true);
  run.update({ remainingHours: remainingAt(INITIAL_TRIAL_HOURS + 24), stage, stageState: 'battle' });
  assert.equal(run.state, 'completed');
});

test('challenge continues beyond task seven and ends without a pass or failure at its extended deadline', () => {
  const run = new RunController({ mode: 'challenge' });
  for (const number of [7, 8, 14, 22]) {
    run.update({ remainingHours: 1, stage: { number, kind: 'boss' }, stageState: 'complete' });
    assert.equal(run.isActive, true);
  }
  run.update({ remainingHours: 0, stage: { number: 23, kind: 'regular' }, stageState: 'battle' });
  assert.deepEqual(run.getOutcome(), { state: 'completed', stageNumber: 23, stageKind: 'regular' });
  run.update({ remainingHours: 5, stage: null, stageState: 'selecting' });
  assert.equal(run.state, 'completed');
});

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

  run.update({ remainingHours: 3, stage: finalBossStage, stageState: 'complete' });
  run.update({ remainingHours: 0, stage: null, stageState: 'battle' });

  assert.deepEqual(run.getOutcome(), {
    state: 'cleared',
    stageNumber: TRIAL_FINAL_STAGE_NUMBER,
    stageKind: 'boss',
  });
});

test('final victory waits for the existing victory delay before showing the result', () => {
  const run = new RunController();
  const stage = { number: 7, kind: 'boss' };
  run.update({ remainingHours: 2, stage, stageState: 'victory' });
  assert.equal(run.isActive, true);
  assert.equal(run.getOutcome(), null);
  run.update({ remainingHours: 1, stage, stageState: 'complete' });
  assert.equal(run.state, 'cleared');
});

test('deadline during the final victory delay ends with a pass rather than failure', () => {
  const run = new RunController();
  const stage = { number: 7, kind: 'boss' };
  run.update({ remainingHours: 1, stage, stageState: 'victory' });
  run.update({ remainingHours: 0, stage, stageState: 'victory' });
  assert.equal(run.state, 'cleared');
});
