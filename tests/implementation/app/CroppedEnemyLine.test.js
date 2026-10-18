import test from 'node:test';
import assert from 'node:assert/strict';
import { getCroppedEnemySlots } from '../../../src/app/CroppedEnemyLine.js';
import { COMBINATION_PATTERNS } from '../../../src/game/EncounterDefinitions.js';

test('cropped formation uses actual level-dependent enemies and retains empty slots', () => {
  const regular = getCroppedEnemySlots({ kind: 'regular', level: 1, pattern: COMBINATION_PATTERNS.regular[0] });
  assert.equal(regular.length, 6);
  assert.equal(regular.filter(slot => slot.id).length, 1);
  assert.equal(regular.find(slot => slot.id).position, 3);
  for (const [level, bosses, total] of [[1, 1, 5], [17, 2, 4], [31, 3, 3]]) {
    const slots = getCroppedEnemySlots({ kind: 'boss', level, pattern: COMBINATION_PATTERNS.boss[0] });
    assert.equal(slots.filter(slot => slot.id?.startsWith('large-')).length, bosses);
    assert.equal(slots.filter(slot => slot.id).length, total);
    assert.equal(slots.reduce((sum, slot) => sum + slot.span, 0), 6);
  }
});
