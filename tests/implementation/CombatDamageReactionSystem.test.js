import assert from 'node:assert/strict';
import test from 'node:test';
import CombatDamageReactionSystem from '../../src/game/CombatDamageReactionSystem.js';
import UniqueSkillEffectSystem from '../../src/game/UniqueSkillEffectSystem.js';

function createReactionSystem(attributeSystem) {
  return new CombatDamageReactionSystem({
    controller: null,
    itemFactory: null,
    attributeSystem,
    getWarehouseDropPosition: () => ({ x: 0, y: 0 }),
    uniqueSkillEffectSystem: new UniqueSkillEffectSystem({
      uniqueSkillSystem: {
        getTriggeredSkills: () => [{
          id: 'fire-retaliation-ember', level: 1, levelDetail: { fireAttributeRate: 0.5 },
        }],
      },
    }),
  });
}

test('retaliation ember applies fire to the physical or magic attacker through the shared attribute system', () => {
  const applications = [];
  const owner = { getTagCount: () => 6 };
  const attacker = {};
  const reactions = createReactionSystem({ applyAttribute: (...args) => applications.push(args) });

  reactions.resolve({ actor: attacker, target: owner, category: 'physical', damage: 1 });
  reactions.resolve({ actor: attacker, target: owner, category: 'magic', damage: 1 });

  assert.deepEqual(applications, [
    [owner, attacker, 'fire', 3],
    [owner, attacker, 'fire', 3],
  ]);
});

test('retaliation ember ignores rounded-zero, attribute, and reflection damage', () => {
  const applications = [];
  const owner = { getTagCount: () => 6 };
  const reactions = createReactionSystem({ applyAttribute: (...args) => applications.push(args) });

  reactions.resolve({ actor: {}, target: owner, category: 'physical', damage: 0 });
  reactions.resolve({ actor: {}, target: owner, category: null, damage: 1 });
  reactions.resolve({ actor: {}, target: owner, category: 'reflection', damage: 1 });

  assert.deepEqual(applications, []);
});

test('thunder drain transfers a rate of every opposing participant current gauge to its owner', () => {
  const owner = { chip: { type: 'enemy', actionGauge: 1 } };
  const attacker = { chip: { type: 'hero', actionGauge: 5 } };
  const ally = { chip: { type: 'hero', actionGauge: 3 } };
  const calls = [];
  const reactions = new CombatDamageReactionSystem({
    controller: null,
    itemFactory: null,
    getWarehouseDropPosition: () => ({ x: 0, y: 0 }),
    actionGaugeSystem: { stealCurrentGauge: (...args) => calls.push(args) },
    uniqueSkillEffectSystem: {
      resolve: () => [{ actionGaugeAbsorption: { currentGaugeStealRate: 0.2 } }],
    },
  });

  reactions.resolve({ actor: attacker, target: owner, participants: [owner, attacker, ally] });

  assert.deepEqual(calls, [[owner, [attacker, ally], 0.2]]);
});
