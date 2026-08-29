const FALLBACK_DURATION_MS = 6000;
const FLOW_Y_RANGES = Object.freeze({
  battle: Object.freeze({ min: 12, max: 44 }),
  other: Object.freeze({ min: 56, max: 88 }),
});

function getAnimationDurationMs(element) {
  const value = window.getComputedStyle(element).getPropertyValue('--flow-duration').trim();
  if (value.endsWith('ms')) return Number.parseFloat(value) || FALLBACK_DURATION_MS;
  if (value.endsWith('s')) return (Number.parseFloat(value) || FALLBACK_DURATION_MS / 1000) * 1000;
  return FALLBACK_DURATION_MS;
}

export default class FlowLog {
  constructor(container, gameLog, { random = Math.random } = {}) {
    this.container = container;
    this.random = random;
    this.unsubscribe = gameLog.subscribe((record, definitions) => {
      if (record.notify) this.show(record, definitions);
    });
  }

  getFlowY(channel) {
    const range = channel === 'battle' ? FLOW_Y_RANGES.battle : FLOW_Y_RANGES.other;
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
    text.textContent = record.message;
    message.append(text);
    entry.append(message);
    this.container.append(entry);

    const duration = getAnimationDurationMs(entry);
    const adjustedDuration = duration * (0.85 + this.random() * 0.3);
    entry.style.setProperty('--flow-y', `${this.getFlowY(record.channel)}%`);
    entry.style.setProperty('--flow-duration-adjusted', `${adjustedDuration}ms`);
    entry.addEventListener('animationend', (event) => {
      if (event.target === entry && event.animationName === 'flow-log-right-to-left') entry.remove();
    });
    requestAnimationFrame(() => entry.classList.add('state-running'));
  }
}
