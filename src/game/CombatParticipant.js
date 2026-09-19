export function isHeroCombatant(entity) {
  return entity.chip.type === 'hero';
}

export function isEntityOnBoard(board, entity) {
  return board.chips.includes(entity.chip);
}

export function getEquipmentItems(entity) {
  const equipment = Array.isArray(entity.equipment) ? entity.equipment : Object.values(entity.equipment);
  return equipment.filter(Boolean);
}
