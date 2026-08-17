import { startGame } from './app/GameApp.js';
import { createDemoScenario } from './demo/DemoScenario.js';

startGame({ scenario: createDemoScenario() });
