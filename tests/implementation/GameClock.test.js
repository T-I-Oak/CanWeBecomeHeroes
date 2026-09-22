import test from 'node:test';
import assert from 'node:assert/strict';
import GameClock, { GAME_TICK_SECONDS, GAME_TICKS_PER_SECOND } from '../../src/game/GameClock.js';

test('game clock defines the shared game-time unit', () => {
  assert.equal(GAME_TICKS_PER_SECOND, 60);
  assert.equal(GAME_TICK_SECONDS, 1 / GAME_TICKS_PER_SECOND);
});

test('game clock subdivides accelerated simulation time', () => {
  const clock = new GameClock({ speed: 4 });
  const deltas = [];
  clock.advance(0.05, (deltaSeconds) => deltas.push(deltaSeconds));
  assert.equal(deltas.length, 12);
  assert.ok(deltas.every((deltaSeconds) => deltaSeconds <= GAME_TICK_SECONDS));
  assert.ok(Math.abs(deltas.reduce((total, deltaSeconds) => total + deltaSeconds, 0) - 0.2) < 0.000001);
});
