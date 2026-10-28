import test from 'node:test';
import assert from 'node:assert/strict';
import TouchDragLoupe, { getLoupeLayout } from '../../../src/app/TouchDragLoupe.js';
import { selectImageLevel } from '../../../src/chips/ScaledImage.js';

test('loupe stays in the viewport at corners and keeps the real pointer at its sample center', () => {
  for (const [width, height] of [[390, 844], [844, 390], [768, 1024], [120, 100]]) {
    for (const point of [{ x: 0, y: 0 }, { x: width, y: height }, { x: width / 2, y: height / 2 }]) {
      const layout = getLoupeLayout(point, width, height);
      assert.ok(layout.x >= 0 && layout.y >= 0);
      assert.ok(layout.x + layout.width <= width && layout.y + layout.height <= height);
      assert.equal(layout.sourceX + layout.sourceWidth / 2, point.x);
      assert.equal(layout.sourceY + layout.sourceHeight / 2, point.y);
      assert.equal(layout.width / layout.sourceWidth, 2);
    }
  }
});

test('placement uses hysteresis when the finger crosses the upper boundary', () => {
  const below = getLoupeLayout({ x: 200, y: 150 }, 390, 844);
  assert.equal(below.side, 'below');
  assert.equal(getLoupeLayout({ x: 200, y: 175 }, 390, 844, below.side).side, 'below');
  assert.equal(getLoupeLayout({ x: 200, y: 220 }, 390, 844, below.side).side, 'above');
});

test('loupe redraws at its physical resolution, maps the finger to the center and reuses its canvas', () => {
  for (const density of [1, 2, 3]) {
    const calls = [];
    const makeContext = name => new Proxy({}, { get: (_, key) => (...args) => calls.push([name, key, ...args]) });
    const scratchContext = makeContext('scratch');
    let created = 0;
    const loupe = new TouchDragLoupe(() => { created++; return { getContext: () => scratchContext }; });
    const canvas = { width: 390 * density, height: 844 * density, clientWidth: 390, clientHeight: 844 };
    const context = makeContext('overlay');
    const point = { x: 180, y: 400 };
    let rendered = 0;
    const render = target => { assert.equal(target, scratchContext); rendered++; };
    loupe.draw(context, canvas, point, render);
    const transform = calls.find(call => call[0] === 'scratch' && call[1] === 'setTransform');
    assert.deepEqual(transform.slice(2), [2 * density, 0, 0, 2 * density, -280 * density, -736 * density]);
    assert.equal(transform[2] * point.x + transform[6], 80 * density);
    assert.equal(transform[5] * point.y + transform[7], 64 * density);
    assert.equal(calls.filter(call => call[0] === 'scratch' && call[1] === 'drawImage').length, 0);
    assert.equal(rendered, 1);
    loupe.draw(context, canvas, point, render);
    assert.equal(created, 1);
    const count = calls.length;
    loupe.draw(context, canvas, null, render);
    assert.equal(calls.length, count);
    assert.equal(rendered, 2);
  }
});

test('loupe transform selects the larger image level before and after the board threshold', () => {
  const entry = { levels: [64, 128, 256].map(size => ({ width: size, height: size })) };
  for (const size of [63.9, 64.1]) {
    let selected;
    const target = new Proxy({}, { get: (_, key) => key === 'setTransform'
      ? (a, b, c, d) => { selected = selectImageLevel(entry, size, size, { a, b, c, d }); }
      : () => {} });
    const loupe = new TouchDragLoupe(() => ({ getContext: () => target }));
    loupe.draw(target, { width: 390, height: 844, clientWidth: 390, clientHeight: 844 }, { x: 200, y: 400 }, () => {});
    assert.equal(selected.width, size < 64 ? 128 : 256);
  }
});
