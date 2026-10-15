export function getTrialResultScale(width, height) {
  return Math.max(.05, Math.min((width - 24) / 840, (height - 24) / 600));
}
