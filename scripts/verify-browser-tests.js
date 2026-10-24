import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runBrowserVerification } from './lib/BrowserTestRun.js';
import { windowsBrowserInventory } from './lib/WindowsBrowserInventory.js';

const execute = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'tmp_browser_verification', new Date().toISOString().replaceAll(/[:.]/g, '-'));
const limitMs = Number(process.env.BROWSER_VERIFY_TIMEOUT_MS ?? 90000);
if (process.platform !== 'win32') throw new Error('This verifier requires Windows.');
if (!Number.isFinite(limitMs) || limitMs < 1) throw new Error('Invalid BROWSER_VERIFY_TIMEOUT_MS');
await mkdir(output, { recursive: true });
console.log(`Artifacts: ${output}`);

const inventory = () => windowsBrowserInventory(execute);

const run = number => runBrowserVerification(number, { root, output, limitMs, spawn, inventory, execute, readFile, writeFile });

const first = await run(1);
const results = [first];
if (first.passed) results.push(await run(2));
const passed = results.length === 2 && results.every(r => r.passed);
await writeFile(path.join(output, 'summary.json'), JSON.stringify({ passed, runs: results.map(r => ({
  run: r.run, passed: r.passed, started: r.started, ended: r.ended, exitCode: r.exitCode,
  stats: r.stats, remaining: r.remaining, listeners: r.listeners,
  observationError: r.observationError, observationFailure: r.observationFailure,
})) }, null, 2));
console.log(`VERIFICATION ${passed ? 'PASS' : 'FAIL'}: ${output}`);
process.exitCode = passed ? 0 : 1;
