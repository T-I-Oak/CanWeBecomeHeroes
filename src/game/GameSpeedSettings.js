export const SPEED_LOG_MIN = -1;
export const SPEED_LOG_MAX = 2;
export const SPEED_LOG_STEP = 0.1;
export const DEFAULT_SPEED_LOG = 0;
export const SPEED_LOG_STORAGE_KEY = 'can-we-become-heroes:time-speed-log';

export function normalizeSpeedLog(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return DEFAULT_SPEED_LOG;
  const clampedValue = Math.max(SPEED_LOG_MIN, Math.min(SPEED_LOG_MAX, numericValue));
  return Number((Math.round(clampedValue / SPEED_LOG_STEP) * SPEED_LOG_STEP).toFixed(1));
}

export function getSpeedFromLog(speedLog) {
  return 2 ** normalizeSpeedLog(speedLog);
}

export function readSpeedLog(storage = globalThis.localStorage) {
  try {
    return normalizeSpeedLog(storage?.getItem(SPEED_LOG_STORAGE_KEY));
  } catch {
    return DEFAULT_SPEED_LOG;
  }
}

export function writeSpeedLog(speedLog, storage = globalThis.localStorage) {
  const normalizedSpeedLog = normalizeSpeedLog(speedLog);
  try {
    storage?.setItem(SPEED_LOG_STORAGE_KEY, String(normalizedSpeedLog));
  } catch {
    // Speed remains usable for this session even when persistent storage is unavailable.
  }
  return normalizedSpeedLog;
}
