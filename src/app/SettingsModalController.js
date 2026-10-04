/**
 * Manages the shared settings modal used by both TitleMenu and HUD.
 * Switches visible sections based on opener source ('menu' or 'hud').
 */
export default class SettingsModalController {
  constructor({
    modal,
    closeButton,
    sections = {},
    clock = null,
    modalSelects = [],
    onOpen = () => {},
    onClose = () => {},
  } = {}) {
    if (!modal) throw new Error('SettingsModalController requires a modal element.');
    this.modal = modal;
    this.closeButton = closeButton;
    this.sections = sections;
    this.clock = clock;
    this.modalSelects = modalSelects;
    this.onOpen = onOpen;
    this.onClose = onClose;

    this.currentSource = null;
    this.openerElement = null;
    this.ownerDocument = modal.ownerDocument || globalThis.document;

    this.bindEvents();
  }

  bindEvents() {
    this.closeButton?.addEventListener('click', () => this.close());
    this.modal.addEventListener('click', (event) => {
      if (event.target === this.modal) this.close();
    });
  }

  get isOpen() {
    return !this.modal.hidden;
  }

  open(source, { opener = null } = {}) {
    this.currentSource = source;
    this.openerElement = opener;

    this.updateSectionVisibility(source);

    this.modal.hidden = false;
    this.openerElement?.setAttribute('aria-expanded', 'true');

    this.modalSelects.forEach((select) => select.setOpen?.(false));

    if (source === 'hud') {
      this.clock?.pause('time-settings');
    }

    this.onOpen(source);
  }

  close() {
    if (this.modal.hidden) return;

    this.modal.hidden = true;
    this.openerElement?.setAttribute('aria-expanded', 'false');

    this.modalSelects.forEach((select) => select.setOpen?.(false));

    if (this.currentSource === 'hud') {
      this.clock?.resume('time-settings');
    }

    const previousSource = this.currentSource;

    this.currentSource = null;
    this.openerElement = null;

    this.onClose(previousSource);
  }

  updateSectionVisibility(source) {
    const isHud = source === 'hud';
    if (this.sections.language) {
      this.sections.language.hidden = false;
    }
    if (this.sections.tutorial) {
      this.sections.tutorial.hidden = false;
    }
    if (this.sections.gameProgress) {
      this.sections.gameProgress.hidden = !isHud;
    }
    if (this.sections.overheadStatus) {
      this.sections.overheadStatus.hidden = !isHud;
    }
  }
}
