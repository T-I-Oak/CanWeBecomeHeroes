export const DEFAULT_LOG_SUBJECTS = Object.freeze({
  hero: { label: 'キャラクター' },
  enemy: { label: '敵' },
  system: { label: 'システム' },
});

export const DEFAULT_LOG_LEVELS = Object.freeze({
  info: { label: '情報' },
  luck: { label: '幸運' },
  unluck: { label: '不運' },
  warning: { label: '注意' },
});

export const DEFAULT_LOG_CHANNELS = Object.freeze({
  battle: { label: '戦闘' },
  shop: { label: 'ショップ' },
  guild: { label: 'ギルド' },
  training: { label: '訓練' },
  preparing: { label: '準備' },
  event: { label: 'ゲーム進行' },
});

export default class GameLog {
  constructor({ subjects = DEFAULT_LOG_SUBJECTS, levels = DEFAULT_LOG_LEVELS, channels = DEFAULT_LOG_CHANNELS, now = () => Date.now() } = {}) {
    this.subjects = new Map(Object.entries(subjects));
    this.levels = new Map(Object.entries(levels));
    this.channels = new Map(Object.entries(channels));
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

  defineChannel(id, definition) {
    this.channels.set(id, Object.freeze({ ...definition }));
  }

  log(message, { subject = 'system', level = 'info', channel = 'event', notify = true, data = null } = {}) {
    const subjectDefinition = this.subjects.get(subject);
    const levelDefinition = this.levels.get(level);
    const channelDefinition = this.channels.get(channel);
    if (!subjectDefinition) throw new Error(`Unknown log subject: ${subject}`);
    if (!levelDefinition) throw new Error(`Unknown log level: ${level}`);
    if (!channelDefinition) throw new Error(`Unknown log channel: ${channel}`);
    const record = Object.freeze({
      id: this.nextId++, message, subject, level, channel, notify, data, timestamp: this.now(),
    });
    this.records.push(record);
    this.listeners.forEach((listener) => listener(record, {
      subject: subjectDefinition,
      level: levelDefinition,
      channel: channelDefinition,
    }));
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
