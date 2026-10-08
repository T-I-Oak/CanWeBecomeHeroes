import test from 'node:test';
import assert from 'node:assert/strict';
import { runBattleSimulation } from '../../src/simulation/BattleSimulationRunner.js';

test('battle simulation runs the production battle system for a one-hero tag comparison', () => {
  const result = runBattleSimulation({
    ticks: 10000,
    trials: 3,
    seed: 123,
    left: [{ label: 'valor x3', tags: ['valor', 'valor', 'valor'], weapons: ['sword'] }],
    right: [{ label: 'iron x4', tags: ['iron', 'iron', 'iron', 'iron'], weapons: ['sword'], maximumHp: 3, maximums: { power: 3 } }],
  });

  assert.equal(result.conditions.left[0].tags.filter((tag) => tag === 'valor').length, 3);
  assert.equal(result.conditions.right[0].tags.filter((tag) => tag === 'iron').length, 4);
  assert.equal(result.outcomes.leftWins + result.outcomes.rightWins + result.outcomes.draws, 3);
  assert.ok(result.averages.damageBySide.left > 0);
  assert.ok(result.averages.damageBySide.right > 0);
  assert.ok(result.averages.damageBySource['attack:sword'] > 0);
});

test('Ex simulation is deterministic and distinguishes boss skills from a disabled control', () => {
  const input = { ticks: 2000, trials: 2, seed: 29,
    left: [{ tags: ['valor', 'valor', 'valor'], weapons: ['sword', 'sword'] }],
    right: [{ enemyDefinitionId: 'large-cloth', tags: ['cloth', 'cloth', 'cloth'], weapons: ['holy-book', 'holy-book'] }] };
  const result = runBattleSimulation(input);
  assert.deepEqual(runBattleSimulation(input), result);
  assert.ok(result.averages.damageBySource['attack:night-familiar'] > 0);
  const control = runBattleSimulation({ ...input, right: [{ ...input.right[0], uniqueSkill: null }] });
  assert.equal(control.averages.damageBySource['attack:night-familiar'], undefined);
});
