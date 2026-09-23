/**
 * Geometry shared by Chip rendering and source-art coordinate validation.
 *
 * Center art is deliberately placed below the chip centre: the upper portion
 * of the chip is reserved for intrinsic-tag markers.  Enemy art therefore
 * needs transparent padding outside this safe circle rather than bespoke
 * offsets in a renderer or catalog entry.
 */
export const CHIP_CENTER_ART_SCALE = 0.85;
export const CHIP_CENTER_ART_MASK_RADIUS_RATIO = 0.94;

// Keeps a visible breathing room between source art and the circular chip rim.
// The mask is 0.94.  Art may overlap intrinsic tags, but keeps a thin rim margin.
export const CHIP_CENTER_ART_SAFE_RADIUS_RATIO = 0.93;

export function getCenterImagePlacement(radius) {
  const size = radius * 2 * CHIP_CENTER_ART_SCALE;
  return { x: 0, y: radius - size / 2, size };
}

/**
 * Maps one source-image pixel to the chip's unscaled local coordinate space.
 * This is the exact contain transform used by ChipRenderer.
 */
export function getCenterArtPixelPosition({ imageWidth, imageHeight, pixelX, pixelY, radius }) {
  const placement = getCenterImagePlacement(radius);
  const scale = Math.min(placement.size / imageWidth, placement.size / imageHeight);
  return {
    x: (pixelX + 0.5 - imageWidth / 2) * scale,
    y: placement.y + (pixelY + 0.5 - imageHeight / 2) * scale,
  };
}

export function isWithinCenterArtSafeCircle(position, radius) {
  return Math.hypot(position.x, position.y) <= radius * CHIP_CENTER_ART_SAFE_RADIUS_RATIO;
}

export function createCenterArtBoundarySamples(radius, count = 16) {
  return Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / count;
    const distance = radius * CHIP_CENTER_ART_SAFE_RADIUS_RATIO;
    return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance };
  });
}
