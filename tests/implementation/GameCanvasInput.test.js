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
