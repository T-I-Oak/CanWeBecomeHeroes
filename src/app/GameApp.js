import '../styles.css';
import AssetLoader from '../chips/AssetLoader.js';
import ChipBoard from '../chips/ChipBoard.js';
import ChipRenderer, { getCenterImagePlacement } from '../chips/ChipRenderer.js';
import ItemPickupController from '../game/ItemPickupController.js';
import Camera from '../game/Camera.js';
import { GAME_AREAS, getPreparationSubareaBounds, WORLD_SIZE } from '../game/GameAreas.js';
import { HERO_PREPARATION_IMAGE_SIZE, PREPARATION_LAYOUT, PREPARATION_PANEL_WIDTH } from '../game/PreparationLayout.js';
import { getTagBaseColors, getTagGlyphScales } from '../game/TagCatalog.js';
import { STATUS_VISUALS } from '../game/StatusVisualCatalog.js';
import HeroItemInteractionController from '../game/HeroItemInteractionController.js';
import HeroSlotManager from '../game/HeroSlotManager.js';
import GameClock from '../game/GameClock.js';
import { AREA_THEME } from '../game/AreaTheme.js';
import StaminaRecoverySystem from '../game/StaminaRecoverySystem.js';
import FacilitySwingSystem from '../game/FacilitySwingSystem.js';
import GameLog from '../game/GameLog.js';
import NotificationCenter from './NotificationCenter.js';
import TrainingSystem from '../game/TrainingSystem.js';
import { getShopLayout, SHOP_TRANSACTION_ARROW_WIDTH } from '../game/ShopLayout.js';
import FacilityReturnSystem from '../game/FacilityReturnSystem.js';
import ShopSystem from '../game/ShopSystem.js';
import BattleSystem from '../game/BattleSystem.js';
import CombatEffectSystem from '../game/CombatEffectSystem.js';
import ItemFactory from '../game/ItemFactory.js';
import EnemySpawnSystem from '../game/EnemySpawnSystem.js';
import { BATTLE_ENEMY_AREA_HEIGHT, HERO_SLOT_SIZE } from '../game/HeroSlotLayout.js';
import { drawGuildPanel } from './GuildPanel.js';
import { GUILD_TIMELINE_STANDARD_HOURS } from '../game/GuildTime.js';
import { drawFacilitySlots } from './FacilitySlotRenderer.js';
import { drawFacilityNameplates } from './FacilityNameplateRenderer.js';
import { getFacilitySlotOrigin } from '../game/FacilityLayout.js';

const EQUIPMENT_SLOTS = Object.freeze(['head', 'torso', 'rightHand', 'leftHand', 'feet']);
const STATUS_DEFINITIONS = Object.freeze([
  { key: 'power', visual: STATUS_VISUALS.power },
  { key: 'magic', visual: STATUS_VISUALS.magic },
  { key: 'speed', visual: STATUS_VISUALS.speed },
  { key: 'negotiation', visual: STATUS_VISUALS.negotiation },
  { key: 'luck', visual: STATUS_VISUALS.luck },
  { key: 'stamina', visual: STATUS_VISUALS.stamina },
]);
const TAG_GRID = Object.freeze([
  Object.freeze(['valor', 'arcane', 'dexterity', 'reputation', 'fortune']),
  Object.freeze(['iron', 'cloth', 'feather', 'gem', 'blessing']),
  Object.freeze(['fire', 'water', 'lightning', 'vitality', 'area']),
]);

function getStaminaGaugeColor(value) {
  if (value <= 2) return '#db5b5b';
  if (value <= 4) return '#e59a3f';
  return '#54c96b';
}

function drawStatusGauge(context, assets, visual, x, y, value, maximum, activeColor = '#54c96b', { highlightedCells = [], highlightPhase = 0 } = {}) {
  const { statusGaugeWidth: width, statusGaugeHeight: height, statusIconSize, statusIconTopPadding, statusIconSegmentGap, statusGaugeHorizontalPadding: inset, statusGaugeBottomPadding, statusSegmentHeight, statusSegmentGap: gap } = PREPARATION_LAYOUT;
  const capacity = 7;
  context.fillStyle = visual.gaugeFrameColor;
  context.beginPath();
  context.roundRect(x, y, width, height, 9);
  context.fill();
  const icon = assets.load(visual.iconPath);
  if (icon.complete && icon.naturalWidth > 0) {
    context.drawImage(icon, x + (width - statusIconSize) / 2, y + statusIconTopPadding, statusIconSize, statusIconSize);
  }
  for (let index = 0; index < capacity; index += 1) {
    const segmentY = y + height - statusGaugeBottomPadding - statusSegmentHeight - index * (statusSegmentHeight + gap);
    context.fillStyle = index < value ? activeColor : index < maximum ? '#9da9ba' : '#46536a';
    context.beginPath();
    context.roundRect(x + inset, segmentY, width - inset * 2, statusSegmentHeight, 4);
    context.fill();
    if (highlightedCells.includes(index + 1)) {
      const glow = 0.55 + Math.sin(highlightPhase) * 0.25;
      context.save();
      context.fillStyle = `rgba(255, 215, 91, ${glow})`;
      context.shadowColor = '#fff3af';
      context.shadowBlur = 7;
      context.fill();
      context.strokeStyle = '#fff4ba';
      context.lineWidth = 2;
      context.stroke();
      context.restore();
    }
  }
}

function drawTrainingStatusPanel(context, assets, hero, presentation, time) {
  const area = GAME_AREAS.training;
  const slotOrigin = getFacilitySlotOrigin('training');
  const x = slotOrigin.x + HERO_SLOT_SIZE + 24;
  const y = area.y + (area.height - PREPARATION_LAYOUT.statusGaugeHeight) / 2;
  const highlightsByStat = new Map();
  presentation?.gainedCells.forEach(({ stat, value }) => {
    const cells = highlightsByStat.get(stat) ?? [];
    cells.push(value);
    highlightsByStat.set(stat, cells);
  });
  STATUS_DEFINITIONS.forEach(({ key, visual }, statIndex) => {
    const value = hero ? (key === 'stamina' ? Math.floor(hero.stamina) : Math.floor(hero.getStatus(key))) : 0;
    const maximum = hero ? hero.maximums[key] : 0;
    drawStatusGauge(
      context,
      assets,
      visual,
      x + statIndex * (PREPARATION_LAYOUT.statusColumnWidth + PREPARATION_LAYOUT.statusColumnGap) + (PREPARATION_LAYOUT.statusColumnWidth - PREPARATION_LAYOUT.statusGaugeWidth) / 2,
      y,
      value,
      maximum,
      key === 'stamina' ? getStaminaGaugeColor(value) : '#54c96b',
      { highlightedCells: highlightsByStat.get(key) ?? [], highlightPhase: time / 180 },
    );
  });
}

function drawTextAtVisualCenter(context, text, x, centerY) {
  const metrics = context.measureText(text);
  context.textBaseline = 'alphabetic';
  context.fillText(text, x, centerY + (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2);
}

function drawFramedTag(context, assets, tagPath, baseColor, glyphScale = 1, x, y, size) {
  const centerX = x + size / 2;
  const centerY = y + size / 2;
  context.fillStyle = '#17253d';
  context.beginPath();
  context.arc(centerX, centerY, size * 0.5, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = baseColor ?? '#e1e8f0';
  context.beginPath();
  context.arc(centerX, centerY, size * 0.43, 0, Math.PI * 2);
  context.fill();
  const icon = assets.load(tagPath);
  const glyphSize = size * glyphScale;
  if (icon.complete && icon.naturalWidth > 0) context.drawImage(icon, x + (size - glyphSize) / 2, y + (size - glyphSize) / 2, glyphSize, glyphSize);
  context.lineWidth = Math.max(1, size * 0.035);
  context.strokeStyle = 'rgba(255, 255, 255, 0.78)';
  context.beginPath();
  context.arc(centerX, centerY, size * 0.43 - context.lineWidth / 2, 0, Math.PI * 2);
  context.stroke();
}

function drawTagList(context, assets, hero, x, y) {
  const { statusColumnWidth, statusColumnGap, tagBadgeWidth, tagBadgeHeight, tagIconSize, tagIconNumberGap, tagRowGap } = PREPARATION_LAYOUT;
  context.font = 'bold 14px system-ui';
  context.textAlign = 'center';
  TAG_GRID.forEach((row, rowIndex) => {
    row.forEach((tag, columnIndex) => {
      const count = hero.getTagCount(tag);
      const cellX = x + columnIndex * (statusColumnWidth + statusColumnGap);
      const badgeX = cellX + (statusColumnWidth - tagBadgeWidth) / 2;
      const badgeY = y + rowIndex * (tagBadgeHeight + tagRowGap);
      context.fillStyle = count === 0 ? '#dce2eb' : '#f8fafc';
      context.strokeStyle = count === 0 ? '#b8c1d0' : '#53627c';
      context.lineWidth = 1;
      context.beginPath();
      context.roundRect(badgeX, badgeY, tagBadgeWidth, tagBadgeHeight, 6);
      context.fill();
      context.stroke();
      const tagY = badgeY + (tagBadgeHeight - tagIconSize) / 2;
      drawFramedTag(context, assets, `/assets/tags/${tag}.png`, getTagBaseColors([tag])[0], getTagGlyphScales([tag])[0], badgeX + 3, tagY, tagIconSize);
      context.fillStyle = '#24334d';
      drawTextAtVisualCenter(context, String(count), badgeX + tagBadgeWidth - 9 - tagIconNumberGap, badgeY + tagBadgeHeight / 2);
    });
  });
  context.textAlign = 'start';
  context.textBaseline = 'alphabetic';
}

function drawItemSlot(context, assets, item, slotX, slotY) {
  const slotSize = PREPARATION_LAYOUT.equipmentSlotSize;
  context.fillStyle = item?.category === 'destination' ? AREA_THEME[item.destination].chipFill : '#eef1f6';
  context.strokeStyle = '#aab4c6';
  context.lineWidth = 2;
  context.beginPath();
  context.roundRect(slotX, slotY, slotSize, slotSize, 8);
  context.fill();
  context.stroke();
  if (!item) return;
  const image = assets.load(item.chip.centerPath);
  const imageSize = slotSize - PREPARATION_LAYOUT.equipmentImagePadding * 2;
  const imageX = slotX + (slotSize - imageSize) / 2;
  const imageY = slotY + slotSize - imageSize;
  if (image.complete && image.naturalWidth > 0) context.drawImage(image, imageX, imageY, imageSize, imageSize);
  const tagWidth = item.chip.tagPaths.length * PREPARATION_LAYOUT.equipmentTagIconSize
    + Math.max(0, item.chip.tagPaths.length - 1) * PREPARATION_LAYOUT.equipmentTagGap;
  const tagStartX = slotX + (slotSize - tagWidth) / 2;
  item.chip.tagPaths.forEach((tagPath, tagIndex) => {
    const tagX = tagStartX + tagIndex * (PREPARATION_LAYOUT.equipmentTagIconSize + PREPARATION_LAYOUT.equipmentTagGap);
    drawFramedTag(context, assets, tagPath, item.chip.tagBaseColors[tagIndex], item.chip.tagGlyphScales[tagIndex], tagX, slotY + 2, PREPARATION_LAYOUT.equipmentTagIconSize);
  });
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
  const positions = Object.freeze({ head: [1, 0], rightHand: [0, 1], torso: [1, 1], leftHand: [2, 1], feet: [1, 2] });
  EQUIPMENT_SLOTS.forEach((slot) => {
    const [column, row] = positions[slot];
    const slotX = startX + column * (slotSize + gap);
    const slotY = y + row * (slotSize + gap);
    drawItemSlot(context, assets, hero.equipment[slot], slotX, slotY);
  });
}

function drawShopPanel(context, assets, shop, bag, transaction) {
  if (!shop) return;
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
  drawTrend('SALE FOR', shop.saleTag, layout.saleBoards.sale);
  drawTrend('NEXT', shop.nextTag, layout.saleBoards.next);

  const bagSize = 48;
  const { slotSize, gap, top, sellItemsTop, bagX, bagY, sellX, arrowX, purchaseX } = layout.transaction;
  const bagImage = assets.load('/assets/items/hand-shopping-bag.png');
  if (bagImage.complete && bagImage.naturalWidth > 0) context.drawImage(bagImage, bagX, bagY, bagSize, bagSize);
  Array.from({ length: 3 }, (_, index) => {
    drawItemSlot(context, assets, transaction?.soldItems[index] ?? bag?.storedItems[index] ?? null, sellX + index * (slotSize + gap), sellItemsTop);
  });
  const purchaseSlots = [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]];
  const purchaseSetStart = (transaction?.deliveredSets ?? 0) * purchaseSlots.length;
  const revealedInSet = Math.max(0, (transaction?.revealed ?? 0) - purchaseSetStart);
  purchaseSlots.forEach(([column, row], index) => {
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

function drawTiledBackground(context, assets, imagePath, bounds) {
  const { x, y, width, height } = bounds;
  const image = assets.load(imagePath);
  if (!image.complete || image.naturalWidth === 0) return;
  const pattern = context.createPattern(image, 'repeat');
  if (!pattern) return;
  context.save();
  context.beginPath();
  context.rect(x, y, width, height);
  context.clip();
  context.translate(x, y);
  context.fillStyle = pattern;
  context.fillRect(0, 0, width, height);
  context.restore();
}

function drawAreaBackground(context, assets, areaName) {
  drawTiledBackground(context, assets, `/assets/background/${areaName}.png`, GAME_AREAS[areaName]);
}

function drawBattleSlotGround(context, assets) {
  const image = assets.load('/assets/background/trampled-ground.png');
  if (!image.complete || image.naturalWidth === 0) return;
  const battle = GAME_AREAS.battle;
  const startX = battle.x + (battle.width - HERO_SLOT_SIZE * 6) / 2;
  const rows = [
    { columns: [0, 1, 2, 3, 4, 5], y: battle.y + (BATTLE_ENEMY_AREA_HEIGHT - HERO_SLOT_SIZE) / 2 },
    { columns: [1, 2, 3, 4], y: battle.y + BATTLE_ENEMY_AREA_HEIGHT },
  ];
  rows.forEach(({ columns, y }) => {
    columns.forEach((column) => context.drawImage(image, startX + column * HERO_SLOT_SIZE, y, HERO_SLOT_SIZE, HERO_SLOT_SIZE));
  });
}

export function startGame({ scenario }) {
  const canvas = document.querySelector('#chip-canvas');
  const context = canvas.getContext('2d');
  const board = new ChipBoard(WORLD_SIZE);
  const camera = new Camera(WORLD_SIZE);
  const clock = new GameClock();
  const slotManager = new HeroSlotManager();
  const gameLog = new GameLog();
  new NotificationCenter(document.querySelector('#notification-center'), gameLog);
  const controller = new HeroItemInteractionController(board, new ItemPickupController(board, slotManager, gameLog), gameLog);
  const { preparationHeroes, shop, enemies } = scenario.initialize({ controller });
  const enemySpawn = new EnemySpawnSystem(controller);
  enemySpawn.schedule(enemies);
  const returnSystem = new FacilityReturnSystem(board, slotManager, { onItemReturned: (item) => controller.addToWarehouse(item) });
  const training = new TrainingSystem(board, slotManager, { gameLog, returnSystem });
  const shopSystem = new ShopSystem(board, shop, returnSystem, { onItemPurchased: (item) => controller.addToWarehouse(item), gameLog });
  const combatEffects = new CombatEffectSystem();
  const battleSystem = new BattleSystem(board, { controller, itemFactory: new ItemFactory(), returnSystem, effects: combatEffects, gameLog });
  const staminaRecovery = new StaminaRecoverySystem();
  const facilitySwing = new FacilitySwingSystem();
  let guildTimelineHours = GUILD_TIMELINE_STANDARD_HOURS;
  const assets = new AssetLoader();
  const renderer = new ChipRenderer(context, assets);

  function resizeCanvas() {
    const bounds = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.floor(bounds.width * scale);
    canvas.height = Math.floor(bounds.height * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    camera.setViewport(bounds.width, bounds.height);
  }

  document.querySelector('#add-chip').addEventListener('click', () => {
    scenario.addItem({ controller });
  });
  const pauseButton = document.querySelector('#pause-game');
  pauseButton.addEventListener('click', () => {
    pauseButton.textContent = clock.togglePaused() ? '再開' : '一時停止';
  });
  document.querySelector('#game-speed').addEventListener('change', (event) => {
    clock.setSpeed(Number(event.currentTarget.value));
  });
  let drag = null;

  function drawChipSelectionGuide() {
    const guide = controller.getSelectionGuide();
    if (!guide) return;
    context.save();
    const drawLink = (source, target, color) => {
      context.strokeStyle = color;
      context.lineWidth = 4;
      context.setLineDash([10, 8]);
      context.beginPath();
      context.moveTo(source.chip.x, source.chip.y - source.chip.height);
      context.lineTo(target.chip.x, target.chip.y - target.chip.height);
      context.stroke();
    };
    guide.links.forEach((link) => drawLink(link.source, link.target, '#54c96b'));
    if (!guide.source) {
      context.setLineDash([]);
      context.restore();
      return;
    }
    const source = guide.source.chip;
    const target = guide.target?.chip;
    const color = target ? (guide.valid ? '#54c96b' : '#d88989') : '#88b6e8';
    context.strokeStyle = color;
    context.fillStyle = `${color}33`;
    context.lineWidth = 4;
    context.setLineDash([10, 8]);
    context.beginPath();
    context.moveTo(source.x, source.y - source.height);
    context.lineTo(guide.pointerX, guide.pointerY);
    context.stroke();
    context.setLineDash([]);
    context.beginPath();
    context.arc(source.x, source.y - source.height, source.radius + 7, 0, Math.PI * 2);
    context.stroke();
    if (target) {
      context.beginPath();
      context.arc(target.x, target.y - target.height, target.radius + 8, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    }
    context.restore();
  }

  canvas.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    const bounds = canvas.getBoundingClientRect();
    const point = camera.toWorld(event.clientX - bounds.left, event.clientY - bounds.top);
    const entity = controller.getEntityAt(point.x, point.y);
    const startedSelection = Boolean(entity && !controller.hasSelectionSource() && controller.beginSelection(entity));
    drag = {
      pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, lastX: event.clientX, lastY: event.clientY,
      moved: false, entity, startedSelection,
    };
    controller.updateSelectionHover(point.x, point.y);
    canvas.setPointerCapture(event.pointerId);
  }, { passive: false });
  canvas.addEventListener('pointermove', (event) => {
    const bounds = canvas.getBoundingClientRect();
    const point = camera.toWorld(event.clientX - bounds.left, event.clientY - bounds.top);
    controller.updateSelectionHover(point.x, point.y);
    if (!drag || drag.pointerId !== event.pointerId) return;
    const totalDistance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (totalDistance > 6) drag.moved = true;
    if (drag.moved && !drag.entity) camera.panByScreen(event.clientX - drag.lastX, event.clientY - drag.lastY);
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
  }, { passive: false });
  canvas.addEventListener('pointerup', (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const bounds = canvas.getBoundingClientRect();
    const point = camera.toWorld(event.clientX - bounds.left, event.clientY - bounds.top);
    controller.updateSelectionHover(point.x, point.y);
    if (drag.entity && drag.moved) {
      if (!controller.completeSelectionAt(point.x, point.y)) controller.clearSelection();
    } else if (drag.entity && !drag.startedSelection) {
      controller.completeSelectionAt(point.x, point.y);
    } else if (!drag.entity && !drag.moved && controller.hasSelectionSource()) {
      controller.completeSelectionAt(point.x, point.y);
    }
    drag = null;
  });
  canvas.addEventListener('pointercancel', () => { drag = null; });
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const bounds = canvas.getBoundingClientRect();
    const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
    camera.setZoom(camera.zoom * factor, event.clientX - bounds.left, event.clientY - bounds.top);
  }, { passive: false });

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
      training.update(controller.getHeroes(), simulationDeltaSeconds);
      shopSystem.update(controller.getHeroes(), simulationDeltaSeconds);
      battleSystem.update({ heroes: controller.getHeroes(), enemies: controller.getEnemies(), tick: clock.tick, tickDelta });
      facilitySwing.update(controller.getHeroes(), simulationDeltaSeconds, controller.activeHero);
    });
    controller.updateVisuals();
    context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    context.save();
    context.scale(camera.zoom, camera.zoom);
    context.translate(-camera.x, -camera.y);
    ['warehouse', 'battle', 'shop', 'guild', 'training'].forEach((areaName) => drawAreaBackground(context, assets, areaName));
    preparationHeroes.forEach((_, index) => drawTiledBackground(context, assets, '/assets/background/preparation.png', getPreparationSubareaBounds(index)));
    drawBattleSlotGround(context, assets);
    drawFacilityNameplates(context, assets);
    drawFacilitySlots(context);
    drawShopPanel(context, assets, shop, controller.getShoppingBag(), shopSystem.getTransaction());
    guildTimelineHours = drawGuildPanel(context, {
      tick: clock.tick,
      contributionPoints: battleSystem.contributionPoints,
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
      context.fillText(`【${hero.profession}・${hero.name.ja}】`, characterX + PREPARATION_LAYOUT.characterAreaWidth / 2, y + PREPARATION_LAYOUT.topPadding + PREPARATION_LAYOUT.headerHeight / 2);
      context.textAlign = 'start';
      STATUS_DEFINITIONS.forEach(({ key, visual }, statIndex) => {
        const value = key === 'stamina' ? Math.floor(hero.stamina) : Math.floor(hero.getStatus(key));
        drawStatusGauge(
          context,
          assets,
          visual,
          informationX + statIndex * (PREPARATION_LAYOUT.statusColumnWidth + PREPARATION_LAYOUT.statusColumnGap) + (PREPARATION_LAYOUT.statusColumnWidth - PREPARATION_LAYOUT.statusGaugeWidth) / 2,
          y + PREPARATION_LAYOUT.topPadding,
          value,
          hero.maximums[key],
          key === 'stamina' ? getStaminaGaugeColor(value) : '#54c96b',
        );
      });
      context.textBaseline = 'alphabetic';
      drawEquipmentGrid(context, assets, hero, x, y + PREPARATION_LAYOUT.topPadding);
      drawTagList(context, assets, hero, informationX, y + PREPARATION_LAYOUT.topPadding + PREPARATION_LAYOUT.statusGaugeHeight + PREPARATION_LAYOUT.sectionGap);
    });
    board.getRenderChips().forEach((chip) => renderer.draw(chip, time / 1000));
    combatEffects.draw(context);
    drawChipSelectionGuide();
    context.restore();
    requestAnimationFrame(render);
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
  requestAnimationFrame(render);
}
