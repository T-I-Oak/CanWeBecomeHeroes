import test from 'node:test';
import assert from 'node:assert/strict';
import TimeSettingsController from '../../src/app/TimeSettingsController.js';

function createElement({ hidden = false, checked = false, value = '' } = {}) {
  const listeners = new Map();
  return {
    hidden,
    checked,
    value,
    className: '',
    textContent: '',
    addEventListener(type, callback) { listeners.set(type, callback); },
    dispatch(type) { listeners.get(type)({ currentTarget: this }); },
    setAttribute() {},
  };
}

function createClock() {
  return {
    paused: false,
    pauseReasons: new Set(),
    speed: null,
    setSpeed(speed) { this.speed = speed; },
    pause(reason) { this.pauseReasons.add(reason); },
    resume(reason) { this.pauseReasons.delete(reason); },
    togglePaused() { this.paused = !this.paused; },
  };
}

test('time settings controller owns persisted controls and stamina pause state', () => {
  const values = new Map([['timeSettings', {
    speedLog: 0,
    pauseOnInformation: true,
    pauseOnStaminaFull: true,
    accelerateWithoutPreparation: true,
  }]]);
  const dataManager = { getValue: (key) => values.get(key), setValue: (key, value) => values.set(key, value) };
  const clock = createClock();
  const elements = {
    pauseButton: createElement(),
    timeStatus: createElement(),
    timeSettings: createElement({ hidden: true }),
    timeSettingsToggle: createElement(),
    speedSlider: createElement(),
    pauseOnInformation: createElement(),
    pauseOnStaminaFull: createElement({ checked: true }),
    accelerateWithoutPreparation: createElement({ checked: true }),
  };
  const hero = { currentArea: 'preparation', stamina: 3, maximums: { stamina: 3 } };
  const controller = new TimeSettingsController({
    clock,
    dataManager,
    textRepository: { getLabel: (key) => key },
    getHeroes: () => [hero],
    elements,
  });

  controller.updateStaminaPause();
  assert.equal(clock.pauseReasons.has('stamina-full'), true);
  controller.releaseStaminaPause();
  assert.equal(clock.pauseReasons.has('stamina-full'), false);
  elements.speedSlider.value = '1';
  elements.speedSlider.dispatch('input');
  assert.equal(values.get('timeSettings').speedLog, 1);
  assert.equal(clock.speed, 2);
});
