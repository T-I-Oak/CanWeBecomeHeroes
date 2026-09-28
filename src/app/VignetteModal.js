import Chip from '../chips/Chip.js';
import ChipRenderer from '../chips/ChipRenderer.js';
import { getEnemyDefinitionById } from '../game/EnemyCatalog.js';
import { getHeroProfessionDefinition, HERO_PROFESSION_IDS, default as HeroFactory } from '../game/HeroFactory.js';
import { getItemDefinitionAssetPath } from '../game/ItemFactory.js';
import { getTagBaseColors, getTagGlyphScales, getTagPaths, getTagWeight } from '../game/TagCatalog.js';
import { backgroundDrawOffset, createVignettePlayback, facingStepOffset, updateVignettePlayback } from '../game/VignettePlayer.js';
import {
  VIGNETTE_BACKGROUND_HEIGHT,
  VIGNETTE_BUBBLE_BORDER,
  VIGNETTE_DIALOGUE_FONT_SIZE,
  VIGNETTE_DIALOGUE_LINE_HEIGHT,
  VIGNETTE_STAGE_HEIGHT,
  VIGNETTE_STAGE_WIDTH,
  layoutVignetteBubble,
  traceVignetteBubble,
  vignetteBubbleMaxLines,
  vignetteBubbleTextWidth,
  vignetteStageScale,
  wrapVignetteDialogue,
} from '../game/VignetteStage.js';
import ModalLayer from './ModalLayer.js';

const FRAME_BORDER = 4;
const SKIP_LABEL = '>>Skip';

export default class VignetteModal {
  constructor(container, { assets, clock = null } = {}) {
    if (!assets) throw new Error('Vignette modal requires assets.');
    this.modalLayer = new ModalLayer(container);
    this.container = this.modalLayer.container;
    this.assets = assets;
    this.clock = clock;
    this.heroFactory = new HeroFactory();
    this.chips = new Map();
    this.frame = null;
    this.onResize = () => this.resize();
  }

  play(scenario) {
    this.completed = false;
    this.playback = createVignettePlayback(scenario);
    this.frameElement = document.createElement('div');
    this.frameElement.className = 'VignetteModal__Frame';
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'VignetteModal__Stage';
    this.frameElement.append(this.canvas);
    this.skipButton = document.createElement('button');
    this.skipButton.type = 'button';
    this.skipButton.className = 'VignetteModal__Skip';
    this.skipButton.textContent = SKIP_LABEL;
    this.container.replaceChildren(this.frameElement, this.skipButton);
    this.context = this.canvas.getContext('2d');
    this.modalLayer.open();
    this.clock?.pause('vignette');
    window.addEventListener('resize', this.onResize);
    this.resize();
    this.draw();
    const asset = scenario.commands.find((command) => command.type === 'background')?.asset;
    if (asset) {
      const background = this.assets.load(asset.startsWith('/') ? asset : `/${asset}`);
      if (!background.complete) background.addEventListener('load', () => { if (!this.completed) this.draw(); }, { once: true });
    }
    return new Promise((resolve) => {
      this.resolvePlayback = resolve;
      this.skipButton.addEventListener('click', () => this.complete());
      let last = performance.now();
      const frame = (now) => {
        if (this.completed) return;
        const deltaSeconds = Math.min(0.05, (now - last) / 1000);
        last = now;
        updateVignettePlayback(this.playback, deltaSeconds);
        this.draw();
        if (this.playback.done) {
          this.complete();
          return;
        }
        this.frame = requestAnimationFrame(frame);
      };
      this.frame = requestAnimationFrame(frame);
    });
  }

  complete() {
    if (this.completed) return;
    this.completed = true;
    this.finish();
    this.resolvePlayback?.();
  }

  finish() {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    window.removeEventListener('resize', this.onResize);
    this.clock?.resume('vignette');
    this.modalLayer.close();
    this.chips.clear();
  }

  resize() {
    const style = getComputedStyle(this.container);
    const availableWidth = this.container.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const availableHeight = this.container.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    this.scale = vignetteStageScale(availableWidth - FRAME_BORDER * 2, availableHeight - FRAME_BORDER * 2);
    const pixelScale = window.devicePixelRatio || 1;
    this.canvas.style.width = `${VIGNETTE_STAGE_WIDTH * this.scale}px`;
    this.canvas.style.height = `${VIGNETTE_STAGE_HEIGHT * this.scale}px`;
    this.canvas.width = Math.max(1, Math.floor(VIGNETTE_STAGE_WIDTH * this.scale * pixelScale));
    this.canvas.height = Math.max(1, Math.floor(VIGNETTE_STAGE_HEIGHT * this.scale * pixelScale));
    this.context.setTransform(this.scale * pixelScale, 0, 0, this.scale * pixelScale, 0, 0);
    this.layoutFrame();
  }

  layoutFrame() {
    const { view } = this.playback;
    const { clip, offsetX, offsetY, opacity } = view;
    const style = getComputedStyle(this.container);
    const paddingLeft = parseFloat(style.paddingLeft);
    const paddingTop = parseFloat(style.paddingTop);
    const availableWidth = this.container.clientWidth - paddingLeft - parseFloat(style.paddingRight) - FRAME_BORDER * 2;
    const availableHeight = this.container.clientHeight - paddingTop - parseFloat(style.paddingBottom) - FRAME_BORDER * 2;
    const restX = paddingLeft + FRAME_BORDER + (availableWidth - VIGNETTE_STAGE_WIDTH * this.scale) / 2;
    const restY = paddingTop + FRAME_BORDER + (availableHeight - VIGNETTE_STAGE_HEIGHT * this.scale) / 2;
    this.frameElement.style.left = `${restX + (clip.x + offsetX) * this.scale - FRAME_BORDER}px`;
    this.frameElement.style.top = `${restY + (clip.y + offsetY) * this.scale - FRAME_BORDER}px`;
    this.frameElement.style.width = `${Math.max(0, clip.width * this.scale)}px`;
    this.frameElement.style.height = `${Math.max(0, clip.height * this.scale)}px`;
    this.frameElement.style.opacity = String(opacity);
    this.canvas.style.left = `${-clip.x * this.scale}px`;
    this.canvas.style.top = `${-clip.y * this.scale}px`;
  }

  chipFor(instance, facing) {
    const cached = this.chips.get(instance.id);
    const chip = cached ?? this.createChip(instance);
    chip.radius = facing.chipRadius;
    chip.height = 0;
    chip.fillColor = facing.fillColor;
    chip.flipped = facing.direction === 'left';
    chip.bounds = null;
    this.chips.set(instance.id, chip);
    return chip;
  }

  createChip(instance) {
    if (instance.kind === 'character') {
      const profession = HERO_PROFESSION_IDS.find((id) => getHeroProfessionDefinition(id).heroId === instance.heroId);
      return this.heroFactory.create({ profession, x: 0, y: 0 }).chip;
    }
    if (instance.kind === 'enemy') {
      const definition = getEnemyDefinitionById(instance.enemyId);
      const tags = [...(definition.intrinsicTags ?? [])];
      return new Chip({
        id: 0, type: 'enemy', x: 0, y: 0, weight: getTagWeight(tags), centerPath: definition.assetPath,
        tagPaths: getTagPaths(tags), tagBaseColors: getTagBaseColors(tags), tagGlyphScales: getTagGlyphScales(tags),
      });
    }
    return new Chip({
      id: 0, type: 'item', x: 0, y: 0, weight: 1, centerPath: getItemDefinitionAssetPath(instance.itemId),
      tagPaths: [], tagBaseColors: [], tagGlyphScales: [],
    });
  }

  draw() {
    this.layoutFrame();
    const { context, playback } = this;
    context.clearRect(0, 0, VIGNETTE_STAGE_WIDTH, VIGNETTE_STAGE_HEIGHT);
    this.drawBackground(playback);
    const renderer = new ChipRenderer(context, this.assets);
    const instances = playback.scenario.instances ?? [];
    for (let index = instances.length - 1; index >= 0; index -= 1) {
      const instance = instances[index];
      const state = playback.instances.get(instance.id);
      if (!state?.position || !state.facing) continue;
      const chip = this.chipFor(instance, state.facing);
      const direction = state.facing.direction === 'left' ? -1 : 1;
      chip.x = state.position.x + direction * facingStepOffset(state.facing, playback.time);
      chip.y = state.position.y - state.facing.chipRadius;
      renderer.draw(chip, playback.time);
    }
    this.drawDialogue(playback);
  }

  drawBackground(playback) {
    const { context } = this;
    const background = playback.background;
    if (!background?.asset) return;
    const path = background.asset.startsWith('/') ? background.asset : `/${background.asset}`;
    const image = this.assets.load(path);
    if (!image.complete || image.naturalWidth === 0) return;
    const width = image.naturalWidth * (VIGNETTE_BACKGROUND_HEIGHT / image.naturalHeight);
    const offset = backgroundDrawOffset(background, playback.time, width);
    context.save();
    context.beginPath();
    context.rect(0, 0, VIGNETTE_STAGE_WIDTH, VIGNETTE_STAGE_HEIGHT);
    context.clip();
    context.drawImage(image, offset - width, 0, width, VIGNETTE_BACKGROUND_HEIGHT);
    context.drawImage(image, offset, 0, width, VIGNETTE_BACKGROUND_HEIGHT);
    context.restore();
  }

  drawDialogue(playback) {
    for (const line of playback.lines ?? []) this.drawLine(playback, line);
  }

  drawLine(playback, line) {
    if (!line?.text) return;
    const state = playback.instances.get(line.instanceId);
    if (!state?.position || !state.facing) return;
    const sign = state.facing.direction === 'left' ? -1 : 1;
    const direction = line.direction;
    const { context } = this;
    context.save();
    context.font = `${VIGNETTE_DIALOGUE_FONT_SIZE}px system-ui, sans-serif`;
    context.textBaseline = 'top';
    const inkHeight = context.measureText(line.text).actualBoundingBoxDescent || VIGNETTE_DIALOGUE_FONT_SIZE;
    const rows = wrapVignetteDialogue(
      line.text,
      (sample) => context.measureText(sample).width,
      vignetteBubbleTextWidth(line.width, direction),
      vignetteBubbleMaxLines(direction, VIGNETTE_STAGE_HEIGHT, inkHeight),
    );
    const bubble = layoutVignetteBubble({
      chipCenterX: state.position.x + sign * facingStepOffset(state.facing, playback.time),
      chipCenterY: state.position.y - state.facing.chipRadius,
      chipRadius: state.facing.chipRadius,
      direction,
      width: line.width,
      lines: Math.max(rows.length, 1),
      inkHeight,
    });
    context.beginPath();
    context.rect(0, 0, VIGNETTE_STAGE_WIDTH, VIGNETTE_STAGE_HEIGHT);
    context.clip();
    traceVignetteBubble(context, bubble);
    context.save();
    context.globalAlpha *= line.backgroundOpacity;
    context.fillStyle = line.backgroundColor;
    context.fill();
    context.restore();
    context.lineWidth = VIGNETTE_BUBBLE_BORDER;
    context.strokeStyle = line.borderColor;
    context.lineJoin = 'round';
    context.stroke();
    context.lineWidth = line.outlineWidth;
    context.strokeStyle = line.outlineColor;
    context.fillStyle = line.color;
    rows.forEach((text, index) => {
      const x = bubble.textX;
      const y = bubble.textY + index * VIGNETTE_DIALOGUE_LINE_HEIGHT;
      if (line.outlineWidth > 0) context.strokeText(text, x, y);
      context.fillText(text, x, y);
    });
    context.restore();
  }
}
