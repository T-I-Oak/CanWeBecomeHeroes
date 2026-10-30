import { startGame } from './app/GameApp.js';
import { APP_VERSION } from './game/AppMetadata.js';
import { setAppVersion } from '../../GameWorksOAK/src/lib/utils/env.js';

try {
  setAppVersion(APP_VERSION);
  await startGame();
} catch (error) {
  window.gameStartup.fail(error);
}
