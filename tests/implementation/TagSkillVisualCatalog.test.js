import test from 'node:test';
import assert from 'node:assert/strict';
import { getTagSkillLevelForCount, getTagSkillVisual } from '../../src/game/TagSkillVisualCatalog.js';

test('tag skill visual levels follow tag skill thresholds', () => {
  assert.equal(getTagSkillLevelForCount(0), 0);
  assert.equal(getTagSkillLevelForCount(2), 1);
  assert.equal(getTagSkillLevelForCount(3), 2);
  assert.equal(getTagSkillLevelForCount(6), 3);
  assert.equal(getTagSkillLevelForCount(9), 4);
  assert.equal(getTagSkillVisual(3).level, 2);
});
