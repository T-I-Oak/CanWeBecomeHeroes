import { startGame } from './app/GameApp.js';
import { createDemoScenario } from './demo/DemoScenario.js';

await startGame({ scenario: createDemoScenario() });
