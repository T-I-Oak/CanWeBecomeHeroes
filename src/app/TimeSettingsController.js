import { getSpeedFromLog, readTimeSettings, writeTimeSettings } from '../game/GameSpeedSettings.js';

export default class TimeSettingsController {
  constructor({ clock, dataManager, textRepository, getHeroes, elements, onPauseOnInformationChange = () => {} }) {
    this.clock = clock;
    this.dataManager = dataManager;
    this.textRepository = textRepository;
    this.getHeroes = getHeroes;
    this.elements = elements;
    this.onPauseOnInformationChange = onPauseOnInformationChange;
    this.staminaPauseArmed = true;
    this.isAccelerated = false;
    this.settings = readTimeSettings(dataManager);
    this.initializeElements();
    this.bindEvents();
    this.onPauseOnInformationChange(this.pauseOnInformation);
    this.updateClockSpeed();
    this.updateStatus();
  }

  initializeElements() {
    const { speedSlider, pauseOnInformation, pauseOnStaminaFull, accelerateWithoutPreparation } = this.elements;
    speedSlider.value = String(this.settings.speedLog);
    pauseOnInformation.checked = this.settings.pauseOnInformation;
    pauseOnStaminaFull.checked = this.settings.pauseOnStaminaFull;
    accelerateWithoutPreparation.checked = this.settings.accelerateWithoutPreparation;
  }

  bindEvents() {
    const { pauseButton, timeSettings, timeSettingsToggle, speedSlider, pauseOnInformation, pauseOnStaminaFull, accelerateWithoutPreparation } = this.elements;
    pauseButton.addEventListener('click', () => {
      this.clock.togglePaused();
      this.updateStatus();
    });
    timeSettingsToggle.addEventListener('click', () => {
      const isOpen = timeSettings.hidden;
      timeSettings.hidden = !isOpen;
      timeSettingsToggle.setAttribute('aria-expanded', String(isOpen));
      if (isOpen) this.clock.pause('time-settings');
      else this.clock.resume('time-settings');
      this.updateStatus();
    });
    speedSlider.addEventListener('input', (event) => {
      this.settings.speedLog = Number(event.currentTarget.value);
      speedSlider.value = String(this.settings.speedLog);
      this.save();
      this.updateClockSpeed();
      this.updateStatus();
    });
    pauseOnInformation.addEventListener('change', () => {
      this.onPauseOnInformationChange(this.pauseOnInformation);
      this.save();
      this.updateStatus();
    });
    pauseOnStaminaFull.addEventListener('change', () => {
      this.save();
      this.updateStaminaPause();
      this.updateStatus();
    });
    accelerateWithoutPreparation.addEventListener('change', () => {
      this.save();
      this.updateClockSpeed();
      this.updateStatus();
    });
  }

  get pauseOnInformation() {
    return this.elements.pauseOnInformation.checked;
  }

  updateClockSpeed() {
    this.isAccelerated = this.elements.accelerateWithoutPreparation.checked
      && !this.getHeroes().some((hero) => hero.currentArea === 'preparation');
    this.clock.setSpeed(getSpeedFromLog(this.settings.speedLog) * (this.isAccelerated ? 2 : 1));
  }

  updateStaminaPause() {
    if (!this.elements.pauseOnStaminaFull.checked) {
      this.staminaPauseArmed = true;
      this.clock.resume('stamina-full');
      return;
    }
    const hasFullPreparationCompanion = this.getHeroes()
      .some((hero) => hero.currentArea === 'preparation' && hero.stamina >= hero.maximums.stamina);
    if (!hasFullPreparationCompanion) {
      this.staminaPauseArmed = true;
      this.clock.resume('stamina-full');
    } else if (this.staminaPauseArmed) this.clock.pause('stamina-full');
  }

  releaseStaminaPause() {
    this.staminaPauseArmed = false;
    this.clock.resume('stamina-full');
    this.updateStatus();
  }

  updateStatus() {
    const { pauseButton, timeStatus } = this.elements;
    const autoPaused = this.clock.pauseReasons.has('stamina-full') || this.clock.pauseReasons.has('information-window');
    const settingsPaused = this.clock.pauseReasons.has('time-settings');
    const status = this.textRepository.getLabel(this.clock.paused || settingsPaused ? 'paused' : autoPaused ? 'autoPaused' : this.isAccelerated ? 'accelerated' : 'running');
    const state = this.clock.paused || settingsPaused ? 'state-paused' : autoPaused ? 'state-auto-paused' : this.isAccelerated ? 'state-accelerated' : 'state-running';
    timeStatus.textContent = status;
    timeStatus.className = `HudPanel__Status ${state}`;
    pauseButton.textContent = this.textRepository.getLabel(this.clock.paused ? 'resume' : 'pause');
  }

  save() {
    this.settings = writeTimeSettings({
      speedLog: this.settings.speedLog,
      pauseOnInformation: this.elements.pauseOnInformation.checked,
      pauseOnStaminaFull: this.elements.pauseOnStaminaFull.checked,
      accelerateWithoutPreparation: this.elements.accelerateWithoutPreparation.checked,
    }, this.dataManager);
  }
}
