import test from 'node:test';
import assert from 'node:assert/strict';
import { selectResultAchievements } from '../../src/game/ResultAchievementSelection.js';
const entry = (id, updated, runG, grade = 0) => ({ id, updated, runG, grade });

test('updated achievements take priority, extras use unbounded run G and display returns to definition order', () => {
  const values = [entry('a', false, 8), entry('b', true, 1), entry('c', false, 20), entry('d', true, 0)];
  const snapshot = structuredClone(values);
  assert.deepEqual(selectResultAchievements(values, 3).map(item => item.id), ['b', 'c', 'd']);
  assert.deepEqual(values, snapshot);
});
test('update overflow and equal G both prefer definition order; E and duplicate IDs are handled', () => {
  assert.deepEqual(selectResultAchievements([entry('a', true, 0), entry('b', true, 99)], 1).map(item => item.id), ['a']);
  assert.deepEqual(selectResultAchievements([entry('a', false, 0), entry('a', false, 10), entry('b', false, 0)], 2).map(item => item.id), ['a', 'b']);
  assert.equal(selectResultAchievements([entry('e', false, 0)], 1)[0].grade, 0);
  assert.deepEqual(selectResultAchievements([entry('a', true, 1)], 0), []);
});
