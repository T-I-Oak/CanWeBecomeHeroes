export const SPEED_LOG_MIN = -1;
export const SPEED_LOG_MAX = 2;
export const SPEED_LOG_STEP = 0.1;
export const DEFAULT_SPEED_LOG = 0;
export const TIME_SETTINGS_KEY = 'timeSettings';
export const DEFAULT_TIME_SETTINGS = Object.freeze({
  speedLog: DEFAULT_SPEED_LOG,
  pauseOnInformation: true,
  pauseOnStaminaFull: false,
  accelerateWithoutPreparation: false,
});

export function normalizeSpeedLog(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return DEFAULT_SPEED_LOG;
  const clampedValue = Math.max(SPEED_LOG_MIN, Math.min(SPEED_LOG_MAX, numericValue));
  return Number((Math.round(clampedValue / SPEED_LOG_STEP) * SPEED_LOG_STEP).toFixed(1));
}

export function getSpeedFromLog(speedLog) {
  return 2 ** normalizeSpeedLog(speedLog);
}

export function normalizeTimeSettings(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    speedLog: normalizeSpeedLog(source.speedLog),
    pauseOnInformation: source.pauseOnInformation ?? DEFAULT_TIME_SETTINGS.pauseOnInformation,
    pauseOnStaminaFull: Boolean(source.pauseOnStaminaFull),
    accelerateWithoutPreparation: Boolean(source.accelerateWithoutPreparation),
  };
}

export function readTimeSettings(dataManager) {
  return normalizeTimeSettings(dataManager?.getValue(TIME_SETTINGS_KEY));
}

export function writeTimeSettings(value, dataManager) {
  const normalized = normalizeTimeSettings(value);
  dataManager?.setValue(TIME_SETTINGS_KEY, normalized);
  return normalized;
}
