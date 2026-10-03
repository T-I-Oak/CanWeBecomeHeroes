import test from 'node:test';
import assert from 'node:assert/strict';
import GameCanvasInput from '../../src/app/GameCanvasInput.js';
import Camera from '../../src/game/Camera.js';

function createCanvas() {
  return {
    style: {},
    addEventListener() {},
    getBoundingClientRect() { return { left: 0, top: 0 }; },
    setPointerCapture() {},
  };
}

function createEventRoot() {
  const listeners = new Map();
  return {
    addEventListener(type, listener) { listeners.set(type, listener); },
    dispatch(type, event) { listeners.get(type)(event); },
  };
}

test('a bag storage selection releases the stamina-full pause like every other completed input', () => {
  let pauseReleases = 0;
  const controller = {
    updateSelectionHover() {},
    completeSelectionAt() { return true; },
  };
  const input = new GameCanvasInput(createCanvas(), {
    screenTargetInputRoot: createEventRoot(),
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
    screenTargetInputRoot: createEventRoot(),
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
    screenTargetInputRoot: createEventRoot(),
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

test('a screen target above the HUD enters the existing canvas tap flow', () => {
  const root = createEventRoot();
  let centered = null;
  const input = new GameCanvasInput(createCanvas(), {
    screenTargetInputRoot: root,
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
  let prevented = false;
  let stopped = false;

  root.dispatch('pointerdown', {
    pointerId: 1,
    clientX: 80,
    clientY: 40,
    preventDefault() { prevented = true; },
    stopPropagation() { stopped = true; },
  });
  input.handlePointerUp({ pointerId: 1, clientX: 80, clientY: 40 });

  assert.equal(prevented, true);
  assert.equal(stopped, true);
  assert.equal(centered, 'hero-1');
});

test('a HUD input without a screen target keeps its original event flow', () => {
  const root = createEventRoot();
  const input = new GameCanvasInput(createCanvas(), {
    screenTargetInputRoot: root,
    camera: { toWorld: (x, y) => ({ x, y }) },
    controller: { getEntityAt() { return null; } },
    getCursor: () => '',
    getInformationTarget: () => null,
    getScreenTarget: () => null,
    onScreenTarget() {},
    onInformationTarget() {},
    onPortalOpen() {},
    onReleaseStaminaPause() {},
  });
  let prevented = false;
  let stopped = false;

  root.dispatch('pointerdown', {
    pointerId: 1,
    clientX: 80,
    clientY: 40,
    preventDefault() { prevented = true; },
    stopPropagation() { stopped = true; },
  });

  assert.equal(prevented, false);
  assert.equal(stopped, false);
  assert.equal(input.drag, null);
});

test('two-finger pinch expands zoom on spread, reduces zoom on pinch, respects limits and reverses immediately', () => {
  const camera = new Camera({ width: 2000, height: 1500 });
  camera.setViewport(800, 600);
  const minZoom = camera.getEffectiveMinZoom();
  camera.setZoom(0.8, 400, 300);

  const input = new GameCanvasInput(createCanvas(), {
    screenTargetInputRoot: createEventRoot(),
    camera,
    controller: { getEntityAt() { return null; } },
    getCursor: () => '',
    getInformationTarget: () => null,
    getScreenTarget: () => null,
    onScreenTarget() {},
    onInformationTarget() {},
    onPortalOpen() {},
    onReleaseStaminaPause() {},
  });

  // 1本目の指
  input.handlePointerDown({ pointerId: 1, clientX: 200, clientY: 300, preventDefault() {} });
  // 2本目の指（距離 200）
  input.handlePointerDown({ pointerId: 2, clientX: 400, clientY: 300, preventDefault() {} });

  const initialZoom = camera.zoom;
  assert.equal(initialZoom, 0.8);

  // 指の間隔を広げる（距離 200 -> 300）: 拡大
  input.handlePointerMove({ pointerId: 2, clientX: 500, clientY: 300, preventDefault() {} });
  assert.ok(camera.zoom > initialZoom);
  const expandedZoom = camera.zoom;

  // 指の間隔を狭める（距離 300 -> 150）: 縮小
  input.handlePointerMove({ pointerId: 2, clientX: 350, clientY: 300, preventDefault() {} });
  assert.ok(camera.zoom < expandedZoom);

  // 最大倍率（1.5）まで拡大して、上限到達後直ちに縮小へ追従できるか
  input.handlePointerMove({ pointerId: 2, clientX: 1000, clientY: 300, preventDefault() {} });
  assert.equal(camera.zoom, camera.maxZoom);
  // 逆方向へ狭める
  input.handlePointerMove({ pointerId: 2, clientX: 800, clientY: 300, preventDefault() {} });
  assert.ok(camera.zoom < camera.maxZoom);

  // 最小倍率まで縮小して、下限到達後直ちに拡大へ追従できるか
  input.handlePointerMove({ pointerId: 2, clientX: 201, clientY: 300, preventDefault() {} });
  assert.equal(camera.zoom, minZoom);
  // 逆方向へ広げる
  input.handlePointerMove({ pointerId: 2, clientX: 300, clientY: 300, preventDefault() {} });
  assert.ok(camera.zoom > minZoom);
});

test('pinch preserves world position under center point and follows center movement', () => {
  const camera = new Camera({ width: 2400, height: 1800 });
  camera.setViewport(800, 600);
  camera.setZoom(1.0, 400, 300);

  const input = new GameCanvasInput(createCanvas(), {
    screenTargetInputRoot: createEventRoot(),
    camera,
    controller: { getEntityAt() { return null; } },
    getCursor: () => '',
    getInformationTarget: () => null,
    getScreenTarget: () => null,
    onScreenTarget() {},
    onInformationTarget() {},
    onPortalOpen() {},
    onReleaseStaminaPause() {},
  });

  // 指1: (300, 300), 指2: (500, 300) -> 中点 (400, 300)
  input.handlePointerDown({ pointerId: 1, clientX: 300, clientY: 300, preventDefault() {} });
  input.handlePointerDown({ pointerId: 2, clientX: 500, clientY: 300, preventDefault() {} });

  const worldAtCenterBefore = camera.toWorld(400, 300);

  // 中点を (450, 350) に動かしつつ間隔を広げる
  // 指1: (320, 350), 指2: (580, 350) -> 中点 (450, 350), 距離 260
  input.handlePointerMove({ pointerId: 1, clientX: 320, clientY: 350, preventDefault() {} });
  input.handlePointerMove({ pointerId: 2, clientX: 580, clientY: 350, preventDefault() {} });

  const worldAtCenterAfter = camera.toWorld(450, 350);
  assert.ok(Math.abs(worldAtCenterAfter.x - worldAtCenterBefore.x) < 1e-4);
  assert.ok(Math.abs(worldAtCenterAfter.y - worldAtCenterBefore.y) < 1e-4);
});

test('second touch cancels active selection and drag without triggering information window or drop', () => {
  let cleared = false;
  let infoTarget = null;
  const entity = { id: 'chip-1' };
  const controller = {
    getEntityAt() { return entity; },
    hasSelectionSource() { return false; },
    beginSelection() { return true; },
    updateSelectionHover() {},
    completeSelectionAt() { return true; },
    clearSelection() { cleared = true; },
  };

  const input = new GameCanvasInput(createCanvas(), {
    screenTargetInputRoot: createEventRoot(),
    camera: { toWorld: (x, y) => ({ x, y }) },
    controller,
    getCursor: () => '',
    getInformationTarget: () => ({ type: 'chip', entity }),
    getScreenTarget: () => null,
    onScreenTarget() {},
    onInformationTarget: (target) => { infoTarget = target; },
    onPortalOpen() {},
    onReleaseStaminaPause() {},
  });

  // 1本目の指でドラッグ開始
  input.handlePointerDown({ pointerId: 1, clientX: 100, clientY: 100, preventDefault() {} });
  input.handlePointerMove({ pointerId: 1, clientX: 120, clientY: 100, preventDefault() {} });
  assert.equal(input.drag.startedSelection, true);

  // 2本目の指が触れる
  input.handlePointerDown({ pointerId: 2, clientX: 200, clientY: 100, preventDefault() {} });
  assert.equal(cleared, true);
  assert.equal(input.drag, null);

  // ピンチ操作中に指を離す
  input.handlePointerUp({ pointerId: 1, clientX: 120, clientY: 100 });
  input.handlePointerUp({ pointerId: 2, clientX: 200, clientY: 100 });

  assert.equal(infoTarget, null);
});

test('pinch locks out single pointer input until all fingers are released, then restores normal operation', () => {
  let taps = 0;
  let pauseReleases = 0;
  const input = new GameCanvasInput(createCanvas(), {
    screenTargetInputRoot: createEventRoot(),
    camera: new Camera({ width: 2000, height: 1500 }),
    controller: { getEntityAt() { return null; } },
    getCursor: () => '',
    getInformationTarget: () => ({ type: 'empty' }),
    getScreenTarget: () => null,
    onScreenTarget() {},
    onInformationTarget() { taps += 1; },
    onPortalOpen() {},
    onReleaseStaminaPause() { pauseReleases += 1; },
  });

  input.camera.setViewport(800, 600);

  // 2本指でピンチ開始
  input.handlePointerDown({ pointerId: 1, clientX: 100, clientY: 100, preventDefault() {} });
  input.handlePointerDown({ pointerId: 2, clientX: 300, clientY: 100, preventDefault() {} });

  // 1本目の指を離す（まだ指2が残っている）
  input.handlePointerUp({ pointerId: 1, clientX: 100, clientY: 100 });
  assert.equal(taps, 0);

  // 残った指2を動かしたり離したりしてもタップやドラッグにならない
  input.handlePointerMove({ pointerId: 2, clientX: 320, clientY: 100, preventDefault() {} });
  input.handlePointerUp({ pointerId: 2, clientX: 320, clientY: 100 });
  assert.equal(taps, 0);
  assert.equal(pauseReleases, 1);

  // すべての指が離れた後、新しい1本指でのタップは正常に動作する
  input.handlePointerDown({ pointerId: 3, clientX: 200, clientY: 200, preventDefault() {} });
  input.handlePointerUp({ pointerId: 3, clientX: 200, clientY: 200 });
  assert.equal(taps, 1);
});

test('third finger is ignored during pinch zoom and zero-distance touch handles safely', () => {
  const camera = new Camera({ width: 2000, height: 1500 });
  camera.setViewport(800, 600);
  camera.setZoom(1.0, 400, 300);

  const input = new GameCanvasInput(createCanvas(), {
    screenTargetInputRoot: createEventRoot(),
    camera,
    controller: { getEntityAt() { return null; } },
    getCursor: () => '',
    getInformationTarget: () => null,
    getScreenTarget: () => null,
    onScreenTarget() {},
    onInformationTarget() {},
    onPortalOpen() {},
    onReleaseStaminaPause() {},
  });

  // 距離0での2本指タッチ
  input.handlePointerDown({ pointerId: 1, clientX: 200, clientY: 200, preventDefault() {} });
  input.handlePointerDown({ pointerId: 2, clientX: 200, clientY: 200, preventDefault() {} });
  assert.equal(Number.isNaN(camera.zoom), false);

  // 距離を広げて基準距離を確立（0 -> 200）
  input.handlePointerMove({ pointerId: 2, clientX: 400, clientY: 200, preventDefault() {} });
  // さらに広げる（200 -> 300）: 拡大
  input.handlePointerMove({ pointerId: 2, clientX: 500, clientY: 200, preventDefault() {} });
  const zoomAfterPinch = camera.zoom;
  assert.ok(zoomAfterPinch > 1.0);

  // 3本目の指が追加される
  input.handlePointerDown({ pointerId: 3, clientX: 500, clientY: 500, preventDefault() {} });
  // 3本目の指の動きは倍率に影響しない
  input.handlePointerMove({ pointerId: 3, clientX: 600, clientY: 600, preventDefault() {} });
  assert.equal(camera.zoom, zoomAfterPinch);
});

test('pointercancel and lostpointercapture reset touch state cleanly', () => {
  let cleared = false;
  const input = new GameCanvasInput(createCanvas(), {
    screenTargetInputRoot: createEventRoot(),
    camera: new Camera({ width: 2000, height: 1500 }),
    controller: {
      getEntityAt() { return { id: 'hero' }; },
      hasSelectionSource() { return false; },
      beginSelection() { return true; },
      updateSelectionHover() {},
      clearSelection() { cleared = true; },
    },
    getCursor: () => '',
    getInformationTarget: () => null,
    getScreenTarget: () => null,
    onScreenTarget() {},
    onInformationTarget() {},
    onPortalOpen() {},
    onReleaseStaminaPause() {},
  });

  input.handlePointerDown({ pointerId: 1, clientX: 100, clientY: 100, preventDefault() {} });
  input.handlePointerMove({ pointerId: 1, clientX: 120, clientY: 100, preventDefault() {} });
  assert.equal(input.drag.startedSelection, true);

  input.handlePointerCancel();
  assert.equal(cleared, true);
  assert.equal(input.drag, null);
});

test('lostpointercapture for already-released pointer does not reset lockout while another finger remains', () => {
  let taps = 0;
  const input = new GameCanvasInput(createCanvas(), {
    screenTargetInputRoot: createEventRoot(),
    camera: new Camera({ width: 2000, height: 1500 }),
    controller: { getEntityAt() { return null; } },
    getCursor: () => '',
    getInformationTarget: () => ({ type: 'chip' }),
    getScreenTarget: () => null,
    onScreenTarget() {},
    onInformationTarget() { taps += 1; },
    onPortalOpen() {},
    onReleaseStaminaPause() {},
  });

  // 指1・指2でピンチ開始
  input.handlePointerDown({ pointerId: 1, clientX: 100, clientY: 100, preventDefault() {} });
  input.handlePointerDown({ pointerId: 2, clientX: 300, clientY: 100, preventDefault() {} });
  assert.equal(input.pinchLockout, true);

  // 指1を離す
  input.handlePointerUp({ pointerId: 1, clientX: 100, clientY: 100 });
  assert.equal(input.activePointers.size, 1);
  assert.equal(input.pinchLockout, true);

  // 指1に対してブラウザの通常 lostpointercapture が発火
  input.handleLostPointerCapture({ pointerId: 1 });
  // 指2が残存しているため、ロックアウトおよび指2のアクティブ追跡が維持される
  assert.equal(input.activePointers.size, 1);
  assert.equal(input.pinchLockout, true);

  // 指2が触れている間に追加タッチやタップが発生しても無視される
  input.handlePointerDown({ pointerId: 3, clientX: 200, clientY: 200, preventDefault() {} });
  input.handlePointerUp({ pointerId: 3, clientX: 200, clientY: 200 });
  assert.equal(taps, 0);

  // 最後に指2を離す
  input.handlePointerUp({ pointerId: 2, clientX: 300, clientY: 100 });
  assert.equal(input.activePointers.size, 0);
  assert.equal(input.pinchLockout, false);

  // すべて離れた後はタップ可能
  input.handlePointerDown({ pointerId: 4, clientX: 200, clientY: 200, preventDefault() {} });
  input.handlePointerUp({ pointerId: 4, clientX: 200, clientY: 200 });
  assert.equal(taps, 1);
});

test('pointercancel with specific pointerId only releases that pointer and retains lockout if other pointers remain', () => {
  let pauseReleases = 0;
  const input = new GameCanvasInput(createCanvas(), {
    screenTargetInputRoot: createEventRoot(),
    camera: new Camera({ width: 2000, height: 1500 }),
    controller: { getEntityAt() { return null; } },
    getCursor: () => '',
    getInformationTarget: () => null,
    getScreenTarget: () => null,
    onScreenTarget() {},
    onInformationTarget() {},
    onPortalOpen() {},
    onReleaseStaminaPause() { pauseReleases += 1; },
  });

  input.handlePointerDown({ pointerId: 1, clientX: 100, clientY: 100, preventDefault() {} });
  input.handlePointerDown({ pointerId: 2, clientX: 300, clientY: 100, preventDefault() {} });
  assert.equal(input.pinchLockout, true);

  // 指1のみキャンセル発生
  input.handlePointerCancel({ pointerId: 1 });
  assert.equal(input.activePointers.size, 1);
  assert.equal(input.pinchLockout, true);
  assert.equal(pauseReleases, 0);

  // 指2も離脱
  input.handlePointerUp({ pointerId: 2, clientX: 300, clientY: 100 });
  assert.equal(input.activePointers.size, 0);
  assert.equal(input.pinchLockout, false);
  assert.equal(pauseReleases, 1);
});
