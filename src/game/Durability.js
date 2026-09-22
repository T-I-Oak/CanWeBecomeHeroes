export const DURABILITY_UNIT_SCALE = 100;

export function toDurabilityUnits(value) {
  return Math.max(0, Math.round(value * DURABILITY_UNIT_SCALE));
}

export function fromDurabilityUnits(units) {
  return units / DURABILITY_UNIT_SCALE;
}

export function roundDamage(value) {
  return fromDurabilityUnits(toDurabilityUnits(value));
}
