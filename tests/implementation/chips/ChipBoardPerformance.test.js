import test from 'node:test';
import assert from 'node:assert/strict';
import ChipBoard from '../../../src/chips/ChipBoard.js';
class FullScanChipBoard extends ChipBoard {
  updateOverlapLayers() {
    const active = new Set();
    for (let i = 0; i < this.chips.length; i++) for (let j = i + 1; j < this.chips.length; j++) {
      const a = this.chips[i], b = this.chips[j];
      if (Math.hypot(a.x - b.x, a.y - b.y) >= a.radius + b.radius) continue;
      const key = this.getPairKey(a, b);
      active.add(key);
      if (!this.overlapLayers.has(key)) this.overlapLayers.set(key, this.getNaturalTopChip(a, b).id);
    }
    for (const key of this.overlapLayers.keys()) if (!active.has(key)) this.overlapLayers.delete(key);
  }
}

test('drawing contacts match a full scan through movement, impact, flight and external edits', () => {
  let seed = 77;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const modern = new ChipBoard({ width: 2400, height: 1400 });
  const previous = new FullScanChipBoard({ width: 2400, height: 1400 });
  // Ground relaxation intentionally defers new candidates; test that separate rule below.
  modern.resolveGroundOverlaps = previous.resolveGroundOverlaps = () => {};
  const add = (type, x, y) => {
    for (const board of [modern, previous]) {
      const c = board.add({ type, x, y, weight: 5, tagPaths: [] });
      c.height = 0;
    }
  };
  for (let i = 0; i < 100; i++) add('item', 100 + i % 20 * 85, 100 + Math.floor(i / 20) * 90);
  for (let frame = 0; frame < 500; frame++) {
    const index = Math.floor(random() * modern.chips.length);
    const x = 100 + random() * 1700, y = 100 + random() * 500;
    for (const board of [modern, previous]) {
      const c = board.chips[index];
      if (frame % 31 === 0) { c.x = x; c.y = y; }
      if (frame % 37 === 0) board.moveTo(c, x, y);
      if (frame % 47 === 0) board.launchUp(c, { x, y });
      if (frame % 13 === 0) c.isPickupTarget = !c.isPickupTarget;
      if (frame % 23 === 0) c.isTransferVisual = !c.isTransferVisual;
      if (frame % 29 === 0) c.radius = 30 + frame % 20;
      if (frame % 17 === 0) c.height = 0;
      if (frame === 170 || frame === 340) board.removeChip(c);
    }
    if (frame === 171 || frame === 341) add('hero', x, y);
    for (const board of [modern, previous]) board.update(1 / 60);
    assert.deepEqual(modern.chips.map(c => ({ ...c })), previous.chips.map(c => ({ ...c })), `frame ${frame}`);
    assert.deepEqual(modern.getRenderChips().map(c => c.id), previous.getRenderChips().map(c => c.id), `render ${frame}`);
    assert.deepEqual([...modern.overlapLayers].toSorted(), [...previous.overlapLayers].toSorted());
  }
});

test('a ground push reaches a previously static neighbour on the next update and keeps separating', () => {
  const board = new ChipBoard({ width: 10000, height: 1000 });
  for (const x of [100, 170, 246, ...Array.from({ length: 20 }, (_, i) => 500 + i * 100)]) {
    const c = board.add({ type: 'item', x, y: 100, weight: 5, tagPaths: [] });
    c.height = 0;
  }
  board.resolveGroundOverlaps(0);
  const third = board.chips[2];
  board.resolveGroundOverlaps(1 / 60);
  assert.equal(third.x, 246);
  board.resolveGroundOverlaps(1 / 60);
  assert.ok(third.x > 246);
  for (let i = 0; i < 120; i++) board.resolveGroundOverlaps(1 / 60);
  for (let i = 0; i < 2; i++) {
    const a = board.chips[i], b = board.chips[i + 1];
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= a.radius + b.radius - 1e-4);
  }
});

test('landing and leaving pickup or transfer state restart ground contact checks', () => {
  for (const field of ['height', 'rise', 'isPickupTarget', 'isTransferVisual']) {
    const board = new ChipBoard({ width: 1000, height: 1000 });
    const a = board.add({ type: 'item', x: 200, y: 200, weight: 5, tagPaths: [] });
    const b = board.add({ type: 'item', x: 220, y: 220, weight: 5, tagPaths: [] });
    a.height = b.height = 0;
    a[field] = field === 'height' ? 10 : true;
    board.resolveGroundOverlaps(1 / 60);
    board.resolveGroundOverlaps(1 / 60);
    assert.equal(a.x, 200, field);
    a[field] = field === 'height' ? 0 : false;
    board.resolveGroundOverlaps(1 / 60);
    assert.ok(a.x < 200, field);
  }
});

test('subpixel residual overlaps settle without endlessly marking chips as moving', () => {
  const board = new ChipBoard({ width: 1000, height: 1000 });
  const a = board.add({ type: 'item', x: 200, y: 200, weight: 5, tagPaths: [] });
  const b = board.add({ type: 'item', x: 260 - .00002, y: 245 - .000015, weight: 5, tagPaths: [] });
  a.height = b.height = 0;
  for (let i = 0; i < 10; i++) board.resolveGroundOverlaps(1 / 60);
  assert.equal(a.x, 200);
  assert.equal(b.x, 260 - .00002);
  assert.equal(board.groundContacts.contacts.size, 0);
});

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
