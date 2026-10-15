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
    for (const key of ['category', 'item', 'grade', 'comment']) row.append(cell('th', '', headings[key]));
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
    if (mode === 'record') item.append(cell('span', 'AchievementTable__Condition', entry.condition));
    row.append(item, cell('td', `AchievementTable__Grade${entry.updated ? ' state-updated' : ''}`, entry.gradeLabel));
    if (mode !== 'toast') row.append(cell('td', 'AchievementTable__Comment', entry.comment));
    body.append(row);
  });
  table.append(body);
  return table;
}
