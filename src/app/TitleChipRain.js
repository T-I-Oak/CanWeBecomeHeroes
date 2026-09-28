import { CHIP_RADIUS } from '../chips/Chip.js';
import ChipRenderer from '../chips/ChipRenderer.js';
import { AREA_THEME } from '../game/AreaTheme.js';
import { ENEMY_CATALOG } from '../game/EnemyCatalog.js';
import { HERO_PROFESSION_IDS, getHeroProfessionDefinition } from '../game/HeroFactory.js';
import { ENEMY_CHIP_DIAMETER } from '../game/HeroSlotLayout.js';
import { DESTINATION_TYPES, DESTINATIONS, WEAPONS, getItemDefinitionAssetPath } from '../game/ItemFactory.js';
import { getTagBaseColors, getTagGlyphScales, getTagPaths } from '../game/TagCatalog.js';

/** Screen size of a Hero. The rim uses world radii, then this scale, so it matches in-game thickness. */
const TITLE_HERO_DIAMETER = 72;
const TITLE_SCALE = TITLE_HERO_DIAMETER / (CHIP_RADIUS.hero * 2);
const RADII = Object.freeze({
  small: ENEMY_CHIP_DIAMETER.small / 2,
  medium: CHIP_RADIUS.hero,
  large: ENEMY_CHIP_DIAMETER.large / 2,
  item: CHIP_RADIUS.item,
});
/** Screen area occupied by one falling chip. The count follows the viewport so density stays even. */
const SCREEN_AREA_PER_CHIP = 32000;
const FALL_ANGLE = 0.32;
const ITEM_TYPES = Object.freeze([
  ...Object.keys(WEAPONS),
  ...DESTINATION_TYPES,
  ...['head', 'torso', 'feet'].flatMap((part) => [1, 2, 3, 4, 5].map((number) => `${part}-${number}`)),
]);

function randomBetween(random, min, max) {
  return min + random() * (max - min);
}

function createAppearance(definition) {
  return {
    radius: RADII[definition.size],
    centerPath: definition.centerPath,
    tagPaths: getTagPaths(definition.tags),
    tagBaseColors: getTagBaseColors(definition.tags),
    tagGlyphScales: getTagGlyphScales(definition.tags),
    fillColor: definition.fillColor,
  };
}

function createCatalog() {
  const heroes = HERO_PROFESSION_IDS.map((profession) => {
    const definition = getHeroProfessionDefinition(profession);
    return createAppearance({
      size: 'medium',
      centerPath: `/assets/heroes/${definition.asset}.png`,
      tags: [definition.tag],
      fillColor: AREA_THEME.preparation.chipFill,
    });
  });
  const enemies = Object.values(ENEMY_CATALOG)
    .filter((definition) => definition.size !== 'area')
    .map((definition) => createAppearance({
      size: definition.size,
      centerPath: definition.assetPath,
      tags: definition.intrinsicTags,
      fillColor: AREA_THEME.battle.chipFill,
    }));
  const items = ITEM_TYPES.map((type) => createAppearance({
    size: 'item',
    centerPath: getItemDefinitionAssetPath(type),
    tags: [],
    fillColor: DESTINATIONS[type] ? AREA_THEME[DESTINATIONS[type]].chipFill : '#ffffff',
  }));
  return [heroes, enemies, items];
}

function visualRadius(chip) {
  return chip.radius * chip.scale;
}

function chipCountForViewport(width, height) {
  return Math.max(1, Math.round((width * height) / SCREEN_AREA_PER_CHIP));
}

function isOnScreen(chip, width, height) {
  const radius = visualRadius(chip);
  return chip.x + radius > 0 && chip.x - radius < width && chip.y + radius > 0 && chip.y - radius < height;
}

function deflectOverlappingChips(chips) {
  for (let index = 0; index < chips.length; index += 1) {
    const first = chips[index];
    const firstRadius = visualRadius(first);
    for (let other = index + 1; other < chips.length; other += 1) {
      const second = chips[other];
      const dx = second.x - first.x;
      const dy = second.y - first.y;
      const distance = Math.hypot(dx, dy);
      const minimum = firstRadius + visualRadius(second);
      if (distance >= minimum) continue;
      const nx = distance === 0 ? 1 : dx / distance;
      const ny = distance === 0 ? 0 : dy / distance;
      const approach = (second.vx - first.vx) * nx + (second.vy - first.vy) * ny;
      if (approach < 0) {
        const firstAlong = first.vx * nx + first.vy * ny;
        const secondAlong = second.vx * nx + second.vy * ny;
        first.vx += (secondAlong - firstAlong) * nx;
        first.vy += (secondAlong - firstAlong) * ny;
        second.vx += (firstAlong - secondAlong) * nx;
        second.vy += (firstAlong - secondAlong) * ny;
      }
      const overlap = (minimum - distance) / 2;
      first.x -= nx * overlap;
      first.y -= ny * overlap;
      second.x += nx * overlap;
      second.y += ny * overlap;
    }
  }
}

function createChip(groups, width, height, random) {
  const group = groups[Math.floor(random() * groups.length)];
  const appearance = group[Math.floor(random() * group.length)];
  const drawnRadius = appearance.radius * TITLE_SCALE;
  const direction = random() < 0.5 ? -1 : 1;
  const speed = randomBetween(random, 28, 64);
  const angle = randomBetween(random, -FALL_ANGLE, FALL_ANGLE);
  return {
    ...appearance,
    x: randomBetween(random, -drawnRadius, Math.max(drawnRadius, width + drawnRadius)),
    y: randomBetween(random, -height, height),
    vx: Math.sin(angle) * speed,
    vy: Math.cos(angle) * speed,
    tilt: randomBetween(random, 0, Math.PI * 2),
    tiltVelocity: direction * randomBetween(random, 0.15, 0.7),
    height: 0,
    scale: TITLE_SCALE,
    poseTilt: 0,
    effectOffsetX: 0,
    effectOffsetY: 0,
    effectRotation: 0,
    flipped: false,
    physicalDamageReduction: 0,
    storageCount: null,
    storageCapacity: null,
    actionGauge: null,
    actionGaugeMaximum: null,
    actionGaugeBaseMaximum: null,
  };
}

/** Decorative chips that fall past the title. A hit exchanges the motion along the contact. */
export default class TitleChipRain {
  constructor(canvas, assets, random = Math.random) {
    this.canvas = canvas;
    this.renderer = new ChipRenderer(canvas.getContext('2d'), assets);
    this.random = random;
    this.groups = createCatalog();
    this.chips = [];
    this.frame = 0;
    this.observer = null;
  }

  resize() {
    const { canvas } = this;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return;
    const pixelRatio = window.devicePixelRatio || 1;
    const nextWidth = Math.max(1, Math.floor(width * pixelRatio));
    const nextHeight = Math.max(1, Math.floor(height * pixelRatio));
    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth;
      canvas.height = nextHeight;
    }
    this.reconcileCount(width, height);
  }

  reconcileCount(width, height) {
    const target = chipCountForViewport(width, height);
    while (this.chips.length < target) this.chips.push(createChip(this.groups, width, height, this.random));
    if (this.chips.length <= target) return;
    const visible = this.chips.filter((chip) => isOnScreen(chip, width, height));
    const hidden = this.chips.filter((chip) => !isOnScreen(chip, width, height));
    this.chips = visible.length >= target ? visible.slice(0, target) : [...visible, ...hidden.slice(0, target - visible.length)];
  }

  update(deltaSeconds) {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    this.chips.forEach((chip) => {
      chip.x += chip.vx * deltaSeconds;
      chip.y += chip.vy * deltaSeconds;
      chip.tilt += chip.tiltVelocity * deltaSeconds;
    });
    deflectOverlappingChips(this.chips);
    this.chips.forEach((chip) => {
      const radius = visualRadius(chip);
      const offBottom = chip.y - radius > height;
      const offSide = chip.x + radius < 0 || chip.x - radius > width;
      const offTop = chip.y + radius < 0 && chip.vy < 0;
      if (offBottom || offSide || offTop) {
        const next = createChip(this.groups, width, height, this.random);
        next.y = -visualRadius(next) - randomBetween(this.random, 0, height * 0.35);
        Object.assign(chip, next);
      }
    });
  }

  draw(timeSeconds) {
    const { canvas } = this;
    const context = canvas.getContext('2d');
    const pixelRatio = window.devicePixelRatio || 1;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    this.chips.forEach((chip) => this.renderer.drawBody(chip, timeSeconds));
    this.chips.forEach((chip) => this.renderer.drawEffects(chip, timeSeconds));
  }

  start() {
    this.stop();
    this.resize();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(this.canvas);
    let previous = performance.now();
    const frame = (time) => {
      const deltaSeconds = Math.min(0.05, (time - previous) / 1000);
      previous = time;
      this.update(deltaSeconds);
      this.draw(time / 1000);
      this.frame = requestAnimationFrame(frame);
    };
    this.frame = requestAnimationFrame(frame);
  }

  stop() {
    this.observer?.disconnect();
    this.observer = null;
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
  }
}
