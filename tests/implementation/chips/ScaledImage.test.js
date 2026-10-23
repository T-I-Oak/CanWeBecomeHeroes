import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import manifest from '../../../src/chips/image-levels.json' with { type: 'json' };
import { selectImageLevel, registerScaledImage, drawScaledImage, getImageLevelDiagnostics, setImageLevelRedraw } from '../../../src/chips/ScaledImage.js';

test('static canvases redraw after a shared pending level loads or fails', t => {
  const previous = globalThis.Image;
  const created = [];
  globalThis.Image = class { constructor() { this.complete = false; created.push(this); } };
  t.after(() => { if (previous) globalThis.Image = previous; else delete globalThis.Image; });
  const source = {};
  registerScaledImage(source, '/assets/heroes/guard.png');
  let redrawCount = 0;
  const contexts = [0, 1].map(() => ({ getTransform: () => ({ a: 1, b: 0, c: 0, d: 1 }), drawImage() {} }));
  for (const context of contexts) {
    setImageLevelRedraw(context, () => { redrawCount++; drawScaledImage(context, source, 0, 0, 60, 60); });
    drawScaledImage(context, source, 0, 0, 60, 60);
    drawScaledImage(context, source, 0, 0, 60, 60);
  }
  assert.equal(created.length, 1);
  created[0].complete = true; created[0].naturalWidth = 64; created[0].onload();
  assert.equal(redrawCount, 2);
  drawScaledImage(contexts[0], source, 0, 0, 240, 240);
  created[1].complete = true; created[1].onerror();
  assert.equal(redrawCount, 3);
});

test('generated levels match source hashes, PNG dimensions and the complete source catalog', () => {
  const root = new URL('../../../', import.meta.url);
  for (const group of ['areas', 'heroes', 'tags', 'status', 'enemies', 'items']) {
    for (const name of readdirSync(new URL(`public/assets/${group}/`, root)).filter(name => name.endsWith('.png'))) {
      assert.ok(manifest[`/assets/${group}/${name}`], `Regenerate image levels for ${group}/${name}`);
    }
  }
  for (const [path, entry] of Object.entries(manifest)) {
    const source = readFileSync(new URL(`public${path}`, root));
    const hash = createHash('sha256').update(source).digest('hex').slice(0, 12);
    assert.equal(entry.width, source.readUInt32BE(16));
    assert.equal(entry.height, source.readUInt32BE(20));
    let prior = 0;
    for (const level of entry.levels) {
      assert.ok(level.path.includes(`.${hash}.`), `Regenerate stale source ${path}`);
      const png = readFileSync(new URL(`public${level.path}`, root));
      assert.equal(level.width, png.readUInt32BE(16)); assert.equal(level.height, png.readUInt32BE(20));
      assert.ok(level.width >= prior && level.width < entry.width); prior = level.width;
    }
  }
});

test('selection accounts for DPR, zoom, rotation and both destination dimensions without upscaling', () => {
  const entry = { levels: [{ width: 32, height: 16 }, { width: 64, height: 32 }, { width: 128, height: 64 }] };
  assert.equal(selectImageLevel(entry, 20, 10, { a: 3, b: 0, c: 0, d: 3 }), entry.levels[1]);
  assert.equal(selectImageLevel(entry, 20, 10, { a: 0, b: -3, c: 3, d: 0 }), entry.levels[1]);
  assert.equal(selectImageLevel(entry, 20, 20, { a: 3, b: 0, c: 0, d: 3 }), entry.levels[2]);
  assert.equal(selectImageLevel(entry, 129, 65, { a: 1, b: 0, c: 0, d: 1 }), null);
});

test('pending levels do not draw originals; cached and larger zoom levels preserve destination geometry', t => {
  const created = [];
  const previous = globalThis.Image;
  globalThis.Image = class { constructor() { this.complete = false; this.naturalWidth = 0; created.push(this); } };
  t.after(() => { if (previous) globalThis.Image = previous; else delete globalThis.Image; });
  const source = { complete: true, naturalWidth: 1024, naturalHeight: 1024 };
  registerScaledImage(source, '/assets/heroes/guard.png');
  const calls = [];
  let scale = 1;
  const context = { getTransform: () => ({ a: scale, b: 0, c: 0, d: scale }), drawImage: (...args) => calls.push(args) };
  drawScaledImage(context, source, 10, 20, 20, 20);
  assert.equal(calls.length, 0);
  assert.equal(created.length, 1);
  created[0].complete = true; created[0].naturalWidth = 32;
  drawScaledImage(context, source, 10, 20, 20, 20);
  assert.deepEqual(calls.pop(), [created[0], 10, 20, 20, 20]);
  assert.equal(created.length, 1);
  scale = 4;
  drawScaledImage(context, source, 10, 20, 20, 20);
  assert.equal(created.length, 2);
  assert.match(created[1].src, /\.128\.png$/);
  created[1].complete = true; created[1].naturalWidth = 128;
  drawScaledImage(context, source, 10, 20, 20, 20);
  assert.deepEqual(calls.pop(), [created[1], 10, 20, 20, 20]);
  scale = 100;
  drawScaledImage(context, source, 10, 20, 20, 20);
  assert.deepEqual(calls.pop(), [source, 10, 20, 20, 20]);
});

test('failed level is reported and original remains available without retrying each frame', t => {
  const initialFailures = getImageLevelDiagnostics().failures.length;
  const previous = globalThis.Image;
  let requested;
  globalThis.Image = class { constructor() { requested = this; this.complete = false; } };
  t.after(() => { if (previous) globalThis.Image = previous; else delete globalThis.Image; });
  const source = {};
  registerScaledImage(source, '/assets/areas/battle.png');
  const calls = [];
  const context = { getTransform: () => ({ a: 1, b: 0, c: 0, d: 1 }), drawImage: (...args) => calls.push(args) };
  drawScaledImage(context, source, 0, 0, 30, 30);
  requested.complete = true;
  requested.onerror();
  const before = getImageLevelDiagnostics().requests;
  drawScaledImage(context, source, 0, 0, 30, 30);
  assert.equal(calls[0][0], source);
  assert.equal(getImageLevelDiagnostics().requests, before);
  assert.equal(getImageLevelDiagnostics().failures.length, initialFailures + 1);
});
