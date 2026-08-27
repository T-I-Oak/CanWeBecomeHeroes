import ChipRenderer from '../chips/ChipRenderer.js';
import { getTagBaseColors } from '../game/TagCatalog.js';

const SLOT_COUNT = 6;
const PREVIEW_SIZE = 104;
const PREVIEW_RADIUS = 43;

function createElement(tagName, className, text = null) {
  const element = document.createElement(tagName);
  element.className = className;
  if (text !== null) element.textContent = text;
  return element;
}

function createPreviewChip(chip) {
  return {
    ...chip,
    x: PREVIEW_SIZE / 2,
    y: PREVIEW_SIZE / 2,
    radius: Math.min(chip.radius, PREVIEW_RADIUS),
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
    const option = createElement('button', 'StageSelection__Option state-clickable');
    option.type = 'button';
    option.addEventListener('click', () => this.onSelect(choice.id));

    const enemyLine = createElement('div', 'StageSelection__EnemyLine');
    for (let slotPosition = 1; slotPosition <= SLOT_COUNT; slotPosition += 1) {
      const enemy = choice.enemies.find((candidate) => candidate.slotPosition === slotPosition);
      enemyLine.append(this.createEnemySlot(enemy));
    }

    const trends = createElement('div', 'StageSelection__Trends');
    trends.append(
      this.createTrend('今回の店', choice.shopTrends.saleTag),
      this.createTrend('次回の店', choice.shopTrends.nextTag),
    );
    option.append(enemyLine, trends);
    return option;
  }

  createEnemySlot(enemy) {
    const slot = createElement('div', `StageSelection__EnemySlot${enemy ? '' : ' state-empty'}`);
    if (!enemy) return slot;
    const canvas = createElement('canvas', 'StageSelection__ChipPreview');
    canvas.width = PREVIEW_SIZE;
    canvas.height = PREVIEW_SIZE;
    canvas.setAttribute('aria-label', enemy.definition.nameJa);
    const label = createElement('span', 'StageSelection__EnemyName', enemy.definition.nameJa);
    slot.append(canvas, label);
    this.drawChipPreview(canvas, enemy.chip);
    return slot;
  }

  createTrend(label, tag) {
    const trend = createElement('div', 'StageSelection__Trend');
    const color = getTagBaseColors([tag])[0];
    const tagIcon = createElement('span', 'StageSelection__TrendIcon');
    tagIcon.style.setProperty('--stage-selection-tag-color', color);
    const image = document.createElement('img');
    image.src = `/assets/tags/${tag}.png`;
    image.alt = '';
    tagIcon.append(image);
    trend.append(createElement('span', 'StageSelection__TrendLabel', label), tagIcon);
    return trend;
  }

  drawChipPreview(canvas, chip) {
    const context = canvas.getContext('2d');
    const preview = createPreviewChip(chip);
    const draw = () => {
      context.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
      new ChipRenderer(context, this.assets).draw(preview, 0);
    };
    draw();
    [chip.centerPath, ...chip.tagPaths].forEach((path) => {
      const image = this.assets.load(path);
      if (!image.complete) image.addEventListener('load', draw, { once: true });
    });
  }
}
