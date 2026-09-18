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
