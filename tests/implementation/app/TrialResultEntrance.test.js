import test from 'node:test';
import assert from 'node:assert/strict';
import { playTrialResultEntrance } from '../../../src/app/TrialResultEntrance.js';

function node(name, calls) {
  return { style: {}, setAttribute() {}, remove() {}, animate(frames, options) {
    calls.push({ name, frames, options });
    return { finished: Promise.resolve(), cancel() {} };
  } };
}
test('pass entrance starts transparent and oversized after a confetti lead-in', async () => {
  const calls = [];
  const paper = node('paper', calls);
  const entrance = playTrialResultEntrance({ paper, container: {}, pass: true });
  assert.equal(paper.style.opacity, '0');
  await entrance.finished;
  assert.deepEqual(calls[0].frames, [{ opacity: 0, scale: '1.35' }, { opacity: 1, scale: '1' }]);
  assert.ok(calls[0].options.delay > 0);
  assert.equal(paper.style.opacity, '1');
});
test('failure entrance fades the announcement out before scaling the notice up', async t => {
  const calls = [];
  const previous = globalThis.document;
  globalThis.document = { createElement: () => node('announcement', calls) };
  t.after(() => { globalThis.document = previous; });
  const paper = node('paper', calls);
  const entrance = playTrialResultEntrance({ paper, container: { append() {} }, pass: false, endText: '試験終了' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, 'announcement');
  assert.equal(paper.style.opacity, '0');
  await entrance.finished;
  assert.deepEqual(calls.map(call => call.name), ['announcement', 'paper']);
  assert.equal(calls[0].frames.at(-1).opacity, 0);
  assert.deepEqual(calls[1].frames, [{ opacity: 0, scale: '.65' }, { opacity: 1, scale: '1' }]);
});

test('challenge announces the end then shrinks a transparent oversized paper', async t => {
  const calls = [];
  const previous = globalThis.document;
  globalThis.document = { createElement: () => node('announcement', calls) };
  t.after(() => { globalThis.document = previous; });
  const entrance = playTrialResultEntrance({ paper: node('paper', calls), container: { append() {} }, pass: false, announceEnd: true, shrinkPaper: true, endText: '試験終了' });
  await entrance.finished;
  assert.deepEqual(calls.map(call => call.name), ['announcement', 'paper']);
  assert.deepEqual(calls[1].frames, [{ opacity: 0, scale: '1.35' }, { opacity: 1, scale: '1' }]);
});
