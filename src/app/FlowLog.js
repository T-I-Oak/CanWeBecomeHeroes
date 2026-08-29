const FALLBACK_DURATION_MS = 6000;
const LANE_POSITIONS = Object.freeze({
  battle: Object.freeze([16, 28, 40]),
  other: Object.freeze([62, 74, 86]),
});

function getAnimationDurationMs(element) {
  const value = window.getComputedStyle(element).getPropertyValue('--flow-duration').trim();
  if (value.endsWith('ms')) return Number.parseFloat(value) || FALLBACK_DURATION_MS;
  if (value.endsWith('s')) return (Number.parseFloat(value) || FALLBACK_DURATION_MS / 1000) * 1000;
  return FALLBACK_DURATION_MS;
}

export default class FlowLog {
  constructor(container, gameLog) {
    this.container = container;
    this.lanes = Object.fromEntries(Object.entries(LANE_POSITIONS).map(([channel, positions]) => [
      channel,
      positions.map((position) => ({ position, availableAt: 0 })),
    ]));
    this.unsubscribe = gameLog.subscribe((record, definitions) => {
      if (record.notify) this.show(record, definitions);
    });
  }

  getLane(channel, now) {
    const laneGroup = channel === 'battle' ? 'battle' : 'other';
    const lanes = this.lanes[laneGroup];
    return lanes.reduce((earliest, lane) => (lane.availableAt < earliest.availableAt ? lane : earliest));
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

    const now = performance.now();
    const duration = getAnimationDurationMs(entry);
    const lane = this.getLane(record.channel, now);
    const delay = Math.max(0, lane.availableAt - now);
    lane.availableAt = now + delay + duration;
    entry.style.setProperty('--flow-lane-y', `${lane.position}%`);
    entry.style.setProperty('--flow-delay', `${delay}ms`);
    entry.addEventListener('animationend', (event) => {
      if (event.target === entry && event.animationName === 'flow-log-right-to-left') entry.remove();
    });
    requestAnimationFrame(() => entry.classList.add('state-running'));
  }
}
