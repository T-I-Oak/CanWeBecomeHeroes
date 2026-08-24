import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { analyzeTagSubAffinities, toCsv } from '../src/simulation/TagAffinityAnalysis.js';

const [inputPath] = process.argv.slice(2);
const input = inputPath ? JSON.parse(await readFile(resolve(inputPath), 'utf8')) : {};
const analysis = analyzeTagSubAffinities(input);
const outputDirectory = resolve(input.outputDirectory ?? 'tmp_tag-affinity');
await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeFile(resolve(outputDirectory, 'detail.csv'), `${toCsv(analysis.details)}\n`),
  writeFile(resolve(outputDirectory, 'summary.csv'), `${toCsv(analysis.summaries)}\n`),
  writeFile(resolve(outputDirectory, 'conditions.json'), `${JSON.stringify(analysis.conditions, null, 2)}\n`),
]);
process.stdout.write(`${JSON.stringify({ outputDirectory, detailRows: analysis.details.length, summaryRows: analysis.summaries.length }, null, 2)}\n`);
