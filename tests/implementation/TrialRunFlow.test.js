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
  const recruitmentController = { joinedCount: 3, prepareCompletedStage: (input) => calls.push(['recruit', input]) };
  const flow = new TrialRunFlow({
    clock: { pause: (reason) => calls.push(['pause', reason]) },
    stageController,
    runController,
    recruitmentController,
    heroProgress: { unlockMany() {}, recordTrialClear() {} },
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
    recruitmentController: { joinedCount: 0, prepareCompletedStage() {} },
    heroProgress: { unlockMany() {}, recordTrialClear() {} },
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
    recruitmentController: { joinedCount: 0, prepareCompletedStage() {} },
    heroProgress: { unlockMany() {}, recordTrialClear() {} },
    getMembers: () => members,
    getRemainingHours: () => 2,
    openStageSelection() {},
    onRunCompleted: result => results.push(result),
  });

  flow.update([]);
  flow.update([]);

  assert.deepEqual(results, [{ outcome: { state: 'cleared' }, members }]);
});

test('successful recruitment plays once with pre-join members and defers selection until playback finishes', async () => {
  const existing = [{ profession: 'guard' }, { profession: 'mage' }];
  const recruitedHero = { profession: 'cleric', heroId: 'Darcy' };
  const members = [...existing];
  const stage = { id: 'elite-1', kind: 'elite', enemies: [{ definition: { id: 'medium-iron' } }] };
  let resolvePlayback;
  let requests = 0;
  let selections = 0;
  const playbackContexts = [];
  const flow = new TrialRunFlow({
    clock: { pause() {} },
    stageController: { currentStage: stage, state: 'complete', setJoinedCount() {} },
    runController: { isActive: true, state: 'active', update() {} },
    recruitmentController: {
      joinedCount: 0,
      prepareCompletedStage() {
        requests += 1;
        if (requests > 1) return { recruited: false, reason: 'already-processed' };
        return { reason: 'candidate-selected', candidateProfession: 'cleric' };
      },
      commitRecruitment() {
        members.push(recruitedHero);
        this.joinedCount = 1;
      },
    },
    heroProgress: {},
    getMembers: () => members,
    getRemainingHours: () => 12,
    openStageSelection: () => { selections += 1; },
    playRecruitmentVignette: (context) => {
      playbackContexts.push(context);
      return new Promise((resolve) => { resolvePlayback = resolve; });
    },
  });
  flow.update(existing);
  flow.update(members);
  assert.equal(requests, 1);
  assert.equal(selections, 0);
  assert.deepEqual(members, existing);
  assert.equal(flow.recruitmentPlaybackPending, true);
  assert.deepEqual(playbackContexts, [{ members: existing, recruitedHero, stage }]);
  resolvePlayback();
  await Promise.resolve();
  assert.equal(selections, 1);
  assert.deepEqual(members, [...existing, recruitedHero]);
  assert.equal(flow.recruitmentPlaybackPending, false);
});

test('duplicate recruitment skips the vignette and opens the next selection directly', () => {
  let selections = 0;
  const flow = new TrialRunFlow({
    clock: {},
    stageController: { currentStage: { kind: 'elite' }, state: 'complete', setJoinedCount() {} },
    runController: { isActive: true, state: 'active', update() {} },
    recruitmentController: { joinedCount: 0, prepareCompletedStage: () => ({ recruited: false, reason: 'already-joined' }) },
    heroProgress: {}, getMembers: () => [], getRemainingHours: () => 12,
    openStageSelection: () => { selections += 1; },
    playRecruitmentVignette: () => assert.fail('No actual join should play no vignette'),
  });
  flow.update([]);
  assert.equal(selections, 1);
});
