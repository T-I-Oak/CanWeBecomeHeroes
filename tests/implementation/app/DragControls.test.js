import test from 'node:test';
import assert from 'node:assert/strict';
import GameCanvasInput from '../../../src/app/GameCanvasInput.js';
import Camera from '../../../src/game/Camera.js';
import HeroItemInteractionController from '../../../src/game/HeroItemInteractionController.js';
import Chip from '../../../src/chips/Chip.js';
import ChipBoard from '../../../src/chips/ChipBoard.js';

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

test('real visual hit testing drives drag start, hover, release and tap through camera transforms', () => {
  for (const zoom of [0.5, 1, 1.5]) {
    const { input, camera, event } = fixture();
    camera.zoom = zoom;
    camera.x = 100;
    camera.y = 200;
    const starts = [];
    const board = new ChipBoard({ width: 3000, height: 2000 });
    const controller = new HeroItemInteractionController(board, { start: (...args) => starts.push(args) });
    const hero = { chip: new Chip({ id: 1, type: 'hero', x: 300, y: 650, weight: 1, tagPaths: [] }), currentArea: 'preparation', stamina: 3 };
    const item = { chip: new Chip({ id: 2, type: 'item', x: 550, y: 650, weight: 1, tagPaths: [] }) };
    [hero, item].forEach(entity => {
      entity.chip.height = 200;
      entity.chip.effectOffsetX = 20;
      entity.chip.effectOffsetY = 10;
      controller.add(entity);
    });
    input.controller = controller;
    input.getScreenTarget = () => null;
    input.getInformationTarget = point => controller.tap(point.x, point.y);
    let tapped;
    input.onInformationTarget = target => { tapped = target; };
    const at = (x, y) => event((x - camera.x) * zoom, (y - camera.y) * zoom);
    input.handlePointerDown(at(320, 460));
    assert.equal(input.drag.entity, hero);
    input.handlePointerMove(at(570, 460));
    assert.equal(controller.getSelectionGuide().target, item);
    input.handlePointerUp(at(570, 460));
    assert.deepEqual(starts, [[hero, item]]);
    input.handlePointerDown(at(570, 460));
    input.handlePointerUp(at(570, 460));
    assert.equal(tapped, item);
    input.handlePointerDown(at(550, 650));
    assert.equal(input.drag.entity, undefined);
    input.handlePointerCancel();
  }
});

test('touch loupe follows selection across empty space and edge scrolling, then clears on every exit', () => {
  for (const exit of ['handlePointerUp', 'handlePointerCancel', 'handleLostPointerCapture', 'pinch']) {
    const { input, event, camera } = fixture();
    input.controller.hasSelectionSource = () => Boolean(input.drag?.startedSelection);
    const touch = (x, y) => ({ ...event(x, y), pointerType: 'touch' });
    input.handlePointerDown(touch(200, 400));
    assert.equal(input.getLoupePoint(), null);
    input.handlePointerMove(touch(220, 400));
    assert.deepEqual(input.getLoupePoint(), { x: 220, y: 400 });
    input.handlePointerMove(touch(389, 400));
    const before = camera.x;
    input.update(0.05);
    assert.ok(camera.x > before);
    assert.deepEqual(input.getLoupePoint(), { x: 389, y: 400 });
    if (exit === 'pinch') input.handlePointerDown({ ...touch(100, 100), pointerId: 2 });
    else input[exit](touch(389, 400));
    assert.equal(input.getLoupePoint(), null);
    input.handlePointerCancel();
    input.handlePointerDown(touch(200, 400));
    input.handlePointerMove(touch(220, 400));
    assert.deepEqual(input.getLoupePoint(), { x: 220, y: 400 });
  }
});

test('mouse, pen, rejected selection and empty-space pan never show the loupe', () => {
  for (const pointerType of ['mouse', 'pen', 'touch']) {
    for (const kind of ['accepted', 'rejected', 'pan']) {
      const { input, event } = fixture();
      input.controller.hasSelectionSource = () => Boolean(input.drag?.startedSelection);
      input.controller.beginSelection = () => kind !== 'rejected';
      if (kind === 'pan') input.controller.getEntityAt = () => null;
      input.handlePointerDown({ ...event(200, 400), pointerType });
      input.handlePointerMove({ ...event(220, 400), pointerType });
      assert.equal(Boolean(input.getLoupePoint()), pointerType === 'touch' && kind === 'accepted');
    }
  }
});

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
