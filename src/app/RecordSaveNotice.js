import { createElement } from './UIElement.js';

export default class RecordSaveNotice {
  constructor(container, textRepository) {
    this.container = container;
    this.textRepository = textRepository;
    this.message = createElement('p', 'RecordSaveNotice__Message');
    this.retry = createElement('button', 'RecordSaveNotice__Retry');
    this.retry.type = 'button';
    this.retry.addEventListener('click', () => this.onRetry());
    container.append(this.message, this.retry);
    this.observer = new ResizeObserver(() => this.syncHeight());
    this.observer.observe(container);
  }

  show() {
    this.refreshLanguage();
    this.container.hidden = false;
    this.syncHeight();
  }

  hide() {
    this.container.hidden = true;
    this.syncHeight();
  }

  refreshLanguage() {
    this.message.textContent = this.textRepository.getLabel('recordsSaveFailed');
    this.retry.textContent = this.textRepository.getLabel('recordsSaveRetry');
  }

  syncHeight() {
    const height = this.container.getBoundingClientRect().height;
    document.documentElement.style.setProperty('--record-save-notice-height', `${height}px`);
  }
}
