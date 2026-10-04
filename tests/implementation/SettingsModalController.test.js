import test from 'node:test';
import assert from 'node:assert/strict';
import SettingsModalController from '../../src/app/SettingsModalController.js';
import TitleMenu from '../../src/app/TitleMenu.js';

function createElement({ tagName = 'div', hidden = false, disabled = false } = {}) {
  const listeners = new Map();
  const attributes = new Map();
  const children = [];
  let parent = null;
  let focused = false;

  const element = {
    tagName: tagName.toUpperCase(),
    hidden,
    disabled,
    attributes,
    children,
    get parentElement() { return parent; },
    set parentElement(p) { parent = p; },
    classList: {
      contains: () => false,
      add() {},
      remove() {},
      toggle() {},
    },
    addEventListener(type, callback) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(callback);
    },
    removeEventListener(type, callback) {
      const list = listeners.get(type);
      if (list) {
        const index = list.indexOf(callback);
        if (index !== -1) list.splice(index, 1);
      }
    },
    dispatch(type, event = {}) {
      const list = listeners.get(type);
      list?.forEach((cb) => cb({ currentTarget: this, target: this, ...event }));
    },
    setAttribute(name, value) { attributes.set(name, String(value)); },
    getAttribute(name) { return attributes.get(name); },
    focus() {
      focused = true;
      if (element.ownerDocument) element.ownerDocument.activeElement = element;
    },
    blur() {
      focused = false;
      if (element.ownerDocument && element.ownerDocument.activeElement === element) {
        element.ownerDocument.activeElement = null;
      }
    },
    get isFocused() { return focused; },
    clearFocus() { focused = false; },
    append(...nodes) {
      for (const node of nodes) {
        children.push(node);
        node.parentElement = element;
      }
    },
    contains(child) {
      if (!child) return false;
      if (child === element) return true;
      return children.some((c) => c.contains?.(child));
    },
    closest(selector) {
      if (selector === '[hidden]' && (element.hidden || attributes.has('hidden'))) return element;
      return parent?.closest?.(selector) ?? null;
    },
    querySelectorAll(selector) {
      const results = [];
      const isMatch = (el) => {
        if (selector.includes('button') && el.tagName === 'BUTTON') return true;
        if (selector.includes('select') && el.tagName === 'SELECT') return true;
        if (selector.includes('input') && el.tagName === 'INPUT') return true;
        return false;
      };
      const traverse = (el) => {
        for (const child of el.children) {
          if (isMatch(child)) results.push(child);
          traverse(child);
        }
      };
      traverse(element);
      return results;
    },
  };

  return element;
}

function createDocument() {
  const listeners = new Map();
  return {
    activeElement: null,
    addEventListener(type, callback) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(callback);
    },
    removeEventListener(type, callback) {
      const list = listeners.get(type);
      if (list) {
        const index = list.indexOf(callback);
        if (index !== -1) list.splice(index, 1);
      }
    },
    dispatch(type, event = {}) {
      const list = listeners.get(type);
      list?.forEach((cb) => cb({ ...event }));
    },
    listenerCount(type) {
      return listeners.get(type)?.length ?? 0;
    },
  };
}

function createClock() {
  return {
    pauseReasons: new Set(),
    pause(reason) { this.pauseReasons.add(reason); },
    resume(reason) { this.pauseReasons.delete(reason); },
  };
}

test('settings modal controller shows only language when opened from menu without pausing clock', () => {
  const modal = createElement({ hidden: true });
  const closeButton = createElement();
  const opener = createElement();
  const clock = createClock();
  const sections = {
    language: createElement({ hidden: true }),
    tutorial: createElement({ hidden: true }),
    gameProgress: createElement({ hidden: true }),
    overheadStatus: createElement({ hidden: true }),
  };
  const closedSelects = [];
  const modalSelect = {
    setOpen(isOpen) { if (!isOpen) closedSelects.push(true); },
  };

  const controller = new SettingsModalController({
    modal,
    closeButton,
    sections,
    clock,
    modalSelects: [modalSelect],
  });

  controller.open('menu', { opener });

  assert.equal(modal.hidden, false);
  assert.equal(sections.language.hidden, false);
  assert.equal(sections.tutorial.hidden, false);
  assert.equal(sections.gameProgress.hidden, true);
  assert.equal(sections.overheadStatus.hidden, true);
  assert.equal(clock.pauseReasons.has('time-settings'), false);
  assert.equal(opener.getAttribute('aria-expanded'), 'true');
  assert.equal(closeButton.isFocused, false);
  assert.equal(closedSelects.length, 1);

  controller.close();

  assert.equal(modal.hidden, true);
  assert.equal(opener.getAttribute('aria-expanded'), 'false');
  assert.equal(opener.isFocused, false);
  assert.equal(clock.pauseReasons.has('time-settings'), false);
  assert.equal(closedSelects.length, 2);
});

test('settings modal controller shows all sections and pauses clock when opened from hud without focusing', () => {
  const modal = createElement({ hidden: true });
  const closeButton = createElement();
  const opener = createElement();
  const clock = createClock();
  const sections = {
    language: createElement({ hidden: true }),
    tutorial: createElement({ hidden: true }),
    gameProgress: createElement({ hidden: true }),
    overheadStatus: createElement({ hidden: true }),
  };

  const controller = new SettingsModalController({
    modal,
    closeButton,
    sections,
    clock,
  });

  controller.open('hud', { opener });

  assert.equal(modal.hidden, false);
  assert.equal(sections.language.hidden, false);
  assert.equal(sections.tutorial.hidden, false);
  assert.equal(sections.gameProgress.hidden, false);
  assert.equal(sections.overheadStatus.hidden, false);
  assert.equal(clock.pauseReasons.has('time-settings'), true);
  assert.equal(opener.getAttribute('aria-expanded'), 'true');
  assert.equal(closeButton.isFocused, false);

  controller.close();

  assert.equal(modal.hidden, true);
  assert.equal(clock.pauseReasons.has('time-settings'), false);
  assert.equal(opener.getAttribute('aria-expanded'), 'false');
  assert.equal(opener.isFocused, false);
});

test('settings modal controller closes on backdrop click without focusing opener', () => {
  const modal = createElement({ hidden: true });
  const closeButton = createElement();
  const opener = createElement();

  const controller = new SettingsModalController({
    modal,
    closeButton,
  });

  controller.open('menu', { opener });
  assert.equal(modal.hidden, false);

  modal.dispatch('click', { target: modal });
  assert.equal(modal.hidden, true);
  assert.equal(opener.isFocused, false);
});

test('title menu delegates settings button click to shared settings controller', () => {
  let openedSource = null;
  let receivedOpener = null;

  const originalDocument = globalThis.document;
  globalThis.document = {
    createElement(tagName) {
      const listeners = new Map();
      const element = {
        tagName,
        className: '',
        textContent: '',
        type: '',
        style: {},
        addEventListener(type, callback) { listeners.set(type, callback); },
        click() { listeners.get('click')?.({ currentTarget: this }); },
        replaceChildren() {},
      };
      return element;
    },
  };

  try {
    const labels = new Map([
      ['startGame', '試験開始'],
      ['records', 'レコード'],
      ['settings', '設定'],
      ['challengeMode', 'チャレンジモード'],
      ['close', '閉じる'],
      ['recordsEmpty', '記録はありません。'],
    ]);

    const container = {
      style: {},
      classList: { add() {}, remove() {} },
      replaceChildren() {},
    };

    const textRepository = {
      getLabel: (key) => labels.get(key) ?? key,
    };

    const heroProgress = {
      hasClearedTrial: () => true,
    };

    const assets = {
      getImage: () => ({}),
    };

    const titleMenu = new TitleMenu(container, {
      textRepository,
      assets,
      heroProgress,
      onOpenSettings: (opener) => {
        openedSource = 'menu';
        receivedOpener = opener;
      },
    });

    // Verify command buttons include challengeMode
    assert.equal(titleMenu.heroProgress.hasClearedTrial(), true);
    titleMenu.menu = globalThis.document.createElement('nav');
    titleMenu.renderMenu();

    const settingsCommand = titleMenu.commands.find((c) => c.label === 'settings');
    assert.ok(settingsCommand, 'Settings command should exist in title menu');
    assert.equal(settingsCommand.element.textContent, '設定');

    const challengeCommand = titleMenu.commands.find((c) => c.label === 'challengeMode');
    assert.ok(challengeCommand, 'Challenge mode command should exist when trial is cleared');
    assert.equal(challengeCommand.element.textContent, 'チャレンジモード');

    // Trigger settings
    settingsCommand.element.click();
    assert.equal(openedSource, 'menu');
    assert.equal(receivedOpener, settingsCommand.element);
  } finally {
    globalThis.document = originalDocument;
  }
});

