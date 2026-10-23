export function summarize(values) {
  if (!values.length) return null;
  const sorted = values.toSorted((a, b) => a - b);
  const percentile = p => sorted[Math.floor((sorted.length - 1) * p)];
  return { count: values.length, mean: values.reduce((a, b) => a + b, 0) / values.length,
    p50: percentile(.5), p95: percentile(.95), p99: percentile(.99), max: sorted.at(-1),
    over33ms: values.filter(v => v > 1000 / 30).length / values.length,
    over50ms: values.filter(v => v > 50).length / values.length };
}

export function summarizeFrames(rows) {
  const keys = [...new Set(rows.flatMap(row => Object.keys(row)))];
  return Object.fromEntries(keys.map(key => [key, summarize(rows.map(row => row[key]).filter(Number.isFinite))]));
}

// A fixed scene uses one size per source. Cropped drawImage calls retain the original.
export function getRequiredImageSize(image, args, transform) {
  if (args.length !== 2 && args.length !== 4) return null;
  const width = args.length === 4 ? Math.abs(args[2]) : image.naturalWidth;
  const height = args.length === 4 ? Math.abs(args[3]) : image.naturalHeight;
  const scale = Math.max(width * Math.hypot(transform.a, transform.b) / image.naturalWidth,
    height * Math.hypot(transform.c, transform.d) / image.naturalHeight);
  // Round up, so a cached image never needs magnifying at the sampled transform.
  return Math.min(1, 2 ** Math.ceil(Math.log2(Math.max(scale, 1 / Math.max(image.naturalWidth, image.naturalHeight)))));
}
