import { build, preview } from 'vite';
import { chromium } from 'playwright';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import { dirname } from 'node:path';
import { performanceBuildPlugin, installPerformanceProbe } from './lib/PerformanceBuild.js';

const duration = Number(process.env.PERF_SECONDS ?? 30);
const repeats = Number(process.env.PERF_REPEATS ?? 3);
const warmup = Number(process.env.PERF_WARMUP ?? 5);
const output = process.env.PERF_OUTPUT ?? 'tmp_performance/results.json';
const cases = [
  { name: 'title-dpr3', scene: 'title' },
  { name: 'selection-dpr3', scene: 'selection' },
  { name: 'idle-dpr3', scene: 'idle' },
  { name: 'idle-original-images', scene: 'idle', originalImages: true },
  { name: 'idle-dpr1', scene: 'idle', dpr: 1 },
  { name: 'idle-desktop', scene: 'idle', dpr: 1, width: 1280, height: 900 },
  { name: 'idle-no-background', scene: 'idle', skip: ['background'] },
  { name: 'idle-no-chips', scene: 'idle', skip: ['ChipRenderer.drawBody', 'ChipRenderer.drawEffects'] },
  { name: 'idle-paused', scene: 'idle', paused: true },
  { name: 'idle-no-probe', scene: 'idle', measured: false },
  { name: 'idle-normal-build', scene: 'idle', normal: true },
  { name: 'idle-cpu4', scene: 'idle', cpu: 4 },
  { name: 'idle-cpu4-dpr1', scene: 'idle', cpu: 4, dpr: 1 },
  { name: 'idle-cpu4-no-labels', scene: 'idle', cpu: 4, skip: ['drawFacilityNameplates', 'drawAreaNameplates'] },
  { name: 'idle-cpu4-no-shop', scene: 'idle', cpu: 4, skip: ['drawShopPanel'] },
  { name: 'idle-cpu4-no-status', scene: 'idle', cpu: 4, skip: ['TimeSettingsController.updateStatus'] },
  { name: 'idle-cpu4-no-probe', scene: 'idle', cpu: 4, measured: false },
  { name: 'idle-cpu4-normal-build', scene: 'idle', cpu: 4, normal: true },
  { name: 'idle-speed4', scene: 'idle', speedLog: 2 },
  { name: 'warehouse-full', scene: 'idle', full: true },
  { name: 'warehouse-full-paused', scene: 'idle', full: true, paused: true },
  { name: 'warehouse-full-no-overlaps', scene: 'idle', full: true, skip: ['ChipBoard.resolveGroundOverlaps'] },
  { name: 'information', scene: 'idle', information: true },
  { name: 'information-cpu4', scene: 'idle', information: true, cpu: 4 },
  { name: 'information-no-refresh', scene: 'idle', information: true, cpu: 4, skip: ['InformationWindowManager.refreshDynamicEntries'] },
  { name: 'information-small-icons', scene: 'idle', information: true, cpu: 4, smallIcons: true },
  { name: 'information-paired', scene: 'idle', information: true, cpu: 4, paired: true },
  { name: 'idle-no-labels', scene: 'idle', skip: ['drawFacilityNameplates', 'drawAreaNameplates'] },
  { name: 'idle-no-shop', scene: 'idle', skip: ['drawShopPanel'] },
  { name: 'idle-small-icons', scene: 'idle', smallIcons: true },
  { name: 'idle-cpu4-small-icons', scene: 'idle', cpu: 4, smallIcons: true },
  { name: 'warehouse-full-small-icons', scene: 'idle', full: true, smallIcons: true },
  { name: 'battle', scene: 'battle' },
  { name: 'battle-speed4', scene: 'battle', speedLog: 2 },
  { name: 'drag-zoom', scene: 'idle', interactions: true },
];
const requested = process.argv.slice(2);
if (requested.includes('--list')) { console.log(cases.map(c => c.name).join('\n')); process.exit(0); }
const selected = requested.length ? cases.filter(c => requested.includes(c.name)) : cases;
if (!selected.length || requested.some(name => !cases.some(c => c.name === name))) throw new Error('Unknown performance case');
if (![duration, warmup].every(n => Number.isFinite(n) && n > 0) || !Number.isInteger(repeats) || repeats < 1) throw new Error('Invalid measurement duration/repeats/warmup');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const report = {
  environment: { date: new Date().toISOString(), commit: git('rev-parse', 'HEAD'), diff: git('diff', '--stat'),
    commonCommit: git('-C', '../GameWorksOAK', 'rev-parse', 'HEAD'), commonDiff: git('-C', '../GameWorksOAK', 'diff', '--stat'),
    version: JSON.parse(await readFile('package.json', 'utf8')).version, os: `${os.type()} ${os.release()}`, cpu: os.cpus()[0].model,
    logicalCPUs: os.cpus().length, memoryGiB: os.totalmem() / 1024 ** 3, duration, repeats, warmup, headless: true }, cases: [],
};
const tutorials = JSON.parse(await readFile('public/data/text/tutorial.json', 'utf8')).scenarios.map(s => s.id).filter(Boolean);
const servers = [];
let browser;
function stats(values) {
  const sorted = values.toSorted((a, b) => a - b);
  if (!sorted.length) return null;
  return { n: sorted.length, mean: sorted.reduce((a, b) => a + b, 0) / sorted.length,
    p50: sorted[Math.floor((sorted.length - 1) * .5)], p95: sorted[Math.floor((sorted.length - 1) * .95)],
    p99: sorted[Math.floor((sorted.length - 1) * .99)], max: sorted.at(-1) };
}
async function save() {
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2));
}
try {
  await build({ build: { outDir: 'tmp_performance_dist' }, plugins: [performanceBuildPlugin()] });
  servers.push(await preview({ build: { outDir: 'tmp_performance_dist' }, preview: { host: '127.0.0.1', port: 4186, strictPort: true, open: false } }));
  if (selected.some(c => c.originalImages)) {
    await build({ build: { outDir: 'tmp_performance_original_dist' }, plugins: [performanceBuildPlugin(), {
      name: 'local-original-image-comparison', enforce: 'pre',
      transform(code, id) {
        if (!id.replaceAll('\\', '/').endsWith('/src/chips/ScaledImage.js')) return;
        const marker = 'export const IMAGE_LEVELS_ENABLED = true;';
        if (code.split(marker).length !== 2) throw new Error('Original image comparison marker changed');
        return code.replace(marker, 'export const IMAGE_LEVELS_ENABLED = false;');
      },
    }] });
    servers.push(await preview({ build: { outDir: 'tmp_performance_original_dist' }, preview: { host: '127.0.0.1', port: 4190, strictPort: true, open: false } }));
  }
  if (selected.some(c => c.normal)) {
    await build();
    servers.push(await preview({ preview: { host: '127.0.0.1', port: 4187, strictPort: true, open: false } }));
  }
  browser = await chromium.launch({ headless: true, channel: process.env.PERF_CHANNEL ?? 'chrome' });
  report.environment.channel = process.env.PERF_CHANNEL ?? 'chrome';
  report.environment.browser = browser.version();
  for (const config of selected) {
    const condition = { ...config, dpr: config.dpr ?? 3, width: config.width ?? 390, height: config.height ?? 844, runs: [] };
    for (let repeat = 0; repeat < repeats; repeat++) {
      const context = await browser.newContext({ viewport: { width: condition.width, height: condition.height }, deviceScaleFactor: condition.dpr });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      await page.addInitScript(installPerformanceProbe);
      await page.addInitScript(({ tutorials, speedLog, normal }) => {
        localStorage.setItem('can-we-become-heroes', JSON.stringify({ tutorialState: { completed: tutorials },
          timeSettings: { speedLog, acceleratedSpeedLog: 2, pauseOnInformation: false, pauseOnStaminaFull: false, accelerateWithoutPreparation: false } }));
        if (normal) {
          const sample = time => { __perf.begin(time); __perf.endFrame(); requestAnimationFrame(sample); };
          requestAnimationFrame(sample);
        }
      }, { tutorials, speedLog: config.speedLog ?? 0, normal: Boolean(config.normal) });
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: config.cpu ?? 1 });
      await cdp.send('Performance.enable');
      const start = Date.now();
      await page.goto(`http://127.0.0.1:${config.originalImages ? 4190 : config.normal ? 4187 : 4186}/CanWeBecomeHeroes/`);
      await page.locator('.TitleMenu__Command.state-primary').waitFor();
      const titleReadyMs = Date.now() - start;
      if (config.scene !== 'title') {
        await page.locator('.TitleMenu__Command.state-primary').click();
        await page.locator('.StartPartySelection__StartButton').click();
        await page.locator('.VignetteModal__Skip').click();
        await page.locator('.StageSelection__SelectButton').first().waitFor();
        if (config.scene !== 'selection') {
          await page.locator('.StageSelection__SelectButton').first().click();
          await page.locator('#stage-selection').waitFor({ state: 'hidden' });
        }
      }
      if (!config.normal && config.scene !== 'title') {
        await page.evaluate(config => {
          const s = __session;
          if (config.full) {
            while (s.controller.addToWarehouse(s.makeItem())) { /* respect real capacity */ }
          }
          if (config.information) s.informationWindows.open({ type: 'instance', data: { target: s.informationWindows.createInstanceTarget(s.controller.getHeroes()[0]) }, anchor: { x: 180, y: 200 } });
          if (config.scene === 'battle') {
            const hero = s.controller.getHeroes()[0];
            hero.stamina = 3;
            const weapon = s.controller.addToWarehouse(s.makeItem());
            s.controller.beginSelection(hero);
            if (!s.controller.completeSelectionAt(weapon.chip.x, weapon.chip.y, weapon)) throw new Error('Battle fixture could not send hero');
          }
        }, config);
      }
      await page.waitForTimeout(warmup * 1000);
      if (config.smallIcons) await page.evaluate(async () => {
        for (const [path, image] of __session.assets.images) {
          if (!/\/assets\/(tags|status)\//.test(path) || !image.complete || !image.naturalWidth) continue;
          const scaled = document.createElement('canvas'); scaled.width = scaled.height = 128;
          scaled.getContext('2d').drawImage(image, 0, 0, 128, 128);
          const decoded = new Image(); decoded.src = scaled.toDataURL(); await decoded.decode();
          __session.assets.images.set(path, decoded);
        }
      });
      if (!config.normal) await page.evaluate(config => { __perf.skip = new Set(config.skip ?? []); if (globalThis.__session && config.paused) __session.clock.paused = true; }, config);
      const metadata = await page.evaluate(() => {
        const gl = document.createElement('canvas').getContext('webgl');
        const ext = gl?.getExtension('WEBGL_debug_renderer_info');
        const images = globalThis.__session ? [...__session.assets.images].map(([path, image]) =>
          ({ path, width: image.naturalWidth, height: image.naturalHeight, ready: image.complete })) : [];
        return { userAgent: navigator.userAgent, visibility: document.visibilityState,
          renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null,
          images: globalThis.__session ? { count: images.length, incomplete: images.filter(i => !i.ready).length,
            rgbaBytesEstimate: images.reduce((sum, i) => sum + i.width * i.height * 4, 0), resources: images } : null,
          canvases: [...document.querySelectorAll('canvas')].map(c => ({ id: c.id, width: c.width, height: c.height })),
          session: globalThis.__session ? { chips: __session.board.chips.length, heroes: __session.controller.getHeroes().length,
            enemies: __session.controller.getEnemies().length, speed: __session.clock.speed, paused: __session.clock.isPaused, stage: __session.stageController.state } : null };
      });
      await page.evaluate(enabled => __perf.reset(enabled), config.measured !== false);
      const before = await cdp.send('Performance.getMetrics');
      if (process.env.PERF_PROFILE === '1') {
        await cdp.send('Profiler.enable'); await cdp.send('Profiler.start');
      }
      if (config.paired) {
        for (const phase of ['A1', 'B', 'A2']) {
          await page.evaluate(phase => { __perf.phase = phase;
            if (phase === 'B') __perf.skip.add('InformationWindowManager.refreshDynamicEntries');
            else __perf.skip.delete('InformationWindowManager.refreshDynamicEntries');
          }, phase);
          await page.waitForTimeout(duration * 1000 / 3);
        }
      } else if (config.interactions) {
        const finish = Date.now() + duration * 1000;
        while (Date.now() < finish) {
          await page.mouse.move(150, 350); await page.mouse.down(); await page.mouse.move(220, 450, { steps: 8 }); await page.mouse.up();
          await page.mouse.wheel(0, -100); await page.waitForTimeout(200); await page.mouse.wheel(0, 100); await page.waitForTimeout(200);
        }
      } else await page.waitForTimeout(duration * 1000);
      const after = await cdp.send('Performance.getMetrics');
      if (process.env.PERF_PROFILE === '1') {
        const { profile } = await cdp.send('Profiler.stop');
        await mkdir('tmp_performance', { recursive: true });
        await writeFile(`tmp_performance/${config.name}-${repeat}.cpuprofile`, JSON.stringify(profile));
      }
      const browserMetrics = Object.fromEntries(after.metrics.map(({ name, value }) => [name,
        { end: value, delta: value - before.metrics.find(m => m.name === name).value }]));
      const samples = await page.evaluate(() => { __perf.recording = false; return { intervals: __perf.intervals, rows: __perf.rows, totals: __perf.totals }; });
      const metrics = Object.fromEntries([...new Set(samples.rows.flatMap(Object.keys))].filter(k => !['stage', 'paused', 'phase'].includes(k))
        .map(k => [k, stats(samples.rows.map(r => r[k] ?? 0))]));
      const phaseMetrics = config.paired ? Object.fromEntries(['A1', 'B', 'A2'].map(phase => {
        const indices = samples.rows.map((row, index) => row.phase === phase ? index : -1).filter(i => i >= 0);
        const rows = indices.map(i => samples.rows[i]);
        const intervals = indices.slice(2).map(i => samples.intervals[i - 1]).filter(Number.isFinite);
        return [phase, { main: stats(rows.map(r => r.main)),
          information: stats(rows.map(r => r['InformationWindowManager.refreshDynamicEntries'] ?? 0)), intervals: stats(intervals) }];
      })) : undefined;
      const run = { repeat, titleReadyMs, metadata, errors, browserMetrics, intervals: stats(samples.intervals),
        over33: samples.intervals.filter(x => x > 33.333).length / samples.intervals.length,
        over50: samples.intervals.filter(x => x > 50).length / samples.intervals.length,
        metrics, phaseMetrics, stageStates: [...new Set(samples.rows.map(r => r.stage))], samples };
      condition.runs.push(run);
      console.log(JSON.stringify({ case: config.name, repeat, main: metrics.main?.mean, p95: run.intervals?.p95, over50: run.over50, errors, session: metadata.session }));
      await context.close();
      // Save after each repetition, including an interrupted condition.
      report.cases = [...report.cases.filter(c => c.name !== config.name), condition];
      await save();
    }
  }
} finally {
  await browser?.close();
  for (const server of servers) await new Promise(resolve => server.httpServer.close(resolve));
}
