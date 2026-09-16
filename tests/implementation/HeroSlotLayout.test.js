import test from 'node:test';
import assert from 'node:assert/strict';
import { getEnemyChipScale } from '../../src/game/HeroSlotLayout.js';

test('enemy chip scales preserve the small, mid-boss, and boss size ratio', () => {
  const small = getEnemyChipScale('small');
  const medium = getEnemyChipScale('medium');
  const large = getEnemyChipScale('large');

  assert.equal(medium / small, 1.5);
  assert.equal(large / small, 3);
});
