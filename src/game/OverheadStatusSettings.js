export const OVERHEAD_STATUS_SETTINGS_KEY = 'overheadStatusSettings';
export const OVERHEAD_STATUS_KEYS = Object.freeze(['power', 'magic', 'speed', 'negotiation', 'luck', 'durability', 'weight']);
export const OVERHEAD_STATUS_VISIBILITY = Object.freeze({ always: 'always', battle: 'battle' });
export const OVERHEAD_STATUS_SWITCH_INTERVAL_SECONDS = 1;

export const DEFAULT_OVERHEAD_STATUS_SETTINGS = Object.freeze({
  statuses: Object.freeze([]),
  visibility: OVERHEAD_STATUS_VISIBILITY.always,
});

export function normalizeOverheadStatusSettings(value) {
  const source = value && typeof value === 'object' ? value : {};
  const statuses = Array.isArray(source.statuses)
    ? [...new Set(source.statuses.filter((status) => OVERHEAD_STATUS_KEYS.includes(status)))]
    : [];
  const visibility = Object.values(OVERHEAD_STATUS_VISIBILITY).includes(source.visibility)
    ? source.visibility
    : DEFAULT_OVERHEAD_STATUS_SETTINGS.visibility;
  return Object.freeze({ statuses: Object.freeze(statuses), visibility });
}

export function readOverheadStatusSettings(dataManager) {
  return normalizeOverheadStatusSettings(dataManager?.getValue(OVERHEAD_STATUS_SETTINGS_KEY));
}

export function writeOverheadStatusSettings(value, dataManager) {
  const normalized = normalizeOverheadStatusSettings(value);
  dataManager?.setValue(OVERHEAD_STATUS_SETTINGS_KEY, normalized);
  return normalized;
}

export function getRotatingOverheadStatus(statuses, elapsedSeconds) {
  if (statuses.length === 0) return null;
  const index = Math.floor(Math.max(0, elapsedSeconds) / OVERHEAD_STATUS_SWITCH_INTERVAL_SECONDS) % statuses.length;
  return statuses[index];
}

export function isOverheadStatusVisible(entity, visibility) {
  return visibility === OVERHEAD_STATUS_VISIBILITY.always || entity.currentArea === 'battle';
}

export function getOverheadStatusValue(entity, status) {
  if (status === 'durability') return Math.floor((entity.chip.type === 'enemy' ? entity.hp : entity.stamina) * 100);
  if (status === 'weight') return entity.getCarriedWeight();
  return Math.floor(entity.getStatus(status));
}
