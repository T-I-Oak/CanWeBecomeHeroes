import test from 'node:test';
import assert from 'node:assert/strict';
import { descendants, verificationPassed } from '../../../scripts/lib/BrowserTestVerification.js';

test('process inventory follows descendants and rejects reused parent PIDs', () => {
  const root = { pid: 10, created: '2026-10-24T00:00:00.000Z' };
  const processes = [
    { ...root, parent: 1 },
    { pid: 11, parent: 10, created: '2026-10-24T00:00:01.000Z' },
    { pid: 12, parent: 11, created: '2026-10-24T00:00:02.000Z' },
    { pid: 13, parent: 10, created: '2026-10-23T00:00:00.000Z' },
    { pid: 14, parent: 99, created: '2026-10-24T00:00:02.000Z' },
  ];
  assert.deepEqual(descendants(processes, [root]).map(p => p.pid), [10, 11, 12]);
  assert.deepEqual(descendants(processes, [{ ...root, created: '2026-10-25T00:00:00.000Z' }]), []);
  const reused = [
    { pid: 10, parent: 1, created: '2026-10-24T00:01:00.000Z' },
    { pid: 20, parent: 10, created: '2026-10-24T00:01:01.000Z' },
  ];
  assert.deepEqual(descendants(reused, [root]), []);
});

test('success requires tests, normal exit, successful observation and released resources', () => {
  const result = {
    exitCode: 0, timedOut: false, interrupted: false, observationError: null,
    stats: { expected: 5, unexpected: 0, skipped: 0, flaky: 0 },
    errors: [], remaining: [], listeners: [],
  };
  assert.equal(verificationPassed(result), true);
  for (const patch of [
    { exitCode: 1 }, { exitCode: null }, { timedOut: true }, { interrupted: true },
    { observationError: 'Access denied' }, { remaining: [{ pid: 10 }] },
    { listeners: [{ port: 4174 }] }, { stats: null }, { errors: ['setup failed'] },
    { stats: { ...result.stats, expected: 4 } },
    { stats: { ...result.stats, unexpected: 1 } },
    { stats: { ...result.stats, skipped: 1 } },
    { stats: { ...result.stats, flaky: 1 } },
  ]) assert.equal(verificationPassed({ ...result, ...patch }), false, JSON.stringify(patch));
});
