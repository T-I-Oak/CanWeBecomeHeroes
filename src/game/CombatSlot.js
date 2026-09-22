export function getBattleSlotPosition(combatant) {
  if (Number.isInteger(combatant.slotPosition)) return combatant.slotPosition;
  const match = /^battle-(\d+)$/.exec(combatant.currentSlotId ?? '');
  return match ? Number(match[1]) : null;
}

export function getBattleSlotSpan(combatant) {
  return combatant.definition?.size === 'large' ? 2 : 1;
}
