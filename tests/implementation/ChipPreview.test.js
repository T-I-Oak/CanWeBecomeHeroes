import test from 'node:test';
import assert from 'node:assert/strict';
import HeroFactory from '../../src/game/HeroFactory.js';
import { createStaticChipPreview, drawStaticChipPreview } from '../../src/app/ChipPreview.js';

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

test('high resolution preview keeps its transform when delayed assets redraw', () => {
  const transforms = [];
  const clears = [];
  const context = new Proxy({
    createRadialGradient: () => ({ addColorStop() {} }),
    createLinearGradient: () => ({ addColorStop() {} }),
    setTransform: (...args) => transforms.push(args),
    clearRect: (...args) => clears.push(args),
  }, { get: (target, key) => target[key] ?? (() => {}) });
  const redraws = [];
  const assets = { load: () => ({ complete: false, addEventListener: (type, draw) => redraws.push(draw) }) };
  const chip = new HeroFactory().create({ profession: 'swordfighter', x: 30, y: 40 }).chip;
  drawStaticChipPreview({ getContext: () => context }, chip, 120, assets, 2);
  assert.ok(redraws.length > 0);
  redraws.forEach(draw => draw());
  assert.equal(transforms.length, redraws.length + 1);
  transforms.forEach(value => assert.deepEqual(value, [2, 0, 0, 2, 0, 0]));
  clears.forEach(value => assert.deepEqual(value, [0, 0, 120, 120]));
});
