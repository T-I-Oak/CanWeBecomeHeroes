import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeTagSubAffinities } from '../../src/simulation/TagAffinityAnalysis.js';

test('tag sub-affinity analysis compares a two-versus-two baseline with a substituted sub tag', () => {
  const analysis = analyzeTagSubAffinities({ tags: ['valor', 'iron'], ticks: 1000, trials: 1, seed: 1 });

  assert.equal(analysis.details.length, 8);
  assert.equal(analysis.summaries.length, 4);
  const unchanged = analysis.details.find((row) => row.heroTag === 'valor' && row.mainTag === 'iron' && row.subTag === 'iron');
  assert.equal(unchanged.shareDelta, 0);
  assert.equal(unchanged.subAffinity, 0.5);
  assert.ok(analysis.details.every((row) => Number.isFinite(row.f0) && Number.isFinite(row.ft2)));
});
