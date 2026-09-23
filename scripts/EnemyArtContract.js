/**
 * Source-art contract for enemy Chips.
 *
 * ChipRenderer owns the rank-dependent Chip diameter.  These values only
 * define how much of the common, tag-safe art region the source illustration
 * should occupy.  They intentionally contain no runtime rendering behavior.
 */
export const ENEMY_ART_TARGET_SILHOUETTE_RADIUS_RATIO = Object.freeze({
  small: 0.68,
  medium: 0.75,
  large: 0.79,
});

export const ENEMY_ART_MINIMUM_SILHOUETTE_RADIUS_RATIO = Object.freeze({
  small: 0.64,
  medium: 0.71,
  large: 0.76,
});

export function getEnemyArtRankFromFilename(filename) {
  const rank = filename.split('-', 1)[0];
  if (!(rank in ENEMY_ART_TARGET_SILHOUETTE_RADIUS_RATIO)) {
    throw new Error(`Enemy art filename has no supported rank prefix: ${filename}`);
  }
  return rank;
}
