import { getCombatRandomModifier } from './CombatRandom.js';

export const WEAPON_ATTACKS = Object.freeze({
  sword: ['power', 1], shield: ['power', 1 / 8], claw: ['power', 1 / 8], bow: ['power', 1 / 2],
  banner: ['magic', 1 / 8], staff: ['magic', 1], 'holy-book': ['magic', 1 / 4], orb: ['power', 1 / 8],
  'holy-symbol': ['magic', 1 / 8], 'tarot-cards': ['magic', 1 / 8], unarmed: ['power', 1 / 8],
});

export function getAttackDamage(actor, attack) {
  const [stat, multiplier] = Array.isArray(attack) ? attack : [attack.stat, attack.multiplier];
  return ((actor.getStatus(stat) + 0.5) / (stat === 'magic' ? 4 : 2)) * multiplier;
}

export function getRandomModifier(random = Math.random) { return getCombatRandomModifier(random); }
