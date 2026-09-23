import test from 'node:test';
import assert from 'node:assert/strict';
import CombatConditionSystem from '../../src/game/CombatConditionSystem.js';

test('two-edged sword keeps the highest granted multiplier for one combatant', () => {
  const conditions = new CombatConditionSystem();
  const combatant = {};

  conditions.applyTwoEdgedSword(combatant, 2);
  conditions.applyTwoEdgedSword(combatant, 4);
  conditions.applyTwoEdgedSword(combatant, 2);

  assert.equal(conditions.getTwoEdgedSwordMultiplier(combatant), 4);
});

test('night familiars are replaced after an action, consumed on the next attack, and lost one at a time when damaged', () => {
  const conditions = new CombatConditionSystem();
  const actor = {};

  conditions.summonNightFamiliars(actor, 3);
  assert.equal(conditions.getNightFamiliarCount(actor), 3);
  assert.equal(conditions.removeNightFamiliar(actor), true);
  assert.equal(conditions.getNightFamiliarCount(actor), 2);
  assert.equal(conditions.consumeNightFamiliars(actor), 2);
  assert.equal(conditions.getNightFamiliarCount(actor), 0);
  conditions.summonNightFamiliars(actor, 6);
  assert.equal(conditions.getNightFamiliarCount(actor), 6);
});

test('a critical uses the higher two-edged sword multiplier of its attacker and target', () => {
  const conditions = new CombatConditionSystem();
  const attacker = {};
  const target = {};

  conditions.applyTwoEdgedSword(attacker, 2);
  conditions.applyTwoEdgedSword(target, 4);

  assert.equal(conditions.getCriticalDamageMultiplier(attacker, target), 4);
  conditions.clearTwoEdgedSword(target);
  assert.equal(conditions.getCriticalDamageMultiplier(attacker, target), 2);
  conditions.clearTwoEdgedSword(attacker);
  assert.equal(conditions.getCriticalDamageMultiplier(attacker, target), 1);
});

test('bewilderment lasts until the affected combatant completes or cannot perform its action', () => {
  const conditions = new CombatConditionSystem();
  const combatant = {};

  conditions.applyBewilderment(combatant);
  assert.equal(conditions.hasBewilderment(combatant), true);
  conditions.clearBewilderment(combatant);
  assert.equal(conditions.hasBewilderment(combatant), false);
});
