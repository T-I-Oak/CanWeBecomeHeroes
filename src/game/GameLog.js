export const DEFAULT_LOG_LEVELS = Object.freeze({
  fortune: { label: '幸運', accent: '#bd7b00', surface: '#fff4d6' },
  misfortune: { label: '不運', accent: '#a64b61', surface: '#fff0f3' },
  hero: { label: 'キャラクター', accent: '#2d6ac5', surface: '#e8f1ff' },
  enemy: { label: '敵', accent: '#b84b4b', surface: '#fff0f0' },
  system: { label: 'システム', accent: '#64748b', surface: '#f1f5f9' },
});

export default class GameLog {
  constructor({ levels = DEFAULT_LOG_LEVELS, now = () => Date.now() } = {}) {
    this.levels = new Map(Object.entries(levels));
    this.now = now;
    this.records = [];
    this.listeners = new Set();
    this.nextId = 1;
  }

  defineLevel(id, definition) {
    this.levels.set(id, Object.freeze({ ...definition }));
  }

  log(message, { level = 'system', notify = true, data = null } = {}) {
    const definition = this.levels.get(level);
    if (!definition) throw new Error(`Unknown log level: ${level}`);
    const record = Object.freeze({
      id: this.nextId++, message, level, notify, data, timestamp: this.now(),
    });
    this.records.push(record);
    this.listeners.forEach((listener) => listener(record, definition));
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
