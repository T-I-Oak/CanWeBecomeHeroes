import test from 'node:test';
import assert from 'node:assert/strict';
import TimeSettingsController from '../../src/app/TimeSettingsController.js';

function createSpeedRange() {
  const nodes = {
    '.SpeedRange__Fill--normal': { style: {} },
    '.SpeedRange__Fill--accelerated': { style: {} },
    '.SpeedRange__Thumb--normal': { style: {} },
    '.SpeedRange__Thumb--accelerated': { style: {} },
  };
  return { querySelector: (selector) => nodes[selector], addEventListener() {} };
}

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
    acceleratedSpeedLog: 1,
    pauseOnInformation: true,
    pauseOnStaminaFull: true,
    accelerateWithoutPreparation: true,
  }]]);
  const dataManager = { getValue: (key) => values.get(key), setValue: (key, value) => values.set(key, value) };
  const clock = createClock();
  const elements = {
    pauseButton: createElement(),
    timeStatus: createElement(),
    speedRange: createSpeedRange(),
    speedSlider: createElement({ value: '0' }),
    acceleratedSpeedSlider: createElement({ value: '1' }),
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

test('an empty preparation area uses the accelerated speed thumb', () => {
  const values = new Map([['timeSettings', {
    speedLog: 0,
    acceleratedSpeedLog: 1,
    pauseOnInformation: true,
    pauseOnStaminaFull: false,
    accelerateWithoutPreparation: true,
  }]]);
  const dataManager = { getValue: (key) => values.get(key), setValue() {} };
  const clock = createClock();
  const elements = {
    pauseButton: createElement(),
    timeStatus: createElement(),
    timeSettings: createElement({ hidden: true }),
    timeSettingsToggle: createElement(),
    timeSettingsClose: createElement(),
    speedRange: createSpeedRange(),
    speedSlider: createElement({ value: '0' }),
    acceleratedSpeedSlider: createElement({ value: '1' }),
    pauseOnInformation: createElement(),
    pauseOnStaminaFull: createElement(),
    accelerateWithoutPreparation: createElement({ checked: true }),
  };
  new TimeSettingsController({
    clock,
    dataManager,
    textRepository: { getLabel: (key) => key },
    getHeroes: () => [],
    elements,
  });

  assert.equal(clock.speed, 2);
  elements.acceleratedSpeedSlider.value = '2';
  elements.acceleratedSpeedSlider.dispatch('input');
  assert.equal(clock.speed, 4);
});

function createThumb(rect) {
  const classes = new Set();
  return {
    style: {},
    classList: {
      toggle(name, force) { if (force) classes.add(name); else classes.delete(name); },
      remove(name) { classes.delete(name); },
      contains(name) { return classes.has(name); },
    },
    getBoundingClientRect: () => rect,
  };
}

test('an aborted speed drag does not send the thumb to the left end', () => {
  const listeners = new Map();
  const nodes = {
    '.SpeedRange__Fill--normal': { style: {} },
    '.SpeedRange__Fill--accelerated': { style: {} },
    '.SpeedRange__Thumb--normal': createThumb({ left: 292, right: 308 }),
    '.SpeedRange__Thumb--accelerated': createThumb({ left: 392, right: 408 }),
    '.SpeedRange__Track': { getBoundingClientRect: () => ({ left: 200, width: 300 }) },
  };
  const speedRange = {
    querySelector: (selector) => nodes[selector],
    addEventListener(type, callback) { listeners.set(type, callback); },
    removeEventListener(type) { listeners.delete(type); },
    setPointerCapture() {},
  };
  const elements = {
    pauseButton: createElement(),
    timeStatus: createElement(),
    timeSettings: createElement({ hidden: true }),
    timeSettingsToggle: createElement(),
    timeSettingsClose: createElement(),
    speedRange,
    speedSlider: createElement({ value: '0' }),
    acceleratedSpeedSlider: createElement({ value: '1' }),
    pauseOnInformation: createElement(),
    pauseOnStaminaFull: createElement(),
    accelerateWithoutPreparation: createElement(),
  };
  new TimeSettingsController({
    clock: createClock(),
    dataManager: { getValue: () => undefined, setValue() {} },
    textRepository: { getLabel: (key) => key },
    getHeroes: () => [],
    elements,
  });
  const pointerDown = { button: 0, pointerId: 1, clientX: 300, clientY: 40, type: 'pointerdown', preventDefault() { this.defaultPrevented = true; } };

  listeners.get('pointerdown')(pointerDown);
  assert.equal(nodes['.SpeedRange__Thumb--normal'].classList.contains('is-raised'), true);
  listeners.get('pointercancel')({ type: 'pointercancel', clientX: 0, clientY: 0 });

  assert.equal(pointerDown.defaultPrevented, true);
  assert.equal(elements.speedSlider.value, '0');
  assert.equal(elements.acceleratedSpeedSlider.value, '1');
  assert.equal(nodes['.SpeedRange__Thumb--normal'].classList.contains('is-raised'), false);
  assert.equal(nodes['.SpeedRange__Thumb--accelerated'].classList.contains('is-raised'), false);

  listeners.get('pointerdown')({ button: 0, pointerId: 1, clientX: 400, clientY: 40, type: 'pointerdown', preventDefault() {} });
  assert.equal(nodes['.SpeedRange__Thumb--accelerated'].classList.contains('is-raised'), true);
  assert.equal(nodes['.SpeedRange__Thumb--normal'].classList.contains('is-raised'), false);
  listeners.get('pointerup')({ type: 'pointerup', clientX: 400, clientY: 40 });
  assert.equal(nodes['.SpeedRange__Thumb--accelerated'].classList.contains('is-raised'), false);
});

function createOverlappedSpeedController() {
  const listeners = new Map();
  const nodes = {
    '.SpeedRange__Fill--normal': { style: {} },
    '.SpeedRange__Fill--accelerated': { style: {} },
    '.SpeedRange__Thumb--normal': createThumb({ left: 292, right: 308 }),
    '.SpeedRange__Thumb--accelerated': createThumb({ left: 292, right: 308 }),
    '.SpeedRange__Track': { getBoundingClientRect: () => ({ left: 200, width: 300 }) },
  };
  const elements = {
    pauseButton: createElement(),
    timeStatus: createElement(),
    timeSettings: createElement({ hidden: true }),
    timeSettingsToggle: createElement(),
    timeSettingsClose: createElement(),
    speedRange: {
      querySelector: (selector) => nodes[selector],
      addEventListener(type, callback) { listeners.set(type, callback); },
      removeEventListener(type) { listeners.delete(type); },
      setPointerCapture() {},
    },
    speedSlider: createElement({ value: '0' }),
    acceleratedSpeedSlider: createElement({ value: '0' }),
    pauseOnInformation: createElement(),
    pauseOnStaminaFull: createElement(),
    accelerateWithoutPreparation: createElement(),
  };
  new TimeSettingsController({
    clock: createClock(),
    dataManager: {
      getValue: () => ({ speedLog: 0, acceleratedSpeedLog: 0, pauseOnInformation: true, pauseOnStaminaFull: false, accelerateWithoutPreparation: false }),
      setValue() {},
    },
    textRepository: { getLabel: (key) => key },
    getHeroes: () => [],
    elements,
  });
  return { elements, drag(from, to) {
    listeners.get('pointerdown')({ button: 0, pointerId: 1, clientX: from, clientY: 40, type: 'pointerdown', preventDefault() {} });
    listeners.get('pointermove')({ type: 'pointermove', clientX: to, clientY: 40 });
  } };
}

test('overlapping speed thumbs slide right with the accelerated thumb', () => {
  const { elements, drag } = createOverlappedSpeedController();
  drag(300, 400);
  assert.equal(elements.speedSlider.value, '0');
  assert.equal(elements.acceleratedSpeedSlider.value, '1');
});

test('overlapping speed thumbs slide left with the normal thumb', () => {
  const { elements, drag } = createOverlappedSpeedController();
  drag(300, 250);
  assert.equal(elements.speedSlider.value, '-0.5');
  assert.equal(elements.acceleratedSpeedSlider.value, '0');
});
