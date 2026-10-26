import { build, createLogger } from 'vite';
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { resolve, relative, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
import { startupBuildPlugin, STARTUP_CANDIDATES } from './lib/StartupLoadingBuild.js';
import { summarizeTrace, summarizeResources, traceBetweenMarks } from './lib/StartupLoadingMetrics.js';

const candidates = process.argv.slice(2);
if (candidates.includes('--list')) { console.log(['normal', ...STARTUP_CANDIDATES].join('\n')); process.exit(0); }
const buildOnly = candidates.includes('--build-only');
if (buildOnly) candidates.splice(candidates.indexOf('--build-only'), 1);
if (!candidates.length) candidates.push('normal', ...STARTUP_CANDIDATES);
for (const candidate of candidates) if (!['normal', ...STARTUP_CANDIDATES].includes(candidate)) throw new Error(`Unknown candidate: ${candidate}`);
const repeats = Number(process.env.STARTUP_REPEATS ?? 3);
if (!Number.isInteger(repeats) || repeats < 1) throw new Error('STARTUP_REPEATS must be a positive integer');
const actions = process.env.STARTUP_ACTIONS?.split(',') ?? ['records', 'trial', 'challenge'];
if (!actions.length || actions.some(action => !['records', 'trial', 'challenge'].includes(action))) throw new Error('Invalid STARTUP_ACTIONS');
const output = resolve(process.env.STARTUP_OUTPUT ?? 'tmp_startup_loading');
if (!relative(process.cwd(), output).split(sep)[0].startsWith('tmp_') || relative(process.cwd(), output).startsWith('..')) throw new Error('Output must be within a repository tmp_ directory');
await mkdir(output, { recursive: true });
const tutorials = JSON.parse(readFileSync('public/data/text/tutorial.json', 'utf8')).scenarios.map(scenario => scenario.id).filter(Boolean);
const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
const settings = { viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1, cpuRate: 4, latency: 40,
  downloadThroughput: 20 * 1024 * 1024 / 8, uploadThroughput: 10 * 1024 * 1024 / 8, compression: 'none', repeats,
  tracing: process.env.STARTUP_TRACE !== '0', actions,
  storage: 'ja; trial cleared to expose challenge; all tutorial scenarios completed; seed 54', cache: 'cold context then reload in same context; fresh storage on each navigation' };
const results = { version, started: new Date().toISOString(), settings, builds: {}, runs: [] };
const save = () => writeFile(resolve(output, 'results.json'), JSON.stringify(results, null, 2));

function bundleStats(bundle) {
  const chunks = bundle.output.filter(item => item.type === 'chunk');
  const entry = chunks.find(chunk => chunk.isEntry);
  const closure = new Set();
  function visit(name) { if (closure.has(name)) return; closure.add(name); chunks.find(chunk => chunk.fileName === name).imports.forEach(visit); }
  visit(entry.fileName);
  return { entry: entry.fileName, initialBytes: chunks.filter(chunk => closure.has(chunk.fileName)).reduce((sum, chunk) => sum + Buffer.byteLength(chunk.code), 0),
    initialGzipBytes: chunks.filter(chunk => closure.has(chunk.fileName)).reduce((sum, chunk) => sum + gzipSync(chunk.code).length, 0),
    totalBytes: chunks.reduce((sum, chunk) => sum + Buffer.byteLength(chunk.code), 0),
    chunks: chunks.map(chunk => ({ name: chunk.fileName, initial: closure.has(chunk.fileName), bytes: Buffer.byteLength(chunk.code), gzipBytes: gzipSync(chunk.code).length,
      imports: chunk.imports, dynamicImports: chunk.dynamicImports,
      modules: Object.entries(chunk.modules).map(([path, info]) => ({ path: relative(process.cwd(), path).replaceAll('\\', '/'), renderedLength: info.renderedLength })) })) };
}

async function serve(directory) {
  const types = { js: 'text/javascript', css: 'text/css', json: 'application/json', png: 'image/png', html: 'text/html', svg: 'image/svg+xml' };
  const server = createServer(async (request, response) => {
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const suffix = path.replace(/^\/CanWeBecomeHeroes\//, '') || 'index.html';
    const file = resolve(directory, suffix);
    if (!path.startsWith('/CanWeBecomeHeroes/') || relative(directory, file).startsWith('..')) { response.writeHead(404); response.end(); return; }
    try {
      const data = await readFile(file);
      response.writeHead(200, { 'Content-Type': types[file.split('.').pop()] ?? 'application/octet-stream', 'Content-Length': data.length, 'Cache-Control': 'public, max-age=3600' });
      response.end(data);
    } catch (error) { response.writeHead(error.code === 'ENOENT' ? 404 : 500); response.end(String(error)); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(4188, '127.0.0.1', resolve); });
  return server;
}

async function stopTrace(cdp) {
  const completed = new Promise(resolve => cdp.once('Tracing.tracingComplete', resolve));
  await cdp.send('Tracing.end');
  const { stream } = await completed;
  let data = '';
  while (true) { const part = await cdp.send('IO.read', { handle: stream }); data += part.data; if (part.eof) break; }
  await cdp.send('IO.close', { handle: stream });
  return JSON.parse(data);
}

async function navigateAndMeasure(page, cdp, candidate, action, timing, cache, repeat) {
  const failures = [];
  const onError = error => failures.push(String(error));
  const onResponse = response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); };
  const onConsole = message => { if (message.type() === 'error') failures.push(message.text()); };
  page.on('pageerror', onError); page.on('requestfailed', onError); page.on('response', onResponse); page.on('console', onConsole);
  if (settings.tracing) await cdp.send('Tracing.start', { categories: 'devtools.timeline,v8,blink.user_timing,disabled-by-default-v8.compile', transferMode: 'ReturnAsStream' });
  let trace;
  try {
    await page.goto('http://127.0.0.1:4188/CanWeBecomeHeroes/', { waitUntil: 'commit' });
    await page.waitForFunction(() => performance.getEntriesByName('startup:title-ready').length > 0);
    if (timing === 'settled') {
      await page.waitForFunction(() => performance.getEntriesByName('startup:prefetch-end').length > 0);
      await page.waitForLoadState('networkidle');
    }
    // Immediate inputs are dispatched by the init-script observer, before automation round trips.
    if (action === 'records') {
      await page.locator('.RecordScreen [role="tab"]').first().waitFor({ state: 'visible' });
    } else {
      await page.locator('.StartPartySelection__StartButton').waitFor({ state: 'visible' });
    }
    await page.evaluate(() => performance.mark('startup:action-observed'));
    const initial = await page.evaluate(() => ({ marks: performance.getEntriesByType('mark').map(({ name, startTime }) => ({ name, startTime })),
      resources: [...performance.getEntriesByType('navigation'), ...performance.getEntriesByType('resource')].map(resource => resource.toJSON()) }));
    trace = settings.tracing ? await stopTrace(cdp) : null;
    const stem = `${candidate}-${action}-${timing}-${repeat}-${cache}`;
    if (trace) await writeFile(resolve(output, `${stem}.trace.json`), JSON.stringify(trace));
    const marks = Object.fromEntries(initial.marks.map(mark => [mark.name, mark.startTime]));
    const run = { candidate, action, timing, repeat, cache, titleMs: marks['startup:title-ready'],
      actionMs: marks['startup:target-ready'] - marks['startup:action-input'],
      actionObservedMs: marks['startup:action-observed'] - marks['startup:action-input'], marks: initial.marks,
      startupResources: summarizeResources(initial.resources, marks['startup:title-ready']),
      actionResources: summarizeResources(initial.resources, marks['startup:target-ready']),
      startupTrace: trace ? summarizeTrace(traceBetweenMarks(trace, initial.marks, 'startup:title-ready')) : null,
      actionTrace: trace ? summarizeTrace(traceBetweenMarks(trace, initial.marks, 'startup:target-ready', 'startup:action-input')) : null,
      resources: initial.resources, trace: trace ? `${stem}.trace.json` : null };
    if (!Number.isFinite(run.actionMs)) throw new Error('Target not reached by input');
    if (await page.evaluate(() => globalThis.__startupVersion) !== `v${version}`) throw new Error('Title version mismatch');
    if (action === 'records') {
      const tabs = page.locator('.RecordScreen [role="tab"]');
      await tabs.nth(2).click();
      if (await tabs.nth(2).getAttribute('aria-selected') !== 'true') throw new Error('Record tab input failed');
      await page.locator('.RecordScreen__Header button').click();
      const label = await page.locator('.TitleMenu__Command.state-primary').textContent();
      await page.locator('#language-selector').selectOption('en', { force: true });
      await page.waitForFunction(old => document.querySelector('.TitleMenu__Command.state-primary').textContent !== old, label);
      await page.locator('#language-selector').selectOption('ja', { force: true });
      await page.waitForFunction(old => document.querySelector('.TitleMenu__Command.state-primary').textContent === old, label);
      await page.locator('.TitleMenu__Command').last().click();
      await page.locator('.RecordScreen').waitFor({ state: 'visible' });
      await page.locator('.RecordScreen__Header button').click();
    } else {
      await page.locator('.StartPartySelection__StartButton').click();
      await page.locator('.VignetteModal__Skip').waitFor({ state: 'visible' });
      const skipStarted = await page.evaluate(() => performance.now());
      await page.locator('.VignetteModal__Skip').click();
      await page.locator('#stage-selection').waitFor({ state: 'visible' });
      run.skipToStageObservedMs = await page.evaluate(start => performance.now() - start, skipStarted);
      run.skipToStageMs = await page.evaluate(() => performance.getEntriesByName('startup:stage-ready')[0].startTime - performance.getEntriesByName('startup:skip-input')[0].startTime);
      await page.waitForLoadState('networkidle');
      await page.locator('.StageSelection__SelectButton').first().click();
      await page.locator('#stage-selection').waitFor({ state: 'hidden' });
      if (candidate !== 'normal') {
        await page.evaluate(() => globalThis.__startupFinishTrial());
        await page.locator('.TitleMenu__Command.state-primary').waitFor({ state: 'visible' });
        await page.locator('.TitleMenu__Command.state-primary').click();
        await page.locator('.StartPartySelection__StartButton').waitFor({ state: 'visible' });
      }
    }
    await page.waitForLoadState('networkidle');
    const broken = await page.evaluate(() => [...document.images].filter(image => !image.complete || !image.naturalWidth).map(image => image.src));
    if (broken.length) failures.push(`Broken DOM images: ${broken.join(', ')}`);
    if (failures.length) throw new Error(failures.join('\n'));
    run.finalResources = await page.evaluate(() => [...performance.getEntriesByType('navigation'), ...performance.getEntriesByType('resource')].map(resource => resource.toJSON()));
    run.finalTotals = summarizeResources(run.finalResources);
    run.finalMarks = await page.evaluate(() => performance.getEntriesByType('mark').map(({ name, startTime }) => ({ name, startTime })));
    run.validated = true;
    results.runs.push(run); await save();
    console.log(`${stem}: title ${run.titleMs.toFixed(1)}ms; input ${run.actionMs.toFixed(1)}ms`);
  } catch (error) {
    await page.screenshot({ path: resolve(output, 'failure.png') });
    await writeFile(resolve(output, 'failure.txt'), `${error.stack}\n${failures.join('\n')}\n${await page.locator('body').innerText()}`);
    throw error;
  } finally {
    if (settings.tracing && !trace) await stopTrace(cdp);
    page.off('pageerror', onError); page.off('requestfailed', onError); page.off('response', onResponse); page.off('console', onConsole);
  }
}

let browser;
try {
  // Build all variants before measuring: no concurrent builds or tests during sampling.
  for (const candidate of candidates) {
    const warnings = [];
    const logger = createLogger('info', { allowClearScreen: false });
    const warn = logger.warn.bind(logger);
    logger.warn = (message, options) => { warnings.push(message); warn(message, options); };
    const bundle = await build({ plugins: candidate === 'normal' ? [] : [startupBuildPlugin(candidate)],
      build: { outDir: resolve(output, `dist-${candidate}`), emptyOutDir: true,
        rollupOptions: candidate === 'static' ? { output: { manualChunks: id => id.replaceAll('\\', '/').endsWith('/src/chips/image-levels.json') ? 'image-levels' : undefined } } : {},
      }, customLogger: logger, logLevel: 'info' });
    results.builds[candidate] = { ...bundleStats(bundle), warnings };
    console.log(`${candidate}: initial JS ${results.builds[candidate].initialBytes} bytes; warnings ${warnings.length}`);
    await save();
  }
  if (buildOnly) {
    results.finished = new Date().toISOString(); await save();
  } else {
    browser = await chromium.launch({ channel: process.env.STARTUP_CHANNEL ?? 'chrome', headless: true });
    results.browser = browser.version();
    for (const candidate of candidates) {
      const server = await serve(resolve(output, `dist-${candidate}`));
      try {
        for (const timing of ['immediate', ...(['prefetch', 'combined'].includes(candidate) ? ['settled'] : [])]) {
          for (const action of actions) for (let repeat = 1; repeat <= repeats; repeat++) {
            const context = await browser.newContext({ viewport: settings.viewport, deviceScaleFactor: settings.deviceScaleFactor });
            try {
              await context.addInitScript(({ action, timing, tutorials }) => {
                localStorage.clear();
                localStorage.setItem('can-we-become-heroes', JSON.stringify({ heroProgress: { unlockedProfessionIds: ['swordfighter', 'guard'], hasClearedTrial: true }, tutorialState: { completed: tutorials } }));
                let seed = 54;
                Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
                performance.setResourceTimingBufferSize(5000);
                document.addEventListener('click', event => {
                  if (event.target.closest('.VignetteModal__Skip')) performance.mark('startup:skip-input');
                }, true);
                let clicked = false;
                const observer = new MutationObserver(() => {
                  const commands = document.querySelectorAll('.TitleMenu__Command');
                  if (!commands.length || clicked) return;
                  if (!performance.getEntriesByName('startup:title-ready').length) performance.mark('startup:title-ready');
                  if (timing === 'settled' && !performance.getEntriesByName('startup:prefetch-end').length) return;
                  clicked = true;
                  globalThis.__startupVersion = document.querySelector('.TitleMenu__Version').textContent;
                  performance.mark('startup:action-input');
                  commands[action === 'records' ? commands.length - 1 : action === 'challenge' ? 1 : 0].click();
                });
                new MutationObserver(() => {
                  const stage = document.querySelector('#stage-selection');
                  if (stage && !stage.hidden && stage.children.length && !performance.getEntriesByName('startup:stage-ready').length) performance.mark('startup:stage-ready');
                  if (performance.getEntriesByName('startup:target-ready').length) return;
                  const target = document.querySelector(action === 'records' ? '.RecordScreen [role="tab"]' : '.StartPartySelection__StartButton');
                  if (target) performance.mark('startup:target-ready');
                }).observe(document, { subtree: true, childList: true });
                observer.observe(document, { subtree: true, childList: true });
                // Prefetch resolves without a DOM mutation; observe its performance mark.
                if (timing === 'settled') {
                  new PerformanceObserver(() => {
                    if (!clicked && performance.getEntriesByName('startup:prefetch-end').length) document.body.append(document.createComment('prefetch settled'));
                  }).observe({ entryTypes: ['mark'] });
                }
              }, { action, timing, tutorials });
              const page = await context.newPage();
              page.setDefaultTimeout(30000);
              const cdp = await context.newCDPSession(page);
              await cdp.send('Network.enable');
              await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: settings.latency, downloadThroughput: settings.downloadThroughput, uploadThroughput: settings.uploadThroughput });
              await cdp.send('Emulation.setCPUThrottlingRate', { rate: settings.cpuRate });
              for (const cache of ['cold', 'warm']) await navigateAndMeasure(page, cdp, candidate, action, timing, cache, repeat);
            } finally { await context.close(); }
          }
        }
      } finally { await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }); }
    }
    results.finished = new Date().toISOString(); await save();
  }
} catch (error) { results.failure = error.stack; await save(); throw error; }
finally { await browser?.close(); }
