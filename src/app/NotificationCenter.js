const DISPLAY_DURATION_MS = 4200;
const EXIT_DURATION_MS = 260;

function getToastGap(container) {
  return Number.parseFloat(window.getComputedStyle(container).rowGap) || 0;
}

export default class NotificationCenter {
  constructor(container, gameLog) {
    this.container = container;
    this.notifications = [];
    this.unsubscribe = gameLog.subscribe((record, definitions) => {
      if (record.notify) this.show(record, definitions);
    });
  }

  show(record, definitions) {
    const element = document.createElement('article');
    element.className = 'Toast';
    element.dataset.level = record.level;
    element.dataset.subject = record.subject;
    element.setAttribute('role', 'status');
    const levelElement = document.createElement('span');
    levelElement.className = 'Toast__Level';
    levelElement.textContent = definitions.level.label;
    const messageElement = document.createElement('p');
    messageElement.className = `Toast__Message ${record.subject} ${record.level}`;
    const textElement = document.createElement('span');
    textElement.className = 'Toast__Text';
    textElement.textContent = record.message;
    messageElement.append(levelElement, textElement);
    element.append(messageElement);
    this.container.append(element);
    this.notifications.push(element);
    requestAnimationFrame(() => element.classList.add('state-visible'));
    window.setTimeout(() => this.dismiss(element), DISPLAY_DURATION_MS);
  }

  dismiss(element) {
    if (!element.isConnected || element.classList.contains('state-leaving')) return;
    const exitDistance = element.getBoundingClientRect().height + getToastGap(this.container);
    element.style.setProperty('--toast-exit-distance', `${exitDistance}px`);
    element.classList.remove('state-visible');
    element.classList.add('state-leaving');
    window.setTimeout(() => {
      const previousPositions = new Map(this.notifications
        .filter((notification) => notification !== element)
        .map((notification) => [notification, notification.getBoundingClientRect().top]));
      const index = this.notifications.indexOf(element);
      if (index >= 0) this.notifications.splice(index, 1);
      element.remove();
      this.notifications.forEach((notification) => {
        const previousTop = previousPositions.get(notification);
        const offset = previousTop - notification.getBoundingClientRect().top;
        if (!offset) return;
        notification.style.transition = 'none';
        notification.style.transform = `translateY(${offset}px)`;
        requestAnimationFrame(() => {
          notification.style.transition = '';
          notification.style.transform = '';
        });
      });
    }, EXIT_DURATION_MS);
  }
}
