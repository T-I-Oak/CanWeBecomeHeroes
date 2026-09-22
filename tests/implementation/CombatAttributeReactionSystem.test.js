import assert from 'node:assert/strict';
import test from 'node:test';
import CombatAttributeReactionSystem from '../../src/game/CombatAttributeReactionSystem.js';
import CombatAttributeSystem from '../../src/game/CombatAttributeSystem.js';

function createCombatant(attributes = {}) {
  return {
    attributes: { fire: 0, water: 0, lightning: 0, ...attributes },
    attributeSources: {},
    chip: { attributeValues: null },
    getTagCount: () => 0,
    getLuckDegree: () => 1,
  };
}

test('arcane reflection reduces a newly received attribute and transfers the reduced amount to its source', () => {
  const source = createCombatant();
  const target = createCombatant();
  const reactionSystem = new CombatAttributeReactionSystem({
    uniqueSkillEffectSystem: {
      resolve: () => [{ attributeReflection: { reductionRate: 0.5 } }],
    },
  });
  const system = new CombatAttributeSystem({
    board: null,
    applyDamage: () => {},
    resolveAttributeReactions: (event) => reactionSystem.resolve(event),
  });

  system.applyAttribute(source, target, 'fire', 6);

  assert.equal(target.attributes.fire, 3);
  assert.equal(target.attributeSources.fire, source);
  assert.equal(source.attributes.fire, 3);
  assert.equal(source.attributeSources.fire, target);
});

test('arcane reflection never lowers an existing stronger attribute but still transfers the reduced incoming amount', () => {
  const source = createCombatant({ water: 2 });
  const target = createCombatant({ water: 2 });
  const reactionSystem = new CombatAttributeReactionSystem({
    uniqueSkillEffectSystem: {
      resolve: () => [{ attributeReflection: { reductionRate: 0.75 } }],
    },
  });
  const system = new CombatAttributeSystem({
    board: null,
    applyDamage: () => {},
    resolveAttributeReactions: (event) => reactionSystem.resolve(event),
  });

  system.applyAttribute(source, target, 'water', 6);

  assert.equal(target.attributes.water, 2);
  assert.equal(source.attributes.water, 4.5);
  assert.equal(source.attributeSources.water, target);
});

test('arcane reflection ignores an attribute that cannot raise the target value', () => {
  const source = createCombatant();
  const target = createCombatant({ lightning: 4 });
  const reactionSystem = new CombatAttributeReactionSystem({
    uniqueSkillEffectSystem: {
      resolve: () => [{ attributeReflection: { reductionRate: 0.5 } }],
    },
  });
  const system = new CombatAttributeSystem({
    board: null,
    applyDamage: () => {},
    resolveAttributeReactions: (event) => reactionSystem.resolve(event),
  });

  system.applyAttribute(source, target, 'lightning', 3);

  assert.equal(target.attributes.lightning, 4);
  assert.equal(source.attributes.lightning, 0);
});
