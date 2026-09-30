import test from 'node:test';
import assert from 'node:assert/strict';
import { createTagAngles, getActionGaugePresentationRatio, getCenterImagePlacement, getChipRimWidth, getContainedImageSize, getPhysicalShieldPresentation, getStaminaPauseWavePresentation } from '../../src/chips/ChipRenderer.js';

test('chip rim width stays the same share of the radius at every size', () => {
  assert.equal(getChipRimWidth(22) / 22, getChipRimWidth(192) / 192);
});

test('tag angles keep the same interval for two and three tags', () => {
  const slotCount = 8;
  const twoTags = createTagAngles(2, slotCount);
  const threeTags = createTagAngles(3, slotCount);
  const expectedInterval = (Math.PI * 2) / slotCount;

  assert.equal(twoTags[1] - twoTags[0], expectedInterval);
  assert.equal(threeTags[1] - threeTags[0], expectedInterval);
  assert.equal(threeTags[2] - threeTags[1], expectedInterval);
});

test('tag groups are centered on the twelve o’clock direction', () => {
  const twoTags = createTagAngles(2, 8);
  const threeTags = createTagAngles(3, 8);

  assert.equal((twoTags[0] + twoTags[1]) / 2, -Math.PI / 2);
  assert.equal(threeTags[1], -Math.PI / 2);
});

test('center image is scaled from the bottom center of the chip', () => {
  const placement = getCenterImagePlacement(100);

  assert.equal(placement.size, 170);
  assert.equal(placement.x, 0);
  assert.equal(placement.y, 15);
  assert.equal(placement.y + placement.size / 2, 100);
});

test('center images retain their source aspect ratio inside the common square drawing box', () => {
  assert.deepEqual(getContainedImageSize(1024, 1536, 170), { width: 113.33333333333333, height: 170 });
  assert.deepEqual(getContainedImageSize(1536, 1024, 170), { width: 170, height: 113.33333333333333 });
});

test('physical shield presentation strengthens with physical damage reduction', () => {
  const absent = getPhysicalShieldPresentation(0);
  const partial = getPhysicalShieldPresentation(0.2);
  const full = getPhysicalShieldPresentation(0.7);

  assert.equal(absent.alpha, 0);
  assert.ok(full.alpha > partial.alpha);
  assert.ok(full.pulse > partial.pulse);
});

test('stamina-full waves expand and fade over their real-time animation cycle', () => {
  const first = getStaminaPauseWavePresentation(0, 96, 0);
  const later = getStaminaPauseWavePresentation(0.6, 96, 0);

  assert.ok(later.radius > first.radius);
  assert.ok(later.alpha < first.alpha);
});

test('action gauge remains visually full while its action animation is active', () => {
  const chip = { actionGauge: 3, actionGaugeMaximum: 12, actionVisualCount: 1 };

  assert.equal(getActionGaugePresentationRatio(chip), 1);
  chip.actionVisualCount = 0;
  assert.equal(getActionGaugePresentationRatio(chip), 0.25);
});
