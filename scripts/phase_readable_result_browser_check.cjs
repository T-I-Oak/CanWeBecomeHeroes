const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.argv[2] || 'playwright');
const output = process.argv[3];

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const page = await browser.newPage({ hasTouch: true, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    // Supply long-text fixtures at the table boundary before the modal measures it.
    // The real table builder, CSS, wrapping and modal fitting still run unchanged.
    await page.route('**/src/app/AchievementTable.js', async route => {
      const response = await route.fetch();
      const source = (await response.text()).replace('export function createAchievementTable(', 'function buildAchievementTable(');
      await route.fulfill({ response, body: source + `
        export function createAchievementTable(options) {
          const table = buildAchievementTable(options);
          const scenario = window.phaseLongTable;
          if (options.mode === 'result' && scenario) {
            table.querySelectorAll('.AchievementTable__Item').forEach(cell => { cell.textContent = 'Item'; });
            table.querySelectorAll('.AchievementTable__Category').forEach(cell => { cell.textContent = 'Group'; });
            const phrase = document.documentElement.lang === 'ja'
              ? '経験を重ねて着実に成長しています。'
              : 'Your steady practice has helped you grow with each new challenge. ';
            table.querySelectorAll('.AchievementTable__Comment').forEach((cell, index) => {
              cell.textContent = scenario === 'overflow' ? phrase.repeat(12) : index === 0 ? phrase.repeat(3) : 'OK';
            });
          }
          return table;
        }
      ` });
    });
    await page.goto('http://127.0.0.1:5173/CanWeBecomeHeroes/');
    await page.getByRole('button', { name: 'レコード', exact: true }).waitFor();
    for (const language of ['ja', 'en']) {
      await page.locator('#language-selector').selectOption(language, { force: true });
      await page.waitForFunction(language => document.documentElement.lang === language, language);
      for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
        await page.setViewportSize(viewport);
        for (const pass of [true, false]) {
          await page.evaluate(async pass => {
            const { default: Modal } = await import('./src/app/TrialRunResultModal.js');
            const { default: Texts } = await import('./src/game/GameTextRepository.js');
            const { default: Achievements } = await import('./src/game/Achievements.js');
            const { default: Statistics } = await import('./src/game/GameStatistics.js');
            const modal = new Modal(document.querySelector('#trial-run-result'), { textRepository: await new Texts().load() });
            const statistics = new Statistics();
            statistics.record({ type: 'hero-tags', heroId: 'Avery', counts: { valor: 1, arcane: 7 } });
            const evaluated = new Achievements().evaluate(statistics).entries;
            const result = { type: pass ? 'certificate' : 'failure-notice', issuedAt: new Date(),
              members: ['Avery', 'Briar', 'Casey', 'Darcy'].map(heroId => ({ heroId, epithet: 'The Hero of Unwavering Courage' })),
              achievements: [...evaluated.slice(0, 8), ...evaluated.filter(entry => ['tag:valor', 'tag:arcane'].includes(entry.id))].map(entry => ({ ...entry, updated: false })) };
            window.phaseResultClosed = false;
            modal.show(result).then(() => { window.phaseResultClosed = true; });
          }, pass);
          await page.locator('.ReturnButton').waitFor();
          const check = await page.locator('.TrialResultViewport').evaluate(element => {
            const back = element.querySelector('.ReturnButton').getBoundingClientRect();
            const paper = element.querySelector('.TrialResultPaper');
            return { buttonHeight: back.height, buttonVisible: back.x >= 0 && back.right <= innerWidth && back.y >= 0 && back.bottom <= innerHeight,
              scale: new DOMMatrix(getComputedStyle(paper).transform).a,
              paperFits: paper.getBoundingClientRect().left >= 0 && paper.getBoundingClientRect().right <= innerWidth && paper.getBoundingClientRect().top >= 0 && paper.getBoundingClientRect().bottom <= back.top,
              outerOverflow: document.documentElement.scrollWidth > innerWidth };
          });
          assert.ok(check.buttonHeight >= (viewport.width <= 900 || viewport.height <= 480 ? 36 : 44) && check.buttonVisible);
          assert.ok(check.scale > 0 && check.scale <= 1 && check.paperFits);
          assert.equal(check.outerOverflow, false);
          if (output) await page.screenshot({ path: path.join(output, `result-${language}-${pass ? 'pass' : 'fail'}-${viewport.width}.png`) });
          await page.locator('.FlipButton').tap();
          await page.locator('.ResultContent.state-score').waitFor();
          assert.equal(await page.locator('.ResultContent tbody tr').count(), 10);
          assert.ok((await page.locator('.ResultContent').innerText()).includes(language === 'ja' ? '勘所が使えるようになりましたね。' : 'You can now use Keen Instinct.'));
          const readable = await page.locator('.ResultContent').evaluate(content => {
            return { fontSize: parseFloat(getComputedStyle(content.querySelector('table')).fontSize),
              end: content.querySelector('tbody tr:last-child').getBoundingClientRect().bottom,
              bottom: content.getBoundingClientRect().bottom };
          });
          assert.ok(readable.fontSize >= 14 && readable.end <= readable.bottom + 1);
          assert.equal(await page.locator('.TrialResultScroll').evaluate(element => getComputedStyle(element).overflow), 'hidden');
          assert.equal(await page.locator('.ResultContent').evaluate(element => getComputedStyle(element).overflow), 'hidden');
          if (output) await page.screenshot({ path: path.join(output, `result-${language}-score-${viewport.width}.png`) });
          await page.locator('.FlipButton').tap();
          await page.locator('.ResultContent:not(.state-score)').waitFor();
          for (const scenario of ['wrap-fit', 'overflow']) {
            await page.evaluate(value => { window.phaseLongTable = value; }, scenario);
            await page.locator('.FlipButton').tap();
            await page.locator('.ResultContent.state-score').waitFor();
            const layout = await page.locator('.ResultContent').evaluate(content => {
              const body = content.querySelector('.ResultContentBody');
              const table = content.querySelector('table');
              const comment = table.querySelector('.AchievementTable__Comment');
              const range = document.createRange();
              range.selectNodeContents(comment);
              const bounds = content.getBoundingClientRect();
              const tableBounds = table.getBoundingClientRect();
              const style = getComputedStyle(content);
              return { wrapped: range.getClientRects().length > 1,
                scale: new DOMMatrix(getComputedStyle(body).transform).a,
                naturalHeight: body.scrollHeight,
                availableHeight: content.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom),
                fits: tableBounds.top >= bounds.top - 1 && tableBounds.bottom <= bounds.bottom + 1
                  && tableBounds.left >= bounds.left - 1 && tableBounds.right <= bounds.right + 1,
                rows: table.querySelectorAll('tbody tr').length,
                noScroll: getComputedStyle(content).overflow === 'hidden' };
            });
            assert.ok(layout.wrapped, `${language} ${scenario}: text must wrap`);
            assert.equal(layout.rows, 10);
            assert.ok(layout.fits && layout.noScroll, `${language} ${scenario}: entire table must remain visible`);
            if (scenario === 'wrap-fit') {
              assert.ok(layout.naturalHeight <= layout.availableHeight, JSON.stringify({ language, viewport, scenario, layout }));
              assert.equal(layout.scale, 1, 'wrapping that fits must not shrink');
            } else {
              assert.ok(layout.naturalHeight > layout.availableHeight);
              assert.ok(layout.scale > 0 && layout.scale < 1, 'overflow must shrink the whole body');
            }
            if (output) await page.screenshot({ path: path.join(output, `result-${language}-${scenario}-${pass ? 'pass' : 'fail'}-${viewport.width}.png`) });
            await page.locator('.FlipButton').tap();
            await page.locator('.ResultContent:not(.state-score)').waitFor();
          }
          await page.evaluate(() => { delete window.phaseLongTable; });
          await page.locator('.ReturnButton').tap();
          await page.waitForFunction(() => window.phaseResultClosed);
        }
      }
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, languages: ['ja', 'en'], viewports: 3, outcomes: 2, longTextScenarios: ['wrap-fit', 'overflow'], longTextChecks: 24, errors }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
