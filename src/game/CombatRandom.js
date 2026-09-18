export function getCombatRandomModifier(random = Math.random) {
  return 0.8 + random() * 0.4;
}
