/**
 * Owns the lifecycle of one application-modal layer.
 *
 * Modal content belongs to its feature. This class only controls the shared
 * fixed layer so every application modal opens and closes consistently.
 */
export default class ModalLayer {
  constructor(container) {
    if (!container) throw new Error('Modal layer requires a container.');
    this.container = container;
  }

  open() {
    this.container.hidden = false;
    this.container.classList.add('state-open');
  }

  close() {
    this.container.classList.remove('state-open');
    this.container.replaceChildren();
    this.container.hidden = true;
  }
}
