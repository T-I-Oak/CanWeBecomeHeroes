import { parentPort, workerData } from 'node:worker_threads';
import { analyzeTagMatchups } from '../src/simulation/TagMatchupMatrix.js';

try {
  const analysis = analyzeTagMatchups(workerData);
  parentPort.postMessage({ matchups: analysis.matchups });
} catch (error) {
  parentPort.postMessage({ error: error instanceof Error ? error.message : String(error) });
}
