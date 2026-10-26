import test from 'node:test';
import assert from 'node:assert/strict';
import ChipBoard from '../../../src/chips/ChipBoard.js';

test('distant pairs avoid distance calculations in rendering, ground resolution and contact propagation', t => {
  const board = new ChipBoard({ width: 100000, height: 100000 });
  for (let i = 0; i < 100; i++) {
    const chip = board.add({ type: 'item', x: 1000 + i * 300, y: 1000, weight: 1, tagPaths: [] });
    chip.height = 0;
  }
  let distances = 0;
  const hypot = Math.hypot;
  t.mock.method(Math, 'hypot', (...args) => { distances++; return hypot(...args); });
  board.getRenderChips(); board.resolveGroundOverlaps(1 / 60); board.pushOverlaps(board.chips[0], 10);
  assert.equal(distances, 0);
});

test('ground resolution matches the original sequential all-pairs algorithm in dense mixed states', () => {
  const board = new ChipBoard({ width: 800, height: 600 });
  let seed = 54;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  for (let i = 0; i < 70; i++) {
    const c = board.add({ type: i % 7 ? 'item' : 'hero', x: 200 + random() * 250, y: 200 + random() * 150,
      weight: i % 16, tagPaths: [] });
    c.height = i % 9 === 0 ? 2 : 0; c.isPickupTarget = i % 11 === 0; c.isTransferVisual = i % 13 === 0;
  }
  const expected = board.chips.map(c => ({ ...c }));
  for (let step = 0; step < 15; step++) {
    for (let i = 0; i < expected.length; i++) for (const second of expected.slice(i + 1)) {
      const first = expected[i];
      if (first.rise || second.rise || first.height > 1 || second.height > 1 || first.isPickupTarget || second.isPickupTarget || first.isTransferVisual || second.isTransferVisual) continue;
      const dx = second.x - first.x || 1, dy = second.y - first.y || 1;
      const distance = Math.hypot(dx, dy), minimum = first.radius + second.radius;
      if (distance >= minimum) continue;
      const overlap = Math.min(minimum - distance, 6), weight = first.weight + second.weight;
      const a = weight === 0 ? .5 : second.weight / weight, b = weight === 0 ? .5 : first.weight / weight;
      Object.assign(first, board.constrainPosition(first, first.x - dx / distance * overlap * a, first.y - dy / distance * overlap * a));
      Object.assign(second, board.constrainPosition(second, second.x + dx / distance * overlap * b, second.y + dy / distance * overlap * b));
    }
    board.resolveGroundOverlaps(1 / 60);
    assert.deepEqual(board.chips.map(c => [c.x, c.y]), expected.map(c => [c.x, c.y]));
  }
});
