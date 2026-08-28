import test from 'node:test';
import assert from 'node:assert/strict';
import { getTagBadgeVisual, getTagSkillLevelForCount, getTagSkillVisual } from '../../src/game/TagSkillVisualCatalog.js';

test('tag skill visual levels follow tag skill thresholds', () => {
  assert.equal(getTagSkillLevelForCount(0), 0);
  assert.equal(getTagSkillLevelForCount(2), 1);
  assert.equal(getTagSkillLevelForCount(3), 2);
  assert.equal(getTagSkillLevelForCount(6), 3);
  assert.equal(getTagSkillLevelForCount(9), 4);
  assert.equal(getTagSkillVisual(3).level, 2);
  assert.notEqual(getTagSkillVisual(1).fill, getTagSkillVisual(0).fill);
  assert.equal(getTagSkillVisual(1).text, '#ffffff');
  assert.equal(getTagSkillVisual(4).text, '#ffffff');
});

test('attribute tag badges use an owned or unowned visual without skill tiers', () => {
  assert.equal(getTagBadgeVisual('water', 0).level, 0);
  assert.equal(getTagBadgeVisual('water', 1).level, 1);
  assert.equal(getTagBadgeVisual('water', 7).level, 1);
  assert.equal(getTagBadgeVisual('valor', 3).level, 2);
});
