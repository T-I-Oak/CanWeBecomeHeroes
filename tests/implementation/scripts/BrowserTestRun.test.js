import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { runBrowserVerification } from '../../../scripts/lib/BrowserTestRun.js';

function fixture({ interruptBeforeSpawn = false, wrongOwner = false, wrongTime = false, signal = 'SIGINT' } = {}) {
  const signals = new EventEmitter();
  const killed = [];
  const saved = [];
  let calls = 0;
  let spawned = 0;
  let active = false;
  let root;
  const child = Object.assign(new EventEmitter(), {
    pid: 101, stdout: new PassThrough(), stderr: new PassThrough(), stdin: new PassThrough(),
    unref() {},
  });
  const other = { pid: 999, parent: 1, created: new Date(0).toISOString(), command: 'unrelated' };
  const options = {
    signals, root: '.', output: '.', limitMs: 90000, log(value) { assert.equal(typeof value, 'string'); },
    async writeFile(file, data) { saved.push({ file, data }); },
    async readFile() { throw new Error('no report'); },
    spawn() {
      spawned++;
      active = true;
      root = { pid: child.pid, parent: wrongOwner ? 9999 : process.pid,
        created: new Date(wrongTime ? 0 : Date.now()).toISOString(), command: 'cmd.exe /d /s /c npm.cmd run test:browser -- --reporter=line,json' };
      queueMicrotask(() => child.stdout.write('fixture output\n'));
      return child;
    },
    async inventory() {
      calls++;
      if (calls === 1) {
        if (interruptBeforeSpawn) signals.emit(signal);
        return { processes: [other], listeners: [] };
      }
      if (calls === 2) throw Object.assign(new Error('first post-spawn inventory failed'), {
        diagnostics: { stage: 'listeners', code: 1, stderr: 'Access denied' },
      });
      return { processes: active ? [root, { pid: 102, parent: 101, created: root.created }, other] : [other],
        listeners: active ? [{ port: 4174, pid: 102 }] : [] };
    },
    async execute(command, args) {
      killed.push(Number(args[1]));
      active = false;
      child.emit('close', 1);
      return { stdout: 'terminated' };
    },
  };
  return { options, killed, saved, spawned: () => spawned };
}

test('first post-spawn inventory failure recovers owned root and cleans only its tree', async () => {
  const f = fixture();
  const result = await runBrowserVerification(1, f.options);
  assert.equal(result.passed, false);
  assert.match(result.observationError, /first post-spawn/);
  assert.deepEqual(f.killed, [101]);
  assert.deepEqual(result.afterCleanup, { remaining: [], listeners: [] });
  assert.equal(f.saved.length, 2);
  assert.equal(f.saved[0].data.toString(), 'fixture output\n');
  assert.deepEqual(JSON.parse(f.saved[1].data).observationFailure,
    { stage: 'listeners', code: 1, stderr: 'Access denied' });
});

for (const signal of ['SIGINT', 'SIGTERM']) test(`${signal} during preflight does not spawn a test process`, async () => {
  const f = fixture({ interruptBeforeSpawn: true, signal });
  const result = await runBrowserVerification(1, f.options);
  assert.equal(f.spawned(), 0);
  assert.deepEqual(f.killed, []);
  assert.equal(result.interrupted, true);
  assert.equal(result.rootPid, null);
  assert.equal(result.passed, false);
  assert.equal(f.options.signals.listenerCount(signal), 0);
});

test('recovered inventory with different root owner never kills the matching PID', async () => {
  const f = fixture({ wrongOwner: true });
  const result = await runBrowserVerification(1, f.options);
  assert.deepEqual(f.killed, []);
  assert.equal(result.passed, false);
  assert.match(result.cleanup[0].error, /identity/);
});

test('recovered inventory with creation time outside spawn never kills the matching PID', async () => {
  const f = fixture({ wrongTime: true });
  const result = await runBrowserVerification(1, f.options);
  assert.deepEqual(f.killed, []);
  assert.equal(result.passed, false);
  assert.match(result.cleanup[0].error, /identity/);
});
