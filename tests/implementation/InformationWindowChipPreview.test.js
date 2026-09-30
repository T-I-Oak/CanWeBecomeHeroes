import test from 'node:test';
import assert from 'node:assert/strict';
import Chip, { CHIP_RADIUS } from '../../src/chips/Chip.js';
import { AREA_THEME } from '../../src/game/AreaTheme.js';
import { ENEMY_CHIP_DIAMETER } from '../../src/game/HeroSlotLayout.js';
import { createInformationDefinitionChip } from '../../src/app/InformationWindowDefinitionChipFactory.js';
import { MAX_WINDOW_SCALE } from '../../src/app/InformationWindowScale.js';
import { getInformationWindowChipBitmapScale, getInformationWindowChipPreviewSize } from '../../src/app/InformationWindowChipPreview.js';

test('information-window chip previews preserve gameplay chip size ratios from a regular enemy baseline', () => {
  const chip = (type, radius) => new Chip({ id: 0, type, radius, x: 0, y: 0, weight: 0, centerPath: '', tagPaths: [] });
  assert.equal(getInformationWindowChipPreviewSize(chip('enemy', ENEMY_CHIP_DIAMETER.small / 2)), 44);
  assert.equal(getInformationWindowChipPreviewSize(chip('hero', CHIP_RADIUS.hero)), 66);
  assert.equal(getInformationWindowChipPreviewSize(chip('enemy', ENEMY_CHIP_DIAMETER.medium / 2)), 66);
  assert.equal(getInformationWindowChipPreviewSize(chip('enemy', ENEMY_CHIP_DIAMETER.large / 2)), 132);
  assert.equal(getInformationWindowChipPreviewSize(chip('item', CHIP_RADIUS.item)), 26);
  assert.equal(getInformationWindowChipBitmapScale(1), MAX_WINDOW_SCALE);
  assert.equal(getInformationWindowChipBitmapScale(2), MAX_WINDOW_SCALE * 2);
});

test('static definition chips use their representative area and intrinsic tags', () => {
  const hero = createInformationDefinitionChip('hero', 'Avery');
  const enemy = createInformationDefinitionChip('enemy', 'large-area');
  const item = createInformationDefinitionChip('item', 'sword');

  assert.equal(hero.fillColor, AREA_THEME.preparation.chipFill);
  assert.equal(hero.tagPaths.length, 2);
  assert.equal(enemy.fillColor, AREA_THEME.battle.chipFill);
  assert.equal(enemy.radius * 2, ENEMY_CHIP_DIAMETER.large);
  assert.equal(enemy.tagPaths.length, 1);
  assert.equal(item.fillColor, AREA_THEME.warehouse.chipFill);
  assert.equal(item.tagPaths.length, 0);
});

