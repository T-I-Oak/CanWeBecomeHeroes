import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runBrowserVerification } from './lib/BrowserTestRun.js';

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

const run = number => runBrowserVerification(number, { root, output, limitMs, spawn, inventory, execute, readFile, writeFile });

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
