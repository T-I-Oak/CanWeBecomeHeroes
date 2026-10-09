import ChipBoard from '../chips/ChipBoard.js';
import ChipRenderer, { createTagAngles } from '../chips/ChipRenderer.js';
import { getConditionIconAtPoint, getConditionIconInformationTarget } from '../chips/ConditionIconLayout.js';
import ItemPickupController from '../game/ItemPickupController.js';
import { GAME_AREAS, WORLD_SIZE } from '../game/GameAreas.js';
import { getTagBaseColors, getTagGlyphScales } from '../game/TagCatalog.js';
import HeroItemInteractionController from '../game/HeroItemInteractionController.js';
import EntityRegistry from '../game/EntityRegistry.js';
import HeroSlotManager from '../game/HeroSlotManager.js';
import StaminaRecoverySystem from '../game/StaminaRecoverySystem.js';
import FacilitySwingSystem from '../game/FacilitySwingSystem.js';
import GameLog from '../game/GameLog.js';
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
import { drawWarehouseMetadata, isWarehousePortalAtPoint } from './WarehouseMetadataRenderer.js';
import TrialRunFlow from './TrialRunFlow.js';
import TrialRunResultModal from './TrialRunResultModal.js';
import { createTrialRunResult } from '../game/TrialRunResult.js';
import { drawWorldSurfaces } from './WorldSurfaceRenderer.js';
import { drawSelectionGuide } from './SelectionGuideRenderer.js';
import { drawShopPanel as drawShopPanelPresentation, getShopPanelSnapshot } from './ShopPanelPresenter.js';
import { drawPreparationHeroPanel, drawTrainingStatusPanel, getTrainingStatusAtPoint, PREPARATION_HERO_STATUS_DEFINITIONS } from './HeroStatusPanelRenderer.js';
import { drawFramedTag, drawItemSlot } from './EquipmentSlotRenderer.js';
import { getPreparationEquipmentItemAtPoint, getPreparationEquipmentTagAtPoint, getPreparationStatusAtPoint, getPreparationTagAtPoint } from './PreparationPanelHitTest.js';
import { getShopItemAtPoint, getShopTagAtPoint } from './ShopPanelHitTest.js';
import { drawOverheadStatuses } from './OverheadStatusRenderer.js';
import { createRunScenario } from '../game/RunScenario.js';
import HeroDirectionIndicatorRenderer from './HeroDirectionIndicatorRenderer.js';
import TutorialController from './TutorialController.js';
import { getHeroDirectionIndicatorAtPoint, getHeroDirectionIndicators } from '../game/HeroDirectionIndicator.js';

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

export async function startTrial({
  selectedProfessionIds, textRepository, assets, heroProgress, canvas, context, directionCanvas, directionContext, camera, clock, informationLayer, trial, canvasInput, timeSettingsController, overheadStatusSettingsController, dataManager,
}) {
  const nameplateBounds = createLocationNameplateBoundsRegistry();
  const board = new ChipBoard(WORLD_SIZE);
  const slotManager = new HeroSlotManager();
  const gameLog = new GameLog({ textRepository });
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
  const trialRunResultModal = new TrialRunResultModal(document.querySelector('#trial-run-result'), { textRepository });
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
  const heroDirectionIndicatorRenderer = new HeroDirectionIndicatorRenderer(directionContext, assets);
  const informationWindows = new InformationWindowManager({
    clock,
    entityRegistry,
    onChange: (entries) => informationLayer.render(entries),
  });
  informationLayer.setManager(informationWindows);
  informationWindows.setPauseOnOpen(timeSettingsController.pauseOnInformation);
  const stageSelection = new StageSelectionModal(document.querySelector('#stage-selection'), {
    assets,
    textRepository,
    onSelect: (choiceId) => {
      stageController.selectStage(choiceId, { tick: clock.tick });
      informationWindows.closeInvalidEntries();
      stageSelection.hide();
      clock.resume('stage-selection');
      tutorial.check();
    },
    onTagSelect: (tag, anchor) => informationWindows.open({ type: 'tag', data: { tag }, anchor }),
    onEnemySelect: (enemy, anchor) => informationWindows.open({ type: 'instance', data: { target: informationWindows.createInstanceTarget(enemy) }, anchor }),
  });

  function openStageSelection(stageNumber = stageController.stageNumber + 1) {
    const choices = stageController.createStageChoices({ stageNumber });
    clock.pause('stage-selection');
    stageSelection.show({ stageNumber, choices });
    tutorial.onStageSelection();
  }

  function getRemainingTrialHours() {
    return getGuildTimeStatus({
      tick: clock.tick,
      contributionPoints: battleSystem.contributionPoints,
      extensionHours: guildSystem.getExtensionHours(),
    }).remainingHours;
  }

  const tutorial = new TutorialController({ camera, clock, canvas, canvasInput, dataManager, textRepository,
    getHeroes: () => controller.getHeroes(), getPreparationHeroes: () => preparationHeroes,
    getItems: () => [...controller.entities.values()].filter(entity => entity.chip.type === 'item'),
    isStageSelecting: () => stageController.state === 'selecting', isActive: () => runController.isActive,
  });
  trial.tutorial = tutorial;
  openStageSelection(1);
  let finishTrial = () => {};
  const completed = new Promise((resolve) => { finishTrial = resolve; });
  const trialRunFlow = new TrialRunFlow({
    clock,
    stageController,
    runController,
    recruitmentController,
    heroProgress,
    getMembers: () => preparationHeroes,
    getRemainingHours: getRemainingTrialHours,
    openStageSelection,
    onRunCompleted: ({ outcome, members }) => {
      trialRunResultModal.show(createTrialRunResult({ outcome, members })).then(finishTrial);
    },
  });

  canvasInput.controller = controller;
  trial.controller = controller;
  trial.informationWindows = informationWindows;
  trial.stageSelection = stageSelection;
  trial.flowLog = flowLog;
  trial.getDirectionIndicators = () => getHeroDirectionIndicators(controller.getHeroes(), camera);
  trial.getScreenTarget = (point) => getHeroDirectionIndicatorAtPoint(trial.getDirectionIndicators(), point);
  trial.getCursor = (point, screenPoint) => (
    trial.getScreenTarget(screenPoint) || isWarehousePortalAtPoint(context, point) ? 'pointer' : ''
  );
  trial.getInformationTarget = (point) => {
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
      const conditionIcon = [...controller.getHeroes(), ...controller.getEnemies()]
        .map((combatant) => getConditionIconAtPoint(combatant.chip, point))
        .find(Boolean);
      if (conditionIcon) return getConditionIconInformationTarget(conditionIcon);
      if (slotItem) return { type: 'instance', data: { target: informationWindows.createInstanceTarget(slotItem) } };
      if (entity) return { type: 'instance', data: { target: informationWindows.createInstanceTarget(entity) } };
      return null;
    };

  trial.update = (deltaSeconds, time) => {
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
      tutorial.check();
    });
    tutorial.check();
    tutorial.update(time);
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
      stageNumber: stageController.stageNumber,
      animationTime: performance.now() / 1000,
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
    const renderChips = board.getRenderChips();
    const timeSeconds = time / 1000;
    renderChips.forEach((chip) => renderer.drawBody(chip, timeSeconds));
    renderChips.forEach((chip) => renderer.drawEffects(chip, timeSeconds, { staminaPauseTarget: staminaPauseTargets.has(chip) }));
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
    directionContext.clearRect(0, 0, directionCanvas.clientWidth, directionCanvas.clientHeight);
    heroDirectionIndicatorRenderer.draw(trial.getDirectionIndicators(), time / 1000);
  };
  return completed;
}
