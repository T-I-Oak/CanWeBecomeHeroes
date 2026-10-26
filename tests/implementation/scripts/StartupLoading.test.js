import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { startupBuildPlugin, compactManifestSource, replaceRequired } from '../../../scripts/lib/StartupLoadingBuild.js';
import { summarizeTrace, summarizeResources, traceBetweenMarks } from '../../../scripts/lib/StartupLoadingMetrics.js';

test('investigation replacements fail when source markers drift', () => {
  assert.throws(() => replaceRequired('abc', 'missing', ''), /exactly once/);
  assert.throws(() => replaceRequired('aa', 'a', ''), /exactly once/);
});

test('trace windows clip overlapping events and reject missing boundaries', () => {
  const trace = { traceEvents: [{ name: 'ready', cat: 'blink.user_timing', ts: 20000 },
    { name: 'EvaluateScript', ph: 'X', ts: 8000, dur: 18000, pid: 1, tid: 1 }] };
  const marks = [{ name: 'ready', startTime: 10 }];
  assert.equal(summarizeTrace(traceBetweenMarks(trace, marks, 'ready')).executionMs, 10);
  assert.throws(() => traceBetweenMarks(trace, marks, 'missing'), /Missing trace boundary/);
});

test('lazy candidates remove only requested static imports and validate all transforms', () => {
  for (const candidate of ['baseline', 'bootstrap', 'static', 'trial', 'records', 'both', 'prefetch', 'compact', 'combined']) {
    const plugin = startupBuildPlugin(candidate);
    const transformed = {};
    for (const file of ['main.js', 'app/GameApp.js', 'app/TitleMenu.js', 'app/TrialSession.js', 'chips/ScaledImage.js']) {
      transformed[file] = plugin.transform(readFileSync(`src/${file}`, 'utf8'), `/project/src/${file}`);
    }
    plugin.buildEnd();
    assert.equal(transformed['app/GameApp.js'].includes("import { startTrial } from './TrialSession.js'"), !['trial', 'both', 'prefetch', 'combined'].includes(candidate));
    assert.equal(transformed['app/TitleMenu.js'].includes("import RecordScreen from './RecordScreen.js'"), !['records', 'both', 'prefetch', 'combined'].includes(candidate));
    assert.equal(transformed['main.js'].includes('await startGame();'), ['baseline', 'static', 'compact'].includes(candidate));
  }
  assert.throws(() => startupBuildPlugin('invalid'), /Unknown/);
  assert.throws(() => startupBuildPlugin('both').buildEnd(), /not transformed/);
});

test('compact manifest preserves every runtime entry, dimensions and ordered level paths', async () => {
  const manifest = JSON.parse(readFileSync('src/chips/image-levels.json', 'utf8'));
  const code = compactManifestSource(manifest);
  const { default: compact } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  assert.deepEqual(Object.keys(compact), Object.keys(manifest));
  for (const [path, entry] of Object.entries(manifest)) {
    assert.deepEqual(compact[path], { width: entry.width, height: entry.height, levels: entry.levels });
  }
});

test('trace summary separates compilation from execution and unions nested intervals', () => {
  const trace = { traceEvents: [
    { name: 'EvaluateScript', ph: 'X', ts: 0, dur: 5000, pid: 1, tid: 2 },
    { name: 'FunctionCall', ph: 'X', ts: 1000, dur: 2000, pid: 1, tid: 2 },
    { name: 'v8.compile', ph: 'X', ts: 2000, dur: 1000, pid: 1, tid: 2 },
    { name: 'v8.parseOnBackgroundWaiting', ph: 'X', ts: 2000, dur: 9000, pid: 1, tid: 3 },
  ] };
  assert.deepEqual(summarizeTrace(trace), { compileMs: 1, executionMs: 5, compileEvents: 1, executionEvents: 2 });
  assert.deepEqual(summarizeResources([{ name: 'a.js', transferSize: 120, encodedBodySize: 100, decodedBodySize: 200, responseEnd: 5 },
    { name: 'b.png', transferSize: 40, encodedBodySize: 20, decodedBodySize: 20, responseEnd: 10 }], 6),
  { count: 1, transferBytes: 120, encodedBytes: 100, decodedBytes: 200, jsTransferBytes: 120 });
});
