/** Select by update/run contribution, then return in original definition order. */
export function selectResultAchievements(entries, limit) {
  if (!Number.isInteger(limit) || limit < 0) throw new RangeError('Achievement display limit must be a nonnegative integer.');
  const candidates = entries.map((entry, index) => ({ entry, index }));
  const unique = candidates.filter(({ entry }, index) => candidates.findIndex(item => item.entry.id === entry.id) === index);
  const selected = unique.filter(item => item.entry.updated).slice(0, limit);
  const remaining = Math.max(0, limit - selected.length);
  selected.push(...unique.filter(item => !item.entry.updated)
    .sort((a, b) => b.entry.runG - a.entry.runG || a.index - b.index).slice(0, remaining));
  return selected.sort((a, b) => a.index - b.index).map(item => item.entry);
}
