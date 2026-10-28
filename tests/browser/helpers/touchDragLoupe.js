import { expect } from '@playwright/test';

export async function verifyTouchDragLoupe(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => !window.landing.tutorial.transition);
  await page.evaluate(async () => {
    const { default: Loupe } = await import('/CanWeBecomeHeroes/src/app/TouchDragLoupe.js');
    const draw = Loupe.prototype.draw;
    Loupe.prototype.draw = function (...args) {
      window.landing.loupePoint = args[2];
      return draw.apply(this, args);
    };
    const tutorial = window.landing.tutorial;
    const { default: Texts } = await import('/CanWeBecomeHeroes/src/game/GameTextRepository.js');
    const texts = await new Texts().load();
    tutorial.manager.state.completed = texts.resource.tutorial.scenarios.filter(scenario => scenario.id).map(scenario => scenario.id);
    tutorial.clock.paused = true;
    const controller = tutorial.canvasInput.controller;
    controller.board.chips.forEach(chip => { chip.x = 2500; chip.y = 1500; chip.height = 0; });
    const hero = tutorial.getHeroes()[0];
    const item = tutorial.getItems()[0];
    Object.assign(tutorial.camera, { zoom: 0.8, x: 0, y: 0 });
    Object.assign(hero.chip, { x: 150, y: 500, height: 0 });
    Object.assign(item.chip, { x: 300, y: 500, height: 0 });
    hero.currentArea = 'preparation';
    hero.stamina = 3;
    window.landing.loupeItemId = item.chip.id;
    window.landing.loupeItemPath = item.chip.centerPath;
    const drawImage = CanvasRenderingContext2D.prototype.drawImage;
    window.landing.imageDraws = [];
    CanvasRenderingContext2D.prototype.drawImage = function (image, ...args) {
      if (image.src?.includes('/image-levels/')) {
        window.landing.imageDraws.push({ path: image.src, width: image.naturalWidth,
          layer: this.canvas.id === 'chip-canvas' ? 'board' : 'loupe', scale: this.getTransform().a });
        if (window.landing.imageDraws.length > 1000) window.landing.imageDraws.splice(0, 500);
      }
      return drawImage.call(this, image, ...args);
    };
  });
  const pointer = (x, y, extra = {}) => ({ pointerId: 81, pointerType: 'touch', clientX: x, clientY: y, ...extra });
  const dispatch = (kind, x, y, extra) => page.dispatchEvent('#chip-canvas', kind, pointer(x, y, extra));
  const point = () => page.evaluate(() => window.landing.loupePoint);
  await dispatch('pointerdown', 120, 400);
  await dispatch('pointermove', 170, 400);
  await expect.poll(point).toEqual({ x: 170, y: 400 });
  expect(await page.evaluate(() => window.landing.tutorial.canvasInput.controller.getSelectionGuide().target)).toBeNull();
  await page.screenshot({ path: 'tmp_touch_drag_loupe/before-target.png' });
  await dispatch('pointermove', 240, 400);
  await expect.poll(() => page.evaluate(() => window.landing.tutorial.canvasInput.controller.getSelectionGuide().target?.chip.id)).toBe(await page.evaluate(() => window.landing.loupeItemId));
  await page.screenshot({ path: 'tmp_touch_drag_loupe/over-target.png' });
  await expect.poll(() => page.evaluate(() => {
    const name = window.landing.loupeItemPath.split('/').at(-1).replace('.png', '.');
    const draws = window.landing.imageDraws.filter(draw => draw.path.includes(name));
    const board = draws.findLast(draw => draw.layer === 'board');
    const loupe = draws.findLast(draw => draw.layer === 'loupe');
    return Boolean(board && loupe && loupe.width > board.width && Math.abs(loupe.scale / board.scale - 2) < 0.001);
  })).toBe(true);
  await dispatch('pointermove', 389, 800);
  await expect.poll(point).toEqual({ x: 389, y: 800 });
  await page.screenshot({ path: 'tmp_touch_drag_loupe/edge.png' });
  await dispatch('pointerdown', 100, 300, { pointerId: 82 });
  await expect.poll(point).toBeNull();
  await dispatch('pointerup', 389, 800);
  await dispatch('pointerup', 100, 300, { pointerId: 82 });
  for (const pointerType of ['mouse', 'touch']) {
    await page.evaluate(() => Object.assign(window.landing.tutorial.camera, { zoom: 0.8, x: 0, y: 0 }));
    await dispatch('pointerdown', 120, 400, { pointerType });
    await dispatch('pointermove', 170, 400, { pointerType });
    if (pointerType === 'touch') await expect.poll(point).toEqual({ x: 170, y: 400 });
    else await expect.poll(point).toBeNull();
    await dispatch('pointercancel', 170, 400, { pointerType });
    await expect.poll(point).toBeNull();
  }
}
