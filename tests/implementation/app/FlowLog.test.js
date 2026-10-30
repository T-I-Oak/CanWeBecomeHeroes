import test from 'node:test';
import assert from 'node:assert/strict';
import FlowLog from '../../../src/app/FlowLog.js';
import GameLog from '../../../src/game/GameLog.js';

test('flow duration preserves subject/level timing, random endpoints and channel positions without style reads', () => {
  const oldDocument = globalThis.document;
  const oldFrame = globalThis.requestAnimationFrame;
  const element = () => ({
    children: [], style: { values: {}, setProperty(key, value) { this.values[key] = value; } },
    dataset: {}, classList: { add() {} }, setAttribute() {}, addEventListener() {},
    append(child) { this.children.push(child); },
  });
  globalThis.document = { createElement: element };
  globalThis.requestAnimationFrame = callback => callback();
  try {
    const container = element();
    const log = new GameLog();
    const flow = new FlowLog(container, log);
    const levels = { hero: [6000, 9000, 7000, 6000], enemy: [6000, 9000, 7000, 6000], system: [6000, 9000, 7000, 10000] };
    for (const [subject, durations] of Object.entries(levels)) {
      for (const [index, level] of ['info', 'luck', 'unluck', 'warning'].entries()) {
        for (const random of [0, .5, 1]) for (const channel of ['battle', 'ex-skill', 'event']) {
          flow.random = () => random;
          log.log('message', { subject, level, channel });
          const { values } = container.children.at(-1).style;
          assert.equal(values['--flow-duration-adjusted'], `${durations[index] * (.85 + random * .3)}ms`);
          assert.equal(values['--flow-y'], `${(channel === 'event' ? 56 : 12) + 32 * random}%`);
        }
      }
    }
    const before = container.children.length;
    log.log('history only', { notify: false });
    assert.equal(container.children.length, before);
    assert.equal(log.getRecords().length, before + 1);
  } finally {
    globalThis.document = oldDocument;
    globalThis.requestAnimationFrame = oldFrame;
  }
});
