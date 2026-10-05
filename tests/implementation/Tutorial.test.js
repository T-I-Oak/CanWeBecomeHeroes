import test from 'node:test';
import assert from 'node:assert/strict';
import { TutorialManager } from '../../../GameWorksOAK/src/lib/core/tutorialManager.js';
import { expandLanguageResource, setLanguage } from '../../../GameWorksOAK/src/lib/core/i18n.js';
import { readGameText } from '../../src/game/readGameText.js';
import { calculateTutorialFocus, calculateRestoredCamera, getTutorialTimings } from '../../src/app/TutorialController.js';
import Camera from '../../src/game/Camera.js';
import GameClock from '../../src/game/GameClock.js';

function scenarios() { setLanguage('ja'); return expandLanguageResource(readGameText()).tutorial.scenarios; }

test('camera restoration uses normal viewport calculations with and without resizing', () => {
  const camera = new Camera({ width: 3000, height: 2000 });
  camera.setViewport(1200, 700);
  const saved = { x: 400, y: 300, zoom: 1, viewport: { width: 1200, height: 700 } };
  assert.deepEqual(calculateRestoredCamera(saved, camera), { x: 400, y: 300, zoom: 1 });
  camera.setViewport(390, 844);
  const restored = calculateRestoredCamera(saved, camera);
  assert.equal(restored.zoom, 1);
  assert.equal(restored.x + 390 / 2, 1000);
  assert.equal(restored.y + 844 / 2, 650);
  const fit = { x: -200, y: -200, zoom: 700 / 2400, viewport: saved.viewport };
  const portrait = calculateRestoredCamera(fit, camera);
  assert.equal(portrait.zoom, camera.getEffectiveMinZoom());
  const range = camera.getRange.bind({ ...camera, zoom: portrait.zoom });
  for (const [axis, dimension, size] of [['x', 'width', 390], ['y', 'height', 844]]) {
    const bounds = range(dimension, size);
    assert.ok(portrait[axis] >= bounds.min && portrait[axis] <= bounds.max);
  }
});

test('shared engine enforces the fork prerequisites and joins only after all four branches', () => {
  const manager = new TutorialManager(scenarios());
  assert.equal(manager.willTrigger('arrival:shop', {}), false);
  manager.state = { completed: ['trial-selection-intro', 'game-screen-intro', 'departure-intro'] };
  for (const id of ['shop-detail', 'training-detail', 'guild-detail', 'battle-detail']) {
    const trigger = `arrival:${id.replace('-detail', '')}`;
    assert.equal(manager.willTrigger(trigger, {}), true);
    assert.equal(manager.willTrigger('gameplay', {}), false);
    manager.state.completed.push(id);
    assert.equal(manager.willTrigger(trigger, {}), false);
  }
  assert.equal(manager.willTrigger('gameplay', {}), true);
  const restored = new TutorialManager(scenarios(), { initialState: manager.getState() });
  assert.equal(restored.willTrigger('gameplay', {}), true);
  assert.equal(restored.willTrigger('arrival:shop', {}), false);
});

test('candidate selection waits for recovery, queues simultaneous arrivals, and disarms on reset', () => {
  const hero = { currentArea: 'preparation', stamina: 2.99 };
  const input = { stageSelecting: false, active: true, heroes: [hero], armed: true };
  assert.deepEqual(getTutorialTimings(input).map(timing => timing.trigger), ['game-screen', 'gameplay']);
  hero.stamina = 3;
  assert.deepEqual(getTutorialTimings(input).map(timing => timing.trigger), ['game-screen', 'stamina-ready', 'gameplay']);
  assert.deepEqual(getTutorialTimings({ ...input, armed: false }), []);
  hero.currentArea = 'shop';
  assert.deepEqual(getTutorialTimings(input).map(timing => timing.trigger), ['game-screen', 'gameplay']);
  input.arrivals = new Map([['shop', hero], ['training', { currentArea: 'training' }]]);
  assert.deepEqual(getTutorialTimings(input).map(timing => timing.trigger), ['game-screen', 'arrival:shop', 'arrival:training', 'gameplay']);
});

test('changing scenario IDs and dependencies needs no game timing changes', () => {
  const changed = [
    { id: 'custom-shop', trigger: 'arrival:shop', requires: [], pages: [{ message: 'shop' }] },
    { id: 'custom-join', trigger: 'gameplay', requires: ['custom-shop'], pages: [{ message: 'done' }] },
  ];
  const manager = new TutorialManager(changed);
  const timings = getTutorialTimings({ stageSelecting: false, active: true, heroes: [], armed: true, arrivals: new Map([['shop', {}]]) });
  assert.equal(timings.find(timing => manager.willTrigger(timing.trigger, timing)).trigger, 'arrival:shop');
  manager.state.completed.push('custom-shop');
  assert.equal(timings.find(timing => manager.willTrigger(timing.trigger, timing)).trigger, 'gameplay');
});

test('focus shows large areas and small chips above the explanation across portrait and landscape screens', () => {
  for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    for (const bounds of [{ x: 1000, y: 1000, width: 1344, height: 1120 }, { x: 2152, y: 650, width: 75, height: 75 }]) {
      const focus = calculateTutorialFocus(bounds, viewport);
      const left = (bounds.x - focus.x) * focus.zoom;
      const top = (bounds.y - focus.y) * focus.zoom;
      assert.ok(left >= 23.99);
      assert.ok(top >= 23.99);
      assert.ok(left + bounds.width * focus.zoom <= viewport.width - 23.99);
      assert.ok(top + bounds.height * focus.zoom < viewport.height * .56);
    }
  }
});

test('releasing a tutorial pause preserves manual pause and the task selection pause', () => {
  const clock = new GameClock();
  clock.paused = true;
  clock.pause('tutorial');
  clock.pause('stage-selection');
  clock.resume('tutorial');
  assert.equal(clock.isPaused, true);
  clock.paused = false;
  assert.equal(clock.isPaused, true);
  clock.resume('stage-selection');
  assert.equal(clock.isPaused, false);
});

test('approved stamina wording uses display units and translations cover every tutorial page', () => {
  const resource = readGameText();
  for (const s of resource.tutorial.scenarios) {
    for (const p of s.pages) {
      assert.ok(p.message['lang-store'].ja);
      assert.ok(p.message['lang-store'].en);
      assert.doesNotMatch(p.message['lang-store'].ja, /スタミナ(?:が|を)?3(?:以上|消費)/);
    }
  }
});
