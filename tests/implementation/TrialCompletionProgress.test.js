import test from 'node:test';
import assert from 'node:assert/strict';
import { unlockClearedTrialMembers } from '../../src/game/TrialCompletionProgress.js';

test('a recruited hero remains temporary until the trial is cleared', () => {
  const unlockCalls = [];
  const heroProgress = { unlockMany: (professionIds) => unlockCalls.push(professionIds) };
  const members = [{ profession: 'swordfighter' }, { profession: 'mage' }];

  assert.equal(unlockClearedTrialMembers({ wasRunActive: true, runController: { state: 'active' }, members, heroProgress }), false);
  assert.deepEqual(unlockCalls, []);
});

test('clearing a trial unlocks every member present in that run exactly once', () => {
  const unlockCalls = [];
  const heroProgress = { unlockMany: (professionIds) => unlockCalls.push(professionIds) };
  const members = [{ profession: 'swordfighter' }, { profession: 'mage' }, { profession: 'mage' }];

  assert.equal(unlockClearedTrialMembers({ wasRunActive: true, runController: { state: 'cleared' }, members, heroProgress }), true);
  assert.deepEqual(unlockCalls, [['swordfighter', 'mage', 'mage']]);
  assert.equal(unlockClearedTrialMembers({ wasRunActive: false, runController: { state: 'cleared' }, members, heroProgress }), false);
  assert.equal(unlockCalls.length, 1);
});
