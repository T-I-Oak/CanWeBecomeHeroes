import test from 'node:test';
import assert from 'node:assert/strict';
import GameStatistics from '../../../src/game/GameStatistics.js';
import Achievements from '../../../src/game/Achievements.js';
import { ACHIEVEMENT_DEFINITIONS } from '../../../src/game/AchievementDefinitions.js';
import { getAchievementProgress, getRecordAchievements, getTaskRecords } from '../../../src/app/RecordScreenData.js';

test('next achievement thresholds agree with the evaluator at every integer boundary', () => {
  for (const definition of ACHIEVEMENT_DEFINITIONS) {
    for (let grade = 0; grade < definition.levels.length; grade++) {
      const progress = getAchievementProgress(definition, { p: 0, grade });
      const next = definition.levels[grade];
      assert.ok(definition.gradeFormula(progress.target) >= next.minG - 1e-12, definition.id);
      assert.ok(definition.gradeFormula(progress.target - 1) < next.minG - 1e-12, definition.id);
    }
    assert.equal(getAchievementProgress(definition, { p: 99999, grade: definition.levels.length }).target, null);
  }
});

test('tag progress advances one tag at a time through all seven ranks', () => {
  const definition = ACHIEVEMENT_DEFINITIONS.find(item => item.id === 'tag:valor');
  for (let count = 0; count < 7; count++) {
    assert.deepEqual(getAchievementProgress(definition, { p: count, grade: count }), {
      current: count, target: count + 1, ratio: count / (count + 1),
    });
  }
  assert.equal(getAchievementProgress(definition, { p: 7, grade: 7 }).target, null);
});

test('all known achievements retain definition order and zero progress without mutating cumulative data', () => {
  const data = new GameStatistics().exportData();
  const before = structuredClone(data);
  const known = Object.fromEntries(ACHIEVEMENT_DEFINITIONS.map(({ id }) => [id, true]));
  const rows = getRecordAchievements(data, 'ja', known);
  assert.deepEqual(rows.map(row => row.id), ACHIEVEMENT_DEFINITIONS.map(row => row.id));
  assert.ok(rows.every(row => row.gradeLabel === 'E' && row.progress.current === 0));
  assert.deepEqual(data, before);
  data.runs.trial = { 'Avery|Briar': { started: 3, cleared: 0, expired: 0 } };
  const updated = getRecordAchievements(data, 'en', known)[0];
  assert.equal(updated.progress.current, 3);
  assert.equal(updated.gradeLabel, new Achievements().evaluate(new GameStatistics({ data })).entries[0].label);
});

test('task records exclude uncleared patterns and read highest levels across all heroes', () => {
  const data = new GameStatistics().exportData();
  data.stages['regular:0'] = { attempts: 4, clears: 2, highestLevel: 17 };
  data.stages['boss:14'] = { attempts: 1, clears: 0, highestLevel: null };
  const before = structuredClone(data);
  const groups = getTaskRecords(data);
  assert.deepEqual(groups.map(group => group.kind), ['regular', 'elite', 'boss']);
  assert.deepEqual(groups.map(group => group.entries.length), [1, 0, 0]);
  assert.equal(groups[0].entries[0].highestLevel, 17);
  assert.deepEqual(data, before);
});

test('each kind retains five unique patterns by highest level then latest clear of that level', () => {
  const data = new GameStatistics().exportData();
  for (const kind of ['regular', 'elite', 'boss']) {
    for (let index = 0; index < 8; index++) data.stages[`${kind}:${index}`] = {
      attempts: 10, clears: 9, highestLevel: index === 0 ? 25 : 20,
      highestLevelClearedAt: `2026-10-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
    };
  }
  const before = structuredClone(data);
  for (const group of getTaskRecords(data)) {
    assert.deepEqual(group.entries.map(entry => entry.patternIndex), [0, 7, 6, 5, 4]);
  }
  assert.deepEqual(data, before);
});
