import assert from 'node:assert/strict';
import test from 'node:test';
import { UNIQUE_SKILL_CATALOG } from '../../src/game/UniqueSkillCatalog.js';
import {
  hasUniqueSkillTrigger,
  shouldActivateUniqueSkill,
  UNIQUE_SKILL_ACTIVATION_RATE,
  UNIQUE_SKILL_TRIGGER,
} from '../../src/game/UniqueSkillTrigger.js';

test('unique skills declare their semantic trigger in one shared catalog', () => {
  assert.equal(UNIQUE_SKILL_ACTIVATION_RATE, 0.07);
  assert.equal(hasUniqueSkillTrigger(UNIQUE_SKILL_CATALOG['vitality-summon'], UNIQUE_SKILL_TRIGGER.entityDefeated), true);
  assert.equal(hasUniqueSkillTrigger(UNIQUE_SKILL_CATALOG['gem-orb-rain'], UNIQUE_SKILL_TRIGGER.damageReceived), true);
  assert.equal(hasUniqueSkillTrigger(UNIQUE_SKILL_CATALOG['area-head-rush'], UNIQUE_SKILL_TRIGGER.actionCompleted), true);
});

test('each matching unique skill uses the shared independent seven-percent activation roll', () => {
  const skill = UNIQUE_SKILL_CATALOG['gem-orb-rain'];

  assert.equal(shouldActivateUniqueSkill(skill, UNIQUE_SKILL_TRIGGER.damageReceived, () => 0.069999), true);
  assert.equal(shouldActivateUniqueSkill(skill, UNIQUE_SKILL_TRIGGER.damageReceived, () => 0.07), false);
  assert.equal(shouldActivateUniqueSkill(skill, UNIQUE_SKILL_TRIGGER.actionCompleted, () => 0), false);
});
