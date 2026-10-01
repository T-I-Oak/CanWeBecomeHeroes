import test from 'node:test';
import assert from 'node:assert/strict';
import Camera from '../../src/game/Camera.js';

test('camera starts at the effective minimum zoom after its viewport is set', () => {
  const camera = new Camera({ width: 1600, height: 1200 });

  camera.setViewport(800, 600);

  assert.equal(camera.zoom, camera.getEffectiveMinZoom());
});

test('camera keeps the world point under the screen point while zooming', () => {
  const camera = new Camera({ width: 2400, height: 1800 });
  const screenPoint = { x: 240, y: 180 };

  camera.setViewport(800, 600);
  camera.setZoom(0.75, 400, 300);
  const worldPointBeforeZoom = camera.toWorld(screenPoint.x, screenPoint.y);

  camera.setZoomAtScreenPoint(1.1, screenPoint.x, screenPoint.y);

  assert.deepEqual(camera.toWorld(screenPoint.x, screenPoint.y), worldPointBeforeZoom);
});

test('camera uses the applied maximum zoom when preserving a screen point', () => {
  const camera = new Camera({ width: 2400, height: 1800 });
  const screenPoint = { x: 400, y: 300 };

  camera.setViewport(800, 600);
  camera.setZoom(0.75, screenPoint.x, screenPoint.y);
  const worldPointBeforeZoom = camera.toWorld(screenPoint.x, screenPoint.y);

  camera.setZoomAtScreenPoint(99, screenPoint.x, screenPoint.y);

  assert.equal(camera.zoom, camera.maxZoom);
  assert.deepEqual(camera.toWorld(screenPoint.x, screenPoint.y), worldPointBeforeZoom);
});

test('camera centers a requested world point when possible', () => {
  const camera = new Camera({ width: 2400, height: 1800 });
  camera.setViewport(800, 600);
  camera.setZoom(1, 400, 300);

  camera.centerOnWorldPoint({ x: 1200, y: 900 });

  assert.deepEqual(camera.toWorld(400, 300), { x: 1200, y: 900 });
});
