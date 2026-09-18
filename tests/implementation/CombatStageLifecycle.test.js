import test from 'node:test';
import assert from 'node:assert/strict';
import CombatStageLifecycle, { BATTLE_VICTORY_DELAY_TICKS } from '../../src/game/CombatStageLifecycle.js';

test('combat stage lifecycle starts only after a settled enemy is encountered', () => {
  const lifecycle = new CombatStageLifecycle();
  const fallingEnemy = { chip: { isSettled: false } };
  const settledEnemy = { chip: { isSettled: true } };

  lifecycle.markEnemyEncountered([fallingEnemy]);
  assert.equal(lifecycle.startWhenReady([fallingEnemy], 10), false);
  assert.equal(lifecycle.startWhenReady([settledEnemy], 20), true);
  assert.equal(lifecycle.battleStartTick, 20);
});

test('combat stage lifecycle records one victory and completes after its delay', () => {
  const lifecycle = new CombatStageLifecycle();
  lifecycle.markEnemyEncountered([{}]);

  assert.equal(lifecycle.markVictory(100), true);
  assert.equal(lifecycle.markVictory(101), false);
  lifecycle.updateVictoryDelay(BATTLE_VICTORY_DELAY_TICKS - 1, 299);
  assert.equal(lifecycle.isComplete(), false);
  lifecycle.updateVictoryDelay(1, 300);
  assert.equal(lifecycle.stageCompleteTick, 300);
});
