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

test('camera fits four corners within viewport at minimum zoom across diverse screen sizes', () => {
  const world = { width: 2000, height: 1500 };
  const viewports = [
    { width: 390, height: 844 },   // 縦長スマホ
    { width: 844, height: 390 },   // 横長スマホ
    { width: 768, height: 1024 },  // タブレット
    { width: 1280, height: 720 },  // PC
  ];

  for (const { width, height } of viewports) {
    const camera = new Camera(world);
    camera.setViewport(width, height);

    const minZoom = camera.getEffectiveMinZoom();
    assert.equal(camera.zoom, minZoom);

    // 四隅のスクリーン座標を計算
    const corners = [
      { x: 0, y: 0 },
      { x: world.width, y: 0 },
      { x: 0, y: world.height },
      { x: world.width, y: world.height },
    ];

    for (const corner of corners) {
      const screenX = (corner.x - camera.x) * camera.zoom;
      const screenY = (corner.y - camera.y) * camera.zoom;
      assert.ok(screenX >= -1e-4 && screenX <= width + 1e-4, `corner (${corner.x}, ${corner.y}) X (${screenX}) out of [0, ${width}]`);
      assert.ok(screenY >= -1e-4 && screenY <= height + 1e-4, `corner (${corner.x}, ${corner.y}) Y (${screenY}) out of [0, ${height}]`);
    }

    // 余白のある軸は中央配置され、パンしても動かない（マップが隠れない）
    const fitX = width / world.width;
    const fitY = height / world.height;
    if (fitX > fitY) {
      // 横方向に余白がある
      const expectedLeftMargin = (width - world.width * minZoom) / 2;
      assert.ok(Math.abs((0 - camera.x) * camera.zoom - expectedLeftMargin) < 1e-4);
      camera.panByScreen(100, 0);
      assert.ok(Math.abs((0 - camera.x) * camera.zoom - expectedLeftMargin) < 1e-4);
      camera.panByScreen(-100, 0);
      assert.ok(Math.abs((0 - camera.x) * camera.zoom - expectedLeftMargin) < 1e-4);
    } else {
      // 縦方向に余白がある
      const expectedTopMargin = (height - world.height * minZoom) / 2;
      assert.ok(Math.abs((0 - camera.y) * camera.zoom - expectedTopMargin) < 1e-4);
      camera.panByScreen(0, 100);
      assert.ok(Math.abs((0 - camera.y) * camera.zoom - expectedTopMargin) < 1e-4);
      camera.panByScreen(0, -100);
      assert.ok(Math.abs((0 - camera.y) * camera.zoom - expectedTopMargin) < 1e-4);
    }
  }
});

test('camera tracks minimum zoom on resize if at minimum, and maintains clamped zoom if zoomed in', () => {
  const world = { width: 2000, height: 1500 };
  const camera = new Camera(world);

  // 初期: 縦長 390x844
  camera.setViewport(390, 844);
  const minZoomPortrait = camera.getEffectiveMinZoom();
  assert.equal(camera.zoom, minZoomPortrait);

  // 横長 844x390 へリサイズ（下限だったため新下限へ追従）
  camera.setViewport(844, 390);
  const minZoomLandscape = camera.getEffectiveMinZoom();
  assert.equal(camera.zoom, minZoomLandscape);

  // 拡大する
  camera.setZoom(0.8, 422, 195);
  assert.equal(camera.zoom, 0.8);

  // リサイズ後も拡大中なら許容範囲内を維持
  camera.setViewport(1280, 720);
  assert.equal(camera.zoom, 0.8);

  // fitToScreen で縮小下限へ復帰
  camera.fitToScreen();
  assert.equal(camera.zoom, camera.getEffectiveMinZoom());
});

test('camera respects maxZoom and centers world when viewport is larger than maxZoom fit', () => {
  const world = { width: 1000, height: 800 };
  const camera = new Camera(world, { maxZoom: 1.5 });
  camera.setViewport(3000, 2400);

  // 3000/1000 = 3.0, 2400/800 = 3.0 > maxZoom 1.5
  assert.equal(camera.getEffectiveMinZoom(), 1.5);
  assert.equal(camera.zoom, 1.5);

  // 画面中央に配置される
  const screenLeft = (0 - camera.x) * camera.zoom;
  const expectedMargin = (3000 - 1000 * 1.5) / 2; // (3000 - 1500) / 2 = 750
  assert.ok(Math.abs(screenLeft - expectedMargin) < 1e-4);
});

test('camera allows zooming out with padding and panning up to padding beyond world edges', () => {
  const world = { width: 2400, height: 1800 };
  const padding = 200;
  const camera = new Camera(world, { padding });
  camera.setViewport(800, 600);

  // 全体表示倍率は (world + 2*padding) を基準とする
  const expectedMinZoom = Math.min(800 / (2400 + 400), 600 / (1800 + 400));
  assert.ok(Math.abs(camera.getEffectiveMinZoom() - expectedMinZoom) < 1e-4);

  // ズームインしてパン範囲を検証
  camera.setZoom(1.0, 400, 300);

  // 左上へ最大限パン: camera.x は -padding まで動ける
  camera.panByScreen(99999, 99999);
  assert.equal(camera.x, -padding);
  assert.equal(camera.y, -padding);

  // 右下へ最大限パン: camera.x は world.width + padding - visibleWidth まで動ける
  camera.panByScreen(-99999, -99999);
  const expectedMaxX = world.width + padding - 800 / 1.0;
  const expectedMaxY = world.height + padding - 600 / 1.0;
  assert.ok(Math.abs(camera.x - expectedMaxX) < 1e-4);
  assert.ok(Math.abs(camera.y - expectedMaxY) < 1e-4);
});

test('HUD scale is capped at 1.0 and scales down proportionally to preparation area screen width on small zoom', () => {
  const PREPARATION_PANEL_WIDTH = 796;
  const HUD_BASE_WIDTH = 296;
  const calculateHudScale = (zoom) => Math.min(1, (PREPARATION_PANEL_WIDTH * zoom) / HUD_BASE_WIDTH);

  // zoom = 1.0: 準備エリア幅 796px > HUD幅 296px -> scale 1.0
  assert.equal(calculateHudScale(1.0), 1.0);
  // zoom = 0.5: 準備エリア幅 398px > HUD幅 296px -> scale 1.0
  assert.equal(calculateHudScale(0.5), 1.0);
  // zoom = 0.25: 準備エリア幅 199px < HUD幅 296px -> scale 199 / 296 ≈ 0.672
  assert.ok(Math.abs(calculateHudScale(0.25) - 199 / 296) < 1e-4);
  // zoom = 0.2: 準備エリア幅 159.2px -> scale 159.2 / 296 ≈ 0.5378
  assert.ok(Math.abs(calculateHudScale(0.2) - 159.2 / 296) < 1e-4);
});
