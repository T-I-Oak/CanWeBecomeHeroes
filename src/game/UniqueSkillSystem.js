import CombatUniqueSkillOwnership from './CombatUniqueSkillOwnership.js';

export default class UniqueSkillSystem {
  constructor({ random = Math.random, ownership = new CombatUniqueSkillOwnership({ random }) } = {}) {
    Object.assign(this, { ownership, random });
  }

  reset() { this.ownership.reset(); }

  initialize(entity) { this.ownership.initialize(entity); }

  refreshBlessingSkills(entity) { this.ownership.refreshBlessingSkills(entity); }

  replaceTemporarySkills(entity, skills) { this.ownership.replaceTemporarySkills(entity, skills); }

  getTriggeredSkills(entity, trigger) { return this.ownership.getTriggeredSkills(entity, trigger); }
}
