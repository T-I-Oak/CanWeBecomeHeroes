import { readFile, writeFile } from 'node:fs/promises';

const [output, ...inputs] = process.argv.slice(2);
if (!output || !inputs.length) throw new Error('Usage: node scripts/summarize-performance.js output.json input.json [...]');
const reports = [];
for (const input of inputs) {
  const report = JSON.parse(await readFile(input, 'utf8'));
  reports.push({ source: input, environment: report.environment, excludedConditions: report.excludedConditions ?? [], cases: report.cases.map(({ runs, ...condition }) => ({
    ...condition, runs: runs.map(({ samples, metrics, browserMetrics, ...run }) => ({
      ...run,
      metrics: Object.fromEntries(Object.entries(metrics).map(([key, value]) => [key, { mean: value.mean, p95: value.p95 }])),
      browserMetrics: Object.fromEntries(Object.entries(browserMetrics).filter(([key]) => [
        'Timestamp', 'TaskDuration', 'ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration', 'LayoutCount',
        'RecalcStyleCount', 'Nodes', 'JSEventListeners', 'JSHeapUsedSize',
      ].includes(key))),
      gameSecondsPerWallSecond: run.metadata.session ?
        (samples.rows.at(-1).tick - samples.rows[0].tick) / 60 / browserMetrics.Timestamp.delta : null,
      measuredTotals: samples.totals,
    })),
  })) });
}
await writeFile(output, JSON.stringify({ reports }, null, 2) + '\n');
