import { getCombatRandomModifier } from './CombatRandom.js';

export const WEAPON_ATTACKS = Object.freeze({
  sword: ['power', 1], shield: ['power', 1 / 3], claw: ['power', 1 / 3], bow: ['power', 2 / 3],
  banner: ['magic', 1 / 3], staff: ['magic', 1], 'holy-book': ['magic', 1 / 2], orb: ['power', 1 / 3],
  'holy-symbol': ['magic', 1 / 3], 'tarot-cards': ['magic', 1 / 3], unarmed: ['power', 1 / 3],
});

export function getAttackDamage(actor, attack) {
  const [stat, multiplier] = Array.isArray(attack) ? attack : [attack.stat, attack.multiplier];
  return ((actor.getStatus(stat) + 0.5) / (stat === 'magic' ? 4 : 2)) * multiplier;
}

export function getRandomModifier(random = Math.random) { return getCombatRandomModifier(random); }
