import manifest from './image-levels.json' with { type: 'json' };
import { resolvePublicAssetPath } from './PublicAssetPath.js';

const CACHE_BYTE_LIMIT = 24 * 1024 * 1024;
export const IMAGE_LEVELS_ENABLED = true;
const sources = new WeakMap();
const redraws = new WeakMap();
const cache = new Map();
let reservedBytes = 0;
let requests = 0;
const failures = new Set();

/** Static canvases need one redraw after their pending image levels settle. */
export function setImageLevelRedraw(context, redraw) {
  redraws.set(context, redraw);
}

export function registerScaledImage(image, path) {
  const entry = manifest[path];
  if (entry) sources.set(image, entry);
}

export function selectImageLevel(entry, width, height, transform) {
  const requiredWidth = Math.abs(width) * Math.hypot(transform.a, transform.b);
  const requiredHeight = Math.abs(height) * Math.hypot(transform.c, transform.d);
  return entry.levels.find(level => level.width >= requiredWidth && level.height >= requiredHeight) ?? null;
}

function loadLevel(level, redraw) {
  let entry = cache.get(level.path);
  if (entry) {
    cache.delete(level.path); cache.set(level.path, entry);
    if (!entry.image.complete && redraw) entry.redraws.add(redraw);
    return entry.image;
  }
  const bytes = level.width * level.height * 4;
  for (const [path, candidate] of cache) {
    if (reservedBytes + bytes <= CACHE_BYTE_LIMIT) break;
    if (!candidate.image.complete) continue;
    cache.delete(path); reservedBytes -= candidate.bytes;
  }
  // Do not repeatedly fetch levels when the visible working set exceeds the cache.
  if (reservedBytes + bytes > CACHE_BYTE_LIMIT) return null;
  const image = new Image();
  entry = { image, bytes, redraws: new Set(redraw ? [redraw] : []) };
  cache.set(level.path, entry); reservedBytes += bytes; requests++;
  const settled = () => {
    const callbacks = [...entry.redraws];
    entry.redraws.clear();
    callbacks.forEach(callback => callback());
  };
  image.onload = settled;
  image.onerror = () => { failures.add(level.path); settled(); };
  image.src = resolvePublicAssetPath(level.path);
  return image;
}

export function drawScaledImage(context, image, x, y, width, height) {
  const entry = IMAGE_LEVELS_ENABLED && sources.get(image);
  if (!entry) return context.drawImage(image, x, y, width, height);
  const level = selectImageLevel(entry, width, height, context.getTransform());
  if (!level || failures.has(level.path)) return context.drawImage(image, x, y, width, height);
  const scaled = loadLevel(level, redraws.get(context));
  if (!scaled) return context.drawImage(image, x, y, width, height);
  // Avoid the expensive original-image path while a requested level is loading.
  // Geometry stays unchanged; no undersized image is stretched during zoom.
  if (scaled.complete && scaled.naturalWidth > 0) context.drawImage(scaled, x, y, width, height);
}

export function getImageLevelDiagnostics() {
  return { policy: IMAGE_LEVELS_ENABLED ? 'prebuilt-image-levels-v1' : 'original-images', requests,
    reservedBytes, byteLimit: CACHE_BYTE_LIMIT, entries: cache.size,
    loading: [...cache.values()].filter(entry => !entry.image.complete).length,
    failures: [...failures] };
}
