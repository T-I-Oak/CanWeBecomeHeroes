import test from 'node:test';
import assert from 'node:assert/strict';
import GameClock from '../../src/game/GameClock.js';

test('game clock pauses state updates while allowing the caller to render', () => {
  const clock = new GameClock();
  clock.togglePaused();
  let elapsed = 0;
  assert.equal(clock.advance(0.02, (deltaSeconds) => { elapsed += deltaSeconds; }), 0);
  assert.equal(elapsed, 0);
});

test('game clock can pause updates for a named modal without changing the player pause state', () => {
  const clock = new GameClock();
  let elapsed = 0;
  clock.pause('stage-selection');
  assert.equal(clock.advance(0.02, (deltaSeconds) => { elapsed += deltaSeconds; }), 0);
  assert.equal(clock.paused, false);
  clock.resume('stage-selection');
  assert.ok(clock.advance(0.02, (deltaSeconds) => { elapsed += deltaSeconds; }) > 0);
  assert.ok(elapsed > 0);
});

test('game clock subdivides accelerated simulation time', () => {
  const clock = new GameClock({ speed: 4 });
  const deltas = [];
  clock.advance(0.05, (deltaSeconds) => deltas.push(deltaSeconds));
  assert.equal(deltas.length, 12);
  assert.ok(deltas.every((deltaSeconds) => deltaSeconds <= 1 / 60));
  assert.ok(Math.abs(deltas.reduce((total, deltaSeconds) => total + deltaSeconds, 0) - 0.2) < 0.000001);
});
