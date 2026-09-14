export const DEFAULT_LOG_SUBJECTS = Object.freeze({
  hero: { labelKey: 'logCategory_hero' },
  enemy: { labelKey: 'logCategory_enemy' },
  system: { labelKey: 'logCategory_system' },
});

export const DEFAULT_LOG_LEVELS = Object.freeze({
  info: { labelKey: 'logCategory_info' },
  luck: { labelKey: 'logCategory_luck' },
  unluck: { labelKey: 'logCategory_unluck' },
  warning: { labelKey: 'logCategory_warning' },
});

export const DEFAULT_LOG_CHANNELS = Object.freeze({
  battle: { labelKey: 'logCategory_battle' },
  shop: { labelKey: 'logCategory_shop' },
  guild: { labelKey: 'logCategory_guild' },
  training: { labelKey: 'logCategory_training' },
  preparing: { labelKey: 'logCategory_preparing' },
  event: { labelKey: 'logCategory_event' },
});

export default class GameLog {
  constructor({ textRepository = null, subjects = DEFAULT_LOG_SUBJECTS, levels = DEFAULT_LOG_LEVELS, channels = DEFAULT_LOG_CHANNELS, now = () => Date.now() } = {}) {
    this.textRepository = textRepository;
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

  log(message, { subject = 'system', level = 'info', channel = 'event', notify = true, data = null, localized = null } = {}) {
    const subjectDefinition = this.subjects.get(subject);
    const levelDefinition = this.levels.get(level);
    const channelDefinition = this.channels.get(channel);
    if (!subjectDefinition) throw new Error(`Unknown log subject: ${subject}`);
    if (!levelDefinition) throw new Error(`Unknown log level: ${level}`);
    if (!channelDefinition) throw new Error(`Unknown log channel: ${channel}`);
    const record = Object.freeze({
      id: this.nextId++, message, subject, level, channel, notify, data, localized, timestamp: this.now(),
    });
    this.records.push(record);
    this.listeners.forEach((listener) => listener(record, {
      subject: this.resolveDefinition(subjectDefinition),
      level: this.resolveDefinition(levelDefinition),
      channel: this.resolveDefinition(channelDefinition),
    }));
    return record;
  }

  resolveDefinition(definition) {
    if (!definition.labelKey) return definition;
    return { ...definition, label: this.textRepository ? this.textRepository.getLabel(definition.labelKey) : definition.labelKey };
  }

  logLocalized(event, options = {}) {
    const localized = structuredClone(event);
    return this.log(this.textRepository ? this.textRepository.formatLog(localized) : event.key, { ...options, localized });
  }

  getMessage(record) {
    return record.localized && this.textRepository ? this.textRepository.formatLog(record.localized) : record.message;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getRecords() {
    return [...this.records];
  }
}
