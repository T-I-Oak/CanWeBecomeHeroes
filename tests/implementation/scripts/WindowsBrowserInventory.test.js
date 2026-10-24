import test from 'node:test';
import assert from 'node:assert/strict';
import { windowsBrowserInventory } from '../../../scripts/lib/WindowsBrowserInventory.js';

test('Windows inventory reads BOM JSON and keeps bounded hidden execution', async () => {
  const state = { processes: [{ pid: 10 }], listeners: [] };
  const result = await windowsBrowserInventory(async (command, args, options) => {
    assert.equal(command, 'powershell.exe');
    assert.ok(args.includes('-NonInteractive'));
    assert.equal(options.timeout, 15000);
    assert.equal(options.windowsHide, true);
    return { stdout: `\uFEFF${JSON.stringify(state)}`, stderr: 'inventory:serialize\r\n' };
  });
  assert.deepEqual(result, state);
});

test('failed inventory preserves timeout, exit and query stage evidence', async () => {
  const failure = Object.assign(new Error('query terminated'), {
    code: null, signal: 'SIGTERM', killed: true, stdout: '',
    stderr: 'inventory:processes\r\ninventory:listeners\r\n',
  });
  await assert.rejects(windowsBrowserInventory(async () => { throw failure; }), error => {
    assert.equal(error.diagnostics.stage, 'listeners');
    assert.equal(error.diagnostics.signal, 'SIGTERM');
    assert.equal(error.diagnostics.killed, true);
    assert.equal(error.diagnostics.stderr, failure.stderr);
    assert.equal(error.diagnostics.timeoutMs, 15000);
    return true;
  });
});

test('invalid JSON is an observation failure with the original output', async () => {
  await assert.rejects(windowsBrowserInventory(async () => ({
    stdout: 'invalid JSON', stderr: 'inventory:serialize\n',
  })), error => {
    assert.equal(error.diagnostics.stage, 'serialize');
    assert.equal(error.diagnostics.stdout, 'invalid JSON');
    assert.equal(error.diagnostics.killed, false);
    return true;
  });
});
