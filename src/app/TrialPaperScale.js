export function getTrialPaperLayout(width, height) {
  const scale = Math.min(1, width / 840, height / 534);
  return { scale, width: 840 * scale, height: 534 * scale };
}
