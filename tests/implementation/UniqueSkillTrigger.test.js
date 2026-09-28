import assert from 'node:assert/strict';
import test from 'node:test';
import { UNIQUE_SKILL_CATALOG } from '../../src/game/UniqueSkillCatalog.js';
import { hasUniqueSkillTrigger, UNIQUE_SKILL_TRIGGER } from '../../src/game/UniqueSkillTrigger.js';
import CombatUniqueSkillOwnership from '../../src/game/CombatUniqueSkillOwnership.js';
import { BLESSING_RANDOM_SKILL_GRANT_RATE } from '../../src/game/UniqueSkillBlessing.js';

test('unique skills declare their semantic trigger in one shared catalog', () => {
  assert.equal(BLESSING_RANDOM_SKILL_GRANT_RATE, 0.07);
  assert.equal(hasUniqueSkillTrigger(UNIQUE_SKILL_CATALOG['vitality-summon'], UNIQUE_SKILL_TRIGGER.entityDefeated), true);
  assert.equal(hasUniqueSkillTrigger(UNIQUE_SKILL_CATALOG['gem-orb-rain'], UNIQUE_SKILL_TRIGGER.damageReceived), true);
  assert.equal(hasUniqueSkillTrigger(UNIQUE_SKILL_CATALOG['area-head-rush'], UNIQUE_SKILL_TRIGGER.actionCompleted), true);
  assert.equal(hasUniqueSkillTrigger(UNIQUE_SKILL_CATALOG['shadow-fingertips'], UNIQUE_SKILL_TRIGGER.actionStarted), true);
  assert.equal(hasUniqueSkillTrigger(UNIQUE_SKILL_CATALOG['arcane-reflection'], UNIQUE_SKILL_TRIGGER.attributeReceived), true);
  assert.equal(hasUniqueSkillTrigger(UNIQUE_SKILL_CATALOG['cloth-night-familiars'], UNIQUE_SKILL_TRIGGER.actionCompleted), true);
  assert.equal(hasUniqueSkillTrigger(UNIQUE_SKILL_CATALOG['water-deep-sea-surge'], UNIQUE_SKILL_TRIGGER.actionStarted), true);
  assert.equal(hasUniqueSkillTrigger(UNIQUE_SKILL_CATALOG['fire-retaliation-ember'], UNIQUE_SKILL_TRIGGER.damageReceived), true);
  assert.equal(hasUniqueSkillTrigger(UNIQUE_SKILL_CATALOG['lightning-thunder-drain'], UNIQUE_SKILL_TRIGGER.damageReceived), true);
  assert.equal(hasUniqueSkillTrigger(UNIQUE_SKILL_CATALOG['reputation-bewildering-words'], UNIQUE_SKILL_TRIGGER.actionStarted), true);
  assert.equal(hasUniqueSkillTrigger(UNIQUE_SKILL_CATALOG['fortune-misfortune-curse'], UNIQUE_SKILL_TRIGGER.actionStarted), true);
  assert.equal(hasUniqueSkillTrigger(UNIQUE_SKILL_CATALOG['feather-storm-wings'], UNIQUE_SKILL_TRIGGER.actionStarted), true);
  assert.deepEqual(UNIQUE_SKILL_CATALOG['blessing-random'].triggers, []);
  assert.equal(UNIQUE_SKILL_CATALOG['blessing-random'].affinityTag, 'blessing');
});

test('a matching unique skill enters its hook, while effect-specific chance remains in its own definition', () => {
  const gemSkill = UNIQUE_SKILL_CATALOG['gem-orb-rain'];

  assert.equal(hasUniqueSkillTrigger(gemSkill, UNIQUE_SKILL_TRIGGER.damageReceived), true);
  assert.equal(gemSkill.levels[1].chance, 0.5);
});

test('combat unique skill ownership combines intrinsic and temporary skills by their declared hooks', () => {
  const ownership = new CombatUniqueSkillOwnership();
  const enemy = { uniqueSkill: { id: 'gem-orb-rain', level: 1 } };

  ownership.replaceTemporarySkills(enemy, [{ id: 'area-head-rush', level: 2 }]);

  assert.deepEqual(ownership.getTriggeredSkills(enemy, UNIQUE_SKILL_TRIGGER.damageReceived).map((skill) => skill.id), ['gem-orb-rain']);
  assert.deepEqual(ownership.getTriggeredSkills(enemy, UNIQUE_SKILL_TRIGGER.actionCompleted).map((skill) => skill.id), ['area-head-rush']);
});

test('blessing refreshes independently granted skill flags at combat lifecycle boundaries', () => {
  const rolls = [0.06, 0.08, 0.06, 0.08, 0.08, 0.08];
  const ownership = new CombatUniqueSkillOwnership({ random: () => rolls.shift() });
  const enemy = { uniqueSkill: { id: 'blessing-random', level: 1 } };

  ownership.initialize(enemy);
  assert.deepEqual(ownership.getTriggeredSkills(enemy, UNIQUE_SKILL_TRIGGER.entityDefeated).map((skill) => skill.id), ['vitality-summon']);
  assert.deepEqual(ownership.getTriggeredSkills(enemy, UNIQUE_SKILL_TRIGGER.actionCompleted).map((skill) => skill.id), ['area-head-rush']);

  ownership.refreshBlessingSkills(enemy);
  assert.deepEqual(ownership.getTriggeredSkills(enemy, UNIQUE_SKILL_TRIGGER.entityDefeated), []);
  assert.deepEqual(ownership.getTriggeredSkills(enemy, UNIQUE_SKILL_TRIGGER.actionCompleted), []);
});
