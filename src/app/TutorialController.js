import { TutorialManager } from '../../../GameWorksOAK/src/lib/core/tutorialManager.js';
import { GAME_AREAS, getPreparationSubareaBounds } from '../game/GameAreas.js';
import { PREPARATION_LAYOUT } from '../game/PreparationLayout.js';
import { getPreparationEquipmentOrigin } from './PreparationPanelHitTest.js';
import { getShopLayout } from '../game/ShopLayout.js';
import Camera from '../game/Camera.js';

export const TUTORIAL_STATE_KEY = 'tutorialState';
const PAUSE_REASON = 'tutorial';

export function calculateRestoredCamera(saved, camera) {
  const restored = new Camera(camera.world, { minZoom: camera.minZoom, maxZoom: camera.maxZoom, padding: camera.padding });
  Object.assign(restored, { x: saved.x, y: saved.y, zoom: saved.zoom, viewport: { ...saved.viewport } });
  restored.setViewport(camera.viewport.width, camera.viewport.height);
  return { x: restored.x, y: restored.y, zoom: restored.zoom };
}

export function getTutorialTimings({ stageSelecting, active, heroes, armed, arrivals = new Map() }) {
  if (!armed) return [];
  if (stageSelecting) return [{ trigger: 'stage-selection' }];
  if (!active) return [];
  const timings = [{ trigger: 'game-screen' }];
  const hero = heroes.find(hero => hero.currentArea === 'preparation' && hero.stamina >= 3);
  if (hero) timings.push({ trigger: 'stamina-ready', hero });
  for (const [area, hero] of arrivals) timings.push({ trigger: `arrival:${area}`, hero });
  timings.push({ trigger: 'gameplay' });
  return timings;
}

export function calculateTutorialFocus(bounds, viewport, maximumZoom = 1.5) {
  // Reserve the bottom portion for the explanation, including on narrow screens.
  const margin = 24;
  const availableWidth = Math.max(1, viewport.width - margin * 2);
  const availableHeight = Math.max(1, viewport.height * 0.52 - margin * 2);
  const zoom = Math.min(maximumZoom, availableWidth / bounds.width, availableHeight / bounds.height);
  return {
    zoom,
    x: bounds.x + bounds.width / 2 - viewport.width / (2 * zoom),
    y: bounds.y + bounds.height / 2 - viewport.height * 0.28 / zoom,
  };
}

export default class TutorialController {
  constructor({ camera, clock, canvas, canvasInput, dataManager, textRepository, getHeroes, getPreparationHeroes, getItems, isStageSelecting, isActive }) {
    Object.assign(this, { camera, clock, canvas, canvasInput, dataManager, textRepository, getHeroes, getPreparationHeroes, getItems, isStageSelecting, isActive });
    this.armed = true;
    this.hero = null;
    this.savedCamera = null;
    this.scenarioActive = false;
    this.transition = null;
    this.viewport = { ...camera.viewport };
    this.previousAreas = new Map();
    this.arrivals = new Map();
    this.hudPanel = document.querySelector('.HudPanel');
    this.root = document.createElement('section');
    this.root.id = 'tutorial-layer';
    this.root.hidden = true;
    this.root.innerHTML = '<canvas id="tutorial-mask-canvas" class="hidden" aria-hidden="true"></canvas><section id="tutorial-tooltip" class="hidden" role="dialog" aria-modal="true" aria-labelledby="tutorial-title"><span class="tooltip-arrow" aria-hidden="true"></span><h2 id="tutorial-title"></h2><p id="tutorial-message"></p><footer><span id="tutorial-page-count"></span><button id="tutorial-next-btn" type="button">次へ</button></footer></section>';
    document.body.append(this.root);
    this.blockInput = event => {
      if (!this.scenarioActive || this.root.contains(event.target)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    for (const event of ['pointerdown', 'pointermove', 'pointerup', 'wheel', 'click', 'keydown']) document.addEventListener(event, this.blockInput, true);
    this.manager = new TutorialManager(this.getScenarios(), {
      initialState: dataManager.getValue(TUTORIAL_STATE_KEY),
      onSaveState: state => dataManager.setValue(TUTORIAL_STATE_KEY, state),
      nextButtonSelector: '#tutorial-next-btn',
      elementScrollDelayMs: 0,
      onCalculateRect: highlight => highlight.targetType
        ? this.screenBounds(this.worldBounds(highlight.targetType))
        : document.getElementById(highlight.elementId).getBoundingClientRect(),
      onBeforeScenario: () => {
        if (this.canvasInput) {
          this.canvasInput.drag = null;
          this.canvasInput.pinch = null;
          this.canvasInput.activePointers.clear();
          this.canvasInput.pinchLockout = false;
          this.canvasInput.controller?.clearSelection();
        }
        this.scenarioActive = true;
        this.hudPanel.classList.add('is-tutorial-hidden');
        this.root.hidden = false;
        this.clock.pause(PAUSE_REASON);
      },
      onBeforeShowPage: context => this.preparePage(context),
      onAfterShowPage: context => this.layoutPage(context),
      onAfterScenario: () => this.finishScenario(),
      onActionResume: () => this.clock.resume(PAUSE_REASON),
    });
  }

  getScenarios() {
    return this.textRepository.resource.tutorial.scenarios.map(scenario => ({
      ...scenario,
      pages: scenario.pages.map(page => ({
        ...page,
        highlight: page.target ? [{
          ...(page.target === 'stage-selection' || page.target === 'time-settings-toggle'
            ? { elementId: page.target === 'stage-selection' ? 'tutorial-stage-choices' : page.target } : { targetType: page.target }),
          shape: 'rect', padding: 8, radius: 12,
        }] : [],
      })),
    }));
  }

  check() {
    const heroes = this.getHeroes();
    for (const hero of heroes) {
      if (this.armed && GAME_AREAS[hero.currentArea]
        && this.previousAreas.get(hero) !== hero.currentArea) this.arrivals.set(hero.currentArea, hero);
      this.previousAreas.set(hero, hero.currentArea);
    }
    if (this.scenarioActive || this.manager.isAdvancing) return;
    for (const timing of getTutorialTimings({ stageSelecting: this.isStageSelecting(), active: this.isActive(), heroes, armed: this.armed, arrivals: this.arrivals })) {
      if (!this.manager.willTrigger(timing.trigger, timing)) continue;
      this.hero = timing.hero ?? null;
      this.manager.checkTrigger(timing.trigger, timing);
      break;
    }
  }

  onStageSelection() { this.armed = true; this.check(); }

  async reset() {
    this.armed = false;
    this.arrivals.clear();
    await this.manager.resetTutorialAsync();
    await this.finishScenario();
    this.clock.resume(PAUSE_REASON);
  }

  worldBounds(target) {
    if (target === 'preparation') {
      const first = getPreparationSubareaBounds(0);
      const last = getPreparationSubareaBounds(this.getPreparationHeroes().length - 1);
      return { ...first, height: last.y + last.height - first.y };
    }
    if (GAME_AREAS[target]) return GAME_AREAS[target];
    if (target === 'sale-board') return getShopLayout(GAME_AREAS.shop).saleBoards.sale;
    if (target === 'equipment') {
      const index = this.getPreparationHeroes().indexOf(this.hero);
      const layout = PREPARATION_LAYOUT;
      return { ...getPreparationEquipmentOrigin(Math.max(0, index)),
        width: layout.itemAreaWidth, height: layout.equipmentSlotSize * 3 + layout.equipmentGap * 2 };
    }
    const entity = target === 'hero' ? this.hero : this.getItems().find(item => item.type === target);
    if (!entity) throw new Error(`Tutorial target unavailable: ${target}`);
    const { x, y, radius } = entity.chip;
    return { x: x - radius, y: y - radius, width: radius * 2, height: radius * 2 };
  }

  screenBounds(bounds) {
    const canvasBounds = this.canvas.getBoundingClientRect();
    return { left: canvasBounds.left + (bounds.x - this.camera.x) * this.camera.zoom,
      top: canvasBounds.top + (bounds.y - this.camera.y) * this.camera.zoom,
      width: bounds.width * this.camera.zoom, height: bounds.height * this.camera.zoom };
  }

  async preparePage({ page }) {
    const highlightsHud = page.highlight.some(highlight => highlight.elementId
      && this.hudPanel.contains(document.getElementById(highlight.elementId)));
    this.hudPanel.classList.toggle('is-tutorial-hidden', !highlightsHud);
    if (page.highlight[0]?.targetType) {
      this.savedCamera ??= { x: this.camera.x, y: this.camera.y, zoom: this.camera.zoom,
        viewport: { ...this.camera.viewport } };
      await this.moveCamera(calculateTutorialFocus(this.worldBounds(page.target), this.camera.viewport, this.camera.maxZoom));
    } else if (this.savedCamera) {
      await this.restoreCamera();
    }
  }

  moveCamera(target) {
    return new Promise(resolve => { this.transition = { from: { x: this.camera.x, y: this.camera.y, zoom: this.camera.zoom }, target, start: performance.now(), resolve }; });
  }

  update(time) {
    const viewport = this.camera.viewport;
    if (viewport.width !== this.viewport.width || viewport.height !== this.viewport.height) {
      this.viewport = { ...viewport };
      if (this.restoringCamera && this.transition) {
        this.transition.from = { x: this.camera.x, y: this.camera.y, zoom: this.camera.zoom };
        this.transition.target = calculateRestoredCamera(this.restoringCamera, this.camera);
        this.transition.start = time;
      }
      if (this.scenarioActive && this.savedCamera) {
        const page = this.manager.getCurrentStep().pages[this.manager.currentPageIndex];
        if (page.highlight[0]?.targetType) {
          const target = calculateTutorialFocus(this.worldBounds(page.target), viewport, this.camera.maxZoom);
          if (this.transition) {
            this.transition.from = { x: this.camera.x, y: this.camera.y, zoom: this.camera.zoom };
            this.transition.target = target;
            this.transition.start = time;
          } else {
            Object.assign(this.camera, target);
          }
        }
      }
    }
    if (this.transition) {
      const { from, target, start, resolve } = this.transition;
      const t = Math.min(1, Math.max(0, (time - start) / 320));
      const eased = t * t * (3 - 2 * t);
      for (const key of ['x', 'y', 'zoom']) this.camera[key] = from[key] + (target[key] - from[key]) * eased;
      if (t === 1) { Object.assign(this.camera, target); this.transition = null; resolve(); }
    }
    if (this.manager.isShowing && !this.manager.isAdvancing) {
      this.manager.updateMask();
      this.layoutPage(this.manager.getLifecycleContext());
    }
  }

  layoutPage({ page, scenario, pageIndex }) {
    const tooltip = this.root.querySelector('#tutorial-tooltip');
    const centered = !page.target;
    tooltip.classList.toggle('is-centered', centered);
    tooltip.style.bottom = 'auto';
    this.root.querySelector('.tooltip-arrow').hidden = centered;
    if (centered) {
      tooltip.style.left = '50%';
      tooltip.style.top = '50%';
    }
    this.root.querySelector('#tutorial-page-count').textContent = `${pageIndex + 1} / ${scenario.pages.length}`;
    this.root.querySelector('#tutorial-next-btn').textContent = this.textRepository.getLabel(pageIndex + 1 === scenario.pages.length ? 'close' : 'tutorialNext');
    if (!centered) this.manager.positionTooltip(page);
  }

  async restoreCamera() {
    if (!this.savedCamera) return;
    const saved = this.savedCamera;
    this.savedCamera = null;
    this.restoringCamera = saved;
    await this.moveCamera(calculateRestoredCamera(saved, this.camera));
    this.restoringCamera = null;
  }

  async finishScenario() {
    await this.restoreCamera();
    this.scenarioActive = false;
    this.hudPanel.classList.remove('is-tutorial-hidden');
    this.root.hidden = true;
  }

  refreshLanguage() {
    this.manager.scenarios = this.getScenarios();
    if (this.manager.isShowing) {
      this.manager.showTooltip(this.manager.getCurrentStep().pages[this.manager.currentPageIndex]);
      this.layoutPage(this.manager.getLifecycleContext());
    }
  }

  dispose() {
    for (const event of ['pointerdown', 'pointermove', 'pointerup', 'wheel', 'click', 'keydown']) document.removeEventListener(event, this.blockInput, true);
    this.manager.nextButtonElement?.removeEventListener('click', this.manager.boundNextButtonHandler);
    this.transition?.resolve();
    this.clock.resume(PAUSE_REASON);
    this.hudPanel.classList.remove('is-tutorial-hidden');
    this.root.remove();
  }
}
