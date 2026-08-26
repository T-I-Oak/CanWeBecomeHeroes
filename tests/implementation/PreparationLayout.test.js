import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PREPARATION_INFORMATION_HEIGHT,
  PREPARATION_LAYOUT,
  PREPARATION_PANEL_WIDTH,
  PREPARATION_SUBAREA_HEIGHT,
} from '../../src/game/PreparationLayout.js';

test('preparation information aligns five tag columns with the first five status columns', () => {
  const statusWidth = PREPARATION_LAYOUT.statusColumnWidth * PREPARATION_LAYOUT.statusCount
    + PREPARATION_LAYOUT.statusColumnGap * (PREPARATION_LAYOUT.statusCount - 1);
  const tagWidth = PREPARATION_LAYOUT.tagBadgeWidth * 5
    + PREPARATION_LAYOUT.statusColumnGap * 4;

  assert.equal(statusWidth, PREPARATION_LAYOUT.informationAreaWidth);
  assert.equal(tagWidth + PREPARATION_LAYOUT.statusColumnWidth + PREPARATION_LAYOUT.statusColumnGap, PREPARATION_LAYOUT.informationAreaWidth);
  assert.equal(PREPARATION_INFORMATION_HEIGHT, 232);
  assert.equal(PREPARATION_SUBAREA_HEIGHT, 256);
});

test('preparation panel derives its width from character, information, and item areas', () => {
  const expectedWidth = PREPARATION_LAYOUT.characterAreaWidth
    + PREPARATION_LAYOUT.informationAreaWidth
    + PREPARATION_LAYOUT.itemAreaWidth
    + PREPARATION_LAYOUT.areaGap * 2
    + PREPARATION_LAYOUT.topPadding * 2;

  assert.equal(PREPARATION_PANEL_WIDTH, expectedWidth);
  assert.equal(PREPARATION_PANEL_WIDTH, 744);
});
