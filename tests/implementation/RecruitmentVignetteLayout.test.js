import test from 'node:test';
import assert from 'node:assert/strict';
import { projectRecruitmentGround, RECRUITMENT_PERSPECTIVE, RECRUITMENT_HERO_PLACEMENTS, recruitmentEnemyPlacement } from '../../src/game/RecruitmentVignetteLayout.js';

test('ground feet, spacing and apparent size share one vanishing point', () => {
  const near = projectRecruitmentGround({ lateral: 120, depth: 1 }, 40);
  const far = projectRecruitmentGround({ lateral: 120, depth: 2 }, 40);
  const { vanishingX, horizonY } = RECRUITMENT_PERSPECTIVE;
  assert.equal(far.x - vanishingX, (near.x - vanishingX) / 2);
  assert.equal(far.y - horizonY, (near.y - horizonY) / 2);
  assert.equal(far.radius, near.radius / 2);
  assert.equal((far.x - vanishingX) / (far.y - horizonY), (near.x - vanishingX) / (near.y - horizonY));
});

test('enemy rows converge horizontally and keep feet on the ground while size varies by species', () => {
  const placement = (slotPosition, size) => recruitmentEnemyPlacement({ slotPosition, definition: { size } });
  const nearLeft = placement(1, 'small');
  const nearRight = placement(5, 'small');
  const farLeft = placement(2, 'small');
  const farRight = placement(6, 'small');
  assert.ok(farLeft.y < nearLeft.y && farLeft.y > RECRUITMENT_PERSPECTIVE.horizonY);
  assert.ok(farRight.x - farLeft.x < nearRight.x - nearLeft.x);
  assert.ok(farLeft.radius < nearLeft.radius);
  const medium = placement(1, 'medium');
  assert.equal(medium.x, nearLeft.x);
  assert.equal(medium.y, nearLeft.y);
  assert.equal(medium.radius / nearLeft.radius, 1.5);
});

test('staggered slots stay in left-to-right order after perspective projection', () => {
  const slots = Array.from({ length: 6 }, (_, index) => recruitmentEnemyPlacement({ slotPosition: index + 1, definition: { size: 'small' } }));
  for (let index = 1; index < slots.length; index += 1) assert.ok(slots[index].x > slots[index - 1].x);
  const worldX = slots.map((slot) => (slot.x - RECRUITMENT_PERSPECTIVE.vanishingX) / slot.scale);
  const rowSpacing = worldX[2] - worldX[0];
  for (const index of [0, 2, 4]) assert.ok(Math.abs(worldX[index + 1] - worldX[index] - rowSpacing / 2) < 1e-10);
});

test('enemy slot 3 sits halfway between A and B for either enemy size', () => {
  for (const size of ['small', 'medium']) {
    assert.equal(recruitmentEnemyPlacement({ slotPosition: 3, definition: { size } }).x, (RECRUITMENT_HERO_PLACEMENTS.A.x + RECRUITMENT_HERO_PLACEMENTS.B.x) / 2);
  }
});
