import test from 'node:test';
import assert from 'node:assert/strict';
import { createVignettePlayback, updateVignettePlayback, vignetteActionOffset } from '../../src/game/VignettePlayer.js';

test('line hop begins with speech and returns to rest without modifying position', () => {
  const playback = createVignettePlayback({ instances: [{ id: 'A' }], commands: [
    { type: 'position', instanceId: 'A', x: 200, y: 340 },
    { type: 'line', instanceId: 'A', text: 'hello', seconds: 3, action: { type: 'hop', height: 7, seconds: 0.32 } },
  ] });
  const state = playback.instances.get('A');
  assert.equal(playback.line.text, 'hello');
  assert.equal(vignetteActionOffset(state, 0), 0);
  updateVignettePlayback(playback, 0.16);
  assert.equal(vignetteActionOffset(state, playback.time), -7);
  assert.deepEqual(state.position, { x: 200, y: 340 });
  updateVignettePlayback(playback, 0.16);
  assert.equal(vignetteActionOffset(state, playback.time), 0);
  assert.equal(playback.line.text, 'hello');
});

test('lines without an action keep their speaker still', () => {
  const playback = createVignettePlayback({ instances: [{ id: 'A' }], commands: [{ type: 'line', instanceId: 'A', text: 'hello', seconds: 3 }] });
  assert.equal(vignetteActionOffset(playback.instances.get('A'), 0.16), 0);
});
