import test from 'node:test';
import assert from 'node:assert/strict';
import GameStatistics from '../../src/game/GameStatistics.js';
import StatisticsCollector from '../../src/game/StatisticsCollector.js';
import Achievements from '../../src/game/Achievements.js';

test('collector updates run and total independently, with raw tags, departure weapons and facility details', () => {
  const run = new GameStatistics({ run: true });
  const total = new GameStatistics();
  const collector = new StatisticsCollector({ run, total, achievements: new Achievements() });
  const hero = { heroId: 'Avery', getTags: () => Array(12).fill('fortune'), equipment: { rightHand: { category: 'weapon', type: 'claw' }, leftHand: { category: 'weapon', type: 'claw' } } };
  collector.record({ type: 'hero-tags', hero });
  collector.record({ type: 'departure', hero, facilityId: 'shop' });
  assert.deepEqual(run.data.heroes.Avery.weapons, {});
  collector.record({ type: 'departure', hero, facilityId: 'battle' });
  collector.record({ type: 'defeat', enemyId: 'small-valor', points: 10, heroId: 'Avery', level: 7 });
  collector.record({ type: 'defeat', enemyId: 'small-valor', points: 0, heroId: 'Avery', level: 3 });
  collector.record({ type: 'shop-tags', heroId: 'Avery', count: 2 });
  collector.record({ type: 'guild-extension', heroId: 'Avery', hours: 1.5 });
  collector.record({ type: 'training-luck', heroId: 'Avery' });
  assert.equal(run.data.heroes.Avery.tags.fortune, 12);
  assert.equal(run.data.heroes.Avery.weapons.claw, 2);
  assert.deepEqual(run.data.heroes.Avery.defeats['small-valor'], { count: 2, highestLevel: 7 });
  assert.deepEqual(total.data.heroes.Avery.defeats, {});
  assert.equal(total.data.combat.points, 10);
  assert.equal(total.data.combat.defeats, 2);
  assert.equal(run.data.heroes.Avery.shopTags, 2);
  assert.equal(run.data.heroes.Avery.guildHours, 1.5);
  assert.equal(run.data.heroes.Avery.trainingLuck, 1);
  assert.notEqual(run.data.heroes.Avery, total.data.heroes.Avery);
  assert.deepEqual(collector.getRunAchievements().new, [
    { id: 'enemy-defeat:small-valor', oldGrade: 0, newGrade: 2 },
    { id: 'tag:fortune', oldGrade: 0, newGrade: 7 },
  ]);
});

test('stage counters retain counts, maximum and its latest clear time, while start pairs are unordered', () => {
  const stats = new GameStatistics();
  stats.record({ type: 'run-start', mode: 'trial', heroIds: ['Briar', 'Avery'] });
  stats.record({ type: 'run-start', mode: 'trial', heroIds: ['Avery', 'Briar'] });
  stats.record({ type: 'stage-start', kind: 'elite', patternIndex: 2 });
  stats.record({ type: 'stage-clear', kind: 'elite', patternIndex: 2, level: 9, clearedAt: '2026-10-16T01:00:00.000Z' });
  stats.record({ type: 'stage-clear', kind: 'elite', patternIndex: 2, level: 5 });
  assert.equal(stats.data.runs.trial['Avery|Briar'].started, 2);
  assert.deepEqual(stats.data.stages['elite:2'], { attempts: 1, clears: 2, highestLevel: 9, highestLevelClearedAt: '2026-10-16T01:00:00.000Z' });
});

test('equal and higher clears update the record time and lower clears preserve it', () => {
  const stats = new GameStatistics();
  stats.data.stages['boss:0'] = { attempts: 2, clears: 1, highestLevel: 16, highestLevelClearedAt: '2026-10-16T00:00:00.000Z' };
  const clear = (level, clearedAt) => stats.record({ type: 'stage-clear', kind: 'boss', patternIndex: 0, level, clearedAt });
  clear(15, '2026-10-16T01:00:00.000Z');
  assert.equal(stats.data.stages['boss:0'].highestLevelClearedAt, '2026-10-16T00:00:00.000Z');
  clear(16, '2026-10-16T02:00:00.000Z');
  assert.equal(stats.data.stages['boss:0'].highestLevelClearedAt, '2026-10-16T02:00:00.000Z');
  clear(17, '2026-10-16T03:00:00.000Z');
  clear(16, '2026-10-16T04:00:00.000Z');
  assert.equal(stats.data.stages['boss:0'].highestLevel, 17);
  assert.equal(stats.data.stages['boss:0'].highestLevelClearedAt, '2026-10-16T03:00:00.000Z');
});

test('collector forwards the clear event timestamp unchanged to run and total', () => {
  const run = new GameStatistics({ run: true }), total = new GameStatistics();
  const collector = new StatisticsCollector({ run, total, achievements: new Achievements() });
  collector.record({ type: 'stage-clear', kind: 'regular', patternIndex: 0, level: 1, clearedAt: '2026-10-16T01:00:00.000Z' });
  const at = run.data.stages['regular:0'].highestLevelClearedAt;
  assert.equal(at, '2026-10-16T01:00:00.000Z');
  assert.equal(at, total.data.stages['regular:0'].highestLevelClearedAt);
});

test('collector keeps start grades fixed and updates previous grades before notifying', () => {
  let grade = 2;
  const seen = [];
  const evaluator = { evaluate: (_, previous = {}) => ({ entries: [{ id: 'example', G: grade }], grades: { example: grade }, gained: grade > (previous.example ?? 0) ? [{ id: 'example', oldGrade: previous.example ?? 0, newGrade: grade }] : [] }) };
  const collector = new StatisticsCollector({ run: new GameStatistics({ run: true }), total: new GameStatistics(), achievements: evaluator, onGradeRaised: changes => seen.push(changes) });
  assert.equal(seen.length, 0);
  grade = 3;
  collector.record({ type: 'training-luck', heroId: 'Avery' });
  collector.record({ type: 'training-luck', heroId: 'Avery' });
  assert.equal(seen.length, 1);
  assert.deepEqual(collector.startGrades, { example: 2 });
  assert.deepEqual(collector.previousGrades, { example: 3 });
});
