import path from 'node:path';
import { descendants, verificationPassed } from './BrowserTestVerification.js';

export async function runBrowserVerification(number, options) {
  const { root, output, limitMs, spawn, inventory, execute, readFile, writeFile, signals = process, log = console.log } = options;
  const result = {
    run: number, started: new Date().toISOString(), ended: null, limitMs,
    command: 'npm.cmd run test:browser -- --reporter=line,json',
    channel: process.env.PLAYWRIGHT_CHANNEL ?? null, ci: process.env.CI ?? null,
    node: process.version, rootPid: null, exitCode: null, timedOut: false, interrupted: false,
    observationError: null, observationFailure: null, stats: null, errors: [], remaining: [], listeners: [], snapshots: [], cleanup: [],
  };
  const prefix = path.join(output, `run-${number}`);
  let child;
  let timer;
  let closed;
  let known = [];
  let launch;
  let stopRequested = false;
  const chunks = [];
  const interrupt = () => { result.interrupted = true; stopRequested = true; };
  signals.on('SIGINT', interrupt);
  signals.on('SIGTERM', interrupt);
  try {
    const before = await inventory();
    result.listeners = before.listeners;
    if (stopRequested) return result;
    if (before.listeners.length) throw new Error('Dedicated ports already in use; no test started.');
    result.started = new Date().toISOString();
    const spawnStartedMs = Date.now();
    child = spawn(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', result.command], {
      cwd: root, windowsHide: true,
      env: { ...process.env, DEBUG: 'pw:webserver', PLAYWRIGHT_JSON_OUTPUT_FILE: `${prefix}.playwright.json` },
    });
    launch = { pid: child.pid, parent: process.pid, startedMs: spawnStartedMs, returnedMs: Date.now() };
    result.launch = launch;
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
      log(data.toString());
    });
    timer = setTimeout(() => { result.timedOut = true; stopRequested = true; }, limitMs);
    while (!closed && !stopRequested) {
      const snapshot = await inventory();
      if (!known.length) {
        const entry = ownedRoot(snapshot.processes, launch, closed);
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
    result.observationFailure = error.diagnostics ?? null;
    log(error.message);
    if (result.observationFailure) log(JSON.stringify(result.observationFailure));
  } finally {
    clearTimeout(timer);
    signals.off('SIGINT', interrupt);
    signals.off('SIGTERM', interrupt);
    result.ended ??= new Date().toISOString();
    // A failed observation must never turn into an all-process or port-owner kill.
    if (child && (!closed || result.remaining.length)) {
      try {
        const current = await inventory();
        // The first observation may have failed. Recover only a still-live child created by this spawn.
        if (!known.length) {
          const entry = ownedRoot(current.processes, launch, closed);
          if (!entry) throw new Error('Unable to verify root identity; no process was terminated.');
          known.push(entry);
        }
        const owned = descendants(current.processes, known);
        for (const p of owned) if (!known.some(k => k.pid === p.pid && k.created === p.created)) known.push(p);
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
        result.cleanup.push({ error: error.message, diagnostics: error.diagnostics ?? null });
      }
      child.stdout.destroy();
      child.stderr.destroy();
      child.stdin.destroy();
      child.unref();
    }
    result.passed = verificationPassed(result);
    await writeFile(`${prefix}.log`, Buffer.concat(chunks));
    await writeFile(`${prefix}.json`, JSON.stringify(result, null, 2));
    log(`RUN ${number}: ${result.passed ? 'PASS' : 'FAIL'} exit=${result.exitCode} timeout=${result.timedOut}`);
  }
  return result;
}

function ownedRoot(processes, launch, closed) {
  if (closed) return undefined;
  return processes.find(p => p.pid === launch.pid && p.parent === launch.parent &&
    Date.parse(p.created) >= launch.startedMs && Date.parse(p.created) <= launch.returnedMs);
}
