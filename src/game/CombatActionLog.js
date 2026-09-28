import { entityText, logText } from './LocalizedLog.js';
import { logUniqueSkill, termText } from './UniqueSkillLog.js';
import { isHeroCombatant } from './CombatParticipant.js';

const MINIMUM_LOGGED_DAMAGE = 0.01;

export default class CombatActionLog {
  constructor({ gameLog = null, textRepository = null } = {}) {
    Object.assign(this, { gameLog, textRepository });
    this.results = null;
  }

  begin() {
    this.results = new Map();
    this.misfortuneDamage = new Map();
  }

  recordMisfortune(actor, damage) {
    if (!this.misfortuneDamage || !actor || damage <= 0) return;
    this.misfortuneDamage.set(actor, (this.misfortuneDamage.get(actor) ?? 0) + damage);
  }

  recordMiss(actor, target) {
    if (!this.results || !actor || !target) return;
    this.getResult(actor, target).miss = true;
  }

  recordDamage(actor, target, damage, critical) {
    if (!this.results || !actor || !target) return;
    const result = this.getResult(actor, target);
    result.damage += damage;
    result.critical ||= critical;
  }

  recordDefeat(actor, target) {
    if (!this.results || !actor || !target) return;
    this.getResult(actor, target).defeated = true;
  }

  flush() {
    if (!this.results) return;
    this.results.forEach((targets) => targets.forEach((result) => this.logResult(result)));
    this.misfortuneDamage?.forEach((damage, actor) => {
      logUniqueSkill(this.gameLog, this.textRepository, 'logMisfortuneSelf', { condition: termText('misfortune'), actor: entityText(actor), damage: Math.round(damage * 100) }, actor);
    });
    this.results = null;
    this.misfortuneDamage = null;
  }

  getResult(actor, target) {
    let targets = this.results.get(actor);
    if (!targets) {
      targets = new Map();
      this.results.set(actor, targets);
    }
    let result = targets.get(target);
    if (!result) {
      result = { actor, target, damage: 0, critical: false, miss: false, defeated: false };
      targets.set(target, result);
    }
    return result;
  }

  logResult({ actor, target, damage, critical, miss, defeated }) {
    const subject = isHeroCombatant(actor) ? 'hero' : 'enemy';
    const values = { actor: entityText(actor), target: entityText(target), damage: Math.round(damage * 100) };
    if (defeated) {
      logText(this.gameLog, this.textRepository, 'logDefeat', values, { subject, level: 'info', channel: 'battle' });
    } else if (damage >= MINIMUM_LOGGED_DAMAGE) {
      logText(this.gameLog, this.textRepository, critical ? 'logCritical' : 'logDamage', values, { subject, level: critical ? 'luck' : 'info', channel: 'battle' });
    } else if (miss) {
      logText(this.gameLog, this.textRepository, 'logMiss', values, { subject, level: 'unluck', channel: 'battle' });
    }
  }
}
