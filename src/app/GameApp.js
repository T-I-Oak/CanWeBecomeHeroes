import '../styles.css';
import AssetLoader from '../chips/AssetLoader.js';
import ChipBoard from '../chips/ChipBoard.js';
import ChipRenderer, { getCenterImagePlacement } from '../chips/ChipRenderer.js';
import { CHIP_RADIUS } from '../chips/Chip.js';
import ItemPickupController from '../game/ItemPickupController.js';
import Camera from '../game/Camera.js';
import { GAME_AREAS, getPreparationSubareaBounds, WORLD_SIZE } from '../game/GameAreas.js';
import { HERO_PREPARATION_IMAGE_SIZE, PREPARATION_LAYOUT } from '../game/PreparationLayout.js';
import { getTagBaseColors, getTagGlyphScales, TAGS } from '../game/TagCatalog.js';
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

const PREPARATION_PANEL_WIDTH = PREPARATION_LAYOUT.panelWidth;
const EQUIPMENT_GRID_HEIGHT = PREPARATION_LAYOUT.equipmentSlotSize * 3 + PREPARATION_LAYOUT.equipmentGap * 2;
const PREPARATION_TAG_LIST_TOP = PREPARATION_LAYOUT.topPadding + EQUIPMENT_GRID_HEIGHT - PREPARATION_LAYOUT.tagBadgeHeight;
const CHARACTER_IMAGE_VERTICAL_OFFSET = Math.max(0, CHIP_RADIUS.hero * 2 - (PREPARATION_TAG_LIST_TOP - PREPARATION_LAYOUT.topPadding));
const EQUIPMENT_SLOTS = Object.freeze(['head', 'torso', 'rightHand', 'leftHand', 'feet']);
const STATUS_DEFINITIONS = Object.freeze([
  { key: 'power', label: 'パワー', frameColor: '#594238' },
  { key: 'magic', label: '魔力', frameColor: '#4b3c63' },
  { key: 'speed', label: 'スピード', frameColor: '#285b5a' },
  { key: 'negotiation', label: '交渉力', frameColor: '#695528' },
  { key: 'luck', label: '運', frameColor: '#603d5b' },
  { key: 'stamina', label: 'スタミナ', frameColor: '#3d4d62' },
]);
const TAG_ORDER = Object.freeze(Object.keys(TAGS));

function getStaminaGaugeColor(value) {
  if (value <= 2) return '#db5b5b';
  if (value <= 4) return '#e59a3f';
  return '#54c96b';
}

function drawStatusGauge(context, x, y, value, maximum, width = 204, activeColor = '#54c96b', frameColor = '#293954') {
  const height = 20;
  const inset = 3;
  const gap = 2;
  const capacity = 7;
  const segmentWidth = (width - inset * 2 - gap * (capacity - 1)) / capacity;
  context.fillStyle = frameColor;
  context.beginPath();
  context.roundRect(x, y, width, height, 10);
  context.fill();
  for (let index = 0; index < capacity; index += 1) {
    context.fillStyle = index < value ? activeColor : index < maximum ? '#9da9ba' : '#46536a';
    context.beginPath();
    context.roundRect(x + inset + index * (segmentWidth + gap), y + inset, segmentWidth, height - inset * 2, 7);
    context.fill();
  }
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
  const cellWidth = PREPARATION_LAYOUT.tagCellWidth;
  context.font = 'bold 13px system-ui';
  context.textAlign = 'center';
  TAG_ORDER.forEach((tag, index) => {
    const count = hero.getTagCount(tag);
    const badgeX = x + 12 + PREPARATION_LAYOUT.tagListOffset + index * cellWidth + 1;
    const badgeCenterX = badgeX + 10;
    const badgeY = y;
    context.fillStyle = count === 0 ? '#dce2eb' : '#f8fafc';
    context.strokeStyle = count === 0 ? '#b8c1d0' : '#53627c';
    context.lineWidth = 1;
    context.beginPath();
    context.roundRect(badgeX, badgeY, 20, PREPARATION_LAYOUT.tagBadgeHeight, 6);
    context.fill();
    context.stroke();
    drawFramedTag(context, assets, `/assets/tags/${tag}.png`, getTagBaseColors([tag])[0], getTagGlyphScales([tag])[0], badgeCenterX - PREPARATION_LAYOUT.tagIconSize / 2, badgeY + 3, PREPARATION_LAYOUT.tagIconSize);
    context.fillStyle = '#24334d';
    drawTextAtVisualCenter(context, String(count), badgeCenterX, badgeY + 31);
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
  const gridWidth = slotSize * 3 + gap * 2;
  const startX = x + PREPARATION_PANEL_WIDTH - PREPARATION_LAYOUT.bottomPadding - gridWidth;
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
    drawFacilitySlots(context);
    drawShopPanel(context, assets, shop, controller.getShoppingBag(), shopSystem.getTransaction());
    guildTimelineHours = drawGuildPanel(context, {
      tick: clock.tick,
      contributionPoints: battleSystem.contributionPoints,
      timelineHours: guildTimelineHours,
    }).timelineHours;
    preparationHeroes.forEach((hero, index) => {
      const { x, y, height } = getPreparationSubareaBounds(index);
      const image = assets.load(hero.chip.centerPath);
      context.strokeStyle = '#aab4c6';
      context.lineWidth = 1;
      context.strokeRect(x, y, PREPARATION_PANEL_WIDTH, height);
      if (image.complete && image.naturalWidth > 0) {
        const placement = getCenterImagePlacement(hero.chip.radius);
        const centerX = x + PREPARATION_LAYOUT.leftAreaWidth + HERO_PREPARATION_IMAGE_SIZE / 2;
        const centerY = y + PREPARATION_LAYOUT.topPadding + hero.chip.radius - CHARACTER_IMAGE_VERTICAL_OFFSET;
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
      context.fillText(`【${hero.profession}・${hero.name.ja}】`, x + PREPARATION_LAYOUT.leftAreaWidth / 2, y + PREPARATION_LAYOUT.topPadding + PREPARATION_LAYOUT.headerHeight / 2);
      context.textAlign = 'start';
      const statusTop = y + PREPARATION_LAYOUT.topPadding + PREPARATION_LAYOUT.headerHeight;
      context.font = '11px system-ui';
      STATUS_DEFINITIONS.forEach(({ key, label, frameColor }, statIndex) => {
        const y = statusTop + statIndex * PREPARATION_LAYOUT.statusRowHeight;
        const value = key === 'stamina' ? Math.floor(hero.stamina) : Math.floor(hero.getStatus(key));
        context.fillStyle = '#24334d';
        drawTextAtVisualCenter(context, label, x + 12, y + 13);
        drawStatusGauge(
          context,
          x + 76,
          y + 4,
          value,
          hero.maximums[key],
          116,
          key === 'stamina' ? getStaminaGaugeColor(value) : '#54c96b',
          frameColor,
        );
      });
      context.textBaseline = 'alphabetic';
      drawEquipmentGrid(context, assets, hero, x, y + PREPARATION_LAYOUT.topPadding);
      drawTagList(context, assets, hero, x, y + PREPARATION_TAG_LIST_TOP);
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
