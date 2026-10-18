import test from 'node:test';
import assert from 'node:assert/strict';
import { createTrialRunResult, TRIAL_RUN_RESULT_TYPE } from '../../../src/game/TrialRunResult.js';

test('cleared trial snapshots its members for a certificate result', () => {
  const result = createTrialRunResult({
    outcome: { state: 'cleared' },
    members: [{ heroId: 'Avery', profession: 'swordfighter' }],
    issuedAt: '2026-09-18T00:00:00.000Z',
  });

  assert.equal(result.type, TRIAL_RUN_RESULT_TYPE.certificate);
  assert.deepEqual(result.members, [{ heroId: 'Avery', profession: 'swordfighter' }]);
  assert.deepEqual(result.achievements, []);
  assert.equal(result.issuedAt.toISOString(), '2026-09-18T00:00:00.000Z');
});

test('expired trial produces a failure notice result', () => {
  const result = createTrialRunResult({ outcome: { state: 'expired' }, members: [] });

  assert.equal(result.type, TRIAL_RUN_RESULT_TYPE.failureNotice);
});

test('result fixes ten selected grades and generated epithets independently of later record changes', () => {
  const record = { statistics: { heroes: {} }, achievements: { entries: Array.from({ length: 12 }, (_, index) => ({ id: `item-${index}`, updated: index === 11, deltaG: index, label: 'B+' })) } };
  const result = createTrialRunResult({ outcome: { state: 'cleared' }, members: [{ heroId: 'Avery', profession: 'swordfighter' }], record, random: () => 0 });
  assert.equal(result.achievements.length, 10);
  assert.ok(result.achievements.some(entry => entry.id === 'item-11'));
  assert.equal(result.members[0].epithet, '勇者');
  record.achievements.entries[11].label = 'E';
  assert.equal(result.achievements.at(-1).label, 'B+');
  assert.ok(Object.isFrozen(result.achievements.at(-1)));
});
