import test from 'node:test';
import assert from 'node:assert/strict';
import { getDirectionIndicatorBackground } from '../../src/app/HeroDirectionIndicatorRenderer.js';

test('a direction indicator uses its ordinary dark background unless its Hero is stamina-full in preparation', () => {
  assert.equal(getDirectionIndicatorBackground({ staminaReady: false }, 0), '#132235');
  assert.notEqual(getDirectionIndicatorBackground({ staminaReady: true }, 0), '#132235');
});
