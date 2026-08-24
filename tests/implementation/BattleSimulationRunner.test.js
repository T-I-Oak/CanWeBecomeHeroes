import test from 'node:test';
import assert from 'node:assert/strict';
import { runBattleSimulation } from '../../src/simulation/BattleSimulationRunner.js';

test('battle simulation runs the production battle system for a one-hero tag comparison', () => {
  const result = runBattleSimulation({
    ticks: 10000,
    trials: 3,
    seed: 123,
    left: [{ label: 'valor x3', tags: ['valor', 'valor', 'valor'], weapons: ['sword'] }],
    right: [{ label: 'iron x3', tags: ['iron', 'iron', 'iron'], weapons: ['sword'], maximumHp: 3 }],
  });

  assert.equal(result.conditions.left[0].tags.filter((tag) => tag === 'valor').length, 3);
  assert.equal(result.conditions.right[0].tags.filter((tag) => tag === 'iron').length, 3);
  assert.equal(result.outcomes.leftWins + result.outcomes.rightWins + result.outcomes.draws, 3);
  assert.ok(result.averages.damageBySide.left > 0);
  assert.ok(result.averages.damageBySide.right > 0);
  assert.ok(result.averages.damageBySource['attack:sword'] > 0);
});
