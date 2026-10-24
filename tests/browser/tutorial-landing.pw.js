import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

test('initial heroes land before the introduction, preserving pause, read state and reset', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:4174/CanWeBecomeHeroes/');
  await expect(page.locator('.TitleMenu__Version')).toHaveText(`v${version}`);
  await page.evaluate(async () => {
    const { default: Tutorial } = await import('/CanWeBecomeHeroes/src/app/TutorialController.js');
    const check = Tutorial.prototype.check;
    window.landing = { samples: [], starts: [] };
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, ...args) {
      if (/^v\d+\.\d+\.\d+$/.test(text)) window.landing.warehouseVersion = text;
      return fillText.call(this, text, ...args);
    };
    Tutorial.prototype.check = function (...args) {
      window.landing.tutorial = this;
      const before = this.scenarioActive;
      const states = this.getPreparationHeroes().map(hero => ({
        height: hero.chip.height, velocity: hero.chip.verticalVelocity, settled: hero.chip.isSettled,
      }));
      const result = check.apply(this, args);
      if (!this.isStageSelecting()) window.landing.samples.push(states);
      if (!before && this.scenarioActive) window.landing.starts.push({ id: this.manager.getCurrentStep().id, states });
      return result;
    };
  });
  await page.locator('.TitleMenu__Command.state-primary').click();
  await page.locator('.StartPartySelection__StartButton').click();
  await page.locator('.VignetteModal__Skip').click();
  const next = page.locator('#tutorial-next-btn');
  async function finishTutorial(id) {
    await expect.poll(() => page.evaluate(() => window.landing.tutorial.manager.getCurrentStep()?.id)).toBe(id);
    while (await page.evaluate(() => window.landing.tutorial.scenarioActive)) {
      if (await next.isVisible()) await next.click();
      else await page.waitForTimeout(50);
    }
  }
  await finishTutorial('trial-selection-intro');
  await page.evaluate(async () => {
    const tutorial = window.landing.tutorial;
    tutorial.clock.paused = true;
    await tutorial.reset();
    tutorial.check();
  });
  expect(await page.evaluate(() => ({
    armed: window.landing.tutorial.armed,
    paused: window.landing.tutorial.clock.paused,
    selecting: window.landing.tutorial.clock.pauseReasons.has('stage-selection'),
    active: window.landing.tutorial.scenarioActive,
  }))).toEqual({ armed: false, paused: true, selecting: true, active: false });
  await page.evaluate(() => window.landing.tutorial.onStageSelection());
  await finishTutorial('trial-selection-intro');
  await page.locator('.StageSelection__SelectButton').first().click();
  expect(await page.evaluate(() => ({
    active: window.landing.tutorial.scenarioActive,
    settled: window.landing.tutorial.getPreparationHeroes().every(hero => hero.chip.isSettled),
    paused: window.landing.tutorial.clock.paused,
  }))).toEqual({ active: false, settled: false, paused: true });
  await page.evaluate(() => { window.landing.tutorial.clock.paused = false; });
  await expect.poll(() => page.evaluate(() => window.landing.starts.some(start => start.id === 'game-screen-intro'))).toBe(true);
  const observed = await page.evaluate(() => ({
    starts: window.landing.starts.filter(start => start.id === 'game-screen-intro'),
    falling: window.landing.samples.some(states => states.some(chip => chip.height > 0 && chip.velocity > 0)),
    bouncing: window.landing.samples.some(states => states.some(chip => chip.velocity < 0)),
    paused: window.landing.tutorial.clock.pauseReasons.has('tutorial'),
  }));
  expect(observed.starts).toHaveLength(1);
  expect(observed.starts[0].states.every(chip => chip.settled)).toBe(true);
  expect(observed.falling).toBe(true);
  expect(observed.bouncing).toBe(true);
  expect(observed.paused).toBe(true);
  expect(await page.evaluate(() => window.landing.warehouseVersion)).toBe(`v${version}`);
  await expect(next).toBeVisible();
  await page.screenshot({ path: 'tmp_tutorial_landing/intro.png' });
  await page.evaluate(() => { window.landing.tutorial.clock.paused = true; });
  await finishTutorial('game-screen-intro');
  expect(await page.evaluate(() => {
    const tutorial = window.landing.tutorial;
    tutorial.getPreparationHeroes()[0].chip.beginDrop();
    tutorial.check();
    return { ready: tutorial.isGameScreenReady(), active: tutorial.scenarioActive,
      paused: tutorial.clock.paused, tutorialPause: tutorial.clock.pauseReasons.has('tutorial'),
      completed: tutorial.manager.state.completed.includes('game-screen-intro') };
  })).toEqual({ ready: true, active: false, paused: true, tutorialPause: false, completed: true });
  expect(errors).toEqual([]);
});
