import ChipRenderer, { drawFramedTag } from '../chips/ChipRenderer.js';
import { getTagBaseColors, getTagGlyphScales } from '../game/TagCatalog.js';
import { HERO_SLOT_SIZE } from '../game/HeroSlotLayout.js';

const SLOT_COUNT = 6;
// 進路選択では実戦と同じ小:中:大 = 1:1.5:3 の比率を維持する。
// 大型Enemyは横2スロットを占有するため、プレビューCanvasも2枠分を使う。
// 戦闘エリアの224pxスロットを、モーダル内の100pxスロットへ等倍縮尺する。
const PREVIEW_SLOT_SIZE = 100;
const PREVIEW_SCALE = PREVIEW_SLOT_SIZE / HERO_SLOT_SIZE;
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

function createPreviewChip(chip, previewSize) {
  return {
    ...chip,
    x: previewSize / 2,
    y: previewSize / 2,
    radius: chip.radius * PREVIEW_SCALE,
    height: 0,
    scale: 1,
    tilt: 0,
    poseTilt: 0,
    effectOffsetX: 0,
    effectOffsetY: 0,
    effectRotation: 0,
    actionGauge: null,
    actionGaugeMaximum: null,
    actionGaugeBaseMaximum: null,
  };
}

export default class StageSelectionModal {
  constructor(container, { assets, onSelect = () => {} } = {}) {
    if (!container || !assets) throw new Error('Stage selection modal requires a container and assets.');
    this.container = container;
    this.assets = assets;
    this.onSelect = onSelect;
  }

  show({ stageNumber, choices }) {
    this.container.replaceChildren();
    const dialog = createElement('section', 'StageSelection__Dialog');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'stage-selection-title');
    const heading = createElement('h1', 'StageSelection__Title', '進路を選択');
    heading.id = 'stage-selection-title';
    const subtitle = createElement('p', 'StageSelection__Subtitle', `第${stageNumber}ステージ`);
    const options = createElement('div', 'StageSelection__Options');
    choices.forEach((choice) => options.append(this.createOption(choice)));
    dialog.append(heading, subtitle, options);
    this.container.append(dialog);
    this.container.hidden = false;
    this.container.classList.add('state-open');
  }

  hide() {
    this.container.classList.remove('state-open');
    this.container.replaceChildren();
    this.container.hidden = true;
  }

  createOption(choice) {
    const option = createElement('article', 'StageSelection__Option');

    const hasLargeEnemy = choice.enemies.some((enemy) => enemy.definition.size === 'large');
    const enemyLine = createElement('div', `StageSelection__EnemyLine${hasLargeEnemy ? ' state-has-large' : ''}`);
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
      this.createTrend('今回の店', choice.shopTrends.saleTag),
      this.createTrend('次回の店', choice.shopTrends.nextTag),
    );
    const selectButton = createElement('button', 'StageSelection__SelectButton state-clickable', 'この進路へ');
    selectButton.type = 'button';
    selectButton.addEventListener('click', () => this.onSelect(choice.id));
    option.append(enemyLine, trends, selectButton);
    return option;
  }

  createEnemySlot(enemy, { slotPosition, span }) {
    const slot = createElement('div', `StageSelection__EnemySlot${enemy ? '' : ' state-empty'}`);
    slot.style.gridColumn = `${slotPosition} / span ${span}`;
    if (!enemy) return slot;
    const previewSize = PREVIEW_SLOT_SIZE * span;
    const canvas = createElement('canvas', 'StageSelection__ChipPreview');
    if (span > 1) canvas.classList.add('state-large');
    canvas.width = previewSize;
    canvas.height = previewSize;
    canvas.setAttribute('aria-label', enemy.definition.nameJa);
    const label = createElement('span', 'StageSelection__EnemyName', enemy.definition.nameJa);
    slot.append(canvas, label);
    this.drawChipPreview(canvas, enemy.chip, previewSize);
    return slot;
  }

  createTrend(label, tag) {
    const trend = createElement('div', 'StageSelection__Trend');
    const tagIcon = document.createElement('canvas');
    tagIcon.className = 'StageSelection__TrendIcon';
    tagIcon.width = TREND_TAG_SIZE;
    tagIcon.height = TREND_TAG_SIZE;
    tagIcon.setAttribute('aria-label', tag);
    this.drawTrendTag(tagIcon, tag);
    trend.append(createElement('span', 'StageSelection__TrendLabel', label), tagIcon);
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
    const context = canvas.getContext('2d');
    const preview = createPreviewChip(chip, previewSize);
    const draw = () => {
      context.clearRect(0, 0, previewSize, previewSize);
      new ChipRenderer(context, this.assets).draw(preview, 0);
    };
    draw();
    [chip.centerPath, ...chip.tagPaths].forEach((path) => {
      const image = this.assets.load(path);
      if (!image.complete) image.addEventListener('load', draw, { once: true });
    });
  }
}
