import '../styles.css';
import AssetLoader from '../chips/AssetLoader.js';
import ChipBoard from '../chips/ChipBoard.js';
import ChipRenderer, { createTagAngles, getCenterImagePlacement } from '../chips/ChipRenderer.js';
import ItemPickupController from '../game/ItemPickupController.js';
import Camera from '../game/Camera.js';
import { GAME_AREAS, getPreparationSubareaBounds, WORLD_SIZE } from '../game/GameAreas.js';
import { HERO_PREPARATION_IMAGE_SIZE, PREPARATION_LAYOUT, PREPARATION_PANEL_WIDTH } from '../game/PreparationLayout.js';
import { getTagBaseColors, getTagGlyphScales } from '../game/TagCatalog.js';
import { getVitalGaugeColor, STATUS_VISUALS } from '../game/StatusVisualCatalog.js';
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
import GameCanvasInput from './GameCanvasInput.js';
import TrialRunFlow from './TrialRunFlow.js';
import { drawWorldSurfaces } from './WorldSurfaceRenderer.js';
import { drawSelectionGuide } from './SelectionGuideRenderer.js';
import { getRevealedPurchaseEntries, getShopPanelSnapshot, getShopPurchasePresentation, getShopSoldItems, SHOP_PURCHASE_SLOT_GRID } from './ShopPanelPresenter.js';
import { drawHeroTagList, drawStatusGauge, drawTrainingStatusPanel, drawWeightGauge, getTrainingStatusGaugeBounds, HERO_STATUS_DEFINITIONS } from './HeroStatusPanelRenderer.js';
import { drawFramedTag, drawItemSlot } from './EquipmentSlotRenderer.js';
import { EQUIPMENT_SLOT_GRID, EQUIPMENT_SLOTS, getPreparationEquipmentOrigin, getPreparationStatusAtPoint, getPreparationTagAtPoint, PREPARATION_TAG_GRID } from './PreparationPanelHitTest.js';
import { getWeightFillRatio } from '../game/WeightVisual.js';
import GameTextRepository from '../game/GameTextRepository.js';
import { onLanguageChange, setupLanguageSelector } from '../../../GameWorksOAK/src/lib/core/i18n.js';
import HeroProgressRepository from '../game/HeroProgressRepository.js';
import StartPartySelection from '../game/StartPartySelection.js';
import StartPartySelectionModal from './StartPartySelectionModal.js';
import { createRunScenario } from '../game/RunScenario.js';

const STATUS_DEFINITIONS = HERO_STATUS_DEFINITIONS;
const WEIGHT_STATUS_DEFINITION = Object.freeze({ key: 'weight', visual: STATUS_VISUALS.weight });
const PREPARATION_STATUS_DEFINITIONS = Object.freeze([...STATUS_DEFINITIONS, WEIGHT_STATUS_DEFINITION]);
function isPointInRect(point, x, y, width, height) {
  return point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + height;
}

function getTrainingStatusAtPoint(point, hero) {
  for (let statusIndex = 0; statusIndex < STATUS_DEFINITIONS.length; statusIndex += 1) {
    const { key } = STATUS_DEFINITIONS[statusIndex];
    const bounds = getTrainingStatusGaugeBounds(statusIndex);
    // The icon is intentionally small.  The whole gauge is the interaction target,
    // so training status remains usable with both mouse and touch input.
    if (!isPointInRect(point, bounds.x, bounds.y, bounds.width, bounds.height)) continue;
    return { status: key };
  }
  return null;
}

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

function getItemSlotTagAtPoint(point, item, slotX, slotY) {
  if (!item) return null;
  const tagSize = PREPARATION_LAYOUT.equipmentTagIconSize;
  const tagGap = PREPARATION_LAYOUT.equipmentTagGap;
  const tagWidth = item.chip.tagPaths.length * tagSize + Math.max(0, item.chip.tagPaths.length - 1) * tagGap;
  const tagStartX = slotX + (PREPARATION_LAYOUT.equipmentSlotSize - tagWidth) / 2;
  const tagIndex = item.tags.findIndex((tag, index) => isPointInRect(point, tagStartX + index * (tagSize + tagGap), slotY + 2, tagSize, tagSize));
  return tagIndex >= 0 ? item.tags[tagIndex] : null;
}

function getItemSlotAtPoint(point, item, slotX, slotY) {
  if (!item) return null;
  return isPointInRect(point, slotX, slotY, PREPARATION_LAYOUT.equipmentSlotSize, PREPARATION_LAYOUT.equipmentSlotSize) ? item : null;
}

function drawEquipmentGrid(context, assets, hero, x, y) {
  const slotSize = PREPARATION_LAYOUT.equipmentSlotSize;
  const gap = PREPARATION_LAYOUT.equipmentGap;
  const startX = x
    + PREPARATION_LAYOUT.topPadding
    + PREPARATION_LAYOUT.characterAreaWidth
    + PREPARATION_LAYOUT.areaGap
    + PREPARATION_LAYOUT.informationAreaWidth
    + PREPARATION_LAYOUT.areaGap;
  EQUIPMENT_SLOTS.forEach((slot) => {
    const [column, row] = EQUIPMENT_SLOT_GRID[slot];
    const slotX = startX + column * (slotSize + gap);
    const slotY = y + row * (slotSize + gap);
    drawItemSlot(context, assets, hero.equipment[slot], slotX, slotY);
  });
}

function getPreparationItemTagAtPoint(point, heroes) {
  const slotSize = PREPARATION_LAYOUT.equipmentSlotSize;
  const gap = PREPARATION_LAYOUT.equipmentGap;
  for (let index = 0; index < heroes.length; index += 1) {
    const hero = heroes[index];
    const { x: startX, y: startY } = getPreparationEquipmentOrigin(index);
    for (const slot of EQUIPMENT_SLOTS) {
      const [column, row] = EQUIPMENT_SLOT_GRID[slot];
      const tag = getItemSlotTagAtPoint(point, hero.equipment[slot], startX + column * (slotSize + gap), startY + row * (slotSize + gap));
      if (tag) return tag;
    }
  }
  return null;
}

function getPreparationItemAtPoint(point, heroes) {
  const slotSize = PREPARATION_LAYOUT.equipmentSlotSize;
  const gap = PREPARATION_LAYOUT.equipmentGap;
  for (let index = 0; index < heroes.length; index += 1) {
    const hero = heroes[index];
    const { x: startX, y: startY } = getPreparationEquipmentOrigin(index);
    for (const slot of EQUIPMENT_SLOTS) {
      const [column, row] = EQUIPMENT_SLOT_GRID[slot];
      const item = getItemSlotAtPoint(point, hero.equipment[slot], startX + column * (slotSize + gap), startY + row * (slotSize + gap));
      if (item) return item;
    }
  }
  return null;
}

function drawShopPanel(context, assets, shop, bag, transaction, texts) {
  const snapshot = getShopPanelSnapshot(shop, bag, transaction);
  if (!snapshot) return;
  const area = GAME_AREAS.shop;
  const layout = getShopLayout(area);
  const drawTrend = (label, tag, board) => {
    const panelCenterX = board.x + board.width / 2;
    const { x: boardX, y, width: boardWidth, height: boardHeight } = board;
    context.fillStyle = '#263b2a';
    context.strokeStyle = '#9b7142';
    context.lineWidth = 4;
    context.beginPath();
    context.roundRect(boardX, y, boardWidth, boardHeight, 8);
    context.fill();
    context.stroke();

    context.fillStyle = '#f2e8c8';
    context.font = 'bold 16px system-ui';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(label, panelCenterX, y + 26);
    drawFramedTag(context, assets, `/assets/tags/${tag}.png`, getTagBaseColors([tag])[0], getTagGlyphScales([tag])[0], panelCenterX - 24, y + 44, 48);
  };
  drawTrend(texts.getLabel('shopSale'), snapshot.saleTag, layout.saleBoards.sale);
  drawTrend(texts.getLabel('shopNext'), snapshot.nextTag, layout.saleBoards.next);

  const bagSize = 48;
  const { slotSize, gap, top, sellItemsTop, bagX, bagY, sellX, arrowX, purchaseX } = layout.transaction;
  const bagImage = assets.load('/assets/items/hand-shopping-bag.png');
  if (bagImage.complete && bagImage.naturalWidth > 0) context.drawImage(bagImage, bagX, bagY, bagSize, bagSize);
  snapshot.soldItems.forEach((item, index) => {
    drawItemSlot(context, assets, item, sellX + index * (slotSize + gap), sellItemsTop);
  });
  const { setStart: purchaseSetStart, revealedCount: revealedInSet } = getShopPurchasePresentation(transaction);
  SHOP_PURCHASE_SLOT_GRID.forEach(([column, row], index) => {
    const purchase = transaction?.purchases[purchaseSetStart + index];
    drawItemSlot(context, assets, index < revealedInSet ? purchase.item : null, purchaseX + (column - 1) * (slotSize + gap), top + row * (slotSize + gap));
  });
  const arrowY = sellItemsTop + slotSize / 2;
  const arrowWidth = SHOP_TRANSACTION_ARROW_WIDTH;
  const arrowHeight = 30;
  context.fillStyle = '#f7f0d7';
  context.strokeStyle = '#9b7142';
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(arrowX, arrowY - arrowHeight / 2);
  context.lineTo(arrowX + arrowWidth - 14, arrowY - arrowHeight / 2);
  context.lineTo(arrowX + arrowWidth - 14, arrowY - arrowHeight);
  context.lineTo(arrowX + arrowWidth, arrowY);
  context.lineTo(arrowX + arrowWidth - 14, arrowY + arrowHeight);
  context.lineTo(arrowX + arrowWidth - 14, arrowY + arrowHeight / 2);
  context.lineTo(arrowX, arrowY + arrowHeight / 2);
  context.closePath();
  context.fill();
  context.stroke();
  context.textAlign = 'start';
  context.textBaseline = 'alphabetic';
}

function getShopTagAtPoint(point, shop, bag, transaction) {
  if (!shop) return null;
  const layout = getShopLayout(GAME_AREAS.shop);
  const trendSize = 48;
  const trendTag = [
    { tag: shop.saleTag, board: layout.saleBoards.sale },
    { tag: shop.nextTag, board: layout.saleBoards.next },
  ].find(({ board }) => isPointInRect(point, board.x + board.width / 2 - trendSize / 2, board.y + 44, trendSize, trendSize));
  if (trendTag) return trendTag.tag;

  const { slotSize, gap, top, sellItemsTop, sellX, purchaseX } = layout.transaction;
  const soldItems = getShopSoldItems(bag, transaction);
  for (let index = 0; index < soldItems.length; index += 1) {
    const tag = getItemSlotTagAtPoint(point, soldItems[index], sellX + index * (slotSize + gap), sellItemsTop);
    if (tag) return tag;
  }
  const { setStart: purchaseSetStart, revealedCount: revealedInSet } = getShopPurchasePresentation(transaction);
  for (const { column, row, item } of getRevealedPurchaseEntries(transaction)) {
    const tag = getItemSlotTagAtPoint(point, item, purchaseX + (column - 1) * (slotSize + gap), top + row * (slotSize + gap));
    if (tag) return tag;
  }
  return null;
}

function getShopItemAtPoint(point, shop, bag, transaction) {
  if (!shop) return null;
  const layout = getShopLayout(GAME_AREAS.shop);
  const { slotSize, gap, top, sellItemsTop, bagX, bagY, sellX, purchaseX } = layout.transaction;
  if (bag && isPointInRect(point, bagX, bagY, 48, 48)) return bag;
  const soldItems = getShopSoldItems(bag, transaction);
  for (let index = 0; index < soldItems.length; index += 1) {
    const item = getItemSlotAtPoint(point, soldItems[index], sellX + index * (slotSize + gap), sellItemsTop);
    if (item) return item;
  }
  const { setStart: purchaseSetStart, revealedCount: revealedInSet } = getShopPurchasePresentation(transaction);
  for (const { column, row, item: purchaseItem } of getRevealedPurchaseEntries(transaction)) {
    const item = getItemSlotAtPoint(point, purchaseItem, purchaseX + (column - 1) * (slotSize + gap), top + row * (slotSize + gap));
    if (item) return item;
  }
  return null;
}

export async function startGame() {
  setupLanguageSelector('#language-selector', ['ja', 'en']);
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
  onLanguageChange(async () => { await textRepository.refreshLanguage(); informationWindows.refreshEntries(); stageSelection.refreshLanguage(); refreshLocalizedUI(document, textRepository); flowLog.refreshLanguage(); timeSettingsController.updateStatus(); });
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
  const speedSlider = document.querySelector('#game-speed');
  const pauseOnInformation = document.querySelector('#pause-on-information');
  const pauseOnStaminaFull = document.querySelector('#pause-on-stamina-full');
  const accelerateWithoutPreparation = document.querySelector('#accelerate-without-preparation');
  const timeSettingsController = new TimeSettingsController({
    clock,
    dataManager,
    textRepository,
    getHeroes: () => controller.getHeroes(),
    elements: { pauseButton, timeStatus, timeSettings, timeSettingsToggle, speedSlider, pauseOnInformation, pauseOnStaminaFull, accelerateWithoutPreparation },
    onPauseOnInformationChange: (pauseOnOpen) => informationWindows.setPauseOnOpen(pauseOnOpen),
  });
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
      const status = getPreparationStatusAtPoint(point, preparationHeroes, PREPARATION_STATUS_DEFINITIONS)
        ?? getTrainingStatusAtPoint(point, controller.getHeroes().find((hero) => hero.currentArea === 'training'));
      const tag = getPreparationTagAtPoint(point, preparationHeroes)
        ?? getPreparationItemTagAtPoint(point, preparationHeroes)
        ?? getShopTagAtPoint(point, shop, controller.getShoppingBag(), shopSystem.getTransaction())
        ?? getChipTagAtPoint(controller.getEntityAt(point.x, point.y) ?? {}, point);
      const slotItem = getPreparationItemAtPoint(point, preparationHeroes)
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
      const { x, y, height } = getPreparationSubareaBounds(index);
      const image = assets.load(hero.chip.centerPath);
      context.strokeStyle = '#aab4c6';
      context.lineWidth = 1;
      context.strokeRect(x, y, PREPARATION_PANEL_WIDTH, height);
      const characterX = x + PREPARATION_LAYOUT.topPadding;
      const informationX = characterX + PREPARATION_LAYOUT.characterAreaWidth + PREPARATION_LAYOUT.areaGap;
      if (image.complete && image.naturalWidth > 0) {
        const placement = getCenterImagePlacement(hero.chip.radius);
        const centerX = characterX + PREPARATION_LAYOUT.characterAreaWidth / 2;
        const centerY = y + PREPARATION_LAYOUT.topPadding + PREPARATION_LAYOUT.headerHeight + PREPARATION_LAYOUT.sectionGap + HERO_PREPARATION_IMAGE_SIZE / 2;
        context.drawImage(
          image,
          centerX + placement.x - placement.size / 2,
          centerY + placement.y - placement.size / 2,
          placement.size,
          placement.size,
        );
      }
      context.fillStyle = '#24334d';
      context.font = '16px system-ui';
      context.textBaseline = 'middle';
      context.textAlign = 'center';
      context.fillText(`【${textRepository.getHeroLabel(hero)}】`, characterX + PREPARATION_LAYOUT.characterAreaWidth / 2, y + PREPARATION_LAYOUT.topPadding + PREPARATION_LAYOUT.headerHeight / 2);
      context.textAlign = 'start';
      PREPARATION_STATUS_DEFINITIONS.forEach(({ key, visual }, statIndex) => {
        if (key === 'weight') {
          drawWeightGauge(
            context,
            assets,
            informationX + statIndex * (PREPARATION_LAYOUT.statusColumnWidth + PREPARATION_LAYOUT.statusColumnGap) + (PREPARATION_LAYOUT.statusColumnWidth - PREPARATION_LAYOUT.statusGaugeWidth) / 2,
            y + PREPARATION_LAYOUT.topPadding,
            hero.getCarriedWeight(),
          );
          return;
        }
        const value = key === 'stamina' ? hero.stamina : Math.floor(hero.getStatus(key));
        drawStatusGauge(
          context,
          assets,
          visual,
          informationX + statIndex * (PREPARATION_LAYOUT.statusColumnWidth + PREPARATION_LAYOUT.statusColumnGap) + (PREPARATION_LAYOUT.statusColumnWidth - PREPARATION_LAYOUT.statusGaugeWidth) / 2,
          y + PREPARATION_LAYOUT.topPadding,
          value,
          hero.maximums[key],
          key === 'stamina' ? getVitalGaugeColor(value) : '#54c96b',
        );
      });
      context.textBaseline = 'alphabetic';
      drawEquipmentGrid(context, assets, hero, x, y + PREPARATION_LAYOUT.topPadding);
      drawHeroTagList(context, assets, hero, informationX, y + PREPARATION_LAYOUT.topPadding + PREPARATION_LAYOUT.statusGaugeHeight + PREPARATION_LAYOUT.sectionGap);
    });
    const staminaPauseTargets = new Set(controller.getHeroes()
      .filter((hero) => hero.currentArea === 'preparation' && hero.stamina >= hero.maximums.stamina)
      .map((hero) => hero.chip));
    board.getRenderChips().forEach((chip) => renderer.draw(chip, time / 1000, { staminaPauseTarget: staminaPauseTargets.has(chip) }));
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
