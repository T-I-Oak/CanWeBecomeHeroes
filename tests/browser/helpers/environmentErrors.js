import { expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const base = 'http://127.0.0.1:4175/CanWeBecomeHeroes/';
const tutorial = JSON.parse(readFileSync(new URL('../../../public/data/text/tutorial.json', import.meta.url), 'utf8'));

export async function verifyStartupRecovery(browser) {
  for (const [name, pattern, contentType, body] of [
    ['json', '**/data/text/ui.json', 'application/json', '{}'],
    ['image', '**/assets/logo.png', 'image/png', ''],
    ['script', '**/assets/index-*.js', 'text/javascript', ''],
    ['stylesheet', '**/assets/index-*.css', 'text/css', ''],
  ]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    try {
      const page = await context.newPage();
      await page.route(pattern, route => route.fulfill({ status: 503, contentType, body }));
      await page.goto(base);
      await expect(page.locator('#startup-error')).toBeVisible();
      await expect(page.locator('#startup-error p')).toHaveText('Failed to load game data.');
      await expect(page.locator('.AppShell')).toBeHidden();
      await page.screenshot({ path: `tmp_audit_startup_${name}.png` });
      await page.unroute(pattern);
      await page.locator('#startup-retry').click();
      await expect(page.locator('.TitleMenu__Command.state-primary')).toBeVisible();
      await expect(page.locator('#startup-error')).toBeHidden();
    } finally { await context.close(); }
  }
  const context = await browser.newContext();
  try {
    await context.addInitScript(() => {
      const get = Storage.prototype.getItem;
      Storage.prototype.getItem = function (key) {
        if (key === 'can-we-become-heroes' && !sessionStorage.getItem('allow-storage')) throw new DOMException('blocked', 'SecurityError');
        return get.call(this, key);
      };
    });
    const page = await context.newPage();
    await page.goto(base);
    await expect(page.locator('#startup-error')).toBeVisible();
    await page.evaluate(() => sessionStorage.setItem('allow-storage', 'true'));
    await page.locator('#startup-retry').click();
    await expect(page.locator('.TitleMenu__Command.state-primary')).toBeVisible();
  } finally { await context.close(); }
}

export async function verifyRecordSaveNotice(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  try {
    await context.addInitScript(completed => {
      localStorage.setItem('can-we-become-heroes', JSON.stringify({ tutorialState: { completed } }));
    }, tutorial.scenarios.filter(s => s.id).map(s => s.id));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base);
    await page.locator('.TitleMenu__Command.state-primary').click();
    await page.locator('.StartPartySelection__StartButton').click();
    await page.locator('.VignetteModal__Skip').click();
    await expect(page.locator('#stage-selection')).toBeVisible();
    await page.evaluate(() => {
      const set = Storage.prototype.setItem;
      window.allowRecordSave = false;
      Storage.prototype.setItem = function (key, value) {
        if (key === 'can-we-become-heroes' && !window.allowRecordSave) throw new DOMException('full', 'QuotaExceededError');
        return set.call(this, key, value);
      };
    });
    await page.locator('.StageSelection__SelectButton').first().click();
    const notice = page.locator('#record-save-notice');
    await expect(notice).toBeVisible();
    await expect(notice).toContainText('記録を保存できませんでした。');
    await notice.locator('button').click();
    await expect(notice).toBeVisible();
    await page.locator('#time-settings-toggle').click();
    await page.locator('#settings-section-language .ModalSelect__Trigger').click();
    await page.locator('#settings-section-language .ModalSelect__Option').filter({ hasText: 'English' }).click();
    await expect(notice).toContainText('Your records could not be saved.');
    for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(viewport);
      await expect.poll(async () => {
        const close = await page.locator('#time-settings-close').boundingBox();
        const banner = await notice.boundingBox();
        return close && banner && close.y + close.height <= banner.y;
      }).toBe(true);
      await page.screenshot({ path: `tmp_audit_save_${viewport.width}.png` });
    }
    await page.evaluate(() => { window.allowRecordSave = true; });
    await notice.locator('button').click();
    await expect(notice).toBeHidden();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('can-we-become-heroes')).runRecords);
    expect(saved.statistics.runs.trial['Avery|Briar'].started).toBe(1);
    expect(saved.summary.completed).toBe(0);
    expect(saved.history).toHaveLength(0);
    expect(errors).toEqual([]);
  } finally { await context.close(); }
}
