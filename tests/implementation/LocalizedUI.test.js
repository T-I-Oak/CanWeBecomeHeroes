import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import gameText from '../../src/game/readGameText.js';
import { expandLanguageResource, setLanguage } from '../../../GameWorksOAK/src/lib/core/i18n.js';
import GameTextRepository, { textPart } from '../../src/game/GameTextRepository.js';
import GameLog from '../../src/game/GameLog.js';
import FlowLog from '../../src/app/FlowLog.js';
import CombatEffectSystem from '../../src/game/CombatEffectSystem.js';
import { refreshLocalizedUI } from '../../src/app/LocalizedUI.js';
import { createLogMessageParts } from '../../src/game/LogPresentation.js';
import { drawGuildPanel } from '../../src/app/GuildPanel.js';

test('markup localization attributes reference defined UI labels', async () => {
  const markup = await readFile(new URL('../../index.html', import.meta.url), 'utf8');
  const texts = await new GameTextRepository({ loadResource: async (path) => textPart(expandLanguageResource(gameText), path) }).load();
  const labelIds = [...markup.matchAll(/data-ui(?:-aria)?="([^"]+)"/g)].map(([, id]) => id);

  labelIds.forEach((id) => assert.doesNotThrow(() => texts.getLabel(id)));
});

test('log references keep an icon path and identity for a later history link', async () => {
  setLanguage('ja');
  const texts = await new GameTextRepository({ loadResource: async (path) => textPart(expandLanguageResource(gameText), path) }).load();
  const parts = createLogMessageParts(texts, {
    key: 'logDamage',
    values: {
      actor: { kind: 'hero', heroId: 'Avery', profession: 'swordfighter', framed: true },
      target: { kind: 'enemy', id: 'small-valor', framed: true },
      damage: 125,
    },
  });
  const actor = parts.find((part) => part.kind === 'hero');
  const target = parts.find((part) => part.kind === 'enemy');
  assert.equal(actor.id, 'Avery');
  assert.match(actor.iconPath, /swoardfighter\.png$/);
  assert.equal(target.id, 'small-valor');
  assert.match(target.iconPath, /small-valor\.png$/);
  assert.equal(parts.some((part) => part.type === 'text' && part.value.includes('125')), true);
});

test('UI and historical log text follow language changes without replacing state', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const storage = new Map();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  } });
  try {
    setLanguage('ja');
    const texts = await new GameTextRepository({ loadResource: async (path) => textPart(expandLanguageResource(gameText), path) }).load();
    const log = new GameLog({ textRepository: texts, now: () => 123 });
    const event = { key: 'logDamage', values: {
      actor: { kind: 'hero', heroId: 'Avery', profession: 'swordfighter', framed: true },
      target: { kind: 'enemy', id: Object.keys(gameText.information.enemy)[0], framed: true },
      damage: 125,
    } };
    const record = log.logLocalized(event);
    const japanese = log.getMessage(record);
    event.values.damage = 999;
    const caption = { dataset: { ui: 'settings' }, textContent: '' };
    const control = { dataset: { uiAria: 'controls' }, checked: true, setAttribute(key, value) { this[key] = value; } };
    const root = { querySelectorAll: selector => selector === '[data-ui]' ? [caption] : [control] };
    refreshLocalizedUI(root, texts);
    assert.equal(caption.textContent, '設定');
    const flow = new FlowLog({}, log);
    const visibleText = { textContent: japanese };
    const animationNode = {};
    flow.visibleEntries.set(animationNode, { text: visibleText, record });
    setLanguage('en');
    await texts.refreshLanguage();
    refreshLocalizedUI(root, texts);
    flow.refreshLanguage();
    assert.equal(caption.textContent, 'Settings');
    assert.equal(control['aria-label'], 'Game controls');
    assert.equal(control.checked, true);
    assert.match(visibleText.textContent, /dealt 125 damage/);
    assert.match(visibleText.textContent, /Avery/);
    assert.equal(flow.visibleEntries.has(animationNode), true);
    assert.equal(log.getRecords()[0], record);
    assert.equal(record.timestamp, 123);
    const drawn = [];
    const context = new Proxy({ fillText: text => drawn.push(text), measureText: text => ({ width: text.length * 6 }) }, {
      get: (target, key) => target[key] ?? (() => {}),
    });
    drawGuildPanel(context, { textRepository: texts, stageNumber: 1, tick: 0, contributionPoints: 0 });
    assert.ok(drawn.includes('Time left'));
    assert.ok(drawn.join('').includes('7d 0h'));
    const effects = new CombatEffectSystem({ textRepository: texts });
    effects.damage({ chip: { x: 0, y: 0, height: 0, radius: 10 } }, 0.3, true);
    effects.update(0.1);
    const popup = effects.popups[0];
    effects.draw(context);
    assert.ok(drawn.includes('critical 30'));
    setLanguage('ja');
    await texts.refreshLanguage();
    effects.draw(context);
    assert.ok(drawn.includes('Critical 30'));
    assert.equal(effects.popups[0], popup);
    assert.equal(popup.elapsed, 0.1);
    flow.refreshLanguage();
    assert.equal(visibleText.textContent, japanese);
    flow.unsubscribe();
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  }
});
