import { readFile, writeFile } from 'node:fs/promises';
import { distribution, summarizeFrames } from './lib/ChipPerformance.js';

const [output, ...inputs] = process.argv.slice(2);
if (!output || !inputs.length) throw new Error('Usage: node scripts/summarize-performance.js output.json input.json [...]');
const reports = [];
for (const input of inputs) {
  const report = JSON.parse(await readFile(input, 'utf8'));
  reports.push({ source: input, environment: report.environment, excludedConditions: report.excludedConditions ?? [], cases: report.cases.map(({ runs, ...condition }) => ({
    ...condition, runs: runs.map(({ samples, metrics, browserMetrics, inputObservations, chipPhases, ...run }) => ({
      ...run,
      input: inputObservations?.length ? { n: inputObservations.length,
        eventToDraw: distribution(inputObservations.map(o => o.eventToDraw)),
        deliveryToDraw: distribution(inputObservations.map(o => o.deliveryToDraw)),
        allMatched: inputObservations.every(o => o.selected && o.hoverMatches) } : undefined,
      chipPhases: chipPhases?.map(phase => {
        const rows = samples.rows.filter(row => row.phase === phase.phase);
        const intervals = samples.rows.flatMap((row, index) => row.phase === phase.phase && index > 1
          && samples.rows[index - 1].phase === phase.phase ? [samples.intervals[index - 1]] : []);
        return { ...phase, frames: summarizeFrames(intervals, rows, phase.browserMetrics.Timestamp),
          main: distribution(rows.map(row => row.main)),
          taskPerSecond: phase.browserMetrics.TaskDuration / phase.browserMetrics.Timestamp };
      }),
      metrics: Object.fromEntries(Object.entries(metrics).map(([key, value]) => [key, { n: value.n, mean: value.mean, p95: value.p95, max: value.max }])),
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
