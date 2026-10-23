import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

test('production base path loads bundled common library, text and image assets', async ({ page }) => {
  const failures = [];
  const assets = [];
  page.on('pageerror', error => failures.push(error.message));
  page.on('console', message => { if (message.type() === 'error') failures.push(message.text()); });
  page.on('requestfailed', request => failures.push(request.url()));
  page.on('response', response => {
    if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
    assets.push(response.url());
  });
  await page.goto('http://127.0.0.1:4175/CanWeBecomeHeroes/');
  await expect(page.locator('.TitleMenu__Command.state-primary')).toBeVisible();
  await expect(page.locator('.TitleMenu__Version')).toHaveText(`v${version}`);
  await page.locator('.TitleMenu__Command.state-primary').click();
  await page.locator('.StartPartySelection__StartButton').click();
  await expect(page.locator('#vignette')).toBeVisible();
  await page.locator('.VignetteModal__Skip').click();
  await expect(page.locator('#stage-selection')).toBeVisible();
  await page.waitForLoadState('networkidle');
  await expect.poll(() => page.evaluate(() => [...document.images].every(img => img.complete && img.naturalWidth > 0))).toBe(true);
  expect(assets.some(url => /\/CanWeBecomeHeroes\/assets\/index-.*\.js/.test(url))).toBe(true);
  expect(assets.some(url => url.includes('/CanWeBecomeHeroes/data/text/ui.json'))).toBe(true);
  expect(assets.some(url => url.includes('/CanWeBecomeHeroes/assets/logo.png'))).toBe(true);
  expect(assets.some(url => url.includes('/GameWorksOAK/src/'))).toBe(false);
  expect(assets.some(url => url.includes('MobilePerformance'))).toBe(true);
  expect(failures).toEqual([]);
});

test('measurement build opens its panel at the normal URL without blocking startup', async ({ page }) => {
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:4175/CanWeBecomeHeroes/');
  await expect(page.locator('.TitleMenu__Command.state-primary')).toBeVisible();
  await expect(page.locator('.PerformancePanel summary')).toHaveText(`性能測定 v${version}`);
  await page.locator('[data-action="start"]').click();
  await expect(page.locator('[data-status]')).toContainText('通常画面');
  await expect(page.locator('[data-action="save"]')).toBeDisabled();
  expect(failures).toEqual([]);
});
