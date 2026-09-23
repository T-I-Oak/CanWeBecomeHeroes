import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  CHIP_CENTER_ART_SAFE_RADIUS_RATIO,
  createCenterArtBoundarySamples,
  getCenterArtPixelPosition,
  isWithinCenterArtSafeCircle,
} from '../../src/chips/ChipArtLayout.js';
import {
  ENEMY_ART_MINIMUM_SILHOUETTE_RADIUS_RATIO,
  ENEMY_ART_TARGET_SILHOUETTE_RADIUS_RATIO,
  getEnemyArtRankFromFilename,
} from '../../scripts/EnemyArtContract.js';
import { forEachVisiblePixel, readRgbaPng } from '../../scripts/lib/PngRgba.js';

const CHIP_RADIUS = 100;
const ENEMY_ART_SOURCE_DIRECTORY = join(process.cwd(), 'assets', 'enemies', 'source');
const ENEMY_ASSET_DIRECTORY = join(process.cwd(), 'public', 'assets', 'enemies');
const ALPHA_THRESHOLD = 16;
const ENEMY_TAG_AFFINITIES = Object.freeze([
  'valor', 'iron', 'arcane', 'reputation', 'lightning',
  'cloth', 'dexterity', 'feather', 'gem', 'blessing',
  'fortune', 'fire', 'water', 'vitality', 'area',
]);
const ENEMY_RANKS = Object.freeze(['small', 'medium', 'large']);
// Rank remains a Chip-size concern at runtime. Source art has its own common
// rank-based density contract inside the shared tag-safe region.

function getEnemyArtGeometry(path) {
  const image = readRgbaPng(path);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  const pixels = [];
  forEachVisiblePixel(image, (pixelX, pixelY) => {
    const position = getCenterArtPixelPosition({ imageWidth: image.width, imageHeight: image.height, pixelX, pixelY, radius: CHIP_RADIUS });
    pixels.push(position);
    minX = Math.min(minX, position.x);
    maxX = Math.max(maxX, position.x);
    minY = Math.min(minY, position.y);
    maxY = Math.max(maxY, position.y);
  }, ALPHA_THRESHOLD);
  const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  let silhouetteRadius = 0;
  pixels.forEach((position) => { silhouetteRadius = Math.max(silhouetteRadius, Math.hypot(position.x - center.x, position.y - center.y)); });
  return { pixels, silhouetteRadius };
}

test('center-art boundary has sixteen common samples inside the chip mask', () => {
  const samples = createCenterArtBoundarySamples(CHIP_RADIUS);

  assert.equal(samples.length, 16);
  samples.forEach((sample) => assert.ok(Math.abs(Math.hypot(sample.x, sample.y) - CHIP_RADIUS * CHIP_CENTER_ART_SAFE_RADIUS_RATIO) < 0.000001));
});

test('every production enemy asset has one retained source master', () => {
  const sourceNames = readdirSync(ENEMY_ART_SOURCE_DIRECTORY).filter((name) => name.endsWith('.png')).sort();
  const outputNames = readdirSync(ENEMY_ASSET_DIRECTORY).filter((name) => name.endsWith('.png')).sort();

  assert.deepEqual(outputNames, sourceNames);
});

test('every tag affinity has a small, medium, and large enemy asset', () => {
  const filenames = new Set(readdirSync(ENEMY_ART_SOURCE_DIRECTORY).filter((name) => name.endsWith('.png')));
  const missing = ENEMY_RANKS.flatMap((rank) => ENEMY_TAG_AFFINITIES
    .map((tag) => `${rank}-${tag}.png`)
    .filter((filename) => !filenames.has(filename)));

  assert.deepEqual(missing, []);
});

test('every retained enemy source master has enough raster resolution for chip normalization', () => {
  const failures = [];
  for (const filename of readdirSync(ENEMY_ART_SOURCE_DIRECTORY).filter((name) => name.endsWith('.png')).sort()) {
    const image = readRgbaPng(join(ENEMY_ART_SOURCE_DIRECTORY, filename));
    if (image.width < 1024 || image.height < 1024) failures.push(`${filename}: ${image.width}x${image.height}`);
  }

  assert.deepEqual(failures, []);
});

test('every enemy asset fits the common chip-art safe circle and has a readable silhouette', () => {
  const failures = [];
  for (const filename of readdirSync(ENEMY_ASSET_DIRECTORY).filter((name) => name.endsWith('.png')).sort()) {
    const geometry = getEnemyArtGeometry(join(ENEMY_ASSET_DIRECTORY, filename));
    const hasOverflow = geometry.pixels.some((position) => !isWithinCenterArtSafeCircle(position, CHIP_RADIUS));
    const rank = getEnemyArtRankFromFilename(filename);
    const silhouetteTooSmall = geometry.silhouetteRadius < CHIP_RADIUS * ENEMY_ART_MINIMUM_SILHOUETTE_RADIUS_RATIO[rank];
    // One source-pixel edge becomes up to 1.5 Chip-space pixels after
    // bicubic resampling, so this is a rasterization tolerance, not a range.
    const missesTarget = Math.abs(geometry.silhouetteRadius - CHIP_RADIUS * ENEMY_ART_TARGET_SILHOUETTE_RADIUS_RATIO[rank]) > 1.5;
    if (hasOverflow || silhouetteTooSmall || missesTarget) {
      failures.push(`${filename}: ${hasOverflow ? 'outside safe circle' : ''}${hasOverflow && (silhouetteTooSmall || missesTarget) ? ', ' : ''}${silhouetteTooSmall ? 'silhouette too small' : ''}${silhouetteTooSmall && missesTarget ? ', ' : ''}${missesTarget ? 'silhouette does not match rank target' : ''}`);
    }
  }

  assert.deepEqual(failures, []);
});
