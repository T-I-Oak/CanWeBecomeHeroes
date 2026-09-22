import test from 'node:test';
import assert from 'node:assert/strict';
import TrialRunFlow from '../../src/app/TrialRunFlow.js';

test('trial run flow advances to the next task only while the run remains active', () => {
  const calls = [];
  const stageController = { currentStage: { id: 'stage-1' }, state: 'complete', setJoinedCount: (count) => calls.push(['joined', count]) };
  const runController = {
    isActive: true,
    state: 'active',
    update: (input) => calls.push(['run', input]),
  };
  const recruitmentController = { joinedCount: 3, processCompletedStage: (input) => calls.push(['recruit', input]) };
  const flow = new TrialRunFlow({
    clock: { pause: (reason) => calls.push(['pause', reason]) },
    stageController,
    runController,
    recruitmentController,
    heroProgress: { unlockMany: () => {} },
    getMembers: () => [],
    getRemainingHours: () => 12,
    openStageSelection: () => calls.push(['choose-next']),
  });

  flow.update([{ id: 'hero-1' }]);

  assert.deepEqual(calls.map(([kind]) => kind), ['recruit', 'joined', 'run', 'choose-next']);
});

test('trial run flow pauses only after the run reaches a terminal state', () => {
  const calls = [];
  const runController = {
    isActive: true,
    state: 'active',
    update() { this.isActive = false; this.state = 'expired'; },
    getOutcome: () => ({ state: 'expired' }),
  };
  const flow = new TrialRunFlow({
    clock: { pause: (reason) => calls.push(reason) },
    stageController: { currentStage: null, state: 'active', setJoinedCount() {} },
    runController,
    recruitmentController: { joinedCount: 0, processCompletedStage() {} },
    heroProgress: { unlockMany() {} },
    getMembers: () => [],
    getRemainingHours: () => 0,
    openStageSelection: () => calls.push('choose-next'),
  });

  flow.update([]);

  assert.deepEqual(calls, ['run-complete']);
});

test('trial run flow publishes one terminal result when an active run ends', () => {
  const results = [];
  const members = [{ heroId: 'Avery', profession: 'swordfighter' }];
  const runController = {
    isActive: true,
    state: 'active',
    update() { this.isActive = false; this.state = 'cleared'; },
    getOutcome: () => ({ state: 'cleared' }),
  };
  const flow = new TrialRunFlow({
    clock: { pause() {} },
    stageController: { currentStage: null, state: 'active', setJoinedCount() {} },
    runController,
    recruitmentController: { joinedCount: 0, processCompletedStage() {} },
    heroProgress: { unlockMany() {} },
    getMembers: () => members,
    getRemainingHours: () => 2,
    openStageSelection() {},
    onRunCompleted: result => results.push(result),
  });

  flow.update([]);
  flow.update([]);

  assert.deepEqual(results, [{ outcome: { state: 'cleared' }, members }]);
});
