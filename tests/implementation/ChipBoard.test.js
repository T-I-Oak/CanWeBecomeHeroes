import test from 'node:test';
import assert from 'node:assert/strict';
import ChipBoard from '../../src/chips/ChipBoard.js';

function addChip(board, type, x, y, weight = 8) {
  return board.add({
    type,
    x,
    y,
    weight,
    centerPath: '/assets/heroes/cleric.png',
    tagPaths: [],
  });
}

test('add assigns an id to each chip', () => {
  const board = new ChipBoard({ width: 800, height: 600 });
  const firstHero = addChip(board, 'hero', 150, 150);
  const item = addChip(board, 'item', 400, 200);

  assert.equal(firstHero.id, 1);
  assert.equal(item.id, 2);
});

test('moveLastHeroTo moves only the latest hero through stepped animation', () => {
  const board = new ChipBoard({ width: 800, height: 600 });
  const hero = addChip(board, 'hero', 150, 150);
  const item = addChip(board, 'item', 400, 200);

  assert.equal(board.moveTo(hero, 650, 450), true);
  board.update(0.1);

  assert.ok(hero.x > 150);
  assert.equal(item.x, 400);
  assert.ok(hero.step);
});

test('moveLastHeroTo constrains a target to the chip radius inside the board', () => {
  const board = new ChipBoard({ width: 800, height: 600 });
  const hero = addChip(board, 'hero', 300, 300);

  board.moveTo(hero, -100, 900);
  board.update(10);

  assert.equal(hero.x, hero.radius);
  assert.equal(hero.y, 600 - hero.radius);
});

test('a single movement step can be limited to a requested distance', () => {
  const board = new ChipBoard({ width: 800, height: 600 });
  const hero = addChip(board, 'hero', 150, 150);
  board.moveTo(hero, 650, 150, { stepDistance: 32 });
  assert.equal(hero.step.targetX, 182);
  assert.equal(hero.step.targetY, 150);
  assert.equal(hero.step.stepCount, 1);
});

test('a landing heavy chip affects a nearby chip', () => {
  const board = new ChipBoard({ width: 800, height: 600 });
  const source = addChip(board, 'hero', 300, 300, 15);
  const neighbor = addChip(board, 'item', 410, 300, 1);
  neighbor.height = 0;
  source.height = 2;
  source.verticalVelocity = 500;

  board.update(0.02);

  assert.ok(neighbor.x > 410);
  assert.ok(neighbor.height > 0);
});

test('a chip stops rotating once its small landing bounce is settled', () => {
  const board = new ChipBoard({ width: 800, height: 600 });
  const chip = addChip(board, 'hero', 300, 300, 15);
  chip.height = 2;
  chip.verticalVelocity = 500;
  chip.tiltVelocity = 3;

  board.update(0.02);

  assert.equal(chip.height, 0);
  assert.equal(chip.verticalVelocity, 0);
  assert.equal(chip.tiltVelocity, 0);
});

test('chips with greater height are rendered after ground chips', () => {
  const board = new ChipBoard({ width: 800, height: 600 });
  const groundChip = addChip(board, 'hero', 300, 300);
  const airborneChip = addChip(board, 'item', 300, 300);
  groundChip.height = 0;
  airborneChip.height = 100;

  assert.deepEqual(board.getRenderChips(), [groundChip, airborneChip]);
});

test('overlapping chips retain their initial top chip until they separate', () => {
  const board = new ChipBoard({ width: 800, height: 600 });
  const firstChip = addChip(board, 'hero', 300, 300);
  const secondChip = addChip(board, 'item', 350, 300);
  firstChip.height = 20;
  secondChip.height = 0;

  assert.deepEqual(board.getRenderChips(), [secondChip, firstChip]);

  secondChip.height = 100;
  assert.deepEqual(board.getRenderChips(), [secondChip, firstChip]);

  secondChip.x = 700;
  assert.deepEqual(board.getRenderChips(), [firstChip, secondChip]);
});

test('a moved chip pushes a chain of overlapping chips', () => {
  const board = new ChipBoard({ width: 1000, height: 600 });
  const source = addChip(board, 'hero', 300, 300);
  const firstNeighbor = addChip(board, 'item', 410, 300);
  const secondNeighbor = addChip(board, 'item', 480, 300);
  source.height = 0;
  firstNeighbor.height = 0;
  secondNeighbor.height = 0;

  board.pushOverlaps(source, 10);

  assert.ok(firstNeighbor.x > 410);
  assert.ok(secondNeighbor.x > 480);
  assert.ok(firstNeighbor.height > firstNeighbor.radius * 0.25);
});

test('a high chip does not push a grounded chip until their heights are close', () => {
  const board = new ChipBoard({ width: 1000, height: 600 });
  const highChip = addChip(board, 'hero', 300, 300);
  const groundChip = addChip(board, 'hero', 400, 300);
  highChip.height = 80;

  board.pushOverlaps(highChip, 12);

  assert.equal(groundChip.x, 400);
});

test('ground chips separate smoothly after movement stops', () => {
  const board = new ChipBoard({ width: 1000, height: 600 });
  const firstChip = addChip(board, 'hero', 300, 300, 15);
  const secondChip = addChip(board, 'item', 350, 300, 1);
  firstChip.height = 0;
  secondChip.height = 0;

  const initialDistance = Math.hypot(firstChip.x - secondChip.x, firstChip.y - secondChip.y);
  board.update(0.01);
  const firstFrameDistance = Math.hypot(firstChip.x - secondChip.x, firstChip.y - secondChip.y);
  for (let index = 0; index < 60; index += 1) board.update(0.01);

  const distance = Math.hypot(firstChip.x - secondChip.x, firstChip.y - secondChip.y);
  assert.ok(firstFrameDistance > initialDistance);
  assert.ok(firstFrameDistance < firstChip.radius + secondChip.radius);
  assert.ok(distance >= firstChip.radius + secondChip.radius);
});

test('tagless item chips separate without invalid positions', () => {
  const board = new ChipBoard({ width: 1000, height: 600 });
  const firstChip = addChip(board, 'item', 300, 300, 1);
  const secondChip = addChip(board, 'item', 350, 300, 1);
  firstChip.height = 0;
  secondChip.height = 0;

  board.update(0.01);

  assert.ok(Number.isFinite(firstChip.x));
  assert.ok(Number.isFinite(secondChip.x));
  assert.ok(firstChip.x < 300);
  assert.ok(secondChip.x > 350);
});
