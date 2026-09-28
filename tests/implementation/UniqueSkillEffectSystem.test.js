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

test('arcane reflection exposes the level-specific attribute reduction as a reaction intent', () => {
  const effectSystem = new UniqueSkillEffectSystem({
    uniqueSkillSystem: { getTriggeredSkills: () => [{ id: 'arcane-reflection', level: 2, levelDetail: { reductionRate: 0.75 } }] },
  });

  const [effect] = effectSystem.resolve({}, UNIQUE_SKILL_TRIGGER.attributeReceived, {
    attributeEvent: { actor: {}, target: {}, attribute: 'lightning', value: 4 },
  });

  assert.deepEqual(effect.attributeReflection, { reductionRate: 0.75 });
});

test('night familiars expose the Ex-specific familiar count after an action', () => {
  const effectSystem = new UniqueSkillEffectSystem({
    uniqueSkillSystem: { getTriggeredSkills: () => [{ id: 'cloth-night-familiars', level: 2, levelDetail: { familiarCount: 6 } }] },
  });

  const [effect] = effectSystem.resolve({}, UNIQUE_SKILL_TRIGGER.actionCompleted);

  assert.equal(effect.familiarCount, 6);
});

test('deep sea surge exposes the owner water value and the Ex-specific damage bonus', () => {
  const actor = { getTagCount: () => 3 };
  const effectSystem = new UniqueSkillEffectSystem({
    uniqueSkillSystem: { getTriggeredSkills: () => [{ id: 'water-deep-sea-surge', level: 1, levelDetail: { waterDamageBonusRate: 0.5 } }] },
  });

  const [effect] = effectSystem.resolve(actor, UNIQUE_SKILL_TRIGGER.actionStarted);

  assert.deepEqual(effect.selfAttribute, { attribute: 'water', value: 3 });
  assert.equal(effect.waterDamageBonusRate, 0.5);
});

test('retaliation ember exposes a fire application only for an applied physical or magic damage event', () => {
  const attacker = {};
  const owner = { getTagCount: () => 4 };
  const effectSystem = new UniqueSkillEffectSystem({
    uniqueSkillSystem: { getTriggeredSkills: () => [{ id: 'fire-retaliation-ember', level: 1, levelDetail: { fireAttributeRate: 0.5 } }] },
  });

  const [physical] = effectSystem.resolve(owner, UNIQUE_SKILL_TRIGGER.damageReceived, { damageEvent: { actor: attacker, category: 'physical', damage: 1 } });
  const [attribute] = effectSystem.resolve(owner, UNIQUE_SKILL_TRIGGER.damageReceived, { damageEvent: { actor: attacker, category: null, damage: 1 } });

  assert.deepEqual(physical.retaliationAttribute, { actor: attacker, attribute: 'fire', value: 2 });
  assert.equal(attribute.retaliationAttribute, null);
});

test('thunder drain reacts only when a lightning-infused direct attacker deals damage', () => {
  const effectSystem = new UniqueSkillEffectSystem({
    uniqueSkillSystem: { getTriggeredSkills: () => [{ id: 'lightning-thunder-drain', level: 2, levelDetail: { currentGaugeStealRate: 0.2 } }] },
  });

  const [triggered] = effectSystem.resolve({}, UNIQUE_SKILL_TRIGGER.damageReceived, {
    damageEvent: { actor: { attributes: { lightning: 1 } }, category: 'magic', damage: 1 },
  });
  const [withoutLightning] = effectSystem.resolve({}, UNIQUE_SKILL_TRIGGER.damageReceived, {
    damageEvent: { actor: { attributes: { lightning: 0 } }, category: 'magic', damage: 1 },
  });
  const [attributeDamage] = effectSystem.resolve({}, UNIQUE_SKILL_TRIGGER.damageReceived, {
    damageEvent: { actor: { attributes: { lightning: 1 } }, category: null, damage: 1 },
  });
  const [reflectionDamage] = effectSystem.resolve({}, UNIQUE_SKILL_TRIGGER.damageReceived, {
    damageEvent: { actor: { attributes: { lightning: 1 } }, category: 'reflection', damage: 1 },
  });
  const [roundedZero] = effectSystem.resolve({}, UNIQUE_SKILL_TRIGGER.damageReceived, {
    damageEvent: { actor: { attributes: { lightning: 1 } }, category: 'physical', damage: 0 },
  });

  assert.deepEqual(triggered.actionGaugeAbsorption, { currentGaugeStealRate: 0.2 });
  assert.equal(withoutLightning.actionGaugeAbsorption, null);
  assert.equal(attributeDamage.actionGaugeAbsorption, null);
  assert.equal(reflectionDamage.actionGaugeAbsorption, null);
  assert.equal(roundedZero.actionGaugeAbsorption, null);
});

test('bewildering words uses a fixed Ex chance and ignores luck', () => {
  const target = {};
  const actor = { getLuckDegree: () => 0 };
  const belowEx1 = new UniqueSkillEffectSystem({ random: () => 0.49 });
  const atEx1 = new UniqueSkillEffectSystem({ random: () => 0.5 });
  const belowEx2 = new UniqueSkillEffectSystem({ random: () => 0.74 });
  const atEx2 = new UniqueSkillEffectSystem({ random: () => 0.75 });

  assert.equal(belowEx1.resolveReputationBewilderingWords(actor, { levelDetail: { chance: 0.5 } }, { target }).bewildermentTarget, target);
  assert.equal(atEx1.resolveReputationBewilderingWords(actor, { levelDetail: { chance: 0.5 } }, { target }).bewildermentTarget, null);
  assert.equal(belowEx2.resolveReputationBewilderingWords(actor, { levelDetail: { chance: 0.75 } }, { target }).bewildermentTarget, target);
  assert.equal(atEx2.resolveReputationBewilderingWords(actor, { levelDetail: { chance: 0.75 } }, { target }).bewildermentTarget, null);
});

test('curse of misfortune applies its Ex-specific critical self-damage rate after the luck check', () => {
  const actor = { getLuckDegree: () => 0.6 };
  const target = {};
  const ex1 = new UniqueSkillEffectSystem({ random: () => 0.5 });
  const ex2 = new UniqueSkillEffectSystem({ random: () => 0.5 });

  assert.deepEqual(
    ex1.resolveFortuneMisfortuneCurse(actor, { levelDetail: { luckRateMultiplier: 1, selfDamageRate: 0.5 } }, { target }).misfortuneTarget,
    { target, damageRate: 0.5 },
  );
  assert.deepEqual(
    ex2.resolveFortuneMisfortuneCurse(actor, { levelDetail: { luckRateMultiplier: 1, selfDamageRate: 1 } }, { target }).misfortuneTarget,
    { target, damageRate: 1 },
  );
});

test('storm wings uses its Ex-specific luck rate and only selects heroes as gust targets', () => {
  const actor = { getLuckDegree: () => 0.8 };
  const hero = { chip: { type: 'hero' } };
  const enemy = { chip: { type: 'enemy' } };
  const ex1 = new UniqueSkillEffectSystem({ random: () => 0.19 });
  const ex2 = new UniqueSkillEffectSystem({ random: () => 0.3 });

  assert.equal(ex1.resolveFeatherStormWings(actor, { levelDetail: { luckRateMultiplier: 0.25 } }, { target: hero }).gustTarget, hero);
  assert.equal(ex2.resolveFeatherStormWings(actor, { levelDetail: { luckRateMultiplier: 0.25 } }, { target: enemy }).gustTarget, null);
  assert.equal(ex2.resolveFeatherStormWings(actor, { levelDetail: { luckRateMultiplier: 0.5 } }, { target: hero }).gustTarget, hero);
});

test('iron counterblow does not react to non-physical damage', () => {
  const effectSystem = new UniqueSkillEffectSystem({});
  const skill = { id: 'iron-counterblow', levelDetail: { knockbackDistanceMultiplier: 1 } };

  const effect = effectSystem.resolveIronCounterblow(skill, { damageEvent: { actor: {}, damage: 1, category: 'misfortune' } });

  assert.equal(effect.knockback, null);
});
