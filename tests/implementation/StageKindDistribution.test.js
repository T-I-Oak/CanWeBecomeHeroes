import test from 'node:test';
import assert from 'node:assert/strict';
import { getBossProbability, getEliteProbability, getStageKindForRoute } from '../../src/game/StageKindDistribution.js';

test('stage route distributions reserve boss spikes and waves for seven-stage milestones', () => {
  assert.equal(getBossProbability('route1', 7), 1);
  assert.equal(getBossProbability('route1', 8), 0);
  assert.equal(getBossProbability('route2', 6), 0);
  assert.equal(getBossProbability('route2', 7), 1);
  assert.equal(getBossProbability('route2', 10.5), 0);
  assert.equal(getBossProbability('route3', 14), 1);
});

test('route three guarantees elite recovery opportunities based on joined count', () => {
  assert.equal(getEliteProbability('route3', 5, 0), 1);
  assert.equal(getEliteProbability('route3', 6, 1), 1);
  assert.equal(getEliteProbability('route3', 5, 1), 0.25);
  assert.equal(getStageKindForRoute({ route: 'route3', stageNumber: 5, joinedCount: 0, random: () => 0.99 }), 'elite');
});

test('route one elite wave has its configured first trough and peak', () => {
  assert.equal(getEliteProbability('route1', 1, 0), 0);
  assert.equal(getEliteProbability('route1', 3.5, 0), 1);
});
