import test from 'node:test';
import assert from 'node:assert/strict';
import Camera from '../../src/game/Camera.js';

test('camera starts at the effective minimum zoom after its viewport is set', () => {
  const camera = new Camera({ width: 1600, height: 1200 });

  camera.setViewport(800, 600);

  assert.equal(camera.zoom, camera.getEffectiveMinZoom());
});
