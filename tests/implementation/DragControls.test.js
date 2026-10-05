import test from 'node:test';
import assert from 'node:assert/strict';
import GameCanvasInput from '../../src/app/GameCanvasInput.js';
import Camera from '../../src/game/Camera.js';
import HeroItemInteractionController from '../../src/game/HeroItemInteractionController.js';

function fixture() {
  const hero = { chip: { x: 1800, y: 1000 } };
  const camera = new Camera({ width: 2400, height: 1800 });
  camera.setViewport(390, 844);
  camera.setZoom(1, 195, 422);
  const calls = [];
  const canvas = {
    style: {}, addEventListener() {}, setPointerCapture() {},
    getBoundingClientRect: () => ({ left: 10, top: 20, width: 390, height: 844 }),
  };
  const input = new GameCanvasInput(canvas, {
    screenTargetInputRoot: canvas, camera,
    controller: {
      getEntityAt: () => hero, hasSelectionSource: () => false,
      beginSelection(entity) { calls.push(['begin', entity]); return true; },
      updateSelectionHover(x, y, entity) { calls.push(['hover', entity]); },
      completeSelectionAt(x, y, entity) { calls.push(['drop', entity]); return true; },
      clearSelection() { calls.push(['clear']); },
    },
    getScreenTarget: (point) => point.x < 60 ? { hero } : null,
    getCursor: () => '', getInformationTarget: () => null,
    onScreenTarget() { calls.push(['tap']); }, onReleaseStaminaPause() {},
  });
  const event = (x, y) => ({ pointerId: 1, clientX: x + 10, clientY: y + 20, preventDefault() {} });
  return { input, camera, calls, hero, event };
}

test('direction indicator starts and ends selection without panning or centering', () => {
  const { input, camera, calls, hero, event } = fixture();
  input.handlePointerDown(event(48, 100));
  const initialX = camera.x;
  input.handlePointerMove(event(80, 100));
  assert.deepEqual(calls[0], ['begin', hero]);
  assert.equal(camera.x, initialX);
  input.handlePointerUp(event(48, 100));
  assert.deepEqual(calls.at(-1), ['drop', hero]);
  assert.ok(!calls.some(([kind]) => kind === 'tap'));
});

test('edge scrolling continues while stationary and stops outside, centrally, and after release', () => {
  const { input, camera, event } = fixture();
  input.handlePointerDown(event(200, 400));
  input.handlePointerMove(event(380, 400));
  const initialX = camera.x;
  input.update(0.1);
  assert.ok(camera.x > initialX);
  const nextX = camera.x;
  input.update(0.1);
  assert.ok(camera.x > nextX);
  for (const x of [391, -1, 200]) {
    input.handlePointerMove(event(x, 400));
    const before = camera.x;
    input.update(0.1);
    assert.equal(camera.x, before);
  }
  input.handlePointerUp(event(380, 400));
  const releasedX = camera.x;
  input.update(0.1);
  assert.equal(camera.x, releasedX);
});

test('edge scrolling stays within camera bounds and cancels with a second touch', () => {
  const { input, camera, event } = fixture();
  input.handlePointerDown(event(200, 400));
  input.handlePointerMove(event(389, 843));
  for (let i = 0; i < 1000; i += 1) input.update(0.1);
  assert.equal(camera.x, camera.getRange('width', 390).max);
  assert.equal(camera.y, camera.getRange('height', 844).max);
  input.handlePointerDown({ ...event(100, 100), pointerId: 2 });
  const before = { x: camera.x, y: camera.y };
  input.update(0.1);
  assert.deepEqual({ x: camera.x, y: camera.y }, before);
});

test('indicator destination uses the real controller action rules', () => {
  const starts = [];
  const controller = new HeroItemInteractionController({}, { start: (...args) => starts.push(args) });
  controller.getEntityAt = () => null;
  const hero = { chip: { type: 'hero' }, currentArea: 'preparation', stamina: 3 };
  const item = { chip: { type: 'item' } };
  controller.beginSelection(hero);
  controller.updateSelectionHover(100, 100, item);
  assert.equal(controller.getSelectionGuide().target, item);
  assert.equal(controller.completeSelectionAt(100, 100, item), true);
  assert.deepEqual(starts, [[hero, item]]);
  controller.beginSelection(item);
  assert.equal(controller.completeSelectionAt(100, 100, hero), false);
  assert.equal(controller.hasSelectionSource(), false);
});

test('tap, blank-space drag and pointer cancellation never edge-scroll', () => {
  const { input, camera, event } = fixture();
  input.handlePointerDown(event(389, 400));
  const initialX = camera.x;
  input.update(0.1);
  assert.equal(camera.x, initialX);
  input.handlePointerMove(event(370, 400));
  input.handlePointerCancel(event(370, 400));
  input.update(0.1);
  assert.equal(camera.x, initialX);
  input.controller.getEntityAt = () => null;
  input.handlePointerDown(event(200, 400));
  input.handlePointerMove(event(389, 400));
  const pannedX = camera.x;
  input.update(0.1);
  assert.equal(camera.x, pannedX);
});
