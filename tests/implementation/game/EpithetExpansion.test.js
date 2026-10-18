import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { aggregate, generate } from '../../../src/game/EpithetExpansion.js';

test('production expansion combines selected sources and filters ally, enemy, common and unfiltered requests', () => {
  const pool = aggregate([{ source: 'tag', words: { person: { ally: ['A'], enemy: ['E'], common: ['C'] } } }]);
  for (const [filter, expected] of [['ally', ['A', 'C']], ['enemy', ['E', 'C']], ['common', ['C']], ['', ['A', 'E', 'C']]]) {
    const outputs = [0, 0.49, 0.99].map(value => generate(`[person${filter ? `(${filter})` : ''}]`, pool, {}, { random: () => value }).text);
    assert.ok(outputs.every(value => expected.includes(value)));
  }
});

test('defaults compose actions only when actionPerson has no regular candidate', () => {
  const defaults = { 'actionPerson(enemy)': ['[action(enemy)][person(ally)]'] };
  const pool = aggregate([{ source: 'sword', words: { action: { enemy: ['を討つ'] }, person: { ally: ['剣豪'] } } }]);
  assert.equal(generate('[actionPerson(enemy)]', pool, defaults).text, 'を討つ剣豪');
  const specific = aggregate([{ source: 'valor', words: { actionPerson: { enemy: ['キラー'] } } }]);
  assert.equal(generate('[actionPerson(enemy)]', specific, defaults).text, 'キラー');
});

test('depth limit selects terminal candidates and preserves template whitespace', () => {
  const pool = aggregate([{ source: 'generic', words: { modifier: { ally: ['赤い'] }, person: { ally: ['[modifier(ally)][person(ally)]', '勇者'] } } }]);
  const result = generate('[person(ally)] アヴェリー', pool, {}, { random: () => 0, maxDepth: 2 });
  assert.equal(result.text, '赤い赤い勇者 アヴェリー');
  assert.ok(result.trace.some(item => item.terminal));
});

test('arbitrary keywords work and unresolved or nonterminating rules report errors', () => {
  const pool = aggregate([{ source: 'custom', words: { special: { common: ['星'] }, loop: { ally: ['[loop(ally)]'] } } }]);
  assert.equal(generate('[special]', pool, {}).text, '星');
  assert.throws(() => generate('[missing(ally)]', pool, {}), /候補がありません/);
  assert.throws(() => generate('[loop(ally)]', pool, {}, { maxDepth: 1 }), /終端/);
});

test('generated data separates person wrappers from bases and terminates without an enemy', () => {
  const data = JSON.parse(fs.readFileSync(new URL('../../../public/data/epithet.json', import.meta.url), 'utf8'));
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

test('enemy construction terminates through person bases without returning to person', () => {
  const data = JSON.parse(fs.readFileSync(new URL('../../../public/data/epithet.json', import.meta.url), 'utf8'));
  assert.deepEqual(data.defaults['actionPerson(enemy)'], ['[action(enemy)][person_base(ally)]', '[action(enemy)][modifier(ally)][person_base(ally)]']);
  const pool = aggregate([
    { source: 'generic', words: data.generic },
    { source: 'sword', words: { person_base: { ally: ['剣豪'] }, modifier: { ally: ['不屈の'] }, action: { enemy: ['を討つ'] } } },
    { source: 'goblin', words: { person_base: { enemy: ['ゴブリン'] }, person: { ally: ['[person_base(enemy)][actionPerson(enemy)]'] } } },
  ]);
  const result = generate('[person(ally)]', pool, data.defaults, { random: () => 0.999 });
  assert.equal(result.text, 'ゴブリンを討つ不屈の剣豪');
  assert.equal(result.trace.filter(item => item.key === 'person(ally)').length, 1);
  assert.ok(result.trace.every(item => item.depth <= 4));
});

test('outer recursive modifiers are allowed even when expansion places them before the enemy', () => {
  const pool = aggregate([
    { source: 'valor', words: { actionPerson: { enemy: ['キラー'] } } },
    { source: 'battle', words: { modifier: { ally: ['歴戦の'] } } },
    { source: 'goblin', words: { person_base: { enemy: ['ゴブリン'] }, person: { ally: ['[modifier(ally)][person(ally)]', '[person_base(enemy)][actionPerson(enemy)]'] } } },
  ]);
  const choices = [0, 0, .999];
  const result = generate('[person(ally)]', pool, {}, { random: () => choices.shift() ?? 0 });
  assert.equal(result.text, '歴戦のゴブリンキラー');
  assert.equal(result.trace.filter(item => item.key === 'modifier(ally)').length, 1);
  assert.equal(result.trace.filter(item => item.key === 'person(ally)').length, 2);
});
