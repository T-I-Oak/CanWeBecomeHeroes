import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const STYLE_SOURCE = readFileSync(new URL('../../src/styles.css', import.meta.url), 'utf8');

function getStyleRules(selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [...STYLE_SOURCE.matchAll(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`, 'g'))].map((match) => match[1]);
}

test('entity detail columns keep independent heights when equipment adds rows', () => {
  const entityPanelRules = getStyleRules('.InformationWindow__EntityPanel');
  const desktopEntityPanelRule = entityPanelRules.find((rule) => rule.includes('232px'));

  assert.match(desktopEntityPanelRule, /align-items:\s*start;/);
});
