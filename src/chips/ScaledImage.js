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
const usage = {};
usage.next = usage.previous = usage;
let previousAnchor = {};
let currentAnchor = {};
let frameTime;
const waitingRedraws = new Set();

function append(node) {
  node.previous = usage.previous;
  node.next = usage;
  usage.previous.next = node;
  usage.previous = node;
}

function remove(node) {
  node.previous.next = node.next;
  node.next.previous = node.previous;
  node.previous = node.next = null;
}

append(previousAnchor);
append(currentAnchor);

/** All Canvas animation loops share the browser's RAF timestamp. */
export function beginImageLevelFrame(time) {
  if (time === frameTime) return;
  frameTime = time;
  remove(previousAnchor);
  previousAnchor = currentAnchor;
  currentAnchor = {};
  append(currentAnchor);
  const callbacks = [...waitingRedraws];
  waitingRedraws.clear();
  callbacks.forEach(callback => callback());
}

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
    if (entry.anchor !== currentAnchor) {
      remove(entry);
      append(entry);
      entry.anchor = currentAnchor;
    }
    if (!entry.image.complete && redraw) entry.redraws.add(redraw);
    return entry.image;
  }
  const bytes = level.width * level.height * 4;
  let candidate = usage.next;
  while (reservedBytes + bytes > CACHE_BYTE_LIMIT && candidate !== previousAnchor) {
    const next = candidate.next;
    if (candidate.image.complete) {
      remove(candidate);
      cache.delete(candidate.path);
      reservedBytes -= candidate.bytes;
    }
    candidate = next;
  }
  // Both previous-frame and current-frame users stay protected under pressure.
  if (reservedBytes + bytes > CACHE_BYTE_LIMIT) {
    if (redraw) waitingRedraws.add(redraw);
    return null;
  }
  const image = new Image();
  entry = { image, bytes, path: level.path, anchor: currentAnchor, redraws: new Set(redraw ? [redraw] : []) };
  append(entry);
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
  if (!scaled) return;
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
