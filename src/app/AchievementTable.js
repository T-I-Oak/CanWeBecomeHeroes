const MODES = new Set(['result', 'record', 'toast']);

function cell(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

/**
 * Presentation only: entries are already selected, ordered and localized.
 * Each entry has categoryId, category, label, condition, gradeLabel, comment, updated.
 * Record entries also supply progress (ratio) and a localized progressLabel.
 * This component never selects entries, evaluates achievements or saves records.
 */
export function createAchievementTable({ mode, entries, headings = {} }) {
  if (!MODES.has(mode)) throw new RangeError(`Unknown achievement display mode: ${mode}`);
  if (mode === 'toast' && entries.length !== 1) throw new RangeError('Achievement toast requires one entry.');
  const table = document.createElement('table');
  table.className = `AchievementTable state-${mode}`;
  if (mode !== 'toast') {
    const head = document.createElement('thead');
    const row = document.createElement('tr');
    const columns = mode === 'record' ? ['category', 'item', 'grade', 'condition', 'progress'] : ['category', 'item', 'grade', 'comment'];
    for (const key of columns) row.append(cell('th', '', headings[key]));
    head.append(row);
    table.append(head);
  }
  const body = document.createElement('tbody');
  entries.forEach((entry, index) => {
    const row = document.createElement('tr');
    if (mode !== 'toast' && (index === 0 || entries[index - 1].categoryId !== entry.categoryId)) {
      let span = 1;
      while (index + span < entries.length && entries[index + span].categoryId === entry.categoryId) span++;
      const category = cell('td', 'AchievementTable__Category', entry.category);
      category.rowSpan = span;
      row.append(category);
    }
    const item = cell('td', 'AchievementTable__Item', entry.label);
    row.append(item, cell('td', `AchievementTable__Grade${entry.updated ? ' state-updated' : ''}`, entry.gradeLabel));
    if (mode === 'record') {
      const progress = cell('td', 'AchievementTable__Progress', entry.progressLabel);
      const track = cell('span', 'AchievementTable__ProgressTrack', '');
      const fill = cell('span', 'AchievementTable__ProgressFill', '');
      fill.style.width = `${entry.progress.ratio * 100}%`;
      track.append(fill);
      progress.append(track);
      row.append(cell('td', 'AchievementTable__Condition', entry.condition), progress);
    } else if (mode !== 'toast') row.append(cell('td', 'AchievementTable__Comment', entry.comment));
    body.append(row);
  });
  table.append(body);
  return table;
}
