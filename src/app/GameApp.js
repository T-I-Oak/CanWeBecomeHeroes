import '../styles.css';
import AssetLoader from '../chips/AssetLoader.js';
import ChipBoard from '../chips/ChipBoard.js';
import ChipRenderer, { createTagAngles } from '../chips/ChipRenderer.js';
import ItemPickupController from '../game/ItemPickupController.js';
import Camera from '../game/Camera.js';
import { GAME_AREAS, WORLD_SIZE } from '../game/GameAreas.js';
import { getTagBaseColors, getTagGlyphScales } from '../game/TagCatalog.js';
import HeroItemInteractionController from '../game/HeroItemInteractionController.js';
import EntityRegistry from '../game/EntityRegistry.js';
import HeroSlotManager from '../game/HeroSlotManager.js';
import GameClock from '../game/GameClock.js';
import StaminaRecoverySystem from '../game/StaminaRecoverySystem.js';
import FacilitySwingSystem from '../game/FacilitySwingSystem.js';
import GameLog from '../game/GameLog.js';
import { refreshLocalizedUI } from './LocalizedUI.js';
import FlowLog from './FlowLog.js';
import TrainingSystem from '../game/TrainingSystem.js';
import { getShopLayout, SHOP_TRANSACTION_ARROW_WIDTH } from '../game/ShopLayout.js';
import FacilityReturnSystem from '../game/FacilityReturnSystem.js';
import ShopSystem from '../game/ShopSystem.js';
import BattleSystem from '../game/BattleSystem.js';
import CombatEffectSystem from '../game/CombatEffectSystem.js';
import ItemFactory from '../game/ItemFactory.js';
import EnemySpawnSystem from '../game/EnemySpawnSystem.js';
import { drawGuildPanel } from './GuildPanel.js';
import { getGuildTimeStatus, GUILD_TIMELINE_STANDARD_HOURS } from '../game/GuildTime.js';
import { drawFacilitySlots } from './FacilitySlotRenderer.js';
import { drawFacilityNameplates } from './FacilityNameplateRenderer.js';
import { drawAreaNameplates } from './AreaNameplateRenderer.js';
import createLocationNameplateBoundsRegistry from './LocationNameplateBoundsRegistry.js';
import GuildSystem from '../game/GuildSystem.js';
import StageController from '../game/StageController.js';
import RunController from '../game/RunController.js';
import RecruitmentController from '../game/RecruitmentController.js';
import PreparationHeroProvisioner from '../game/PreparationHeroProvisioner.js';
import EnemyFactory from '../game/EnemyFactory.js';
import StageSelectionModal from './StageSelectionModal.js';
import InformationWindowManager from './InformationWindowManager.js';
import InformationWindowLayer from './InformationWindowLayer.js';
import { APP_COPYRIGHT } from '../game/AppMetadata.js';
import { drawWarehouseMetadata, isWarehousePortalAtPoint } from './WarehouseMetadataRenderer.js';
import { DataManager } from '../../../GameWorksOAK/src/lib/core/dataManager.js';
import TimeSettingsController from './TimeSettingsController.js';
import ModalSelect from './ModalSelect.js';
import OverheadStatusSettingsController from './OverheadStatusSettingsController.js';
import GameCanvasInput from './GameCanvasInput.js';
import TrialRunFlow from './TrialRunFlow.js';
import { drawWorldSurfaces } from './WorldSurfaceRenderer.js';
import { drawSelectionGuide } from './SelectionGuideRenderer.js';
import { drawShopPanel as drawShopPanelPresentation, getShopPanelSnapshot } from './ShopPanelPresenter.js';
import { drawPreparationHeroPanel, drawTrainingStatusPanel, getTrainingStatusAtPoint, PREPARATION_HERO_STATUS_DEFINITIONS } from './HeroStatusPanelRenderer.js';
import { drawFramedTag, drawItemSlot } from './EquipmentSlotRenderer.js';
import { getPreparationEquipmentItemAtPoint, getPreparationEquipmentTagAtPoint, getPreparationStatusAtPoint, getPreparationTagAtPoint } from './PreparationPanelHitTest.js';
import { getShopItemAtPoint, getShopTagAtPoint } from './ShopPanelHitTest.js';
import { drawOverheadStatuses } from './OverheadStatusRenderer.js';
import GameTextRepository from '../game/GameTextRepository.js';
import { onLanguageChange, setupLanguageSelector } from '../../../GameWorksOAK/src/lib/core/i18n.js';
import HeroProgressRepository from '../game/HeroProgressRepository.js';
import StartPartySelection from '../game/StartPartySelection.js';
import StartPartySelectionModal from './StartPartySelectionModal.js';
import { createRunScenario } from '../game/RunScenario.js';

function getChipTagAtPoint(entity, point) {
  const { chip, tags = [] } = entity;
  if (!chip || tags.length === 0) return null;
  const visualX = chip.x + (chip.effectOffsetX ?? 0);
  const visualY = chip.y - chip.height + (chip.effectOffsetY ?? 0);
  const rotation = chip.tilt + chip.poseTilt + (chip.effectRotation ?? 0);
  const scale = chip.scale || 1;
  const translatedX = (point.x - visualX) / scale;
  const translatedY = (point.y - visualY) / scale;
  const localX = translatedX * Math.cos(rotation) + translatedY * Math.sin(rotation);
  const localY = -translatedX * Math.sin(rotation) + translatedY * Math.cos(rotation);
  const iconSize = chip.radius * 0.42;
  const tagRadius = chip.radius * 0.7;
  const angles = createTagAngles(tags.length, 8);
  const tagIndex = angles.findIndex((angle) => Math.hypot(localX - Math.cos(angle) * tagRadius, localY - Math.sin(angle) * tagRadius) <= iconSize * 0.55);
  return tagIndex >= 0 ? tags[tagIndex] : null;
}

function drawShopPanel(context, assets, shop, bag, transaction, texts) {
  const snapshot = getShopPanelSnapshot(shop, bag, transaction);
  drawShopPanelPresentation({ context, assets, snapshot, texts, layout: getShopLayout(GAME_AREAS.shop), drawItemSlot, drawFramedTag, getTagBaseColors, getTagGlyphScales, arrowWidth: SHOP_TRANSACTION_ARROW_WIDTH });
}

export async function startGame() {
  setupLanguageSelector('#language-selector', ['ja', 'en']);
  const languageModalSelect = new ModalSelect(document.querySelector('#language-selector'));
  const textRepository = await new GameTextRepository().load();
  const canvas = document.querySelector('#chip-canvas');
  const context = canvas.getContext('2d');
  const nameplateBounds = createLocationNameplateBoundsRegistry();
  const board = new ChipBoard(WORLD_SIZE);
  const camera = new Camera(WORLD_SIZE);
  const clock = new GameClock();
  const slotManager = new HeroSlotManager();
  refreshLocalizedUI(document, textRepository);
  const gameLog = new GameLog({ textRepository });
  const dataManager = new DataManager('can-we-become-heroes');
  const heroProgress = new HeroProgressRepository(dataManager);
  const assets = new AssetLoader();
  const partySelection = new StartPartySelection({ unlockedProfessionIds: heroProgress.getUnlockedProfessionIds() });
  const selectedProfessionIds = await new StartPartySelectionModal(document.querySelector('#start-party-selection'), { assets, textRepository }).show(partySelection);
  const scenario = createRunScenario({ professionIds: selectedProfessionIds });
  const flowLog = new FlowLog(document.querySelector('#flow-log'), gameLog);
  const entityRegistry = new EntityRegistry();
  const controller = new HeroItemInteractionController(board, new ItemPickupController(board, slotManager, gameLog, textRepository), gameLog, { entityRegistry });
  const { preparationHeroes: initialPreparationHeroes, shop, random = Math.random } = scenario.initialize({ controller });
  const preparationHeroes = [...initialPreparationHeroes];
  const heroProvisioner = new PreparationHeroProvisioner({ controller, random });
  const enemySpawn = new EnemySpawnSystem(controller);
  const returnSystem = new FacilityReturnSystem(board, slotManager, {
    onItemReturned: (item) => controller.addToWarehouse(item),
    onItemDiscarded: (item) => controller.destroy(item, { includeRelated: true }),
  });
  const training = new TrainingSystem(board, slotManager, { gameLog, returnSystem, textRepository });
  const shopSystem = new ShopSystem(board, shop, returnSystem, { onItemPurchased: (item) => controller.addToWarehouse(item), entityRegistry, gameLog, textRepository });
  const combatEffects = new CombatEffectSystem({ textRepository });
  const enemyFactory = new EnemyFactory();
  const battleSystem = new BattleSystem(board, { controller, itemFactory: new ItemFactory(), enemyFactory, returnSystem, effects: combatEffects, gameLog, textRepository });
  const stageController = new StageController({
    enemySpawn,
    battleSystem,
    enemyFactory,
    shopState: shop,
    hasActiveShopHero: () => controller.getHeroes().some((hero) => hero.currentArea === 'shop'),
    entityRegistry,
    random,
  });
  const recruitmentController = new RecruitmentController({
    random,
    onRecruit: (profession) => {
      const hero = heroProvisioner.provision({ profession, preparationIndex: preparationHeroes.length });
      preparationHeroes.push(hero);
      return hero;
    },
  });
  const runController = new RunController();
  const guildSystem = new GuildSystem(returnSystem, {
    getContributionPoints: () => battleSystem.contributionPoints,
    setContributionPoints: (points) => { battleSystem.contributionPoints = points; },
    gameLog,
    textRepository,
  });
  const staminaRecovery = new StaminaRecoverySystem();
  const facilitySwing = new FacilitySwingSystem();
  let guildTimelineHours = GUILD_TIMELINE_STANDARD_HOURS;
  const renderer = new ChipRenderer(context, assets);
  const informationLayer = new InformationWindowLayer(document.querySelector('#information-windows'), null, textRepository);
  const informationWindows = new InformationWindowManager({
    clock,
    isTargetAlive: (target) => entityRegistry.isAlive(target),
    onChange: (entries) => informationLayer.render(entries),
  });
  informationLayer.manager = informationWindows;
  onLanguageChange(async () => { await textRepository.refreshLanguage(); informationWindows.refreshEntries(); stageSelection.refreshLanguage(); refreshLocalizedUI(document, textRepository); flowLog.refreshLanguage(); timeSettingsController.updateStatus(); overheadStatusSettingsController.refreshLabels(); languageModalSelect.refresh(); overheadStatusModalSelect.refresh(); });
  const stageSelection = new StageSelectionModal(document.querySelector('#stage-selection'), {
    assets,
    textRepository,
    onSelect: (choiceId) => {
      stageController.selectStage(choiceId, { tick: clock.tick });
      informationWindows.closeInvalidEntries();
      stageSelection.hide();
      clock.resume('stage-selection');
    },
    onTagSelect: (tag, anchor) => informationWindows.open({ type: 'tag', data: { tag }, anchor }),
    onEnemySelect: (enemy, anchor) => informationWindows.open({ type: 'entity', data: { entity: enemy }, anchor }),
  });

  function openStageSelection(stageNumber = stageController.stageNumber + 1) {
    const choices = stageController.createStageChoices({ stageNumber });
    clock.pause('stage-selection');
    stageSelection.show({ stageNumber, choices });
  }

  function getRemainingTrialHours() {
    return getGuildTimeStatus({
      tick: clock.tick,
      contributionPoints: battleSystem.contributionPoints,
      extensionHours: guildSystem.getExtensionHours(),
    }).remainingHours;
  }

  openStageSelection(1);
  const trialRunFlow = new TrialRunFlow({
    clock,
    stageController,
    runController,
    recruitmentController,
    heroProgress,
    getMembers: () => preparationHeroes,
    getRemainingHours: getRemainingTrialHours,
    openStageSelection,
  });

  function resizeCanvas() {
    const bounds = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.floor(bounds.width * scale);
    canvas.height = Math.floor(bounds.height * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    camera.setViewport(bounds.width, bounds.height);
  }

  const pauseButton = document.querySelector('#pause-game');
  const timeStatus = document.querySelector('#time-status');
  const timeSettings = document.querySelector('#time-settings');
  const timeSettingsToggle = document.querySelector('#time-settings-toggle');
  const timeSettingsClose = document.querySelector('#time-settings-close');
  const speedSlider = document.querySelector('#game-speed');
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
    getHeroes: () => controller.getHeroes(),
    elements: { pauseButton, timeStatus, timeSettings, timeSettingsToggle, timeSettingsClose, speedSlider, pauseOnInformation, pauseOnStaminaFull, accelerateWithoutPreparation },
    onPauseOnInformationChange: (pauseOnOpen) => informationWindows.setPauseOnOpen(pauseOnOpen),
  });
  const overheadStatusSettingsController = new OverheadStatusSettingsController({
    dataManager,
    textRepository,
    elements: { statuses: overheadStatusInputs, visibility: overheadStatusVisibility, statusLabels: overheadStatusLabels },
  });
  const overheadStatusModalSelect = new ModalSelect(overheadStatusVisibility);
  document.addEventListener('pointerdown', (event) => {
    const windowElement = event.target.closest?.('.InformationWindow');
    informationWindows.focus(windowElement?.dataset.informationWindowId ?? null);
  });
  new GameCanvasInput(canvas, {
    camera,
    controller,
    getCursor: (point) => (isWarehousePortalAtPoint(context, point) ? 'pointer' : ''),
    getInformationTarget: (point) => {
      if (isWarehousePortalAtPoint(context, point)) return { type: 'portal' };
      const facility = nameplateBounds.getFacilityAtPoint(point);
      const area = nameplateBounds.getAreaAtPoint(point);
      const status = getPreparationStatusAtPoint(point, preparationHeroes, PREPARATION_HERO_STATUS_DEFINITIONS)
        ?? getTrainingStatusAtPoint(point);
      const tag = getPreparationTagAtPoint(point, preparationHeroes)
        ?? getPreparationEquipmentTagAtPoint(point, preparationHeroes)
        ?? getShopTagAtPoint(point, shop, controller.getShoppingBag(), shopSystem.getTransaction())
        ?? getChipTagAtPoint(controller.getEntityAt(point.x, point.y) ?? {}, point);
      const slotItem = getPreparationEquipmentItemAtPoint(point, preparationHeroes)
        ?? getShopItemAtPoint(point, shop, controller.getShoppingBag(), shopSystem.getTransaction());
      const entity = controller.getEntityAt(point.x, point.y);
      if (facility) return { type: 'facility', data: { facility } };
      if (area) return { type: 'area', data: { area } };
      if (status) return { type: 'status', data: status };
      if (tag) return { type: 'tag', data: { tag } };
      if (slotItem) return { type: 'item', data: { item: slotItem } };
      if (entity) return {
        type: entity.chip.type === 'item' ? 'item' : 'entity',
        data: entity.chip.type === 'item' ? { item: entity } : { entity },
      };
      return null;
    },
    onInformationTarget: (target, event) => informationWindows.open({ ...target, anchor: { x: event.clientX, y: event.clientY } }),
    onPortalOpen: () => window.open(APP_COPYRIGHT.portalUrl, '_blank', 'noopener,noreferrer'),
    onReleaseStaminaPause: () => timeSettingsController.releaseStaminaPause(),
  });

  let previousTime = performance.now();
  function render(time) {
    const deltaSeconds = (time - previousTime) / 1000;
    previousTime = time;
    clock.advance(deltaSeconds, (simulationDeltaSeconds, tickDelta) => {
      enemySpawn.update(clock.tick);
      board.update(simulationDeltaSeconds);
      combatEffects.update(simulationDeltaSeconds);
      controller.update(simulationDeltaSeconds);
      staminaRecovery.update(controller.getHeroes(), simulationDeltaSeconds);
      timeSettingsController.updateStaminaPause();
      timeSettingsController.updateClockSpeed();
      training.update(controller.getHeroes(), simulationDeltaSeconds);
      guildSystem.update(controller.getHeroes(), simulationDeltaSeconds);
      shopSystem.update(controller.getHeroes(), simulationDeltaSeconds);
      battleSystem.update({ heroes: controller.getHeroes(), enemies: controller.getEnemies(), tick: clock.tick, tickDelta });
      informationWindows.closeInvalidEntries();
      informationWindows.refreshDynamicEntries();
      stageController.update();
      trialRunFlow.update(controller.getHeroes());
      facilitySwing.update(controller.getHeroes(), simulationDeltaSeconds, controller.activeHero);
    });
    controller.updateVisuals();
    timeSettingsController.updateStaminaPause();
    timeSettingsController.updateClockSpeed();
    timeSettingsController.updateStatus();
    context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    context.save();
    context.scale(camera.zoom, camera.zoom);
    context.translate(-camera.x, -camera.y);
    drawWorldSurfaces(context, assets, preparationHeroes.length);
    drawFacilityNameplates(context, assets, textRepository, nameplateBounds);
    drawAreaNameplates(context, assets, textRepository, nameplateBounds);
    drawWarehouseMetadata(context);
    drawFacilitySlots(context);
    drawShopPanel(context, assets, shop, controller.getShoppingBag(), shopSystem.getTransaction(), textRepository);
    guildTimelineHours = drawGuildPanel(context, {
      textRepository,
      tick: clock.tick,
      contributionPoints: battleSystem.contributionPoints,
      extensionHours: guildSystem.getExtensionHours(),
      extensionRate: guildSystem.getEstimatedRate(controller.getHeroes().find((hero) => hero.currentArea === 'guild')),
      timelineHours: guildTimelineHours,
    }).timelineHours;
    const trainingHero = controller.getHeroes().find((hero) => hero.currentArea === 'training');
    drawTrainingStatusPanel(context, assets, trainingHero, trainingHero && training.getPresentation(trainingHero), time);
    preparationHeroes.forEach((hero, index) => {
      drawPreparationHeroPanel({
        context,
        assets,
        hero,
        index,
        textRepository,
      });
    });
    const staminaPauseTargets = new Set(controller.getHeroes()
      .filter((hero) => hero.currentArea === 'preparation' && hero.stamina >= hero.maximums.stamina)
      .map((hero) => hero.chip));
    board.getRenderChips().forEach((chip) => renderer.draw(chip, time / 1000, { staminaPauseTarget: staminaPauseTargets.has(chip) }));
    drawOverheadStatuses(
      context,
      [...controller.getHeroes(), ...controller.getEnemies()],
      overheadStatusSettingsController.getSettings(),
      textRepository,
      time / 1000,
    );
    combatEffects.draw(context, assets);
    drawSelectionGuide(context, controller.getSelectionGuide());
    context.restore();
    requestAnimationFrame(render);
  }

  window.addEventListener('resize', () => {
    resizeCanvas();
    informationWindows.refreshEntries();
  });
  resizeCanvas();
  requestAnimationFrame(render);
}
