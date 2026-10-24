const INVENTORY_TIMEOUT_MS = 15000;
const COMMAND = `
  $ErrorActionPreference='Stop'
  [Console]::Error.WriteLine('inventory:processes')
  $processes=@(Get-CimInstance Win32_Process | ForEach-Object {
    @{pid=[int]$_.ProcessId;parent=[int]$_.ParentProcessId;created=$_.CreationDate.ToUniversalTime().ToString('o');command=$_.CommandLine}
  })
  [Console]::Error.WriteLine('inventory:listeners')
  $listeners=@(Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -in 4174,4175 } | ForEach-Object {
    @{port=[int]$_.LocalPort;pid=[int]$_.OwningProcess}
  })
  [Console]::Error.WriteLine('inventory:serialize')
  @{processes=$processes;listeners=$listeners} | ConvertTo-Json -Depth 5 -Compress
`;

export async function windowsBrowserInventory(execute) {
  const started = Date.now();
  let stdout = '';
  let stderr = '';
  try {
    ({ stdout, stderr } = await execute('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', COMMAND], {
      windowsHide: true, timeout: INVENTORY_TIMEOUT_MS, maxBuffer: 8 * 1024 * 1024,
    }));
    return JSON.parse(stdout.replace(/^\uFEFF/, ''));
  } catch (error) {
    const diagnostics = {
      elapsedMs: Date.now() - started, timeoutMs: INVENTORY_TIMEOUT_MS,
      code: error.code ?? null, signal: error.signal ?? null, killed: error.killed ?? false,
      stdout: error.stdout ?? stdout, stderr: error.stderr ?? stderr, message: error.message,
    };
    const stages = [...diagnostics.stderr.matchAll(/inventory:(\w+)/g)];
    diagnostics.stage = stages.at(-1)?.[1] ?? 'startup';
    throw Object.assign(new Error(`Windows inventory failed (${diagnostics.stage}): ${error.message}`), { diagnostics });
  }
}
