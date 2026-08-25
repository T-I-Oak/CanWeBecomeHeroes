export const GAME_TICKS_PER_HOUR = 500;
export const INITIAL_TRIAL_HOURS = 7 * 24;
export const GUILD_EXTENSION_MAX_HOURS = 24;
export const GUILD_TIMELINE_STANDARD_HOURS = 14 * 24;
export const BASE_GUILD_EXTENSION_RATE = 0.1;

export function getGuildTimeStatus({ tick, contributionPoints, extensionHours = 0 }) {
  const elapsedHours = Math.max(0, tick / GAME_TICKS_PER_HOUR);
  const remainingHours = Math.max(0, INITIAL_TRIAL_HOURS + extensionHours - elapsedHours);
  const estimatedExtensionHours = Math.min(GUILD_EXTENSION_MAX_HOURS, contributionPoints * BASE_GUILD_EXTENSION_RATE);
  // 時間軸は「これから残っている時間」を示す。経過時間は別途数値で示すため、
  // バーには含めない。
  const timelineHours = Math.max(GUILD_TIMELINE_STANDARD_HOURS, remainingHours + estimatedExtensionHours);
  return Object.freeze({ elapsedHours, remainingHours, estimatedExtensionHours, timelineHours });
}

export function formatElapsedGuildTime(hours) {
  const wholeHours = Math.max(0, Math.floor(hours));
  return `${Math.floor(wholeHours / 24)}日 ${wholeHours % 24}時間`;
}

export function formatRemainingGuildTime(hours) {
  const wholeHours = Math.max(0, Math.ceil(hours));
  return `${Math.floor(wholeHours / 24)}日 ${wholeHours % 24}時間`;
}

export function formatGuildHours(hours) {
  return `${Math.max(0, Math.floor(hours))}H`;
}
