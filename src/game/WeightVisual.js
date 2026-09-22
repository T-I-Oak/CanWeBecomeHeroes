export const WEIGHT_GAUGE_MAX = 30;

export const WEIGHT_GAUGE_COLORS = Object.freeze({
  low: '#58c96d',
  middle: '#d6be57',
  high: '#ca7553',
});

export const WEIGHT_GAUGE_COLOR_STOPS = Object.freeze([
  Object.freeze({ position: 0, color: WEIGHT_GAUGE_COLORS.low }),
  Object.freeze({ position: 0.55, color: WEIGHT_GAUGE_COLORS.middle }),
  Object.freeze({ position: 1, color: WEIGHT_GAUGE_COLORS.high }),
]);

export function getWeightFillRatio(weight) {
  return Math.max(0, Math.min(1, weight / WEIGHT_GAUGE_MAX));
}

function parseHex(color) {
  return [1, 3, 5].map((index) => Number.parseInt(color.slice(index, index + 2), 16));
}

function toHex(value) {
  return Math.round(value).toString(16).padStart(2, '0');
}

export function getWeightGaugeColor(weight) {
  const ratio = getWeightFillRatio(weight);
  const upperIndex = WEIGHT_GAUGE_COLOR_STOPS.findIndex((stop) => stop.position >= ratio);
  const upper = WEIGHT_GAUGE_COLOR_STOPS[Math.max(0, upperIndex)];
  const lower = WEIGHT_GAUGE_COLOR_STOPS[Math.max(0, upperIndex - 1)];
  if (lower === upper) return upper.color;
  const localRatio = (ratio - lower.position) / (upper.position - lower.position);
  const lowerChannels = parseHex(lower.color);
  const upperChannels = parseHex(upper.color);
  return `#${lowerChannels.map((channel, index) => toHex(channel + (upperChannels[index] - channel) * localRatio)).join('')}`;
}
