import test from 'node:test';
import assert from 'node:assert/strict';
import { nextToggleScale, resizeInformationWindow } from '../../src/app/InformationWindowScale.js';

const view = { viewportWidth: 800, viewportHeight: 600 };

test('the size button halves the opened window and restores every other size', () => {
  assert.equal(nextToggleScale(1), 0.5);
  assert.equal(nextToggleScale(0.5), 1);
  assert.equal(nextToggleScale(1.4), 1);
  assert.equal(nextToggleScale(0.72), 1);
});

test('dragging the bottom-right corner scales the whole window from the top-left', () => {
  const next = resizeInformationWindow({
    layoutWidth: 200,
    layoutHeight: 100,
    left: 40,
    top: 30,
    scale: 1,
    corner: 'se',
    pointerX: 140,
    pointerY: 80,
    ...view,
  });

  assert.equal(next.scale, 0.5);
  assert.equal(next.left, 40);
  assert.equal(next.top, 30);
});

test('dragging a corner keeps the opposite corner fixed', () => {
  const next = resizeInformationWindow({
    layoutWidth: 200,
    layoutHeight: 100,
    left: 40,
    top: 30,
    scale: 1,
    corner: 'nw',
    pointerX: 0,
    pointerY: 10,
    ...view,
  });

  assert.equal(next.scale, 1.14);
  assert.equal(next.left + 200 * next.scale, 240);
  assert.equal(next.top + 100 * next.scale, 130);
});

test('corner scaling stays inside the minimum and the viewport', () => {
  const shrunk = resizeInformationWindow({
    layoutWidth: 200,
    layoutHeight: 100,
    left: 40,
    top: 30,
    scale: 1,
    corner: 'se',
    pointerX: 50,
    pointerY: 35,
    ...view,
  });
  const grown = resizeInformationWindow({
    layoutWidth: 200,
    layoutHeight: 100,
    left: 40,
    top: 30,
    scale: 1,
    corner: 'se',
    pointerX: 900,
    pointerY: 700,
    ...view,
  });

  assert.equal(shrunk.scale, 0.4);
  assert.equal(grown.scale, 2);
  assert.ok(grown.left + 200 * grown.scale <= 800 - 12);
  assert.ok(grown.top + 100 * grown.scale <= 600 - 12);
});
