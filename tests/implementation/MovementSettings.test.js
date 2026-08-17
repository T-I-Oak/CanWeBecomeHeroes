import test from 'node:test';
import assert from 'node:assert/strict';
import { getHeroStepDistance } from '../../src/game/MovementSettings.js';

test('hero step distance decreases with the square of carried weight', () => {
  assert.equal(getHeroStepDistance(0), 96);
  assert.equal(getHeroStepDistance(25), 48);
  assert.equal(getHeroStepDistance(75), 9.6);
  assert.ok(Math.abs(getHeroStepDistance(100) - 5.647058823529412) < 0.000000001);
});
