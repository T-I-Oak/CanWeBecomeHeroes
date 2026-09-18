export function isHeroCombatant(entity) {
  return entity.chip.type === 'hero';
}

export function isEntityOnBoard(board, entity) {
  return board.chips.includes(entity.chip);
}
