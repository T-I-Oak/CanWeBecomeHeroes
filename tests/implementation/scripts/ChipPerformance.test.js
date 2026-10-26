import test from 'node:test';
import assert from 'node:assert/strict';
import { warehouseLayout, targetItemCount, summarizeFrames } from '../../../scripts/lib/ChipPerformance.js';
import { getWarehouseItemCapacity } from '../../../src/game/WarehouseCapacity.js';
import { GAME_AREAS } from '../../../src/game/GameAreas.js';

test('fixture layout matches real capacity and fits non-overlapping circles', () => {
  const points = warehouseLayout(GAME_AREAS.warehouse, 37.5);
  assert.equal(points.length, getWarehouseItemCapacity());
  for (const [i, point] of points.entries()) {
    assert.ok(point.x >= GAME_AREAS.warehouse.x + 37.5);
    assert.ok(point.x <= GAME_AREAS.warehouse.x + GAME_AREAS.warehouse.width - 37.5);
    assert.ok(point.y >= GAME_AREAS.warehouse.y + 37.5);
    assert.ok(point.y <= GAME_AREAS.warehouse.y + GAME_AREAS.warehouse.height - 37.5);
    for (const other of points.slice(i + 1)) assert.ok(Math.hypot(point.x - other.x, point.y - other.y) >= 75 - 1e-8);
  }
  assert.deepEqual(warehouseLayout({ x: 0, y: 0, width: 74, height: 75 }, 37.5), []);
});

test('targets include initial items and never silently exceed capacity', () => {
  assert.equal(targetItemCount(100, 7, null), 7);
  assert.equal(targetItemCount(100, 7, .25), 25);
  assert.equal(targetItemCount(100, 7, 1), 100);
  assert.throws(() => targetItemCount(100, 30, .25));
  assert.throws(() => targetItemCount(100, 7, 1.1));
});

test('frame summary separates elapsed wall time from ticks and long-frame ratios', () => {
  const result = summarizeFrames([10, 20, 60], [{ tick: 100 }, { tick: 160 }], 2);
  assert.equal(result.over50, 1 / 3);
  assert.equal(result.ticksPerSecond, 30);
  assert.equal(result.intervals.p50, 20);
  assert.equal(result.intervals.max, 60);
  assert.throws(() => summarizeFrames([], [], 0));
});
