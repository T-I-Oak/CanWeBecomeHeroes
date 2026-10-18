import { setLanguage } from '../../../GameWorksOAK/src/lib/core/i18n.js';
import GameTextRepository from '../../src/game/GameTextRepository.js';
import RunRecordsRepository from '../../src/game/RunRecordsRepository.js';
import TrialStatisticsSession from '../../src/game/TrialStatisticsSession.js';
import { createTrialRunResult } from '../../src/game/TrialRunResult.js';
import { APP_VERSION } from '../../src/game/AppMetadata.js';
import { drawGuildPanel } from '../../src/app/GuildPanel.js';
import { GAME_AREAS } from '../../src/game/GameAreas.js';
import TrialRunResultModal from '../../src/app/TrialRunResultModal.js';
import RecordScreen from '../../src/app/RecordScreen.js';
import TutorialController from '../../src/app/TutorialController.js';
import AssetLoader from '../../src/chips/AssetLoader.js';

const values = new Map();
const dataManager = { getValue: key => values.get(key), setValue: (key, value) => values.set(key, structuredClone(value)) };
const repository = new RunRecordsRepository(dataManager);
const session = new TrialStatisticsSession({ repository, mode: 'challenge', professionIds: ['swordfighter', 'guard'] });
for (let n = 0; n < 7; n++) session.record({ type: 'stage-clear', kind: 'regular', patternIndex: 0, level: n + 1, clearedAt: new Date().toISOString() });
const members = [...session.startMembers, { heroId: 'Casey', profession: 'mage' }, { heroId: 'Darcy', profession: 'cleric' }];
const outcome = { state: 'completed', stageNumber: 8, stageKind: 'regular' };
const record = session.finish({ outcome, members, tick: 96000, remainingHours: 0 });
const texts = new GameTextRepository();
const language = document.querySelector('#language');
document.querySelector('#version').textContent = `v${APP_VERSION}`;
async function refreshLanguage() {
  setLanguage(language.value);
  document.documentElement.lang = language.value;
  await texts.load();
}
await refreshLanguage();
language.addEventListener('change', refreshLanguage);
const stage = document.querySelector('#stage');
for (const number of [1, 7, 8, 14, 15, 21, 22]) stage.add(new Option(String(number), String(number)));
const canvas = document.querySelector('#guild');
const context = canvas.getContext('2d');
let tutorial;
function draw(time) {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.translate(-GAME_AREAS.guild.x - 235, -GAME_AREAS.guild.y);
  drawGuildPanel(context, { mode: 'challenge', stageNumber: Number(stage.value), animationTime: time / 1000,
    tick: 0, contributionPoints: 0, extensionHours: 0, textRepository: texts });
  context.restore();
  tutorial?.update(time);
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
document.querySelector('#result').addEventListener('click', () => {
  const result = createTrialRunResult({ outcome, members, record, language: language.value });
  new TrialRunResultModal(document.querySelector('#trial-run-result'), { textRepository: texts }).show(result);
});
document.querySelector('#records').addEventListener('click', () => {
  const container = document.querySelector('#record-preview');
  container.hidden = false;
  const screen = new RecordScreen(container, { repository, textRepository: texts, assets: new AssetLoader(),
    heroProgress: { hasClearedTrial: () => document.querySelector('#unlock').checked },
    onClose: () => { container.hidden = true; },
  });
  screen.open();
});
document.querySelector('#tutorial').addEventListener('click', () => {
  tutorial?.dispose();
  values.set('tutorialState', { completed: [] });
  tutorial = new TutorialController({ mode: 'challenge', camera: { viewport: { width: innerWidth, height: innerHeight } },
    clock: { pause() {}, resume() {} }, canvas, dataManager, textRepository: texts, getHeroes: () => [],
    getPreparationHeroes: () => [], getItems: () => [], isStageSelecting: () => true, isActive: () => true });
  tutorial.onStageSelection();
});
