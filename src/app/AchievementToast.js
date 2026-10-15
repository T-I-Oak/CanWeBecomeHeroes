import { createAchievementTable } from './AchievementTable.js';
import { ACHIEVEMENT_DEFINITIONS } from '../game/AchievementDefinitions.js';
import { getTrialResultScale } from './TrialResultScale.js';

export const TOAST_TIMING = Object.freeze({ resize: 250, grade: 600, hold: 3000 });
const ease = value => { const p = Math.max(0, Math.min(1, value)); return p * p * (3 - 2 * p); };
const lifetime = TOAST_TIMING.resize + TOAST_TIMING.grade + TOAST_TIMING.hold;

export default class AchievementToast {
  constructor({ textRepository, parent = document.body }) {
    this.textRepository = textRepository;
    this.pending = [];
    this.entries = [];
    this.disposed = false;
    this.container = document.createElement('aside');
    this.container.className = 'AchievementToast';
    this.container.setAttribute('role', 'status');
    this.container.setAttribute('aria-live', 'polite');
    this.heading = document.createElement('h2');
    this.heading.className = 'AchievementToast__Heading';
    this.table = createAchievementTable({ mode: 'toast', entries: [{ label: '', gradeLabel: '' }] });
    this.body = this.table.querySelector('tbody');
    this.body.replaceChildren();
    this.container.append(this.heading, this.table);
    parent.append(this.container);
    this.container.hidden = true;
  }

  enqueue(changes) {
    if (!this.disposed) this.pending.push(...changes);
  }

  createEntry(change) {
    const definition = ACHIEVEMENT_DEFINITIONS.find(item => item.id === change.id);
    const language = document.documentElement.lang.startsWith('en') ? 'en' : 'ja';
    const oldLabel = definition.levels[change.oldGrade - 1]?.label ?? 'E';
    const newLabel = definition.levels[change.newGrade - 1].label;
    const table = createAchievementTable({ mode: 'toast', entries: [{
      label: definition.resources[language].label, gradeLabel: oldLabel,
    }] });
    const row = table.querySelector('tr');
    const cells = [...row.children].map(cell => {
      const clip = document.createElement('div');
      clip.className = 'AchievementToast__Clip';
      const content = document.createElement('div');
      content.className = 'AchievementToast__Cell';
      content.textContent = cell.textContent;
      clip.append(content);
      cell.replaceChildren(clip);
      return { clip, content };
    });
    const grade = document.createElement('span');
    grade.className = 'AchievementToast__Grade';
    grade.textContent = oldLabel;
    cells[1].content.replaceChildren(grade);
    row.setAttribute('aria-label', `${definition.resources[language].label}: ${oldLabel} → ${newLabel}`);
    return { row, cells, grade, oldLabel, newLabel, change, age: 0 };
  }

  update(milliseconds, blocked = false) {
    if (this.disposed) return;
    this.container.hidden = blocked || (!this.entries.length && !this.pending.length);
    if (blocked) return;
    this.entries = this.entries.filter(entry => {
      entry.age += milliseconds;
      if (entry.age <= lifetime + TOAST_TIMING.resize) return true;
      entry.row.remove();
      return false;
    });
    this.heading.textContent = this.textRepository.getLabel('achievementToastTitle');
    const scale = getTrialResultScale(window.innerWidth, window.innerHeight);
    this.container.style.transform = `scale(${scale})`;
    const limit = Math.max(1, window.innerHeight * .3 / scale);
    let used = 28;
    for (const entry of this.entries) used += Math.max(...entry.cells.map(cell => cell.content.scrollHeight));
    while (this.entries.length > 1 && used > limit) {
      const entry = this.entries.pop();
      used -= Math.max(...entry.cells.map(cell => cell.content.scrollHeight));
      entry.row.remove();
      this.pending.unshift(entry.change);
    }
    while (this.pending.length && used < limit) {
      const entry = this.createEntry(this.pending[0]);
      this.body.append(entry.row);
      const height = Math.max(...entry.cells.map(cell => cell.content.scrollHeight));
      if (used + height > limit && this.entries.length) { entry.row.remove(); break; }
      this.pending.shift();
      this.entries.push(entry);
      used += height;
    }
    for (const entry of this.entries) {
      const opening = ease(entry.age / TOAST_TIMING.resize);
      const closing = 1 - ease((entry.age - lifetime) / TOAST_TIMING.resize);
      const fraction = opening * closing;
      const height = Math.max(...entry.cells.map(cell => cell.content.scrollHeight));
      for (const { clip } of entry.cells) clip.style.height = `${height * fraction}px`;
      const progress = Math.max(0, Math.min(1, (entry.age - TOAST_TIMING.resize) / TOAST_TIMING.grade));
      const latest = progress >= .5;
      entry.grade.textContent = latest ? entry.newLabel : entry.oldLabel;
      entry.grade.classList.toggle('state-updated', latest);
      entry.grade.style.transform = `scale(${1 + .5 * Math.sin(Math.PI * progress)})`;
    }
    const visibility = Math.max(0, ...this.entries.map(entry =>
      ease(entry.age / TOAST_TIMING.resize) * (1 - ease((entry.age - lifetime) / TOAST_TIMING.resize))));
    this.heading.style.height = `${28 * visibility}px`;
    this.container.classList.toggle('state-visible', visibility > 0);
  }

  dispose() {
    this.disposed = true;
    this.pending.length = 0;
    this.entries.length = 0;
    this.container.remove();
  }
}
