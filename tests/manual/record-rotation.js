import '../../src/styles.css';
import './record-rotation.css';
import TitleMenu from '../../src/app/TitleMenu.js';
import GameTextRepository from '../../src/game/GameTextRepository.js';
import GameStatistics from '../../src/game/GameStatistics.js';
import AssetLoader from '../../src/chips/AssetLoader.js';
import { APP_VERSION } from '../../src/game/AppMetadata.js';

const descriptions = {
  baseline: 'A：撤回後の通常実装と同じ拡縮・canvas更新・内部スクロール。',
  'no-scale': 'B：表のtransformだけを外します。表は論理幅のまま、スクロール用の寸法も等倍にします。',
  'fixed-canvas': 'C：開始時のcanvas描画サイズを維持します。CSSサイズは画面に追従し、チップの動きは継続します。',
  'no-scroll': 'D：表のスクロール領域だけoverflowをvisibleにします。外側の画面枠・拡縮は維持します。',
};
const mode = new URLSearchParams(location.search).get('mode') ?? 'baseline';
if (!(mode in descriptions)) throw new RangeError(`Unknown diagnostic mode: ${mode}`);
document.querySelector('#mode').value = mode;
document.querySelector('#condition-description').textContent = descriptions[mode];
document.querySelector('#diagnostic-summary').textContent = `v${APP_VERSION} 回転検証 ${descriptions[mode].slice(0, 1)}`;

// The fixture never creates a DataManager or reads/writes game save data.
const repository = { data: {
  statistics: new GameStatistics().exportData(),
  rankings: Array.from({ length: 10 }, (_, index) => ({
    id: `rotation-sample-${index}`, mode: 'trial', outcome: 'expired',
    remainingHours: 0, clearedStages: 11 - index, defeats: 11 + index,
    points: 293 + index, endedAt: '2026-10-24T00:00:00.000Z',
    members: ['Avery', 'Briar'].map(heroId => ({ heroId })),
  })),
} };
const texts = await new GameTextRepository().load();
const root = document.querySelector('#rotation-title');
root.classList.add('RotationFixture');
const menu = new TitleMenu(root, {
  textRepository: texts, assets: new AssetLoader(),
  heroProgress: { hasClearedTrial: () => false }, runRecords: repository,
});
menu.render();
menu.modalLayer.open();
menu.commands.find(command => command.label === 'startGame').element.disabled = true;
let seed = 54;
menu.rain.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);

let canvasResizes = 0;
const resizeCanvas = menu.rain.resize.bind(menu.rain);
menu.rain.resize = () => {
  if (mode === 'fixed-canvas' && canvasResizes > 0) return;
  resizeCanvas();
  canvasResizes++;
};
const record = menu.recordScreen;
const resizeRecord = record.resize.bind(record);
record.resize = () => {
  resizeRecord();
  if (mode !== 'no-scale' || !record.isOpen) return;
  record.content.style.transform = 'none';
  record.contentFrame.style.width = `${record.content.scrollWidth}px`;
  record.contentFrame.style.height = `${record.content.scrollHeight}px`;
};
if (mode === 'no-scroll') root.classList.add('state-no-scroll');
menu.rain.start();
menu.openPanel('records');

const logKey = 'can-we-become-heroes:record-rotation-diagnostics';
const events = JSON.parse(sessionStorage.getItem(logKey) ?? '[]');
function capture(event) {
  const canvas = menu.rain.canvas;
  const entry = {
    event, time: new Date().toISOString(), mode, version: APP_VERSION,
    viewport: [innerWidth, innerHeight], dpr: devicePixelRatio,
    visualViewport: window.visualViewport ? [visualViewport.width, visualViewport.height, visualViewport.scale] : null,
    canvasCss: [canvas.clientWidth, canvas.clientHeight], canvasPixels: [canvas.width, canvas.height], canvasResizes,
  };
  if (record.isOpen) {
    entry.contentTransform = getComputedStyle(record.content).transform;
    entry.scrollOverflow = getComputedStyle(record.scroll).overflow;
    entry.scrollSize = [record.scroll.clientWidth, record.scroll.clientHeight, record.scroll.scrollWidth, record.scroll.scrollHeight];
  }
  events.push(entry);
  if (events.length > 100) events.shift();
  sessionStorage.setItem(logKey, JSON.stringify(events));
}
function captureAfterResize() {
  requestAnimationFrame(() => requestAnimationFrame(() => capture('resize')));
}
window.addEventListener('resize', captureAfterResize);
window.visualViewport?.addEventListener('resize', captureAfterResize);
capture('ready');
function showLog() {
  const log = document.querySelector('#diagnostic-log');
  log.hidden = false;
  log.value = JSON.stringify({ userAgent: navigator.userAgent, events }, null, 2);
}
for (const [id, result] of [['record-broken', '異常あり'], ['record-normal', '異常なし']]) {
  document.querySelector(`#${id}`).addEventListener('click', () => {
    capture(result);
    document.querySelector('#result-status').textContent = `${descriptions[mode].slice(0, 1)}：${result}を記録しました。記録は条件を切り替えても、このタブ内に残ります。`;
    showLog();
  });
}
document.querySelector('#show-log').addEventListener('click', () => { capture('manual'); showLog(); });
document.querySelector('#clear-log').addEventListener('click', () => {
  events.length = 0;
  sessionStorage.removeItem(logKey);
  document.querySelector('#result-status').textContent = 'このタブの検証記録を消しました。';
  showLog();
});
