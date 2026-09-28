import { entityText, logText } from './LocalizedLog.js';
import { isHeroCombatant } from './CombatParticipant.js';

const BATTLE_LOG = Object.freeze({ subject: 'enemy', level: 'info', channel: 'battle' });

export function skillText(skill) {
  return { kind: 'unique-skill', id: skill.id };
}

export function termText(id) {
  return { kind: 'term', id };
}

export function tagText(id) {
  return { kind: 'tag', id };
}

export function logUniqueSkill(gameLog, textRepository, key, values, actor = null) {
  const subject = actor && isHeroCombatant(actor) ? 'hero' : 'enemy';
  logText(gameLog, textRepository, key, values, { ...BATTLE_LOG, subject });
}
