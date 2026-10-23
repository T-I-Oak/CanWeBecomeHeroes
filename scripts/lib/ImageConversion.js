const LEVEL_SIZES = [8, 16, 32, 64, 128, 256, 512, 1024];

export function validateImageDefinition(path, definition) {
  if (!/^\/assets\/(areas|heroes|tags|status|enemies|items|background)\/[a-z0-9-]+\.png$/.test(path)) throw new Error(`Invalid asset path: ${path}`);
  if (!Number.isInteger(definition.size) || definition.size < 8 || definition.size > 4096) throw new Error(`Invalid target size: ${path}`);
  if (!/^[a-f0-9]{64}$/.test(definition.sourceSha256)) throw new Error(`Missing master hash: ${path}`);
}

export function getImageConversionPlan(width, height, size) {
  if (![width, height, size].every(value => Number.isInteger(value) && value > 0)) throw new Error('Invalid image dimensions');
  if (size > Math.max(width, height)) throw new Error('Image conversion cannot upscale a master');
  const dimensions = longest => ({
    width: Math.max(1, Math.ceil(width * longest / Math.max(width, height))),
    height: Math.max(1, Math.ceil(height * longest / Math.max(width, height))),
  });
  return { ...dimensions(size), levels: LEVEL_SIZES.filter(level => level < size).map(dimensions) };
}
