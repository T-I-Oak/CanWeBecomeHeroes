import { createTagAngles, drawFramedTag } from '../chips/ChipRenderer.js';
import { getTagBaseColors, getTagGlyphScales } from '../game/TagCatalog.js';
import { getEnemyChipScale } from '../game/HeroSlotLayout.js';
import ModalLayer from './ModalLayer.js';
import { createStaticChipPreview, drawStaticChipPreview } from './ChipPreview.js';

const SLOT_COUNT = 6;
// 課題選択では実戦と同じ小:中:大 = 1:1.5:3 の比率を維持する。
// キャンバスの内部座標。画面上の大きさは実戦のスロット比で CSS が決める。
const PREVIEW_RENDER_SIZE = 100;
const TREND_TAG_SIZE = 38;

function createElement(tagName, className, text = null) {
  const element = document.createElement(tagName);
  element.className = className;
  if (text !== null) element.textContent = text;
  return element;
}

function getEnemySlotSpan(enemy) {
  return enemy?.definition.size === 'large' ? 2 : 1;
}

export function getPreviewTagAtPoint(enemy, canvas, clientX, clientY) {
  const bounds = canvas.getBoundingClientRect();
  const point = {
    x: (clientX - bounds.left) * canvas.width / bounds.width,
    y: (clientY - bounds.top) * canvas.height / bounds.height,
  };
  const preview = createStaticChipPreview(enemy.chip, canvas.width);
  const iconSize = preview.radius * 0.42;
  const tagRadius = preview.radius * 0.7;
  const tagIndex = createTagAngles(enemy.tags.length, 8).findIndex((angle) => (
    Math.hypot(point.x - (preview.x + Math.cos(angle) * tagRadius), point.y - (preview.y + Math.sin(angle) * tagRadius)) <= iconSize * 0.55
  ));
  return tagIndex >= 0 ? enemy.tags[tagIndex] : null;
}

export default class StageSelectionModal {
  constructor(container, { assets, textRepository, onSelect = () => {}, onTagSelect = () => {}, onEnemySelect = () => {} } = {}) {
    if (!container || !assets) throw new Error('Stage selection modal requires a container and assets.');
    this.modalLayer = new ModalLayer(container);
    this.container = this.modalLayer.container;
    this.assets = assets;
    this.textRepository = textRepository;
    this.enemyLabels = [];
    this.textLabels = [];
    this.tagLabels = [];
    this.onSelect = onSelect;
    this.onTagSelect = onTagSelect;
    this.onEnemySelect = onEnemySelect;
  }

  show({ stageNumber, choices }) {
    this.enemyLabels = [];
    this.textLabels = [];
    this.tagLabels = [];
    this.container.replaceChildren();
    const dialog = createElement('section', 'ModalDialog StageSelection__Dialog');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'stage-selection-title');
    const heading = this.createLabel('h1', 'StageSelection__Title', 'stageNumber', { number: stageNumber });
    heading.id = 'stage-selection-title';
    const subtitle = this.createLabel('p', 'StageSelection__Subtitle', 'chooseRoute');
    const options = createElement('div', 'StageSelection__Options');
    choices.forEach((choice) => options.append(this.createOption(choice)));
    dialog.append(heading, subtitle, options);
    this.container.append(dialog);
    this.modalLayer.open();
  }

  hide() {
    this.enemyLabels = [];
    this.textLabels = [];
    this.tagLabels = [];
    this.modalLayer.close();
  }

  createOption(choice) {
    const option = createElement('article', 'StageSelection__Option');

    const enemyLine = createElement('div', 'StageSelection__EnemyLine');
    const largestEnemyChipScale = Math.max(...choice.enemies.map((enemy) => getEnemyChipScale(enemy.definition.size)));
    enemyLine.style.setProperty('--stage-selection-largest-enemy-chip-scale', largestEnemyChipScale);
    const occupiedPositions = new Set();
    for (let slotPosition = 1; slotPosition <= SLOT_COUNT; slotPosition += 1) {
      if (occupiedPositions.has(slotPosition)) continue;
      const enemy = choice.enemies.find((candidate) => candidate.slotPosition === slotPosition);
      const span = getEnemySlotSpan(enemy);
      if (span > 1) {
        const coveredPosition = slotPosition + 1;
        if (coveredPosition > SLOT_COUNT || choice.enemies.some((candidate) => candidate.slotPosition === coveredPosition)) {
          throw new RangeError(`Large enemy at slot ${slotPosition} requires the following enemy slot to be empty.`);
        }
        occupiedPositions.add(coveredPosition);
      }
      enemyLine.append(this.createEnemySlot(enemy, { slotPosition, span }));
    }

    const trends = createElement('div', 'StageSelection__Trends');
    trends.append(
      this.createTrend('currentShop', choice.shopTrends.saleTag),
      this.createTrend('nextShop', choice.shopTrends.nextTag),
    );
    const selectButton = this.createLabel('button', 'StageSelection__SelectButton state-clickable', 'selectRoute');
    selectButton.type = 'button';
    selectButton.addEventListener('click', () => this.onSelect(choice.id));
    option.append(enemyLine, trends, selectButton);
    return option;
  }

  createEnemySlot(enemy, { slotPosition, span }) {
    const slot = createElement('div', `StageSelection__EnemySlot${enemy ? '' : ' state-empty'}`);
    slot.style.gridColumn = `${slotPosition} / span ${span}`;
    if (!enemy) return slot;
    const previewSize = PREVIEW_RENDER_SIZE;
    const canvas = createElement('canvas', 'StageSelection__ChipPreview');
    canvas.style.setProperty('--stage-selection-enemy-chip-scale', getEnemyChipScale(enemy.definition.size));
    canvas.width = previewSize;
    canvas.height = previewSize;
    const name = this.textRepository.getName('enemy', enemy.definition.id);
    canvas.setAttribute('aria-label', name);
    const label = createElement('span', 'StageSelection__EnemyName', name);
    this.enemyLabels.push({ id: enemy.definition.id, canvas, label });
    const chipFrame = createElement('div', 'StageSelection__EnemyChipFrame');
    chipFrame.append(canvas);
    slot.append(chipFrame, label);
    this.drawChipPreview(canvas, enemy.chip, previewSize);
    canvas.addEventListener('click', (event) => {
      const tag = getPreviewTagAtPoint(enemy, canvas, event.clientX, event.clientY);
      if (tag) this.onTagSelect(tag, { x: event.clientX, y: event.clientY });
      else this.onEnemySelect(enemy, { x: event.clientX, y: event.clientY });
    });
    return slot;
  }

  createLabel(tag, className, key, values = {}) {
    const element = createElement(tag, className, this.textRepository.getLabel(key, values));
    this.textLabels.push({ element, key, values });
    return element;
  }

  refreshLanguage() {
    this.textLabels.forEach(({ element, key, values }) => { element.textContent = this.textRepository.getLabel(key, values); });
    this.tagLabels.forEach(({ element, id }) => element.setAttribute('aria-label', this.textRepository.getName('tag', id)));
    this.enemyLabels.forEach(({ id, canvas, label }) => {
      const name = this.textRepository.getName('enemy', id);
      canvas.setAttribute('aria-label', name);
      label.textContent = name;
    });
  }

  createTrend(label, tag) {
    const trend = createElement('div', 'StageSelection__Trend');
    const tagIcon = document.createElement('canvas');
    tagIcon.className = 'StageSelection__TrendIcon';
    tagIcon.width = TREND_TAG_SIZE;
    tagIcon.height = TREND_TAG_SIZE;
    tagIcon.setAttribute('aria-label', this.textRepository.getName('tag', tag));
    this.tagLabels.push({ element: tagIcon, id: tag });
    this.drawTrendTag(tagIcon, tag);
    trend.append(this.createLabel('span', 'StageSelection__TrendLabel', label), tagIcon);
    tagIcon.addEventListener('click', (event) => this.onTagSelect(tag, { x: event.clientX, y: event.clientY }));
    return trend;
  }

  drawTrendTag(canvas, tag) {
    const context = canvas.getContext('2d');
    const path = `/assets/tags/${tag}.png`;
    const draw = () => {
      context.clearRect(0, 0, TREND_TAG_SIZE, TREND_TAG_SIZE);
      drawFramedTag(
        context,
        this.assets,
        path,
        getTagBaseColors([tag])[0],
        getTagGlyphScales([tag])[0],
        TREND_TAG_SIZE / 2,
        TREND_TAG_SIZE / 2,
        TREND_TAG_SIZE,
      );
    };
    draw();
    const image = this.assets.load(path);
    if (!image.complete) image.addEventListener('load', draw, { once: true });
  }

  drawChipPreview(canvas, chip, previewSize) {
    drawStaticChipPreview(canvas, chip, previewSize, this.assets);
  }
}
