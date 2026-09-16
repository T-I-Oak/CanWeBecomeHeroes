import test from 'node:test';
import assert from 'node:assert/strict';
import HeroFactory from '../../src/game/HeroFactory.js';
import { createStaticChipPreview } from '../../src/app/ChipPreview.js';

test('static chip preview centers and settles a gameplay chip without changing its source', () => {
  const chip = new HeroFactory().create({ profession: 'swordfighter', x: 30, y: 40 }).chip;
  const preview = createStaticChipPreview(chip, 120);

  assert.equal(preview.x, 60);
  assert.equal(preview.y, 60);
  assert.equal(preview.radius, 60);
  assert.equal(preview.height, 0);
  assert.equal(preview.actionGauge, null);
  assert.equal(chip.x, 30);
  assert.equal(chip.height > 0, true);
});
