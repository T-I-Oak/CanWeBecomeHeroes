import {
  OVERHEAD_STATUS_KEYS,
  OVERHEAD_STATUS_VISIBILITY,
  readOverheadStatusSettings,
  writeOverheadStatusSettings,
} from '../game/OverheadStatusSettings.js';

export default class OverheadStatusSettingsController {
  constructor({ dataManager, textRepository, elements }) {
    this.dataManager = dataManager;
    this.textRepository = textRepository;
    this.elements = elements;
    this.settings = readOverheadStatusSettings(dataManager);
    this.initializeElements();
    this.bindEvents();
  }

  initializeElements() {
    this.elements.statuses.forEach((input) => {
      input.checked = this.settings.statuses.includes(input.value);
    });
    this.elements.visibility.value = this.settings.visibility;
    this.refreshLabels();
  }

  bindEvents() {
    this.elements.statuses.forEach((input) => input.addEventListener('change', () => this.save()));
    this.elements.visibility.addEventListener('change', () => this.save());
  }

  getSettings() {
    return this.settings;
  }

  refreshLabels() {
    this.elements.statusLabels.forEach((label) => {
      label.textContent = this.textRepository.getName('status', label.dataset.overheadStatus);
    });
  }

  save() {
    const statuses = OVERHEAD_STATUS_KEYS.filter((status) => this.elements.statuses
      .some((input) => input.value === status && input.checked));
    this.settings = writeOverheadStatusSettings({
      statuses,
      visibility: this.elements.visibility.value === OVERHEAD_STATUS_VISIBILITY.battle
        ? OVERHEAD_STATUS_VISIBILITY.battle
        : OVERHEAD_STATUS_VISIBILITY.always,
    }, this.dataManager);
  }
}
