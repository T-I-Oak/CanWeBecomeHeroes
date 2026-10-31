import { expect } from '@playwright/test';

export async function verifyChipVisualHitTest(page) {
  for (const zoom of [0.5, 1, 1.5]) {
    const points = await page.evaluate(zoom => {
      const tutorial = window.landing.tutorial;
      const input = tutorial.canvasInput;
      input.handlePointerCancel();
      const controller = input.controller;
      controller.clearSelection();
      controller.board.chips.forEach(chip => Object.assign(chip, { x: 2500, y: 1500, height: 0 }));
      const hero = tutorial.getHeroes()[0];
      const item = tutorial.getItems()[0];
      Object.assign(tutorial.camera, { zoom, x: 800, y: 0 });
      Object.assign(hero.chip, { x: 920, y: 450, height: 200, effectOffsetX: 20, effectOffsetY: 10, scale: 1 });
      Object.assign(item.chip, { x: 1030, y: 450, height: 200, effectOffsetX: 20, effectOffsetY: 10, scale: 0.75 });
      hero.currentArea = 'preparation';
      hero.stamina = 3;
      window.landing.hitHero = hero;
      window.landing.hitItem = item;
      return { hero: { x: 140 * zoom, y: 260 * zoom }, item: { x: 250 * zoom, y: 260 * zoom }, shadow: { x: 230 * zoom, y: 450 * zoom } };
    }, zoom);
    const send = (kind, point) => page.dispatchEvent('#chip-canvas', kind, {
      pointerId: 91, pointerType: 'mouse', clientX: point.x, clientY: point.y,
    });
    await send('pointermove', points.item);
    await expect(page.locator('#chip-canvas')).toHaveCSS('cursor', 'pointer');
    await send('pointerdown', points.hero);
    expect(await page.evaluate(() => window.landing.tutorial.canvasInput.drag.entity === window.landing.hitHero)).toBe(true);
    await send('pointermove', points.item);
    const state = await page.evaluate(() => {
      const input = window.landing.tutorial.canvasInput;
      return { selected: input.controller.getSelectionGuide().target === window.landing.hitItem,
        drag: { started: input.drag.startedSelection, moved: input.drag.moved }, camera: { x: input.camera.x, y: input.camera.y, zoom: input.camera.zoom },
        item: { x: window.landing.hitItem.chip.x, y: window.landing.hitItem.chip.y, height: window.landing.hitItem.chip.height } };
    });
    expect(state.selected, JSON.stringify(state)).toBe(true);
    await send('pointercancel', points.item);
    await send('pointermove', points.shadow);
    expect(await page.locator('#chip-canvas').evaluate(canvas => canvas.style.cursor)).toBe('');
    await send('pointerdown', points.shadow);
    expect(await page.evaluate(() => Boolean(window.landing.tutorial.canvasInput.drag.entity))).toBe(false);
    await send('pointercancel', points.shadow);
    await send('pointerdown', points.item);
    await send('pointerup', points.item);
    expect(await page.evaluate(() => {
      const target = window.landing.tutorial.canvasInput.getInformationTarget({ x: 1050, y: 260 });
      return window.landing.tutorial.canvasInput.controller.entityRegistry.getByInstanceId(target.data.target.instanceId) === window.landing.hitItem;
    })).toBe(true);
    await page.screenshot({ path: `tmp_chip_visual_hit_test/zoom-${zoom}.png` });
    await page.evaluate(() => {
      const hero = window.landing.hitHero.chip;
      Object.assign(window.landing.hitItem.chip, { x: hero.x, y: hero.y, height: hero.height });
    });
    await send('pointerdown', points.hero);
    expect(await page.evaluate(() => {
      const input = window.landing.tutorial.canvasInput;
      const bodies = input.controller.board.getRenderChips().filter(chip => (
        chip === window.landing.hitHero.chip || chip === window.landing.hitItem.chip
      ));
      return input.drag.entity.chip === bodies.at(-1);
    })).toBe(true);
    await send('pointercancel', points.hero);
  }
}
