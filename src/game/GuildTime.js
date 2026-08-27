export const GAME_TICKS_PER_HOUR = 500;
export const INITIAL_TRIAL_HOURS = 7 * 24;
export const GUILD_EXTENSION_MAX_HOURS = 24;
export const GUILD_TIMELINE_STANDARD_HOURS = INITIAL_TRIAL_HOURS;
export const BASE_GUILD_EXTENSION_RATE = 0.1;

export function getGuildExtensionRate({ reputationSkillLevel = 0, isLucky = false } = {}) {
  return BASE_GUILD_EXTENSION_RATE * (1 + reputationSkillLevel * 0.2) * (isLucky ? 1.2 : 1);
}

export function calculateGuildExtension({ contributionPoints, reputationSkillLevel = 0, isLucky = false }) {
  const availablePoints = Math.max(0, contributionPoints);
  const rate = getGuildExtensionRate({ reputationSkillLevel, isLucky });
  const calculatedHours = availablePoints * rate;
  if (calculatedHours < 1) {
    return Object.freeze({ extensionHours: 1, consumedPoints: availablePoints, rate, isMinimumGuarantee: true });
  }
  if (calculatedHours >= GUILD_EXTENSION_MAX_HOURS) {
    return Object.freeze({ extensionHours: GUILD_EXTENSION_MAX_HOURS, consumedPoints: Math.min(availablePoints, Math.ceil(GUILD_EXTENSION_MAX_HOURS / rate)), rate, isMinimumGuarantee: false });
  }
  return Object.freeze({ extensionHours: calculatedHours, consumedPoints: availablePoints, rate, isMinimumGuarantee: false });
}

export function getGuildTimeStatus({ tick, contributionPoints, extensionHours = 0, extensionRate = BASE_GUILD_EXTENSION_RATE, timelineHours = GUILD_TIMELINE_STANDARD_HOURS }) {
  const elapsedHours = Math.max(0, tick / GAME_TICKS_PER_HOUR);
  const remainingHours = Math.max(0, INITIAL_TRIAL_HOURS + extensionHours - elapsedHours);
  const estimatedExtensionHours = Math.min(GUILD_EXTENSION_MAX_HOURS, Math.max(1, contributionPoints * extensionRate));
  // 時間軸は「これから残っている時間」を示す。開始時は試験期限の7日幅とし、
  // 残り期限と延長見込の合計がそれを越える場合だけ表示上限を拡張する。
  const nextTimelineHours = Math.max(timelineHours, remainingHours + estimatedExtensionHours);
  return Object.freeze({ elapsedHours, remainingHours, estimatedExtensionHours, timelineHours: nextTimelineHours });
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

export function formatGuildExtensionHours(hours) {
  const rounded = Math.round(hours * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}時間`;
}
