export const SPEED_LOG_MIN = -1;
export const SPEED_LOG_MAX = 2;
export const SPEED_LOG_STEP = 0.1;
export const DEFAULT_SPEED_LOG = 0;
export const DEFAULT_ACCELERATED_SPEED_LOG = 1;
export const TIME_SETTINGS_KEY = 'timeSettings';
export const DEFAULT_TIME_SETTINGS = Object.freeze({
  speedLog: DEFAULT_SPEED_LOG,
  acceleratedSpeedLog: DEFAULT_ACCELERATED_SPEED_LOG,
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

export function speedLogToRatio(value) {
  return (normalizeSpeedLog(value) - SPEED_LOG_MIN) / (SPEED_LOG_MAX - SPEED_LOG_MIN);
}

export function ratioToSpeedLog(ratio) {
  const clampedRatio = Math.min(1, Math.max(0, ratio));
  return normalizeSpeedLog(SPEED_LOG_MIN + clampedRatio * (SPEED_LOG_MAX - SPEED_LOG_MIN));
}

export function coupleSpeedLogs({ speedLog, acceleratedSpeedLog, moved = null }) {
  let normal = normalizeSpeedLog(speedLog);
  let accelerated = normalizeSpeedLog(acceleratedSpeedLog);
  if (moved === 'normal' && normal > accelerated) accelerated = normal;
  else if (moved === 'accelerated' && accelerated < normal) normal = accelerated;
  else if (normal > accelerated) accelerated = normal;
  return { speedLog: normal, acceleratedSpeedLog: accelerated };
}

export function normalizeTimeSettings(value) {
  const source = value && typeof value === 'object' ? value : {};
  const speedLog = normalizeSpeedLog(source.speedLog);
  const acceleratedSpeedLog = source.acceleratedSpeedLog == null
    ? normalizeSpeedLog(speedLog + 1)
    : source.acceleratedSpeedLog;
  return {
    ...coupleSpeedLogs({ speedLog, acceleratedSpeedLog }),
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
