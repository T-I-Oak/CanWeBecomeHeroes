import assert from 'node:assert/strict';
import test from 'node:test';
import CombatActionGaugeSystem from '../../src/game/CombatActionGaugeSystem.js';

test('stealing current gauge transfers the specified share of every source without using their maximum', () => {
  const system = new CombatActionGaugeSystem();
  const recipient = { chip: { actionGauge: 1 } };
  const first = { chip: { actionGauge: 5, actionGaugeMaximum: 20 } };
  const second = { chip: { actionGauge: 3, actionGaugeMaximum: 4 } };

  assert.equal(system.stealCurrentGauge(recipient, [first, second], 0.2), 1.6);
  assert.equal(recipient.chip.actionGauge, 2.6);
  assert.equal(first.chip.actionGauge, 4);
  assert.equal(second.chip.actionGauge, 2.4);
});
