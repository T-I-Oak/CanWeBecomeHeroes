import test from 'node:test';
import assert from 'node:assert/strict';
import { drawGuildPanel } from '../../src/app/GuildPanel.js';
import GameTextRepository from '../../src/game/GameTextRepository.js';
import { readGameText } from '../../src/game/readGameText.js';

function createContext() {
  return {
    labels: [], fills: [], clips: [], moves: [],
    save() {}, restore() {}, beginPath() {}, roundRect() {}, fill() {}, stroke() {},
    clip() {}, rect(x, y, width, height) { this.clips.push({ x, y, width, height }); }, closePath() {},
    fillRect(x, y, width, height) { this.fills.push({ x, y, width, height, color: this.fillStyle }); },
    moveTo(x, y) { this.moves.push({ x, y }); }, lineTo() {},
    measureText(text) { return { width: text.length * 8 }; },
    fillText(text, x, y) { this.labels.push({ text, x, y, align: this.textAlign, font: this.font, baseline: this.textBaseline, color: this.fillStyle }); },
  };
}

test('guild panel follows trial progress and current localized labels on every draw', () => {
  const raw = readGameText();
  const texts = new GameTextRepository();
  const options = { tick: 0, contributionPoints: 10, extensionHours: 0, extensionRate: 0.2, textRepository: texts };
  for (const [language, number, expected] of [['ja', 1, '第1試験'], ['ja', 7, '第7試験'], ['en', 7, 'Trial 7'], ['en', 14, 'Trial 14']]) {
    texts.resource = { ui: Object.fromEntries(Object.entries(raw.ui).map(([key, value]) => [key, value['lang-store'][language]])) };
    const context = createContext();
    const status = drawGuildPanel(context, { ...options, stageNumber: number });
    const lines = Map.groupBy(context.labels, ({ y }) => y);
    const stageLine = [...lines.values()].find((line) => line.map(({ text }) => text).join('') === expected);
    const stage = stageLine?.find(({ text }) => text === String(number));
    const remaining = context.labels.find(({ text }) => text === texts.getLabel('remaining'));
    assert.ok(stage, `${language}: trial ${number}`);
    assert.equal(stage.font, 'bold 36px system-ui');
    assert.ok(stage.y > remaining.y);
    assert.ok(stage.x > remaining.x);
    assert.equal(status.remainingHours, 168);
    const contribution = context.labels.find(({ text }) => text === texts.getLabel('contribution'));
    const extension = context.labels.find(({ text, y }) => text === texts.getLabel('extension') && y === contribution.y);
    assert.ok(contribution.x < extension.x);
    assert.equal(extension.color, '#f0c879');
    const band = context.fills.find(({ height, color }) => height === 44 && color === '#49355f');
    const progress = context.fills.find(({ height, color }) => height === 44 && color === '#71509d');
    assert.equal(progress.width, band.width * Math.min(1, number / 7));
    const animated = createContext();
    drawGuildPanel(animated, { ...options, stageNumber: number, animationTime: 0.5 });
    assert.notDeepEqual(animated.moves, context.moves);
    const elapsed = context.labels.find(({ text }) => text === texts.getLabel('elapsed'));
    const deadlineNumber = context.labels.find(({ font }) => font === 'bold 42px system-ui');
    const deadlineLine = lines.get(deadlineNumber.y).filter(({ x }) => x < elapsed.x);
    assert.ok(deadlineLine.every(({ baseline }) => baseline === 'alphabetic'));
    assert.equal(deadlineLine.map(({ text }) => text).join(''), texts.getLabel('daysHours', { days: 7, hours: 0 }));
    assert.ok(deadlineLine.filter(({ text }) => /^\d+$/.test(text)).every(({ font }) => font === 'bold 42px system-ui'));
    assert.ok(deadlineLine.filter(({ text }) => !/^\d+$/.test(text)).every(({ font }) => font === 'bold 13px system-ui'));
    for (const key of ['elapsed', 'contribution', 'extension']) {
      const row = context.labels.find(({ text }) => text === texts.getLabel(key));
      assert.ok(row);
      assert.ok(row.y >= remaining.y && row.y < stage.y);
      if (key === 'elapsed') {
        assert.equal(row.y, remaining.y);
        assert.ok(row.x > remaining.x);
      }
    }
  }
});
