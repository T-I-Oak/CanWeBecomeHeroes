import test from 'node:test';
import assert from 'node:assert/strict';
import { createTagAngles, getCenterImagePlacement, getPhysicalShieldPresentation } from '../../src/chips/ChipRenderer.js';

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

test('physical shield presentation strengthens with physical damage reduction', () => {
  const absent = getPhysicalShieldPresentation(0);
  const partial = getPhysicalShieldPresentation(0.2);
  const full = getPhysicalShieldPresentation(0.7);

  assert.equal(absent.alpha, 0);
  assert.ok(full.alpha > partial.alpha);
  assert.ok(full.pulse > partial.pulse);
});
