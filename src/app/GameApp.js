import '../styles.css';
import AssetLoader from '../chips/AssetLoader.js';
import Camera from '../game/Camera.js';
import { GAME_AREAS, WORLD_SIZE } from '../game/GameAreas.js';
import GameClock from '../game/GameClock.js';
import { refreshLocalizedUI } from './LocalizedUI.js';
import InformationWindowLayer from './InformationWindowLayer.js';
import { APP_COPYRIGHT } from '../game/AppMetadata.js';
import { DataManager } from '../../../GameWorksOAK/src/lib/core/dataManager.js';
import TimeSettingsController from './TimeSettingsController.js';
import SettingsModalController from './SettingsModalController.js';
import ModalSelect from './ModalSelect.js';
import OverheadStatusSettingsController from './OverheadStatusSettingsController.js';
import GameCanvasInput from './GameCanvasInput.js';
import GameTextRepository from '../game/GameTextRepository.js';
import { onLanguageChange, setupLanguageSelector } from '../../../GameWorksOAK/src/lib/core/i18n.js';
import HeroProgressRepository from '../game/HeroProgressRepository.js';
import StartPartySelection from '../game/StartPartySelection.js';
import { createStartVignette } from '../game/StartVignette.js';
import StartPartySelectionModal from './StartPartySelectionModal.js';
import VignetteModal from './VignetteModal.js';
import TitleMenu from './TitleMenu.js';
import '../styles/tutorial.css';
import { startTrial } from './TrialSession.js';

export async function startGame() {
  setupLanguageSelector('#language-selector', ['ja', 'en']);
  const languageModalSelect = new ModalSelect(document.querySelector('#language-selector'));
  const textRepository = await new GameTextRepository().load();
  const canvas = document.querySelector('#chip-canvas');
  const context = canvas.getContext('2d');
  const directionCanvas = document.querySelector('#hero-direction-indicators');
  const directionContext = directionCanvas.getContext('2d');
  const camera = new Camera(WORLD_SIZE);
  const clock = new GameClock();
  refreshLocalizedUI(document, textRepository);
  const dataManager = new DataManager('can-we-become-heroes');
  const heroProgress = new HeroProgressRepository(dataManager);
  const assets = new AssetLoader();
  const shell = document.querySelector('.AppShell');
  const hudPanel = document.querySelector('.HudPanel');
  const titleMenu = new TitleMenu(document.querySelector('#title-menu'), {
    textRepository,
    assets,
    heroProgress,
    onOpenSettings: (opener) => settingsModalController.open('menu', { opener }),
  });
  const informationLayer = new InformationWindowLayer(document.querySelector('#information-windows'), null, textRepository, assets);
  const trial = {
    controller: null,
    informationWindows: null,
    stageSelection: null,
    flowLog: null,
    update: null,
    getCursor: null,
    getInformationTarget: null,
  };
  const pauseButton = document.querySelector('#pause-game');
  const timeStatus = document.querySelector('#time-status');
  const timeSettings = document.querySelector('#time-settings');
  const timeSettingsToggle = document.querySelector('#time-settings-toggle');
  const timeSettingsClose = document.querySelector('#time-settings-close');
  const speedRange = document.querySelector('#game-speed-range');
  const speedSlider = document.querySelector('#game-speed');
  const acceleratedSpeedSlider = document.querySelector('#game-accelerated-speed');
  const pauseOnInformation = document.querySelector('#pause-on-information');
  const pauseOnStaminaFull = document.querySelector('#pause-on-stamina-full');
  const accelerateWithoutPreparation = document.querySelector('#accelerate-without-preparation');
  const overheadStatusInputs = [...document.querySelectorAll('input[name="overhead-status"]')];
  const overheadStatusVisibility = document.querySelector('#overhead-status-visibility');
  const overheadStatusLabels = [...document.querySelectorAll('[data-overhead-status]')];
  const timeSettingsController = new TimeSettingsController({
    clock,
    dataManager,
    textRepository,
    getHeroes: () => trial.controller?.getHeroes() ?? [],
    elements: { pauseButton, timeStatus, speedRange, speedSlider, acceleratedSpeedSlider, pauseOnInformation, pauseOnStaminaFull, accelerateWithoutPreparation },
    onPauseOnInformationChange: (pauseOnOpen) => trial.informationWindows?.setPauseOnOpen(pauseOnOpen),
  });
  const overheadStatusSettingsController = new OverheadStatusSettingsController({
    dataManager,
    textRepository,
    elements: { statuses: overheadStatusInputs, visibility: overheadStatusVisibility, statusLabels: overheadStatusLabels },
  });
  const overheadStatusModalSelect = new ModalSelect(overheadStatusVisibility);
  const tutorialResetFeedback = document.querySelector('#tutorial-reset-feedback');
  const settingsModalController = new SettingsModalController({
    modal: timeSettings,
    closeButton: timeSettingsClose,
    sections: {
      language: document.querySelector('#settings-section-language'),
      tutorial: document.querySelector('#settings-section-tutorial'),
      gameProgress: document.querySelector('#settings-section-game-progress'),
      overheadStatus: document.querySelector('#settings-section-overhead-status'),
    },
    clock,
    modalSelects: [languageModalSelect, overheadStatusModalSelect],
    onOpen: () => {
      tutorialResetFeedback.hidden = true;
      timeSettingsController.updateStatus();
    },
    onClose: () => timeSettingsController.updateStatus(),
  });
  timeSettingsToggle.addEventListener('click', () => {
    settingsModalController.open('hud', { opener: timeSettingsToggle });
  });
  document.querySelector('#reset-tutorial').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    tutorialResetFeedback.hidden = true;
    try {
      if (trial.tutorial) await trial.tutorial.reset();
      else dataManager.setValue('tutorialState', { completed: [] });
      tutorialResetFeedback.hidden = false;
    } finally {
      button.disabled = false;
    }
  });
  const canvasInput = new GameCanvasInput(canvas, {
    screenTargetInputRoot: hudPanel,
    camera,
    controller: null,
    getCursor: (point, screenPoint) => trial.getCursor?.(point, screenPoint) ?? '',
    getInformationTarget: (point) => trial.getInformationTarget?.(point) ?? null,
    getScreenTarget: (point) => trial.getScreenTarget(point),
    onScreenTarget: (target) => camera.centerOnWorldPoint(target.hero.chip),
    onInformationTarget: (target, event) => trial.informationWindows?.open({ ...target, anchor: { x: event.clientX, y: event.clientY } }),
    onPortalOpen: () => window.open(APP_COPYRIGHT.portalUrl, '_blank', 'noopener,noreferrer'),
    onReleaseStaminaPause: () => timeSettingsController.releaseStaminaPause(),
  });
  document.addEventListener('keydown', (event) => {
    // どのキーであっても標準的なUI操作を防止し、ポインター専用とする
    if (['Tab', 'Enter', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
    }
  });
  document.addEventListener('focusin', (event) => {
    // selectやtextareaはキーボードやリスト選択にフォーカスが必要なため除外
    // input（checkboxやrange等）はポインター操作で機能し、フォーカスを残さない
    const tagName = event.target?.tagName;
    if (tagName === 'SELECT' || tagName === 'TEXTAREA') return;

    // それ以外の要素（ボタンやinput等）にフォーカスが残るのを完全に防ぐ
    event.target?.blur?.();
  });
  document.addEventListener('pointerdown', (event) => {
    const windowElement = event.target.closest?.('.InformationWindow');
    trial.informationWindows?.focus(windowElement?.dataset.informationWindowId ?? null);
  });

  let lastHudZoom = null;
  function syncHudScale() {
    if (camera.zoom !== lastHudZoom) {
      lastHudZoom = camera.zoom;
      const prepScreenWidth = GAME_AREAS.preparation.width * camera.zoom;
      const scale = Math.min(1, prepScreenWidth / 296);
      hudPanel?.style.setProperty('--hud-scale', scale);
    }
  }

  function resizeCanvas() {
    const bounds = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.floor(bounds.width * scale);
    canvas.height = Math.floor(bounds.height * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    directionCanvas.width = Math.floor(bounds.width * scale);
    directionCanvas.height = Math.floor(bounds.height * scale);
    directionContext.setTransform(scale, 0, 0, scale, 0, 0);
    camera.setViewport(bounds.width, bounds.height);
    syncHudScale();
  }

  let previousTime = performance.now();
  function render(time) {
    syncHudScale();
    const deltaSeconds = (time - previousTime) / 1000;
    previousTime = time;
    canvasInput.update(deltaSeconds);
    if (trial.update) trial.update(deltaSeconds, time);
    else {
      context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      directionContext.clearRect(0, 0, directionCanvas.clientWidth, directionCanvas.clientHeight);
    }
    requestAnimationFrame(render);
  }

  window.addEventListener('resize', () => {
    resizeCanvas();
    trial.informationWindows?.refreshEntries();
  });
  resizeCanvas();
  requestAnimationFrame(render);
  onLanguageChange(async () => {
    await textRepository.refreshLanguage();
    titleMenu.refreshLanguage();
    trial.informationWindows?.refreshEntries();
    trial.stageSelection?.refreshLanguage();
    refreshLocalizedUI(document, textRepository);
    trial.flowLog?.refreshLanguage();
    timeSettingsController.updateStatus();
    overheadStatusSettingsController.refreshLabels();
    languageModalSelect.refresh();
    overheadStatusModalSelect.refresh();
    trial.tutorial?.refreshLanguage();
  });

  while (true) {
    shell.classList.add('state-title');
    canvasInput.controller = null;
    settingsModalController.close();
    const action = await titleMenu.show();
    if (action !== 'trial') continue;
    const partySelection = new StartPartySelection({ unlockedProfessionIds: heroProgress.getUnlockedProfessionIds() });
    const selectedProfessionIds = await new StartPartySelectionModal(document.querySelector('#start-party-selection'), { assets, textRepository }).show(partySelection);
    shell.classList.remove('state-title');
    await new VignetteModal(document.querySelector('#vignette'), { assets, clock }).play(createStartVignette({ professionIds: selectedProfessionIds, textRepository }));
    camera.fitToScreen();
    resizeCanvas();
    await startTrial({
      selectedProfessionIds, textRepository, assets, heroProgress, canvas, context, directionCanvas, directionContext, camera, clock, informationLayer, trial, canvasInput, timeSettingsController, overheadStatusSettingsController, dataManager,
    });
    trial.tutorial?.dispose();
    trial.tutorial = null;
    clock.reset();
    trial.update = null;
    trial.controller = null;
    trial.getCursor = null;
    trial.getInformationTarget = null;
    canvasInput.controller = null;
    trial.informationWindows?.clear({ includePinned: true });
    trial.stageSelection?.hide();
    trial.flowLog?.dispose();
    trial.flowLog = null;
    context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    directionContext.clearRect(0, 0, directionCanvas.clientWidth, directionCanvas.clientHeight);
  }
}
