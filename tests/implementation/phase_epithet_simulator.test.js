import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { aggregate, generate } from '../../src/game/EpithetExpansion.js';

test('generated data separates person wrappers from bases and terminates without an enemy', () => {
  const data = JSON.parse(fs.readFileSync(new URL('../../scripts/phase_epithet_simulator_data.json', import.meta.url), 'utf8'));
  assert.equal(data.template, '[person(ally)]');
  for (const side of ['ally', 'enemy']) {
    assert.deepEqual(data.generic.person[side].slice(0, 2), [`[person_base(${side})]`, `[modifier(${side})][person_base(${side})]`]);
  }
  const pool = aggregate([{ source: 'generic', words: data.generic }, { source: 'test', words: { person_base: { ally: ['剣豪'] }, modifier: { ally: ['赤い'] } } }]);
  for (let i = 0; i < 200; i++) {
    const ally = generate('[person(ally)]', pool, data.defaults).text;
    assert.match(ally, /^(赤い)?(剣豪|使い手|使者|守り手)$/);
    assert.match(generate('[person(enemy)]', pool, data.defaults).text, /^(恐るべき)?強敵$/);
  }
});
