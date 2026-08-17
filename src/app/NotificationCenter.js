const DISPLAY_DURATION_MS = 4200;
const EXIT_DURATION_MS = 260;

export default class NotificationCenter {
  constructor(container, gameLog) {
    this.container = container;
    this.notifications = [];
    this.unsubscribe = gameLog.subscribe((record, level) => {
      if (record.notify) this.show(record, level);
    });
  }

  show(record, level) {
    const element = document.createElement('article');
    element.className = 'NotificationCenter__Message';
    element.dataset.level = record.level;
    element.setAttribute('role', 'status');
    element.style.setProperty('--notification-accent', level.accent);
    element.style.setProperty('--notification-surface', level.surface);
    const levelElement = document.createElement('span');
    levelElement.className = 'NotificationCenter__Level';
    levelElement.textContent = level.label;
    const messageElement = document.createElement('p');
    messageElement.className = 'NotificationCenter__Text';
    messageElement.textContent = record.message;
    element.append(levelElement, messageElement);
    this.container.append(element);
    this.notifications.push(element);
    requestAnimationFrame(() => element.classList.add('is-visible'));
    window.setTimeout(() => this.dismiss(element), DISPLAY_DURATION_MS);
  }

  dismiss(element) {
    if (!element.isConnected || element.classList.contains('is-leaving')) return;
    element.classList.remove('is-visible');
    element.classList.add('is-leaving');
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
