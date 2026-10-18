import { test, expect } from '@playwright/test';

const base = 'http://127.0.0.1:4174/CanWeBecomeHeroes/';

// Instrument the actual modules in the development browser only. Production code
// and the production-build smoke test have no test hooks or altered conditions.
async function controlSession(page) {
  await page.evaluate(async () => {
    const root = '/CanWeBecomeHeroes/src/';
    const [{ default: Clock }, { default: Stage }, { default: Tutorial }, { default: Flow }, { default: Texts }, { default: ResultModal }] = await Promise.all([
      import(root + 'game/GameClock.js'), import(root + 'game/StageController.js'),
      import(root + 'app/TutorialController.js'), import(root + 'app/TrialRunFlow.js'), import(root + 'game/GameTextRepository.js'),
      import(root + 'app/TrialRunResultModal.js'),
    ]);
    const texts = await new Texts().load();
    // Start with completed tutorials; their individual presentation has separate tests.
    const check = Tutorial.prototype.check;
    Tutorial.prototype.check = function (...args) {
      this.manager.state.completed = texts.resource.tutorial.scenarios.filter(s => s.id).map(s => s.id);
      return check.apply(this, args);
    };
    window.acceptance = { members: [], results: [], labels: {
      cleared: texts.getLabel('trialCertificateTitle'), expired: texts.getLabel('trialFailureTitle'),
    } };
    const show = ResultModal.prototype.show;
    ResultModal.prototype.show = function (result) {
      window.acceptance.results.push(result.type);
      return show.call(this, result);
    };
    const advance = Clock.prototype.advance;
    Clock.prototype.advance = function (...args) {
      window.acceptance.clock = this;
      this.speed = 20;
      return advance.apply(this, args);
    };
    const select = Stage.prototype.selectStage;
    Stage.prototype.selectStage = function (...args) { window.acceptance.stage = this; return select.apply(this, args); };
    const update = Flow.prototype.update;
    Flow.prototype.update = function (...args) {
      window.acceptance.flow = this;
      window.acceptance.members = this.getMembers().map(hero => hero.profession);
      return update.apply(this, args);
    };
  });
}

async function startRun(page) {
  await page.locator('.TitleMenu__Command.state-primary').click();
  await expect(page.locator('#start-party-selection')).toBeVisible();
  await page.locator('.StartPartySelection__Slot.state-clickable').nth(1).click();
  await page.locator('.StartPartySelection__StartButton').click();
  await expect(page.locator('#vignette')).toBeVisible();
  await page.locator('.VignetteModal__Skip').click();
  await expect(page.locator('#stage-selection')).toBeVisible();
}

async function selectRoute(page) {
  await page.locator('.StageSelection__SelectButton').first().click();
  await expect(page.locator('#stage-selection')).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.acceptance.stage.state), { timeout: 15000 }).toBe('battle');
}

async function winStage(page) {
  await page.evaluate(() => {
    const { stage, clock } = window.acceptance;
    // Defeat enemies through the real battle system after spawning has finished.
    stage.enemySpawn.update(clock.tick + 300);
    const battle = stage.battleSystem;
    for (const enemy of [...battle.controller.getEnemies()]) battle.defeatEnemy(enemy);
    battle.stageLifecycle.markVictory(clock.tick);
    battle.stageLifecycle.updateVictoryDelay(200, clock.tick);
  });
}

for (const outcome of ['cleared', 'expired']) test(`${outcome}: title, selected party, vignette, battle, result and restart`, async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    let seed = 54;
    Math.random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  });
  await page.goto(base);
  await expect(page.locator('.TitleMenu__Command.state-primary')).toBeVisible();
  await controlSession(page);
  await startRun(page);
  await selectRoute(page);
  await expect.poll(() => page.evaluate(() => window.acceptance.members)).toEqual(['guard', 'swordfighter']);
  if (outcome === 'cleared') {
    for (let number = 1; number <= 7; number += 1) {
      await expect.poll(() => page.evaluate(() => window.acceptance.stage.stageNumber)).toBe(number);
      await winStage(page);
      if (number < 7) {
        // Elite recruitment uses its real modal, with the same user skip as startup.
        await expect.poll(async () => {
          if (await page.locator('.VignetteModal__Skip').isVisible()) await page.locator('.VignetteModal__Skip').click();
          return page.locator('#stage-selection').isVisible();
        }).toBe(true);
        await selectRoute(page);
      }
    }
  } else {
    await page.evaluate(() => { window.acceptance.clock.tick = 500 * 24 * 7; });
  }
  await expect(page.locator('#trial-run-result')).toBeVisible();
  await expect(page.locator('#trial-run-result-title')).toHaveText(await page.evaluate(key => window.acceptance.labels[key], outcome));
  const history = () => page.evaluate(() => JSON.parse(localStorage.getItem('can-we-become-heroes')).runRecords.history);
  await expect.poll(async () => (await history()).length).toBe(1);
  expect((await history())[0].outcome).toBe(outcome);
  await expect(page.locator('#trial-run-result .ReturnButton')).toBeEnabled();
  await page.evaluate(() => {
    const { flow, stage } = window.acceptance;
    for (let count = 0; count < 3; count += 1) flow.update(stage.battleSystem.controller.getHeroes());
  });
  expect(await page.evaluate(() => window.acceptance.results)).toEqual([outcome === 'cleared' ? 'certificate' : 'failure-notice']);
  expect((await history()).length).toBe(1);
  await page.locator('#trial-run-result .ReturnButton').click();
  await expect(page.locator('.TitleMenu__Command.state-primary')).toBeVisible();
  await expect(page.locator('#trial-run-result')).toBeHidden();
  await startRun(page);
  await selectRoute(page);
  expect((await history()).length).toBe(1);
  expect(errors).toEqual([]);
});
