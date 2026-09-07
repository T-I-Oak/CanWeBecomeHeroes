import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { analyzeTagMatchups, toMatchupMatrixCsv, toMatchupMatrixMarkdown, toTagOutcomeSummaryCsv, toTagOutcomeSummaryMarkdown } from '../src/simulation/TagMatchupMatrix.js';
import { toCsv } from '../src/simulation/TagAffinityAnalysis.js';

const [inputPath] = process.argv.slice(2);
const input = inputPath ? JSON.parse(await readFile(resolve(inputPath), 'utf8')) : {};
const analysis = analyzeTagMatchups(input);
const outputDirectory = resolve(input.outputDirectory ?? 'tmp_tag-matchup-matrix');
await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeFile(resolve(outputDirectory, 'matrix.csv'), `${toMatchupMatrixCsv(analysis)}\n`),
  writeFile(resolve(outputDirectory, 'matrix.md'), `${toMatchupMatrixMarkdown(analysis)}\n`),
  writeFile(resolve(outputDirectory, 'matchups.csv'), `${toCsv(analysis.matchups)}\n`),
  writeFile(resolve(outputDirectory, 'tag-outcomes.csv'), `${toTagOutcomeSummaryCsv(analysis)}\n`),
  writeFile(resolve(outputDirectory, 'tag-outcomes.md'), `${toTagOutcomeSummaryMarkdown(analysis)}\n`),
  writeFile(resolve(outputDirectory, 'conditions.json'), `${JSON.stringify(analysis.conditions, null, 2)}\n`),
]);
process.stdout.write(`${JSON.stringify({ outputDirectory, matchupRows: analysis.matchups.length }, null, 2)}\n`);
