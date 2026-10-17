export function matchesLogFilters(record, { ordinary = true, exSkill = true }) {
  if (!exSkill && record.channel === 'ex-skill') return false;
  return ordinary || !['logDamage', 'logMiss'].includes(record.localized?.key);
}

/** Prefix sums allow variable-height messages without mounting the entire history. */
export function getLogWindow(records, heights, scrollTop, viewportHeight, estimate = 60) {
  const offsets = [0];
  for (const record of records) offsets.push(offsets.at(-1) + (heights.get(record.id) ?? estimate));
  const find = position => {
    let low = 0; let high = records.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (offsets[middle + 1] <= position) low = middle + 1;
      else high = middle;
    }
    return low;
  };
  const anchor = Math.min(find(scrollTop), Math.max(0, records.length - 1));
  const start = Math.max(0, anchor - 6);
  const end = Math.min(records.length, find(scrollTop + viewportHeight) + 7);
  return { offsets, anchor, start, end, total: offsets.at(-1) };
}
