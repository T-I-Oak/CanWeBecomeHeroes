import test from 'node:test';
import assert from 'node:assert/strict';
import UniqueSkillEffectSystem from '../../src/game/UniqueSkillEffectSystem.js';
import { UNIQUE_SKILL_TRIGGER } from '../../src/game/UniqueSkillTrigger.js';

test('unique skill effects retain every result from one hook', () => {
  const skills = [
    { id: 'gem-orb-rain', levelDetail: { chance: 1, dropCount: 1, tagCount: 1 } },
    { id: 'gem-orb-rain', levelDetail: { chance: 1, dropCount: 2, tagCount: 2 } },
  ];
  const effectSystem = new UniqueSkillEffectSystem({
    uniqueSkillSystem: { getTriggeredSkills: () => skills },
    random: () => 0,
  });

  const effects = effectSystem.resolve({}, UNIQUE_SKILL_TRIGGER.damageReceived);

  assert.deepEqual(effects.map((effect) => effect.drops.length), [1, 2]);
  assert.deepEqual(effects.map((effect) => effect.drops[0].tags.length), [1, 2]);
});

test('shadow fingertips selects one target tag and an Ex2 destination after its luck check', () => {
  const sourceItem = { tags: ['valor', 'water'] };
  const destinationItem = { tags: ['dexterity'] };
  const actor = { getLuckDegree: () => 0.5, equipment: [destinationItem] };
  const target = { equipment: [sourceItem] };
  const skill = { id: 'shadow-fingertips', levelDetail: { transfersTag: true } };
  const randomValues = [0.4, 0.9, 0];
  const effectSystem = new UniqueSkillEffectSystem({
    uniqueSkillSystem: { getTriggeredSkills: () => [skill] },
    random: () => randomValues.shift(),
  });

  const [effect] = effectSystem.resolve(actor, UNIQUE_SKILL_TRIGGER.actionStarted, { target });

  assert.equal(effect.tagRemoval.sourceItem, sourceItem);
  assert.equal(effect.tagRemoval.tagIndex, 1);
  assert.equal(effect.tagRemoval.tag, 'water');
  assert.equal(effect.tagRemoval.destinationItem, destinationItem);
});
