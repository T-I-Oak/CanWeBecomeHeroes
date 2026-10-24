import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { descendants, verificationPassed } from './lib/BrowserTestVerification.js';

const execute = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'tmp_browser_verification', new Date().toISOString().replaceAll(/[:.]/g, '-'));
const limitMs = Number(process.env.BROWSER_VERIFY_TIMEOUT_MS ?? 90000);
if (process.platform !== 'win32') throw new Error('This verifier requires Windows.');
if (!Number.isFinite(limitMs) || limitMs < 1) throw new Error('Invalid BROWSER_VERIFY_TIMEOUT_MS');
await mkdir(output, { recursive: true });
console.log(`Artifacts: ${output}`);

async function inventory() {
  const { stdout } = await execute('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `
    $ErrorActionPreference='Stop'
    $processes=@(Get-CimInstance Win32_Process | ForEach-Object {
      @{pid=[int]$_.ProcessId;parent=[int]$_.ParentProcessId;created=$_.CreationDate.ToUniversalTime().ToString('o');command=$_.CommandLine}
    })
    $listeners=@(Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -in 4174,4175 } | ForEach-Object {
      @{port=[int]$_.LocalPort;pid=[int]$_.OwningProcess}
    })
    @{processes=$processes;listeners=$listeners} | ConvertTo-Json -Depth 5 -Compress
  `], { windowsHide: true, timeout: 15000, maxBuffer: 8 * 1024 * 1024 });
  return JSON.parse(stdout.replace(/^\uFEFF/, ''));
}

async function run(number) {
  const result = {
    run: number, started: new Date().toISOString(), ended: null, limitMs,
    command: 'npm.cmd run test:browser -- --reporter=line,json',
    channel: process.env.PLAYWRIGHT_CHANNEL ?? null, ci: process.env.CI ?? null,
    node: process.version, rootPid: null, exitCode: null, timedOut: false, interrupted: false,
    observationError: null, stats: null, errors: [], remaining: [], listeners: [], snapshots: [], cleanup: [],
  };
  const prefix = path.join(output, `run-${number}`);
  let child;
  let timer;
  let closed;
  let known = [];
  let stopRequested = false;
  const chunks = [];
  const interrupt = () => { result.interrupted = true; stopRequested = true; };
  process.on('SIGINT', interrupt);
  process.on('SIGTERM', interrupt);
  try {
    const before = await inventory();
    result.listeners = before.listeners;
    if (before.listeners.length) throw new Error('Dedicated ports already in use; no test started.');
    result.started = new Date().toISOString();
    child = spawn(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', result.command], {
      cwd: root, windowsHide: true,
      env: { ...process.env, DEBUG: 'pw:webserver', PLAYWRIGHT_JSON_OUTPUT_FILE: `${prefix}.playwright.json` },
    });
    result.rootPid = child.pid;
    const completion = new Promise(resolve => {
      child.on('error', error => { result.errors.push(error.message); closed = true; resolve(); });
      child.on('close', code => {
        result.exitCode = code;
        result.ended = new Date().toISOString();
        clearTimeout(timer);
        closed = true;
        resolve();
      });
    });
    for (const stream of [child.stdout, child.stderr]) stream.on('data', data => {
      chunks.push(data);
      process.stdout.write(data);
    });
    timer = setTimeout(() => { result.timedOut = true; stopRequested = true; }, limitMs);
    while (!closed && !stopRequested) {
      const snapshot = await inventory();
      if (!known.length) {
        const entry = snapshot.processes.find(p => p.pid === child.pid);
        if (entry) known.push(entry);
        else if (!closed) throw new Error('Unable to observe test root process.');
      }
      const related = descendants(snapshot.processes, known);
      for (const p of related) if (!known.some(k => k.pid === p.pid && k.created === p.created)) known.push(p);
      result.snapshots.push({ at: new Date().toISOString(), processes: related, listeners: snapshot.listeners });
    }
    if (!stopRequested) await completion;
    clearTimeout(timer);
    result.ended ??= new Date().toISOString();
    const after = await inventory();
    result.remaining = descendants(after.processes, known);
    result.listeners = after.listeners;
    if (!known.length) throw new Error('No process identity captured; cleanup cannot be verified.');
    try {
      const report = JSON.parse(await readFile(`${prefix}.playwright.json`, 'utf8'));
      result.stats = report.stats;
      result.errors.push(...report.errors);
    } catch (error) {
      result.errors.push(`Playwright report unavailable: ${error.message}`);
    }
  } catch (error) {
    result.observationError = error.message;
    console.error(error.message);
  } finally {
    clearTimeout(timer);
    process.off('SIGINT', interrupt);
    process.off('SIGTERM', interrupt);
    result.ended ??= new Date().toISOString();
    // A failed observation must never turn into an all-process or port-owner kill.
    if (child && (!closed || result.remaining.length)) {
      try {
        const current = await inventory();
        const owned = descendants(current.processes, known);
        result.remaining = owned;
        for (const saved of owned.sort((a, b) => a.created.localeCompare(b.created))) {
          const fresh = await inventory();
          if (!descendants(fresh.processes, known).length) break;
          if (!fresh.processes.some(p => p.pid === saved.pid && p.created === saved.created)) continue;
          // The root identity is checked before terminating its tree; orphaned observed roots are checked separately.
          try {
            const killed = await execute('taskkill.exe', ['/PID', String(saved.pid), '/T', '/F'], { windowsHide: true, timeout: 5000 });
            result.cleanup.push({ pid: saved.pid, stdout: killed.stdout });
          } catch (error) {
            result.cleanup.push({ pid: saved.pid, error: error.message });
          }
        }
        const cleaned = await inventory();
        result.afterCleanup = { remaining: descendants(cleaned.processes, known), listeners: cleaned.listeners };
      } catch (error) {
        result.cleanup.push({ error: error.message });
      }
      child.stdout.destroy();
      child.stderr.destroy();
      child.stdin.destroy();
      child.unref();
    }
    result.passed = verificationPassed(result);
    await writeFile(`${prefix}.log`, Buffer.concat(chunks));
    await writeFile(`${prefix}.json`, JSON.stringify(result, null, 2));
    console.log(`RUN ${number}: ${result.passed ? 'PASS' : 'FAIL'} exit=${result.exitCode} timeout=${result.timedOut}`);
  }
  return result;
}

const first = await run(1);
const results = [first];
if (first.passed) results.push(await run(2));
const passed = results.length === 2 && results.every(r => r.passed);
await writeFile(path.join(output, 'summary.json'), JSON.stringify({ passed, runs: results.map(r => ({
  run: r.run, passed: r.passed, started: r.started, ended: r.ended, exitCode: r.exitCode,
  stats: r.stats, remaining: r.remaining, listeners: r.listeners,
})) }, null, 2));
console.log(`VERIFICATION ${passed ? 'PASS' : 'FAIL'}: ${output}`);
process.exitCode = passed ? 0 : 1;
