export function getChipVisualCenter(chip) {
  return {
    x: chip.x + (chip.effectOffsetX ?? 0),
    y: chip.y - chip.height + (chip.effectOffsetY ?? 0),
  };
}

export function isChipBodyAtPoint(chip, x, y) {
  const center = getChipVisualCenter(chip);
  const radius = chip.radius * Math.abs(chip.scale);
  return radius > 0 && Math.hypot(center.x - x, center.y - y) <= radius;
}
