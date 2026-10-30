import { createLogMessageParts } from '../game/LogPresentation.js';
import { renderLogMessage } from './LogMessageView.js';

const DEFAULT_DURATION_MS = 6000;
const LEVEL_DURATION_MS = Object.freeze({ luck: 9000, unluck: 7000 });
const FLOW_Y_RANGES = Object.freeze({
  battle: Object.freeze({ min: 12, max: 44 }),
  other: Object.freeze({ min: 56, max: 88 }),
});

function getAnimationDurationMs({ subject, level }) {
  if (!['hero', 'enemy', 'system'].includes(subject)) return DEFAULT_DURATION_MS;
  if (subject === 'system' && level === 'warning') return 10000;
  return LEVEL_DURATION_MS[level] ?? DEFAULT_DURATION_MS;
}

export default class FlowLog {
  constructor(container, gameLog, { random = Math.random } = {}) {
    this.container = container;
    this.random = random;
    this.gameLog = gameLog;
    this.visibleEntries = new Map();
    this.unsubscribe = gameLog.subscribe((record, definitions) => {
      if (record.notify) this.show(record, definitions);
    });
  }

  getFlowY(channel) {
    const range = ['battle', 'ex-skill'].includes(channel) ? FLOW_Y_RANGES.battle : FLOW_Y_RANGES.other;
    return range.min + (range.max - range.min) * this.random();
  }

  show(record) {
    const entry = document.createElement('article');
    entry.className = `FlowLog__Entry ${record.subject} ${record.level}`;
    entry.dataset.channel = record.channel;
    entry.setAttribute('role', 'status');

    const message = document.createElement('p');
    message.className = 'FlowLog__Message';
    const text = document.createElement('span');
    text.className = 'FlowLog__Text';
    this.renderMessage(text, record);
    this.visibleEntries.set(entry, { text, record });
    message.append(text);
    entry.append(message);
    this.container.append(entry);

    const duration = getAnimationDurationMs(record);
    const adjustedDuration = duration * (0.85 + this.random() * 0.3);
    entry.style.setProperty('--flow-y', `${this.getFlowY(record.channel)}%`);
    entry.style.setProperty('--flow-duration-adjusted', `${adjustedDuration}ms`);
    entry.addEventListener('animationend', (event) => {
      if (event.target === entry && event.animationName === 'flow-log-right-to-left') {
        this.visibleEntries.delete(entry);
        entry.remove();
      }
    });
    requestAnimationFrame(() => entry.classList.add('state-running'));
  }

  renderMessage(text, record) {
    if (record.localized && this.gameLog.textRepository && typeof text.replaceChildren === 'function') {
      renderLogMessage(text, createLogMessageParts(this.gameLog.textRepository, record.localized));
      return;
    }
    text.textContent = this.gameLog.getMessage(record);
  }

  refreshLanguage() {
    this.visibleEntries.forEach(({ text, record }) => this.renderMessage(text, record));
  }

  dispose() {
    this.unsubscribe();
    this.visibleEntries.clear();
    this.container.replaceChildren();
  }
}
