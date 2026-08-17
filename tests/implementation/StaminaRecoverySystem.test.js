import test from 'node:test';
import assert from 'node:assert/strict';
import StaminaRecoverySystem from '../../src/game/StaminaRecoverySystem.js';

test('preparation heroes recover 0.005 stamina for each game tick', () => {
  const system = new StaminaRecoverySystem();
  const hero = { currentArea: 'preparation', stamina: 0, maximums: { stamina: 3 } };
  for (let index = 0; index < 200; index += 1) system.update([hero], 1 / 60);
  assert.ok(Math.abs(hero.stamina - 1) < 0.000000001);
});

test('heroes outside preparation do not recover stamina', () => {
  const system = new StaminaRecoverySystem();
  const hero = { currentArea: 'warehouse', stamina: 0, maximums: { stamina: 3 } };
  system.update([hero], 10);
  assert.equal(hero.stamina, 0);
});
