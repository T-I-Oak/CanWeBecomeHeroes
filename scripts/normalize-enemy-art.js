import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { getCenterImagePlacement } from '../src/chips/ChipArtLayout.js';
import { ENEMY_ART_TARGET_SILHOUETTE_RADIUS_RATIO, getEnemyArtRankFromFilename } from './EnemyArtContract.js';
import { forEachVisiblePixel, readRgbaPng } from './lib/PngRgba.js';

const SOURCE_DIRECTORY = resolve('assets/enemies/source');
const OUTPUT_DIRECTORY = resolve('public/assets/enemies');
const CANVAS_SIZE = 1024;
const CHIP_RADIUS = 100;
const ALPHA_THRESHOLD = 16;

function getVisibleBounds(image) {
  const bounds = { minX: image.width, minY: image.height, maxX: -1, maxY: -1 };
  forEachVisiblePixel(image, (x, y) => {
    bounds.minX = Math.min(bounds.minX, x); bounds.maxX = Math.max(bounds.maxX, x);
    bounds.minY = Math.min(bounds.minY, y); bounds.maxY = Math.max(bounds.maxY, y);
  }, ALPHA_THRESHOLD);
  if (bounds.maxX < 0) throw new Error('Enemy art has no visible pixels.');
  return bounds;
}

function getChipPosition(image, x, y) {
  const placement = getCenterImagePlacement(CHIP_RADIUS);
  const scale = placement.size / Math.max(image.width, image.height);
  return { x: (x + 0.5 - image.width / 2) * scale, y: placement.y + (y + 0.5 - image.height / 2) * scale };
}

function getNormalization(image, rank) {
  const bounds = getVisibleBounds(image);
  const placement = getCenterImagePlacement(CHIP_RADIUS);
  const center = getChipPosition(image, (bounds.minX + bounds.maxX) / 2, (bounds.minY + bounds.maxY) / 2);
  let silhouetteRadius = 0;
  forEachVisiblePixel(image, (x, y) => { const position = getChipPosition(image, x, y); silhouetteRadius = Math.max(silhouetteRadius, Math.hypot(position.x - center.x, position.y - center.y)); }, ALPHA_THRESHOLD);
  const scale = CHIP_RADIUS * ENEMY_ART_TARGET_SILHOUETTE_RADIUS_RATIO[rank] / silhouetteRadius;
  const sourceTopLeft = getChipPosition(image, bounds.minX, bounds.minY);
  const assetScale = placement.size / Math.max(image.width, image.height);
  const targetCenter = Object.freeze({ x: 0, y: placement.y });
  const toCanvasX = (x) => (x / placement.size + 0.5) * CANVAS_SIZE;
  const toCanvasY = (y) => ((y - placement.y) / placement.size + 0.5) * CANVAS_SIZE;
  return {
    sourceX: bounds.minX, sourceY: bounds.minY, sourceWidth: bounds.maxX - bounds.minX + 1, sourceHeight: bounds.maxY - bounds.minY + 1,
    destinationX: Math.round(toCanvasX(targetCenter.x + (sourceTopLeft.x - center.x) * scale)),
    destinationY: Math.round(toCanvasY(targetCenter.y + (sourceTopLeft.y - center.y) * scale)),
    destinationWidth: Math.round((bounds.maxX - bounds.minX + 1) * assetScale * scale / placement.size * CANVAS_SIZE),
    destinationHeight: Math.round((bounds.maxY - bounds.minY + 1) * assetScale * scale / placement.size * CANVAS_SIZE),
  };
}

function normalizeAsset(sourcePath, outputPath, rank) {
  const image = readRgbaPng(sourcePath);
  const layout = getNormalization(image, rank);
  const environment = Object.fromEntries(Object.entries(layout).map(([key, value]) => [`ENEMY_ART_${key}`, String(value)]));
  const temporaryPath = `${outputPath}.normalizing.png`;
  const command = `Add-Type -AssemblyName System.Drawing; $ErrorActionPreference='Stop'; $source=[System.Drawing.Bitmap]::new($env:ENEMY_ART_SOURCE_PATH); $result=[System.Drawing.Bitmap]::new(1024,1024,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb); $graphics=[System.Drawing.Graphics]::FromImage($result); $graphics.Clear([System.Drawing.Color]::Transparent); $graphics.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic; $graphics.PixelOffsetMode=[System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality; $graphics.CompositingQuality=[System.Drawing.Drawing2D.CompositingQuality]::HighQuality; $destination=[System.Drawing.Rectangle]::new([int]$env:ENEMY_ART_destinationX,[int]$env:ENEMY_ART_destinationY,[int]$env:ENEMY_ART_destinationWidth,[int]$env:ENEMY_ART_destinationHeight); $graphics.DrawImage($source,$destination,[int]$env:ENEMY_ART_sourceX,[int]$env:ENEMY_ART_sourceY,[int]$env:ENEMY_ART_sourceWidth,[int]$env:ENEMY_ART_sourceHeight,[System.Drawing.GraphicsUnit]::Pixel); $result.Save($env:ENEMY_ART_TEMPORARY_PATH,[System.Drawing.Imaging.ImageFormat]::Png); $graphics.Dispose(); $result.Dispose(); $source.Dispose()`;
  const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', command], { env: { ...process.env, ...environment, ENEMY_ART_SOURCE_PATH: sourcePath, ENEMY_ART_TEMPORARY_PATH: temporaryPath }, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || `Could not normalize ${sourcePath}`);
  let visiblePixelCount = 0;
  forEachVisiblePixel(readRgbaPng(temporaryPath), () => { visiblePixelCount += 1; }, ALPHA_THRESHOLD);
  if (visiblePixelCount === 0) throw new Error(`Normalization produced an empty asset: ${path}`);
  copyFileSync(temporaryPath, outputPath);
  // Windows may retain a short-lived handle after System.Drawing.Dispose().
  // Retrying keeps generated artifacts out of the working tree.
  rmSync(temporaryPath, { maxRetries: 5, retryDelay: 100 });
}

function initializeSourceAssets() {
  if (existsSync(SOURCE_DIRECTORY)) throw new Error(`Enemy source directory already exists: ${SOURCE_DIRECTORY}`);
  mkdirSync(SOURCE_DIRECTORY, { recursive: true });
  readdirSync(OUTPUT_DIRECTORY)
    .filter((name) => name.endsWith('.png'))
    .forEach((filename) => copyFileSync(join(OUTPUT_DIRECTORY, filename), join(SOURCE_DIRECTORY, filename)));
}

if (process.argv.includes('--initialize-source')) initializeSourceAssets();

readdirSync(SOURCE_DIRECTORY)
  .filter((name) => name.endsWith('.png'))
  .sort()
  .forEach((filename) => normalizeAsset(join(SOURCE_DIRECTORY, filename), join(OUTPUT_DIRECTORY, filename), getEnemyArtRankFromFilename(filename)));
