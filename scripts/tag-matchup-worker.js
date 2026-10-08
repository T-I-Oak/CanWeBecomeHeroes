import { parentPort, workerData } from 'node:worker_threads';
import { analyzeTagMatchups } from '../src/simulation/TagMatchupMatrix.js';

try {
  const analysis = analyzeTagMatchups(workerData);
  parentPort.postMessage({ matchups: analysis.matchups, ...(analysis.partyLoadouts ? { partyLoadouts: analysis.partyLoadouts } : {}) });
} catch (error) {
  parentPort.postMessage({ error: error instanceof Error ? error.message : String(error) });
}
