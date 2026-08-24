import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runBattleSimulation } from '../src/simulation/BattleSimulationRunner.js';

const [inputPath] = process.argv.slice(2);
if (!inputPath) {
  console.error('Usage: npm run simulate:battle -- <conditions.json>');
  process.exitCode = 1;
} else {
  const input = JSON.parse(await readFile(resolve(inputPath), 'utf8'));
  process.stdout.write(`${JSON.stringify(runBattleSimulation(input), null, 2)}\n`);
}
