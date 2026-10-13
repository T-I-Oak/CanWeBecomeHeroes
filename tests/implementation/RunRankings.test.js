import test from 'node:test';
import assert from 'node:assert/strict';
import RunRankings, { RANKING_LIMIT } from '../../src/game/RunRankings.js';

const result = (id, values = {}) => ({ id, mode: 'trial', outcome: 'cleared', endedAt: new Date(2026, 0, id).toISOString(), remainingHours: id, clearedStages: 7, elapsedTicks: id, defeats: id, points: id, ...values });

test('rankings retain union of each top ten and remove records outside every criterion', () => {
  const rankings = new RunRankings();
  for (let id = 1; id <= 40; id++) rankings.add(result(id, { points: 41 - id, defeats: id > 10 && id <= 20 ? 100 - id : 0 }));
  assert.equal(RANKING_LIMIT, 10);
  assert.equal(rankings.data.length, 30);
  assert.equal(rankings.data.some(row => row.id === 25), false);
  assert.deepEqual(rankings.get('trial', 'remainingHours').map(row => row.id), [40,39,38,37,36,35,34,33,32,31]);
  assert.equal(rankings.get('trial', 'points')[0].id, 1);
});

test('trial failures use cleared stages for time ties; all criteria prefer newer completion', () => {
  const rankings = new RunRankings();
  rankings.add(result(1, { outcome: 'expired', remainingHours: 0, clearedStages: 5, points: 10 }));
  rankings.add(result(2, { outcome: 'expired', remainingHours: 0, clearedStages: 3, points: 10 }));
  assert.equal(rankings.get('trial', 'remainingHours')[0].id, 1);
  assert.equal(rankings.get('trial', 'points')[0].id, 2);
  rankings.add(result(3, { mode: 'challenge', elapsedTicks: 900, clearedStages: 2 }));
  rankings.add(result(4, { mode: 'challenge', elapsedTicks: 100, clearedStages: 8 }));
  assert.equal(rankings.get('challenge', 'elapsedTicks')[0].id, 3);
  assert.equal(rankings.get('challenge', 'clearedStages')[0].id, 4);
});
