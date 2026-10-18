import test from 'node:test';
import assert from 'node:assert/strict';
import { getTrialPaperLayout } from '../../../src/app/TrialPaperScale.js';

test('entire paper fits both dimensions without a minimum scale', () => {
  for (const [width, height] of [[378, 700], [820, 280], [300, 200]]) {
    const layout = getTrialPaperLayout(width, height);
    assert.equal(layout.scale, Math.min(1, width / 840, height / 534));
    assert.ok(layout.width <= width && layout.height <= height);
    assert.ok(Math.abs(layout.width / layout.height - 840 / 534) < 1e-12);
  }
  assert.deepEqual(getTrialPaperLayout(1000, 700), { scale: 1, width: 840, height: 534 });
});
