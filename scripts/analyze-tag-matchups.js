import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { availableParallelism } from 'node:os';
import { resolve } from 'node:path';
import { Worker } from 'node:worker_threads';
import { TAG_ORDER } from '../src/game/TagCatalog.js';
import { analyzeTagMatchups, toMatchupMatrixCsv, toMatchupMatrixMarkdown, toTagOutcomeSummaryCsv, toTagOutcomeSummaryMarkdown } from '../src/simulation/TagMatchupMatrix.js';
import { toCsv } from '../src/simulation/TagAffinityAnalysis.js';

const [inputPath] = process.argv.slice(2);
const input = inputPath ? JSON.parse(await readFile(resolve(inputPath), 'utf8')) : {};
const tags = input.tags ?? TAG_ORDER;
const parallelism = Math.max(1, Math.min(input.parallelism ?? 8, availableParallelism(), tags.length));
const chunks = Array.from({ length: parallelism }, () => []);
tags.forEach((tag, index) => chunks[index % parallelism].push(tag));
const workerPath = new URL('./tag-matchup-worker.js', import.meta.url);
const outputs = await Promise.all(chunks.filter((chunk) => chunk.length > 0).map((heroTags) => new Promise((resolveWorker, rejectWorker) => {
  const worker = new Worker(workerPath, { workerData: { ...input, tags, heroTags, enemyTags: tags } });
  worker.once('message', (message) => message.error ? rejectWorker(new Error(message.error)) : resolveWorker(message));
  worker.once('error', rejectWorker);
  worker.once('exit', (code) => { if (code !== 0) rejectWorker(new Error(`Tag matchup worker exited with code ${code}.`)); });
})));
const analysis = analyzeTagMatchups({ ...input, tags, heroTags: [], enemyTags: [] });
const matchups = outputs.flatMap(({ matchups: rows }) => rows).toSorted((left, right) => tags.indexOf(left.heroTag) - tags.indexOf(right.heroTag) || tags.indexOf(left.enemyTag) - tags.indexOf(right.enemyTag));
const completeAnalysis = Object.freeze({ conditions: Object.freeze({ ...analysis.conditions, heroTags: tags, enemyTags: tags, parallelism }), matchups: Object.freeze(matchups) });
const outputDirectory = resolve(input.outputDirectory ?? 'tmp_tag-matchup-matrix');
await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeFile(resolve(outputDirectory, 'matrix.csv'), `${toMatchupMatrixCsv(completeAnalysis)}\n`),
  writeFile(resolve(outputDirectory, 'matrix.md'), `${toMatchupMatrixMarkdown(completeAnalysis)}\n`),
  writeFile(resolve(outputDirectory, 'matchups.csv'), `${toCsv(completeAnalysis.matchups)}\n`),
  writeFile(resolve(outputDirectory, 'tag-outcomes.csv'), `${toTagOutcomeSummaryCsv(completeAnalysis)}\n`),
  writeFile(resolve(outputDirectory, 'tag-outcomes.md'), `${toTagOutcomeSummaryMarkdown(completeAnalysis)}\n`),
  writeFile(resolve(outputDirectory, 'conditions.json'), `${JSON.stringify(completeAnalysis.conditions, null, 2)}\n`),
]);
process.stdout.write(`${JSON.stringify({ outputDirectory, matchupRows: completeAnalysis.matchups.length, parallelism }, null, 2)}\n`);
