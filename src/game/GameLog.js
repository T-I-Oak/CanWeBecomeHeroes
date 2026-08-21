export const DEFAULT_LOG_SUBJECTS = Object.freeze({
  hero: { label: 'キャラクター' },
  enemy: { label: '敵' },
  system: { label: 'システム' },
});

export const DEFAULT_LOG_LEVELS = Object.freeze({
  info: { label: '情報' },
  luck: { label: '幸運' },
  unluck: { label: '不運' },
});

export default class GameLog {
  constructor({ subjects = DEFAULT_LOG_SUBJECTS, levels = DEFAULT_LOG_LEVELS, now = () => Date.now() } = {}) {
    this.subjects = new Map(Object.entries(subjects));
    this.levels = new Map(Object.entries(levels));
    this.now = now;
    this.records = [];
    this.listeners = new Set();
    this.nextId = 1;
  }

  defineLevel(id, definition) {
    this.levels.set(id, Object.freeze({ ...definition }));
  }

  defineSubject(id, definition) {
    this.subjects.set(id, Object.freeze({ ...definition }));
  }

  log(message, { subject = 'system', level = 'info', notify = true, data = null } = {}) {
    const subjectDefinition = this.subjects.get(subject);
    const definition = this.levels.get(level);
    if (!subjectDefinition) throw new Error(`Unknown log subject: ${subject}`);
    if (!definition) throw new Error(`Unknown log level: ${level}`);
    const record = Object.freeze({
      id: this.nextId++, message, subject, level, notify, data, timestamp: this.now(),
    });
    this.records.push(record);
    this.listeners.forEach((listener) => listener(record, { subject: subjectDefinition, level: definition }));
    return record;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getRecords() {
    return [...this.records];
  }
}
