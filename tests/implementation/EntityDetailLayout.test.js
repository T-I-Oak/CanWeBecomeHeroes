import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function readStyleSource(relativePath) {
  const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8');
  return source.replace(/^@import '([^']+)';/gm, (_, importedPath) => readStyleSource(`../../src/${importedPath}`));
}

const STYLE_SOURCE = readStyleSource('../../src/styles.css');

function getStyleRules(selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [...STYLE_SOURCE.matchAll(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`, 'g'))].map((match) => match[1]);
}

test('entity detail columns keep independent heights when equipment adds rows', () => {
  const entityPanelRules = getStyleRules('.InformationWindow__EntityPanel');
  const desktopEntityPanelRule = entityPanelRules.find((rule) => rule.includes('232px'));

  assert.match(desktopEntityPanelRule, /align-items:\s*start;/);
});
