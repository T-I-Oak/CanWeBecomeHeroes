import test from 'node:test';
import assert from 'node:assert/strict';
import { getWeightFillRatio, getWeightGaugeColor, WEIGHT_GAUGE_MAX } from '../../src/game/WeightVisual.js';

test('weight gauge fills from zero through its display maximum and keeps a readable low-to-high gradient', () => {
  assert.equal(WEIGHT_GAUGE_MAX, 30);
  assert.equal(getWeightFillRatio(0), 0);
  assert.equal(getWeightFillRatio(15), 0.5);
  assert.equal(getWeightFillRatio(24), 0.8);
  assert.equal(getWeightGaugeColor(0), '#58c96d');
  assert.equal(getWeightGaugeColor(30), '#ca7553');
});
