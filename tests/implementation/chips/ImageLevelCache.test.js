import test from 'node:test';
import assert from 'node:assert/strict';
import manifest from '../../../src/chips/image-levels.json' with { type: 'json' };

let scenario = 0;
async function setup(t) {
  const api = await import(`../../../src/chips/ScaledImage.js?cache-test=${scenario++}`);
  const previous = globalThis.Image;
  const created = [];
  globalThis.Image = class {
    constructor() { this.complete = false; this.naturalWidth = 0; created.push(this); }
  };
  t.after(() => { if (previous) globalThis.Image = previous; else delete globalThis.Image; });
  const paths = Object.entries(manifest).filter(([, entry]) => entry.levels.some(level => level.width === 512 && level.height === 512))
    .map(([path]) => path).slice(0, 30);
  assert.equal(paths.length, 30);
  const sources = paths.map(path => { const image = {}; api.registerScaledImage(image, path); return image; });
  const calls = [];
  const context = { getTransform: () => ({ a: 1, b: 0, c: 0, d: 1 }), drawImage: (...args) => calls.push(args) };
  const draw = (index, size = 500) => api.drawScaledImage(context, sources[index], 1, 2, size, size);
  const settle = () => created.filter(image => !image.complete).forEach(image => {
    image.complete = true; image.naturalWidth = 512; image.onload();
  });
  const frame = time => { calls.length = 0; api.beginImageLevelFrame(time); };
  const budget = () => assert.ok(api.getImageLevelDiagnostics().reservedBytes <= 24 * 1024 * 1024);
  return { ...api, sources, created, calls, context, draw, settle, frame, budget };
}

test('25-image fixed working set keeps 24 images stable without recurring fetches or original fallback', async t => {
  const h = await setup(t);
  for (let frame = 0; frame < 8; frame++) {
    h.frame(frame);
    for (let image = 0; image < 25; image++) h.draw(image);
    assert.equal(h.created.length, 24);
    assert.equal(h.calls.length, frame === 0 ? 0 : 24);
    if (frame > 0) assert.deepEqual(h.calls.map(call => call[0]), h.created);
    h.budget(); h.settle();
  }
});

test('previous and current anchors protect reused entries and release unused images after a full frame', async t => {
  const h = await setup(t);
  h.frame(0);
  for (let i = 0; i < 24; i++) h.draw(i);
  h.settle();
  h.frame(1);
  h.draw(0); h.draw(0); // Reusing an entry cannot move an anchor.
  h.beginImageLevelFrame(1); // A second RAF callback in the same frame cannot age protection.
  h.draw(24);
  assert.equal(h.created.length, 24); // A: only the previous frame fills the budget.
  h.frame(2);
  h.draw(0); h.draw(24);
  assert.equal(h.created.length, 25);
  h.settle();
  h.frame(3);
  h.draw(0); h.draw(24);
  assert.deepEqual(h.calls.map(call => call[0]), [h.created[0], h.created[24]]);
  h.draw(1); // Unused image 1 was evicted; it can be fetched again.
  assert.equal(h.created.length, 26);
  h.budget();
});

test('zoom change waits for prior-frame protection then requests and displays the new level', async t => {
  const h = await setup(t);
  h.frame(0);
  for (let i = 0; i < 24; i++) h.draw(i);
  h.settle();
  h.frame(1);
  h.draw(0, 240);
  assert.equal(h.created.length, 24);
  assert.equal(h.calls.length, 0);
  h.frame(2);
  h.draw(0, 240);
  assert.equal(h.created.length, 25);
  assert.match(h.created[24].src, /\.256\.png$/);
  assert.equal(h.calls.length, 0);
  h.settle();
  h.frame(3); h.draw(0, 240);
  assert.deepEqual(h.calls[0], [h.created[24], 1, 2, 240, 240]);
  h.budget();
});

test('old pending loads are not evicted; static canvases retry capacity denial and redraw after loading', async t => {
  const h = await setup(t);
  h.frame(0);
  for (let i = 0; i < 24; i++) h.draw(i);
  let redraws = 0;
  h.setImageLevelRedraw(h.context, () => { redraws++; h.draw(24); });
  h.draw(24); // Capacity denied, without a request or original-image draw.
  h.frame(1); h.frame(2);
  assert.equal(h.created.length, 24); // Old but still loading.
  assert.equal(h.calls.length, 0);
  h.settle();
  h.frame(3); // Static retry now evicts an unused completed image.
  assert.equal(h.created.length, 25);
  assert.equal(h.calls.length, 0);
  h.settle();
  assert.equal(h.calls.at(-1)[0], h.created[24]);
  assert.equal(redraws, 4); // Three frame retries and one completion redraw.
  h.budget();
});
