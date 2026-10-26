import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { replaceOnce, performanceBuildPlugin, installPerformanceProbe } from '../../../scripts/lib/PerformanceBuild.js';

test('performance transforms reject missing and ambiguous markers', () => {
  assert.equal(replaceOnce('before marker after', 'marker', 'done'), 'before done after');
  assert.throws(() => replaceOnce('none', 'marker', 'done'));
  assert.throws(() => replaceOnce('marker marker', 'marker', 'done'));
});

test('probe preserves results, separates disabled measurement and caps samples', t => {
  const originalRandom = Math.random;
  const originalProbe = globalThis.__perf;
  t.after(() => { Math.random = originalRandom; globalThis.__perf = originalProbe; });
  let time = 0;
  t.mock.method(performance, 'now', () => time++);
  installPerformanceProbe();
  const probe = globalThis.__perf;
  const firstRandom = Math.random();
  Math.random();
  probe.reseed();
  assert.equal(Math.random(), firstRandom);
  const object = { value: 2, multiply(n) { return this.value * n; } };
  probe.wrap(object, 'Example', ['multiply']);
  assert.equal(object.multiply(3), 6);
  assert.deepEqual(probe.totals, {});
  probe.reset(true);
  probe.begin(0);
  assert.equal(object.multiply(4), 8);
  probe.start('group'); probe.stop('group');
  probe.endFrame();
  assert.equal(probe.rows.length, 1);
  assert.equal(probe.rows[0]['Example.multiply:calls'], 1);
  assert.equal(probe.rows[0].group, 1);
  assert.equal(probe.totals['Example.multiply'], 1);
  probe.skip.add('Example.multiply');
  assert.equal(object.multiply(4), undefined);
  probe.skip.clear();
  probe.reset(false);
  probe.begin(0); assert.equal(object.multiply(4), 8); probe.endFrame();
  assert.equal(probe.rows[0]['Example.multiply:calls'], undefined);
  for (let frame = 1; frame <= 20010; frame++) { probe.begin(frame); probe.endFrame(); }
  assert.equal(probe.rows.length, 20000);
  assert.equal(probe.intervals.length, 20000);
});

test('local instrumentation matches current application boundaries', async () => {
  const plugin = performanceBuildPlugin();
  for (const file of ['app/GameApp.js', 'app/TrialSession.js', 'chips/ChipBoard.js', 'chips/ChipRenderer.js', 'chips/ScaledImage.js',
    'app/InformationWindowManager.js', 'app/InformationWindowLayer.js', 'app/TimeSettingsController.js', 'app/TitleChipRain.js', 'game/HeroItemInteractionController.js',
    'app/FacilityNameplateRenderer.js', 'app/AreaNameplateRenderer.js', 'app/WarehouseMetadataRenderer.js',
    'app/FacilitySlotRenderer.js', 'app/ShopPanelPresenter.js', 'app/GuildPanel.js', 'app/HeroStatusPanelRenderer.js']) {
    const code = await readFile(new URL(`../../../src/${file}`, import.meta.url), 'utf8');
    assert.match(plugin.transform(code, `/project/src/${file}`).code, /globalThis\.__perf/);
  }
});

test('paired chip build includes pinned legacy methods only on explicit request', async t => {
  const previous = process.env.PERF_COMPARE_CHIPS;
  t.after(() => { if (previous === undefined) delete process.env.PERF_COMPARE_CHIPS; else process.env.PERF_COMPARE_CHIPS = previous; });
  process.env.PERF_COMPARE_CHIPS = '1';
  for (const file of ['ChipBoard', 'ChipRenderer']) {
    const code = await readFile(new URL(`../../../src/chips/${file}.js`, import.meta.url), 'utf8');
    assert.match(performanceBuildPlugin().transform(code, `/project/src/chips/${file}.js`).code, new RegExp(`class Legacy${file}`));
    delete process.env.PERF_COMPARE_CHIPS;
    assert.doesNotMatch(performanceBuildPlugin().transform(code, `/project/src/chips/${file}.js`).code, new RegExp(`class Legacy${file}`));
    process.env.PERF_COMPARE_CHIPS = '1';
  }
});
