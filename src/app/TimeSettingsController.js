import { coupleSpeedLogs, getSpeedFromLog, ratioToSpeedLog, readTimeSettings, speedLogToRatio, writeTimeSettings } from '../game/GameSpeedSettings.js';

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
    const { pauseOnInformation, pauseOnStaminaFull, accelerateWithoutPreparation } = this.elements;
    this.#paintSpeedRange(this.settings);
    pauseOnInformation.checked = this.settings.pauseOnInformation;
    pauseOnStaminaFull.checked = this.settings.pauseOnStaminaFull;
    accelerateWithoutPreparation.checked = this.settings.accelerateWithoutPreparation;
  }

  bindEvents() {
    const { pauseButton, speedRange, speedSlider, acceleratedSpeedSlider, pauseOnInformation, pauseOnStaminaFull, accelerateWithoutPreparation } = this.elements;
    pauseButton.addEventListener('click', () => {
      this.clock.togglePaused();
      this.updateStatus();
    });
    speedSlider.addEventListener('input', () => this.#setSpeedLogs({ speedLog: speedSlider.value, acceleratedSpeedLog: acceleratedSpeedSlider.value }, 'normal'));
    acceleratedSpeedSlider.addEventListener('input', () => this.#setSpeedLogs({ speedLog: speedSlider.value, acceleratedSpeedLog: acceleratedSpeedSlider.value }, 'accelerated'));
    speedRange.addEventListener('pointerdown', (event) => this.#beginSpeedDrag(event));
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
    const speedLog = this.isAccelerated ? this.settings.acceleratedSpeedLog : this.settings.speedLog;
    this.clock.setSpeed(getSpeedFromLog(speedLog));
  }

  #setSpeedLogs(logs, moved) {
    this.settings = { ...this.settings, ...coupleSpeedLogs({ ...logs, moved }) };
    this.#paintSpeedRange(this.settings);
    this.save();
    this.updateClockSpeed();
    this.updateStatus();
  }

  #paintSpeedRange({ speedLog, acceleratedSpeedLog }) {
    const { speedRange, speedSlider, acceleratedSpeedSlider } = this.elements;
    const normalRatio = speedLogToRatio(speedLog);
    const acceleratedRatio = speedLogToRatio(acceleratedSpeedLog);
    speedSlider.value = String(speedLog);
    acceleratedSpeedSlider.value = String(acceleratedSpeedLog);
    speedRange.querySelector('.SpeedRange__Fill--normal').style.width = `${normalRatio * 100}%`;
    const acceleratedFill = speedRange.querySelector('.SpeedRange__Fill--accelerated');
    acceleratedFill.style.left = `${normalRatio * 100}%`;
    acceleratedFill.style.width = `${(acceleratedRatio - normalRatio) * 100}%`;
    speedRange.querySelector('.SpeedRange__Thumb--normal').style.left = `${normalRatio * 100}%`;
    speedRange.querySelector('.SpeedRange__Thumb--accelerated').style.left = `${acceleratedRatio * 100}%`;
  }

  #beginSpeedDrag(event) {
    if (event.button !== 0) return;
    event.preventDefault();
    const { speedRange, speedSlider, acceleratedSpeedSlider } = this.elements;
    const bounds = speedRange.querySelector('.SpeedRange__Track').getBoundingClientRect();
    const valueAt = (clientX) => ratioToSpeedLog((clientX - bounds.left) / bounds.width);
    let moved = null;
    const apply = (clientX) => {
      const pointerLog = valueAt(clientX);
      const normal = Number(speedSlider.value);
      const accelerated = Number(acceleratedSpeedSlider.value);
      if (!moved) {
        if (normal === accelerated && pointerLog === normal) return;
        moved = normal === accelerated
          ? (pointerLog > normal ? 'accelerated' : 'normal')
          : (Math.abs(pointerLog - normal) <= Math.abs(pointerLog - accelerated) ? 'normal' : 'accelerated');
      }
      this.#setSpeedLogs({
        speedLog: moved === 'normal' ? pointerLog : normal,
        acceleratedSpeedLog: moved === 'accelerated' ? pointerLog : accelerated,
      }, moved);
      this.#raiseSpeedThumb(moved);
    };
    const move = (moveEvent) => apply(moveEvent.clientX);
    const finish = (endEvent) => {
      speedRange.removeEventListener('pointermove', move);
      speedRange.removeEventListener('pointerup', finish);
      speedRange.removeEventListener('pointercancel', finish);
      if (endEvent.type !== 'pointercancel') apply(endEvent.clientX);
      this.#clearRaisedSpeedThumb();
    };
    apply(event.clientX);
    speedRange.setPointerCapture?.(event.pointerId);
    speedRange.addEventListener('pointermove', move);
    speedRange.addEventListener('pointerup', finish);
    speedRange.addEventListener('pointercancel', finish);
  }

  #raiseSpeedThumb(moved) {
    const { speedRange } = this.elements;
    speedRange.querySelector('.SpeedRange__Thumb--normal').classList.toggle('is-raised', moved === 'normal');
    speedRange.querySelector('.SpeedRange__Thumb--accelerated').classList.toggle('is-raised', moved === 'accelerated');
  }

  #clearRaisedSpeedThumb() {
    const { speedRange } = this.elements;
    speedRange.querySelector('.SpeedRange__Thumb--normal').classList.remove('is-raised');
    speedRange.querySelector('.SpeedRange__Thumb--accelerated').classList.remove('is-raised');
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
      acceleratedSpeedLog: this.settings.acceleratedSpeedLog,
      pauseOnInformation: this.elements.pauseOnInformation.checked,
      pauseOnStaminaFull: this.elements.pauseOnStaminaFull.checked,
      accelerateWithoutPreparation: this.elements.accelerateWithoutPreparation.checked,
    }, this.dataManager);
  }
}
