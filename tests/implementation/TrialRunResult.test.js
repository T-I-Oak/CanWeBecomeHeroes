import test from 'node:test';
import assert from 'node:assert/strict';
import { createTrialRunResult, TRIAL_RUN_RESULT_TYPE } from '../../src/game/TrialRunResult.js';

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
