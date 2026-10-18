import test from 'node:test';
import assert from 'node:assert/strict';
import { selectResultAchievements } from '../../src/game/ResultAchievementSelection.js';
const entry = (id, updated, deltaG, grade = 0, G = 0) => ({ id, updated, deltaG, grade, G });

test('equal growth prefers smaller nonzero final G, then zero, within both update groups', () => {
  for (const updated of [false, true]) {
    const values = [entry('zero', updated, 0), entry('large', updated, 0, 0, 20), entry('small', updated, 0, 0, 0.5), entry('middle', updated, 0, 0, 3)];
    const snapshot = structuredClone(values);
    assert.deepEqual(selectResultAchievements(values, 2).map(item => item.id), ['small', 'middle']);
    assert.deepEqual(selectResultAchievements(values, 3).map(item => item.id), ['large', 'small', 'middle']);
    assert.deepEqual(selectResultAchievements(values, 4), values);
    assert.deepEqual(values, snapshot);
  }
});

test('update and growth precede final G including zero; grade jump size is not a key', () => {
  const values = [entry('growth', false, 100, 0, 0), entry('updated', true, 0, 1, 0), entry('small', false, 1, 9, 0.1)];
  assert.deepEqual(selectResultAchievements(values, 1).map(item => item.id), ['updated']);
  assert.deepEqual(selectResultAchievements(values, 2).map(item => item.id), ['growth', 'updated']);
  assert.deepEqual(selectResultAchievements([entry('first', true, 1, 1, 2), entry('second', true, 1, 9, 2)], 1).map(item => item.id), ['first']);
});

test('ten-entry boundary uses final G and definition order without duplicate IDs', () => {
  const values = Array.from({ length: 12 }, (_, index) => entry(`item-${index}`, false, 0, 0, index === 0 ? 0 : 12 - index));
  values.push(entry('item-0', true, 999, 0, 1));
  const snapshot = structuredClone(values);
  assert.deepEqual(selectResultAchievements(values, 10).map(item => item.id), values.slice(2, 12).map(item => item.id));
  assert.deepEqual(values, snapshot);
  assert.deepEqual(selectResultAchievements(Array.from({ length: 12 }, (_, index) => entry(`tie-${index}`, false, 1, 0, 2)), 10).map(item => item.id), Array.from({ length: 10 }, (_, index) => `tie-${index}`));
});

test('updated achievements take priority, extras use unbounded cumulative G growth and display returns to definition order', () => {
  const values = [entry('a', false, 8), entry('b', true, 1), entry('c', false, 20), entry('d', true, 0)];
  const snapshot = structuredClone(values);
  assert.deepEqual(selectResultAchievements(values, 3).map(item => item.id), ['b', 'c', 'd']);
  assert.deepEqual(values, snapshot);
});
test('update overflow prefers cumulative G growth, breaks ties by definition order, and retains display order', () => {
  const values = [entry('a', true, 0), entry('b', true, 99), entry('c', true, 99), entry('d', false, 1000)];
  const snapshot = structuredClone(values);
  assert.deepEqual(selectResultAchievements(values, 1).map(item => item.id), ['b']);
  assert.deepEqual(selectResultAchievements(values, 2).map(item => item.id), ['b', 'c']);
  assert.deepEqual(selectResultAchievements([entry('a', true, 20), entry('b', true, 99)], 2).map(item => item.id), ['a', 'b']);
  assert.deepEqual(values, snapshot);
});
test('equal G, E and duplicate IDs are handled', () => {
  assert.deepEqual(selectResultAchievements([entry('a', false, 0), entry('a', false, 10), entry('b', false, 0)], 2).map(item => item.id), ['a', 'b']);
  assert.equal(selectResultAchievements([entry('e', false, 0)], 1)[0].grade, 0);
  assert.deepEqual(selectResultAchievements([entry('a', true, 1)], 0), []);
});
