const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.argv[2] || 'playwright');
const output = process.argv[3];
const base = 'http://127.0.0.1:5173/CanWeBecomeHeroes/';

async function main() {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const page = await browser.newPage({ hasTouch: true });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base);
    await page.getByRole('button', { name: 'レコード', exact: true }).click();
    await page.locator('.RecordScreen__Empty').waitFor();
    assert.equal(await page.locator('[role=tab]').count(), 3);
    await page.getByRole('tab', { name: '課題記録', exact: true }).click();
    assert.equal(await page.locator('.RecordScreen__Empty').count(), 3);
    assert.equal(await page.locator('.RecordScreen__Tasks tbody tr').count(), 0);
    await page.getByRole('button', { name: 'タイトルへ戻る' }).click();

    // This browser has an isolated profile. Never edit the owner's saved game.
    await page.evaluate(async () => {
      const { default: Repository } = await import('./src/game/RunRecordsRepository.js');
      const { default: Statistics } = await import('./src/game/GameStatistics.js');
      const repository = new Repository({ getValue: () => undefined });
      const statistics = new Statistics();
      statistics.record({ type: 'run-start', mode: 'trial', heroIds: ['Avery', 'Briar'] });
      statistics.record({ type: 'stage-clear', kind: 'regular', patternIndex: 0, level: 25, clearedAt: '2026-10-16T01:00:00.000Z' });
      statistics.record({ type: 'stage-clear', kind: 'boss', patternIndex: 14, level: 40, clearedAt: '2026-10-16T01:00:00.000Z' });
      for (const kind of ['regular', 'elite', 'boss']) {
        for (let index = 1; index <= 7; index++) statistics.record({ type: 'stage-clear', kind,
          patternIndex: index, level: kind === 'boss' ? 35 : kind === 'elite' ? 10 : 20,
          clearedAt: `2026-10-${String(index + 1).padStart(2, '0')}T00:00:00.000Z` });
      }
      statistics.record({ type: 'hero-tags', heroId: 'Avery', counts: { valor: 7, arcane: 1, dexterity: 2, reputation: 3, blessing: 4, iron: 5, cloth: 6 } });
      repository.data.statistics = statistics.exportData();
      repository.data.rankings = Array.from({ length: 12 }, (_, index) => ({
        id: `check-${index}`, mode: 'trial', outcome: index === 0 ? 'expired' : 'cleared',
        remainingHours: index * 24, clearedStages: 20 + index, defeats: 120 - index,
        points: (index % 4) * 1000 + index, endedAt: new Date(2026, 9, index + 1).toISOString(),
        members: ['Avery', 'Briar', 'Casey', 'Darcy', 'Ellis', 'Finley', 'Garnet', 'Harper'].map(heroId => ({ heroId })),
      }));
      localStorage.setItem('can-we-become-heroes', JSON.stringify({ runRecords: repository.data }));
    });
    await page.reload();
    await page.getByRole('button', { name: 'レコード', exact: true }).click();
    const before = await page.evaluate(() => JSON.parse(localStorage.getItem('can-we-become-heroes')).runRecords);
    const checks = [];
    for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(viewport);
      if (viewport.width === 390) {
        await page.getByRole('tab', { name: '課題記録', exact: true }).tap();
        await page.getByRole('tab', { name: 'アチーブメント', exact: true }).tap();
      }
      for (const [name, column, expected] of [['残り期限', 2, '11'], ['討伐数', 3, '0'], ['獲得貢献ポイント', 4, '11']]) {
        await page.getByRole('tab', { name: '勇者認定試験ランキング' }).click();
        await page.locator('.RecordScreen__Selectors').getByRole('button', { name, exact: true }).click();
        assert.equal(await page.locator('.RecordScreen__Rankings tbody tr').count(), 10);
        assert.equal(await page.locator('.RecordScreen__Rankings thead th').count(), 7);
        assert.equal(await page.locator('.RecordScreen__Rankings time').count(), 10);
        const header = await page.locator('.RecordScreen__Rankings thead th[aria-sort]').evaluate(element => element.cellIndex);
        assert.equal(header, column);
        const src = await page.locator('.RecordScreen__Members img').first().getAttribute('src');
        assert.ok(src.endsWith('swoardfighter.png'));
        if (name === '討伐数') assert.ok((await page.locator('.RecordScreen__Rankings tbody tr').first().innerText()).includes('不合格'));
        const first = await page.locator('.RecordScreen__Rankings tbody tr').first().innerText();
        assert.ok(first.includes(String(20 + Number(expected))));
      }
      if (output) await page.screenshot({ path: path.join(output, `record-rankings-${viewport.width}.png`) });
      await page.locator('.RecordScreen__Portrait').first().tap();
      await page.locator('.RecordInformation .InformationWindow').waitFor();
      assert.equal(await page.locator('.RecordInformation .InformationWindow__Pin').count(), 0);
      assert.equal(await page.locator('.RecordInformation .InformationWindow__EntityProfile').count(), 1);
      assert.equal(await page.locator('.RecordInformation .InformationWindow__EntityStats').count(), 0);
      await page.getByRole('tab', { name: 'アチーブメント', exact: true }).click();
      assert.equal(await page.locator('.AchievementTable tbody tr').count(), 68);
      assert.equal(await page.locator('.AchievementTable thead th').count(), 5);
      assert.deepEqual((await page.locator('.AchievementTable__Grade').allTextContents()).slice(-10), ['S+', 'D', 'C', 'B', 'A', 'A+', 'S', 'E', 'E', 'E']);
      assert.equal(await page.locator('.AchievementTable__Progress').nth(59).innerText(), '1 / 2');
      assert.ok((await page.locator('.AchievementTable__Progress').last().innerText()).length);
      if (output) await page.screenshot({ path: path.join(output, `record-achievements-${viewport.width}.png`) });
      await page.getByRole('tab', { name: '課題記録', exact: true }).click();
      assert.equal(await page.locator('.RecordScreen__Tasks tbody tr').count(), 15);
      assert.equal(await page.locator('.RecordScreen__Tasks').count(), 3);
      assert.equal(await page.locator('.RecordScreen__Tasks time').count(), 15);
      assert.equal(await page.locator('.RecordScreen__Tasks').first().locator('thead th').count(), 3);
      assert.equal(await page.locator('.RecordScreen__Tasks').first().locator('tbody tr').count(), 5);
      assert.equal(await page.getByText('未クリアー', { exact: true }).count(), 0);
      assert.equal(await page.locator('.RecordScreen__Level').first().innerText(), 'Lv 25');
      if (output) await page.screenshot({ path: path.join(output, `record-tasks-${viewport.width}.png`) });
      assert.equal(await page.locator('.RecordScreen [title]').count(), 0);
      const scrollStyle = await page.locator('.RecordScreen__ScrollViewport').evaluate(element => ({
        color: getComputedStyle(element).scrollbarColor, width: getComputedStyle(element).scrollbarWidth,
      }));
      assert.notEqual(scrollStyle.color, 'auto');
      assert.equal(scrollStyle.width, 'thin');
      await page.locator('.CroppedEnemyLine__Slot[role="img"]').first().tap();
      await page.locator('.RecordInformation .InformationWindow').waitFor();
      assert.equal(await page.locator('.RecordInformation .InformationWindow__Pin').count(), 0);
      const informationBounds = await page.locator('.RecordInformation .InformationWindow').boundingBox();
      assert.ok(informationBounds.x >= 0 && informationBounds.x + informationBounds.width <= viewport.width + 1);
      await page.locator('.RecordInformation .InformationWindow__Close').tap();
      assert.equal(await page.locator('.RecordInformation .InformationWindow').count(), 0);
      const content = page.locator('.RecordScreen__ScrollViewport');
      await content.evaluate(element => { element.scrollTop = element.scrollHeight; });
      const layout = await page.locator('.RecordScreen').evaluate(element => {
        const host = element.parentElement.getBoundingClientRect();
        const rect = element.getBoundingClientRect();
        const content = element.querySelector('.RecordScreen__ScrollViewport').getBoundingClientRect();
        return { widthError: Math.abs(rect.width - host.width), heightError: Math.abs(rect.height - host.height),
          scale: new DOMMatrix(getComputedStyle(element.querySelector('.RecordScreen__Content')).transform).a,
          buttonHeight: element.querySelector('header button').getBoundingClientRect().height,
          lastRowBottom: element.querySelector('.RecordScreen__Tasks:last-child tbody tr:last-child').getBoundingClientRect().bottom,
          contentBottom: content.bottom };
      });
      assert.ok(layout.widthError < 1 && layout.heightError < 1);
      assert.ok(layout.scale >= .75 && layout.scale <= 1);
      assert.ok(layout.buttonHeight >= (viewport.width <= 900 || viewport.height <= 480 ? 36 : 44));
      assert.ok(layout.lastRowBottom <= layout.contentBottom + 1);
      assert.equal(await page.locator('.RecordScreen__Level').last().innerText(), 'Lv 35');
      assert.equal(await page.locator('.RecordScreen__Tasks').last().locator('tbody tr').first().locator('.CroppedEnemyLine__Image').count(), 3);
      const geometry = await page.locator('.RecordScreen').evaluate(element => {
        const back = element.querySelector('header button').getBoundingClientRect();
        return { pageOverflow: document.documentElement.scrollWidth > innerWidth, backVisible: back.top >= 0 && back.bottom <= innerHeight };
      });
      assert.deepEqual(geometry, { pageOverflow: false, backVisible: true });
      await page.locator('.CroppedEnemyLine__Slot[role="img"]').last().tap();
      await page.locator('.RecordInformation .InformationWindow').waitFor();
      await page.getByRole('button', { name: 'タイトルへ戻る' }).click();
      assert.equal(await page.locator('.RecordInformation').count(), 0);
      await page.getByRole('button', { name: 'レコード', exact: true }).click();
      checks.push(viewport);
    }
    await page.locator('#language-selector').selectOption('en', { force: true });
    await page.getByRole('tab', { name: 'Achievements', exact: true }).click();
    assert.equal(await page.locator('.AchievementTable thead th').nth(3).innerText(), 'Criteria');
    await page.getByRole('tab', { name: 'Task records', exact: true }).click();
    assert.equal(await page.getByText('Not cleared', { exact: true }).count(), 0);
    for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(viewport);
      for (const name of ['Hero exam rankings', 'Achievements', 'Task records']) {
        await page.getByRole('tab', { name, exact: true }).click();
        const back = await page.getByRole('button', { name: 'Return to Title', exact: true }).boundingBox();
        assert.ok(back.y >= 0 && back.y + back.height <= viewport.height);
      }
    }
    await page.getByRole('button', { name: 'Return to Title', exact: true }).click();
    const after = await page.evaluate(() => JSON.parse(localStorage.getItem('can-we-become-heroes')).runRecords);
    assert.deepEqual(after, before);
    await page.evaluate(async () => {
      const { default: RecordInformation } = await import('./src/app/RecordInformation.js');
      const { default: TextRepository } = await import('./src/game/GameTextRepository.js');
      const texts = await new TextRepository().load();
      const getDetail = texts.getInformationDetail.bind(texts);
      texts.getInformationDetail = (kind, id) => {
        const detail = getDetail(kind, id);
        return kind === 'hero' ? { ...detail, description: [{ type: 'tag', id: 'valor' }] } : detail;
      };
      window.phaseInformation = new RecordInformation(texts, null);
      window.phaseInformation.open('hero', 'Avery', { clientX: 100, clientY: 100 });
    });
    await page.locator('.RecordInformation .InformationWindow__InlineReference').first().tap();
    assert.equal(await page.locator('.RecordInformation .InformationWindow').count(), 2);
    assert.equal(await page.locator('.RecordInformation .InformationWindow__Pin').count(), 0);
    await page.evaluate(() => { window.phaseInformation.dispose(); delete window.phaseInformation; });
    await page.evaluate(async () => {
      const { default: RecordScreen } = await import('./src/app/RecordScreen.js');
      const { default: Repository } = await import('./src/game/RunRecordsRepository.js');
      const { default: TextRepository } = await import('./src/game/GameTextRepository.js');
      const repository = new Repository({ getValue: () => undefined, setValue() { throw new Error('Unexpected record write'); } });
      const host = document.createElement('div');
      document.body.append(host);
      const view = new RecordScreen(host, { repository, textRepository: await new TextRepository().load(), assets: null, onClose() {} });
      view.open();
      if (!host.querySelector('.RecordScreen__Empty')) throw new Error('Missing empty ranking');
      view.close();
      repository.data.rankings.push({ id: 'new', mode: 'trial', outcome: 'cleared', remainingHours: 48,
        clearedStages: 35, defeats: 123, points: 456, endedAt: new Date().toISOString(), members: [] });
      view.open();
      if (!host.querySelector('tbody').textContent.includes('456')) throw new Error('Reopen did not read the latest data');
      view.close();
      host.remove();
    });
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, checks, errors, nonDestructive: true }));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
