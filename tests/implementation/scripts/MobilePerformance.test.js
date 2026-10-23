import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getRequiredImageSize, summarizeFrames } from '../../../src/app/diagnostics/PerformanceStats.js';
import RenderExperiment from '../../../src/app/diagnostics/RenderExperiment.js';

test('image size accounts for physical-pixel transform, rounds up and preserves native/cropped sources', () => {
  const image = { naturalWidth: 1024, naturalHeight: 512 };
  const transform = { a: 3, b: 0, c: 0, d: 3 };
  assert.equal(getRequiredImageSize(image, [0, 0, 100, 50], transform), .5);
  assert.equal(getRequiredImageSize(image, [0, 0, 500, 250], transform), 1);
  assert.equal(getRequiredImageSize(image, [0, 0], transform), 1);
  assert.equal(getRequiredImageSize(image, [0, 0, 10, 10, 0, 0, 20, 20], transform), null);
  assert.equal(getRequiredImageSize(image, [0, 0, 100, 50], { a: 0, b: 3, c: -3, d: 0 }), .5);
});

test('Canvas experiment preserves destination geometry, cropped overload and restores methods', () => {
  const calls = [];
  const image = { naturalWidth: 1024, naturalHeight: 512, complete: true };
  const resized = { naturalWidth: 128, naturalHeight: 64 };
  const proto = Object.fromEntries(['drawImage', 'fill', 'stroke', 'fillRect', 'strokeRect', 'fillText', 'strokeText', 'clip']
    .map(name => [name, function (...args) { calls.push([name, ...args]); return 42; }]));
  const context = Object.create(proto);
  context.getTransform = () => ({ a: 1, b: 0, c: 0, d: 1 });
  const experiment = new RenderExperiment([{ getContext: () => context }]);
  experiment.replacements.set(image, resized);
  experiment.mode = 'smallImages';
  context.drawImage(image, 10, 20);
  assert.deepEqual(calls.pop(), ['drawImage', resized, 10, 20, 1024, 512]);
  context.drawImage(image, 10, 20, 100, 50);
  assert.deepEqual(calls.pop(), ['drawImage', resized, 10, 20, 100, 50]);
  const crop = [image, 1, 2, 3, 4, 5, 6, 7, 8];
  context.drawImage(...crop);
  assert.deepEqual(calls.pop(), ['drawImage', ...crop]);
  experiment.mode = 'noImages';
  context.drawImage(image, 0, 0);
  assert.equal(calls.length, 0);
  assert.equal(context.stroke(), 42);
  experiment.mode = 'noClip'; context.clip();
  assert.equal(calls.length, 1);
  experiment.dispose();
  assert.equal(Object.hasOwn(context, 'drawImage'), false);
  assert.equal(context.drawImage, proto.drawImage);
});

test('frame summary distinguishes unavailable sections and frame intervals', () => {
  const summary = summarizeFrames([{ main: 2 }, { main: 4, interval: 60 }, { main: 3, interval: 20 }]);
  assert.equal(summary.main.mean, 3);
  assert.equal(summary.interval.count, 2);
  assert.equal(summary.interval.over50ms, .5);
  assert.equal(summary.simulation, undefined);
  assert.deepEqual(summarizeFrames([]), {});
});
