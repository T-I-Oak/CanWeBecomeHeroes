import '../styles.css';
import AssetLoader from '../chips/AssetLoader.js';
import ChipBoard from '../chips/ChipBoard.js';
import ChipRenderer, { createTagAngles, getCenterImagePlacement } from '../chips/ChipRenderer.js';
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
import FlowLog from './FlowLog.js';
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
import { drawAreaNameplates } from './AreaNameplateRenderer.js';
import { getAreaNameplateAtPoint } from '../game/AreaNameplateLayout.js';
import { getFacilityNameplateAtPoint, getFacilitySlotOrigin } from '../game/FacilityLayout.js';
import GuildSystem from '../game/GuildSystem.js';
import StageController from '../game/StageController.js';
import EnemyFactory from '../game/EnemyFactory.js';
import StageSelectionModal from './StageSelectionModal.js';
import InformationWindowManager from './InformationWindowManager.js';
import InformationWindowLayer from './InformationWindowLayer.js';
import { getTagBadgeVisual } from '../game/TagSkillVisualCatalog.js';

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
  Object.freeze(['valor', 'arcane', 'dexterity', 'reputation', 'blessing']),
  Object.freeze(['iron', 'cloth', 'feather', 'gem', 'fortune']),
  Object.freeze(['fire', 'water', 'lightning', 'area', 'vitality']),
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

function getTrainingStatusPanelLayout() {
  const area = GAME_AREAS.training;
  const slotOrigin = getFacilitySlotOrigin('training');
  return {
    x: slotOrigin.x + HERO_SLOT_SIZE + 24,
    y: area.y + (area.height - PREPARATION_LAYOUT.statusGaugeHeight) / 2,
  };
}

function getTrainingStatusGaugeBounds(statusIndex) {
  const panel = getTrainingStatusPanelLayout();
  const { statusColumnWidth, statusColumnGap, statusGaugeWidth, statusGaugeHeight } = PREPARATION_LAYOUT;
  return {
    x: panel.x + statusIndex * (statusColumnWidth + statusColumnGap) + (statusColumnWidth - statusGaugeWidth) / 2,
    y: panel.y,
    width: statusGaugeWidth,
    height: statusGaugeHeight,
  };
}

function drawTrainingStatusPanel(context, assets, hero, presentation, time) {
  const highlightsByStat = new Map();
  presentation?.gainedCells.forEach(({ stat, value }) => {
    const cells = highlightsByStat.get(stat) ?? [];
    cells.push(value);
    highlightsByStat.set(stat, cells);
  });
  STATUS_DEFINITIONS.forEach(({ key, visual }, statIndex) => {
    const value = hero ? (key === 'stamina' ? Math.floor(hero.stamina) : Math.floor(hero.getStatus(key))) : 0;
    const maximum = hero ? hero.maximums[key] : 0;
    const bounds = getTrainingStatusGaugeBounds(statIndex);
    drawStatusGauge(
      context,
      assets,
      visual,
      bounds.x,
      bounds.y,
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
      const visual = getTagBadgeVisual(tag, count);
      context.fillStyle = visual.fill;
      context.strokeStyle = visual.border;
      context.lineWidth = 1;
      context.beginPath();
      context.roundRect(badgeX, badgeY, tagBadgeWidth, tagBadgeHeight, 6);
      context.fill();
      context.stroke();
      const tagY = badgeY + (tagBadgeHeight - tagIconSize) / 2;
      drawFramedTag(context, assets, `/assets/tags/${tag}.png`, getTagBaseColors([tag])[0], getTagGlyphScales([tag])[0], badgeX + 3, tagY, tagIconSize);
      context.fillStyle = visual.text;
      drawTextAtVisualCenter(context, String(count), badgeX + tagBadgeWidth - 9 - tagIconNumberGap, badgeY + tagBadgeHeight / 2);
    });
  });
  context.textAlign = 'start';
  context.textBaseline = 'alphabetic';
}

function isPointInRect(point, x, y, width, height) {
  return point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + height;
}

function getPreparationTagAtPoint(point, heroes) {
  const { statusGaugeHeight, sectionGap, statusColumnWidth, statusColumnGap, tagBadgeWidth, tagBadgeHeight, tagRowGap, topPadding } = PREPARATION_LAYOUT;
  for (let heroIndex = 0; heroIndex < heroes.length; heroIndex += 1) {
    const bounds = getPreparationSubareaBounds(heroIndex);
    const informationX = bounds.x + topPadding + PREPARATION_LAYOUT.characterAreaWidth + PREPARATION_LAYOUT.areaGap;
    const tagStartY = bounds.y + topPadding + statusGaugeHeight + sectionGap;
    for (let rowIndex = 0; rowIndex < TAG_GRID.length; rowIndex += 1) {
      for (let columnIndex = 0; columnIndex < TAG_GRID[rowIndex].length; columnIndex += 1) {
        const badgeX = informationX + columnIndex * (statusColumnWidth + statusColumnGap) + (statusColumnWidth - tagBadgeWidth) / 2;
        const badgeY = tagStartY + rowIndex * (tagBadgeHeight + tagRowGap);
        if (isPointInRect(point, badgeX, badgeY, tagBadgeWidth, tagBadgeHeight)) return TAG_GRID[rowIndex][columnIndex];
      }
    }
  }
  return null;
}

function getPreparationStatusAtPoint(point, heroes) {
  const { statusGaugeHeight, statusColumnWidth, statusColumnGap, statusGaugeWidth, statusIconSize, statusIconTopPadding, topPadding } = PREPARATION_LAYOUT;
  for (let heroIndex = 0; heroIndex < heroes.length; heroIndex += 1) {
    const hero = heroes[heroIndex];
    const bounds = getPreparationSubareaBounds(heroIndex);
    const informationX = bounds.x + topPadding + PREPARATION_LAYOUT.characterAreaWidth + PREPARATION_LAYOUT.areaGap;
    const gaugeY = bounds.y + topPadding;
    for (let statusIndex = 0; statusIndex < STATUS_DEFINITIONS.length; statusIndex += 1) {
      const { key } = STATUS_DEFINITIONS[statusIndex];
      const gaugeX = informationX + statusIndex * (statusColumnWidth + statusColumnGap) + (statusColumnWidth - statusGaugeWidth) / 2;
      const iconX = gaugeX + (statusGaugeWidth - statusIconSize) / 2;
      const iconY = gaugeY + statusIconTopPadding;
      if (!isPointInRect(point, iconX, iconY, statusIconSize, statusIconSize)) continue;
      return {
        status: key,
        current: key === 'stamina' ? hero.stamina : hero.getStatus(key),
        maximum: hero.maximums[key],
      };
    }
  }
  return null;
}

function getTrainingStatusAtPoint(point, hero) {
  for (let statusIndex = 0; statusIndex < STATUS_DEFINITIONS.length; statusIndex += 1) {
    const { key } = STATUS_DEFINITIONS[statusIndex];
    const bounds = getTrainingStatusGaugeBounds(statusIndex);
    // The icon is intentionally small.  The whole gauge is the interaction target,
    // so training status remains usable with both mouse and touch input.
    if (!isPointInRect(point, bounds.x, bounds.y, bounds.width, bounds.height)) continue;
    return hero
      ? { status: key, current: key === 'stamina' ? hero.stamina : hero.getStatus(key), maximum: hero.maximums[key] }
      : { status: key };
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

function getItemSlotTagAtPoint(point, item, slotX, slotY) {
  if (!item) return null;
  const tagSize = PREPARATION_LAYOUT.equipmentTagIconSize;
  const tagGap = PREPARATION_LAYOUT.equipmentTagGap;
  const tagWidth = item.chip.tagPaths.length * tagSize + Math.max(0, item.chip.tagPaths.length - 1) * tagGap;
  const tagStartX = slotX + (PREPARATION_LAYOUT.equipmentSlotSize - tagWidth) / 2;
  const tagIndex = item.tags.findIndex((tag, index) => isPointInRect(point, tagStartX + index * (tagSize + tagGap), slotY + 2, tagSize, tagSize));
  return tagIndex >= 0 ? item.tags[tagIndex] : null;
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

function getPreparationItemTagAtPoint(point, heroes) {
  const slotSize = PREPARATION_LAYOUT.equipmentSlotSize;
  const gap = PREPARATION_LAYOUT.equipmentGap;
  const positions = Object.freeze({ head: [1, 0], rightHand: [0, 1], torso: [1, 1], leftHand: [2, 1], feet: [1, 2] });
  for (let index = 0; index < heroes.length; index += 1) {
    const hero = heroes[index];
    const bounds = getPreparationSubareaBounds(index);
    const startX = bounds.x
      + PREPARATION_LAYOUT.topPadding
      + PREPARATION_LAYOUT.characterAreaWidth
      + PREPARATION_LAYOUT.areaGap
      + PREPARATION_LAYOUT.informationAreaWidth
      + PREPARATION_LAYOUT.areaGap;
    for (const slot of EQUIPMENT_SLOTS) {
      const [column, row] = positions[slot];
      const tag = getItemSlotTagAtPoint(point, hero.equipment[slot], startX + column * (slotSize + gap), bounds.y + PREPARATION_LAYOUT.topPadding + row * (slotSize + gap));
      if (tag) return tag;
    }
  }
  return null;
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
  const soldItems = Array.from({ length: 3 }, (_, index) => transaction?.soldItems[index] ?? bag?.storedItems[index] ?? null);
  for (let index = 0; index < soldItems.length; index += 1) {
    const tag = getItemSlotTagAtPoint(point, soldItems[index], sellX + index * (slotSize + gap), sellItemsTop);
    if (tag) return tag;
  }
  const purchaseSlots = [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]];
  const purchaseSetStart = (transaction?.deliveredSets ?? 0) * purchaseSlots.length;
  const revealedInSet = Math.max(0, (transaction?.revealed ?? 0) - purchaseSetStart);
  for (let index = 0; index < purchaseSlots.length; index += 1) {
    if (index >= revealedInSet) continue;
    const [column, row] = purchaseSlots[index];
    const tag = getItemSlotTagAtPoint(point, transaction?.purchases[purchaseSetStart + index]?.item, purchaseX + (column - 1) * (slotSize + gap), top + row * (slotSize + gap));
    if (tag) return tag;
  }
  return null;
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
  new FlowLog(document.querySelector('#flow-log'), gameLog);
  const controller = new HeroItemInteractionController(board, new ItemPickupController(board, slotManager, gameLog), gameLog);
  const { preparationHeroes, shop, random = Math.random } = scenario.initialize({ controller });
  const enemySpawn = new EnemySpawnSystem(controller);
  const returnSystem = new FacilityReturnSystem(board, slotManager, { onItemReturned: (item) => controller.addToWarehouse(item) });
  const training = new TrainingSystem(board, slotManager, { gameLog, returnSystem });
  const shopSystem = new ShopSystem(board, shop, returnSystem, { onItemPurchased: (item) => controller.addToWarehouse(item), gameLog });
  const combatEffects = new CombatEffectSystem();
  const battleSystem = new BattleSystem(board, { controller, itemFactory: new ItemFactory(), returnSystem, effects: combatEffects, gameLog });
  const stageController = new StageController({
    enemySpawn,
    battleSystem,
    enemyFactory: new EnemyFactory(),
    shopState: shop,
    hasActiveShopHero: () => controller.getHeroes().some((hero) => hero.currentArea === 'shop'),
    random,
  });
  const guildSystem = new GuildSystem(returnSystem, {
    getContributionPoints: () => battleSystem.contributionPoints,
    setContributionPoints: (points) => { battleSystem.contributionPoints = points; },
    gameLog,
  });
  const staminaRecovery = new StaminaRecoverySystem();
  const facilitySwing = new FacilitySwingSystem();
  let guildTimelineHours = GUILD_TIMELINE_STANDARD_HOURS;
  const assets = new AssetLoader();
  const renderer = new ChipRenderer(context, assets);
  const informationLayer = new InformationWindowLayer(document.querySelector('#information-windows'));
  const informationWindows = new InformationWindowManager({
    clock,
    onChange: (entries) => informationLayer.render(entries),
  });
  informationLayer.manager = informationWindows;
  const stageSelection = new StageSelectionModal(document.querySelector('#stage-selection'), {
    assets,
    onSelect: (choiceId) => {
      stageController.selectStage(choiceId, { tick: clock.tick });
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

  openStageSelection(1);

  function resizeCanvas() {
    const bounds = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.floor(bounds.width * scale);
    canvas.height = Math.floor(bounds.height * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    camera.setViewport(bounds.width, bounds.height);
  }

  const pauseButton = document.querySelector('#pause-game');
  pauseButton.addEventListener('click', () => {
    pauseButton.textContent = clock.togglePaused() ? '再開' : '一時停止';
  });
  document.querySelector('#game-speed').addEventListener('change', (event) => {
    clock.setSpeed(Number(event.currentTarget.value));
  });
  const pauseOnInformation = document.querySelector('#pause-on-information');
  informationWindows.setPauseOnOpen(pauseOnInformation.checked);
  pauseOnInformation.addEventListener('change', (event) => informationWindows.setPauseOnOpen(event.currentTarget.checked));
  document.addEventListener('pointerdown', (event) => {
    const windowElement = event.target.closest?.('.InformationWindow');
    informationWindows.focus(windowElement?.dataset.informationWindowId ?? null);
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
    drag = {
      pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, lastX: event.clientX, lastY: event.clientY,
      moved: false, entity, startedSelection: false,
    };
    canvas.setPointerCapture(event.pointerId);
  }, { passive: false });
  canvas.addEventListener('pointermove', (event) => {
    const bounds = canvas.getBoundingClientRect();
    const point = camera.toWorld(event.clientX - bounds.left, event.clientY - bounds.top);
    if (!drag || drag.pointerId !== event.pointerId) return;
    const totalDistance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (totalDistance > 6 && !drag.moved) {
      drag.moved = true;
      drag.startedSelection = Boolean(drag.entity && !controller.hasSelectionSource() && controller.beginSelection(drag.entity));
    }
    if (drag.startedSelection) controller.updateSelectionHover(point.x, point.y);
    if (drag.moved && !drag.entity) camera.panByScreen(event.clientX - drag.lastX, event.clientY - drag.lastY);
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
  }, { passive: false });
  canvas.addEventListener('pointerup', (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const bounds = canvas.getBoundingClientRect();
    const point = camera.toWorld(event.clientX - bounds.left, event.clientY - bounds.top);
    if (drag.startedSelection) {
      controller.updateSelectionHover(point.x, point.y);
      if (!controller.completeSelectionAt(point.x, point.y)) controller.clearSelection();
    }
    if (!drag.moved) {
      const facility = getFacilityNameplateAtPoint(point);
      const area = getAreaNameplateAtPoint(point);
      const status = getPreparationStatusAtPoint(point, preparationHeroes)
        ?? getTrainingStatusAtPoint(point, controller.getHeroes().find((hero) => hero.currentArea === 'training'));
      const tag = getPreparationTagAtPoint(point, preparationHeroes)
        ?? getPreparationItemTagAtPoint(point, preparationHeroes)
        ?? getShopTagAtPoint(point, shop, controller.getShoppingBag(), shopSystem.getTransaction())
        ?? getChipTagAtPoint(controller.getEntityAt(point.x, point.y) ?? {}, point);
      const entity = controller.getEntityAt(point.x, point.y);
      if (facility) informationWindows.open({ type: 'facility', data: { facility }, anchor: { x: event.clientX, y: event.clientY } });
      else if (area) informationWindows.open({ type: 'area', data: { area }, anchor: { x: event.clientX, y: event.clientY } });
      else if (status) informationWindows.open({ type: 'status', data: status, anchor: { x: event.clientX, y: event.clientY } });
      else if (tag) informationWindows.open({ type: 'tag', data: { tag }, anchor: { x: event.clientX, y: event.clientY } });
      else if (entity) informationWindows.open({ type: entity.chip.type === 'item' ? 'item' : 'entity', data: entity.chip.type === 'item' ? { item: entity } : { entity }, anchor: { x: event.clientX, y: event.clientY } });
    }
    drag = null;
  });
  canvas.addEventListener('pointercancel', () => {
    if (drag?.startedSelection) controller.clearSelection();
    drag = null;
  });
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
      guildSystem.update(controller.getHeroes(), simulationDeltaSeconds);
      shopSystem.update(controller.getHeroes(), simulationDeltaSeconds);
      battleSystem.update({ heroes: controller.getHeroes(), enemies: controller.getEnemies(), tick: clock.tick, tickDelta });
      stageController.update();
      if (stageController.state === 'complete') openStageSelection();
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
    drawAreaNameplates(context, assets);
    drawFacilitySlots(context);
    drawShopPanel(context, assets, shop, controller.getShoppingBag(), shopSystem.getTransaction());
    guildTimelineHours = drawGuildPanel(context, {
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
