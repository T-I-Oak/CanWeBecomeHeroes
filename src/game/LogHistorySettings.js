const SETTINGS_KEY = 'logHistoryFilters';
const SAVED_DATA_DEFINITION = Object.freeze({
  init: () => ({ ordinary: true, exSkill: true }),
});

export function readLogHistoryFilters(dataManager) {
  return dataManager.getSavedData(SETTINGS_KEY, SAVED_DATA_DEFINITION);
}

export function writeLogHistoryFilters(dataManager, filters) {
  dataManager.setSavedData(SETTINGS_KEY, { ordinary: filters.ordinary, exSkill: filters.exSkill });
}
