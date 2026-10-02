import test from 'node:test';
import assert from 'node:assert/strict';
import GameCanvasInput from '../../src/app/GameCanvasInput.js';

function createCanvas() {
  return {
    style: {},
    addEventListener() {},
    getBoundingClientRect() { return { left: 0, top: 0 }; },
    setPointerCapture() {},
  };
}

test('a bag storage selection releases the stamina-full pause like every other completed input', () => {
  let pauseReleases = 0;
  const controller = {
    updateSelectionHover() {},
    completeSelectionAt() { return true; },
  };
  const input = new GameCanvasInput(createCanvas(), {
    camera: { toWorld: (x, y) => ({ x, y }) },
    controller,
    getCursor: () => '',
    getInformationTarget: () => null,
    getScreenTarget: () => null,
    onScreenTarget() {},
    onInformationTarget() {},
    onPortalOpen() {},
    onReleaseStaminaPause() { pauseReleases += 1; },
  });
  input.drag = {
    pointerId: 1,
    entity: { chip: { type: 'item' } },
    startedSelection: true,
    moved: true,
  };

  input.handlePointerUp({ pointerId: 1, clientX: 80, clientY: 40 });

  assert.equal(pauseReleases, 1);
});

test('a screen target takes precedence over world interaction and receives a tap', () => {
  let centered = null;
  const input = new GameCanvasInput(createCanvas(), {
    camera: { toWorld: (x, y) => ({ x, y }) },
    controller: { getEntityAt() { return { id: 'world-entity' }; } },
    getCursor: () => '',
    getInformationTarget: () => null,
    getScreenTarget: () => ({ hero: { id: 'hero-1' } }),
    onScreenTarget: (target) => { centered = target.hero.id; },
    onInformationTarget() {},
    onPortalOpen() {},
    onReleaseStaminaPause() {},
  });

  input.handlePointerDown({ pointerId: 1, clientX: 80, clientY: 40, preventDefault() {} });
  input.handlePointerUp({ pointerId: 1, clientX: 80, clientY: 40 });

  assert.equal(centered, 'hero-1');
});

test('cursor resolution receives both world and screen coordinates', () => {
  let received = null;
  const input = new GameCanvasInput(createCanvas(), {
    camera: { toWorld: (x, y) => ({ x: x + 10, y: y + 20 }) },
    controller: {},
    getCursor: (worldPoint, screenPoint) => {
      received = { worldPoint, screenPoint };
      return 'pointer';
    },
    getInformationTarget: () => null,
    getScreenTarget: () => null,
    onScreenTarget() {},
    onInformationTarget() {},
    onPortalOpen() {},
    onReleaseStaminaPause() {},
  });

  input.handlePointerMove({ pointerId: 1, clientX: 80, clientY: 40 });

  assert.deepEqual(received, { worldPoint: { x: 90, y: 60 }, screenPoint: { x: 80, y: 40 } });
});
