import assert from 'node:assert/strict';
import test from 'node:test';
import { UNIQUE_SKILL_CATALOG } from '../../src/game/UniqueSkillCatalog.js';
import {
  BLESSING_RANDOM_SKILL_HOOK_ENTRY_RATE,
  hasUniqueSkillTrigger,
  UNIQUE_SKILL_TRIGGER,
} from '../../src/game/UniqueSkillTrigger.js';

test('unique skills declare their semantic trigger in one shared catalog', () => {
  assert.equal(BLESSING_RANDOM_SKILL_HOOK_ENTRY_RATE, 0.07);
  assert.equal(hasUniqueSkillTrigger(UNIQUE_SKILL_CATALOG['vitality-summon'], UNIQUE_SKILL_TRIGGER.entityDefeated), true);
  assert.equal(hasUniqueSkillTrigger(UNIQUE_SKILL_CATALOG['gem-orb-rain'], UNIQUE_SKILL_TRIGGER.damageReceived), true);
  assert.equal(hasUniqueSkillTrigger(UNIQUE_SKILL_CATALOG['area-head-rush'], UNIQUE_SKILL_TRIGGER.actionCompleted), true);
});

test('a matching unique skill enters its hook, while effect-specific chance remains in its own definition', () => {
  const gemSkill = UNIQUE_SKILL_CATALOG['gem-orb-rain'];

  assert.equal(hasUniqueSkillTrigger(gemSkill, UNIQUE_SKILL_TRIGGER.damageReceived), true);
  assert.equal(gemSkill.levels[1].chance, 0.5);
});
