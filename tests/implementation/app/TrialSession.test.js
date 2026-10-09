import test from 'node:test';
import assert from 'node:assert/strict';
import { startTrial } from '../../../src/app/TrialSession.js';
import Camera from '../../../src/game/Camera.js';
import GameClock from '../../../src/game/GameClock.js';
import GameTextRepository from '../../../src/game/GameTextRepository.js';
import { WORLD_SIZE } from '../../../src/game/GameAreas.js';
import { readGameText } from '../../../src/game/readGameText.js';
import { expandLanguageResource, setLanguage } from '../../../../GameWorksOAK/src/lib/core/i18n.js';

// Browser surfaces are inert; the session and all game systems run unchanged.
function createContext() {
  const context = { createPattern: () => ({}), measureText: text => ({ width: String(text).length * 8 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }) };
  for (const name of ['save', 'restore', 'setTransform', 'clearRect', 'translate', 'rotate', 'scale', 'beginPath', 'closePath', 'arc', 'ellipse', 'fill', 'stroke', 'fillRect', 'strokeRect', 'roundRect', 'rect', 'moveTo', 'lineTo', 'quadraticCurveTo', 'bezierCurveTo', 'clip', 'drawImage', 'fillText', 'strokeText', 'setLineDash']) context[name] = () => {};
  return context;
}
class Element {
  constructor(tagName = 'div') {
    this.tagName = tagName; this.children = []; this.hidden = true; this.dataset = {};
    this.style = { setProperty() {} }; this.classList = { add() {}, remove() {} };
    this.clientWidth = 1280; this.clientHeight = 720; this.listeners = new Map();
  }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  setAttribute() {}
  addEventListener(name, callback) { this.listeners.set(name, callback); }
  removeEventListener(name) { this.listeners.delete(name); }
  getContext() { return createContext(); }
  remove() {}
  getBoundingClientRect() { return { x: 0, y: 0, left: 0, top: 0, width: 1280, height: 720 }; }
}

test('trial session connects route selection, information targets and game updates', async t => {
  const previousDocument = globalThis.document;
  const elements = new Map();
  const lookup = selector => {
    if (!elements.has(selector)) elements.set(selector, new Element());
    return elements.get(selector);
  };
  globalThis.document = { body: new Element(), createElement: tag => new Element(tag),
    querySelector: lookup, getElementById: id => lookup('#' + id), addEventListener() {}, removeEventListener() {} };
  t.after(() => { trial.tutorial?.dispose(); trial.flowLog?.dispose(); globalThis.document = previousDocument; });
  setLanguage('ja');
  const textRepository = new GameTextRepository();
  textRepository.resource = expandLanguageResource(readGameText());
  const completed = textRepository.resource.tutorial.scenarios.filter(s => s.id).map(s => s.id);
  const canvas = new Element('canvas');
  const context = createContext();
  const camera = new Camera(WORLD_SIZE); camera.setViewport(1280, 720);
  const clock = new GameClock();
  const trial = {};
  const canvasInput = { controller: null, activePointers: new Map() };
  let informationManager;
  const session = startTrial({ selectedProfessionIds: ['swordfighter', 'guard'], textRepository,
    assets: { load: () => ({ complete: true, naturalWidth: 100, naturalHeight: 100 }) },
    heroProgress: { unlock() {} }, canvas, context, directionCanvas: canvas, directionContext: createContext(),
    camera, clock, trial, canvasInput, informationLayer: { render() {}, setManager: manager => { informationManager = manager; } },
    timeSettingsController: { pauseOnInformation: false, updateStaminaPause() {}, updateClockSpeed() {}, updateStatus() {} },
    overheadStatusSettingsController: { getSettings: () => ({ statuses: [], visibility: 'always' }) },
    dataManager: { getValue: () => ({ completed }), setValue() {} },
  });
  let startupError;
  session.catch(error => { startupError = error; });
  await Promise.resolve();
  assert.ifError(startupError);
  assert.equal(clock.pauseReasons.has('stage-selection'), true);
  assert.equal(trial.stageSelection.container.hidden, false);
  assert.equal(canvasInput.controller, trial.controller);
  assert.equal(informationManager, trial.informationWindows);
  const heroes = trial.controller.getHeroes();
  assert.deepEqual(heroes.map(hero => hero.profession), ['swordfighter', 'guard']);
  assert.equal(trial.controller.getEnemies().length, 0);
  assert.equal(typeof trial.update, 'function');
  assert.ok(session instanceof Promise);

  const root = trial.stageSelection.container.children[0];
  const walk = element => [element, ...(element.children ?? []).flatMap(walk)];
  const route = walk(root).find(element => element.className?.includes('StageSelection__SelectButton'));
  assert.ok(route, 'route selection exposes a selectable choice');
  route.listeners.get('click')();
  assert.equal(clock.pauseReasons.has('stage-selection'), false);
  assert.equal(trial.stageSelection.container.hidden, true);
  for (let frame = 0; frame < 300; frame += 1) trial.update(1 / 60, frame * 1000 / 60);
  assert.ok(trial.controller.getEnemies().length > 0);
  const hero = heroes[0];
  const target = trial.getInformationTarget({ x: hero.chip.x, y: hero.chip.y - hero.chip.height });
  assert.equal(target.type, 'instance');
  assert.equal(trial.informationWindows.getInstance(target.data.target), hero);
  const tickBefore = clock.tick;
  trial.update(1 / 60, 1000);
  assert.ok(clock.tick > tickBefore, 'route selection resumes the connected game clock');
  clock.pause('manual');
  const pausedTick = clock.tick;
  trial.update(1 / 60, 1017);
  assert.equal(clock.tick, pausedTick, 'rendering does not advance a paused game');
});
