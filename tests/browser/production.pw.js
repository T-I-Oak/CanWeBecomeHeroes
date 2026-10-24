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
  expect(assets.some(url => url.includes('MobilePerformance'))).toBe(false);
  expect(failures).toEqual([]);
});

test('normal mobile build keeps records above the animated title across viewport rotations', async ({ page }) => {
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:4175/CanWeBecomeHeroes/');
  await expect(page.locator('.TitleMenu__Command.state-primary')).toBeVisible();
  await expect(page.locator('.TitleMenu__Version')).toHaveText(`v${version}`);
  await expect(page.locator('.PerformancePanel')).toHaveCount(0);
  await page.locator('.TitleMenu__Command').last().click();
  const screen = page.locator('.RecordScreen');
  const tabs = screen.getByRole('tab');
  for (const viewport of [
    { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 390, height: 844 },
    { width: 768, height: 1024 }, { width: 1024, height: 768 }, { width: 768, height: 1024 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(screen).toBeVisible();
    await expect.poll(() => page.locator('.TitleMenu__Chips').evaluate(canvas => ({
      width: canvas.width, height: canvas.height,
    }))).toEqual({ width: viewport.width, height: viewport.height });
    await expect.poll(() => screen.evaluate(element => {
      const { left, top, width, height } = element.getBoundingClientRect();
      return [[.1, .1], [.5, .5], [.9, .9]].every(([x, y]) =>
        element.contains(document.elementFromPoint(left + width * x, top + height * y)));
    })).toBe(true);
    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    const scroll = screen.locator('.RecordScreen__ScrollViewport');
    await scroll.evaluate(element => { element.scrollTo(element.scrollWidth, element.scrollHeight); });
    await expect.poll(() => scroll.evaluate(element => ({
      horizontal: element.scrollWidth > element.clientWidth ? element.scrollLeft > 0 : true,
      vertical: element.scrollTop > 0,
    }))).toEqual({ horizontal: true, vertical: true });
    await tabs.nth(2).click();
    await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true');
    await tabs.nth(0).click();
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
    await page.screenshot({ path: `tmp_record_rotation/${viewport.width}x${viewport.height}.png` });
  }
  await screen.locator('.RecordScreen__Header button').click();
  await expect(screen).toHaveCount(0);
  await expect(page.locator('.TitleMenu__Logo')).toBeVisible();
  const canvas = page.locator('.TitleMenu__Chips');
  const frame = await canvas.evaluate(element => element.toDataURL());
  await expect.poll(() => canvas.evaluate(element => element.toDataURL())).not.toBe(frame);
  await page.locator('.TitleMenu__Command').last().click();
  await expect(screen).toBeVisible();
  await screen.locator('.RecordScreen__Header button').click();
  await page.locator('.TitleMenu__Command.state-primary').click();
  await expect(page.locator('.StartPartySelection__StartButton')).toBeVisible();
  await expect(page.locator('.PerformancePanel')).toHaveCount(0);
  expect(failures).toEqual([]);
});
