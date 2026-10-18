import test from 'node:test';
import assert from 'node:assert/strict';
import Achievements from '../../../src/game/Achievements.js';
import { ACHIEVEMENT_DEFINITIONS, FIFTEEN_LEVELS, SEVEN_LEVELS } from '../../../src/game/AchievementDefinitions.js';
import GameStatistics from '../../../src/game/GameStatistics.js';
import StatisticsCollector from '../../../src/game/StatisticsCollector.js';
import GuildSystem from '../../../src/game/GuildSystem.js';
import HeroFactory from '../../../src/game/HeroFactory.js';
import RunRecordsRepository from '../../../src/game/RunRecordsRepository.js';

function fixture(definition, value) {
  const data = new GameStatistics().data;
  const id = definition.id;
  if (id.startsWith('pair-start:')) {
    const pair = id.slice('pair-start:'.length);
    data.runs = { trial: { [pair]: { started: value / 2 } }, challenge: { [pair]: { started: value / 2 } } };
  } else if (id === 'stage-clear') data.stages = { 'regular:0': { clears: value / 2 }, 'boss:0': { clears: value / 2 } };
  else if (id.startsWith('tag:')) data.heroes = { Avery: { tags: { [id.slice(4)]: value } }, Briar: { tags: { [id.slice(4)]: value - 1 } } };
  else if (id.startsWith('enemy-defeat:')) data.combat.enemies[id.slice('enemy-defeat:'.length)] = value;
  else if (id.startsWith('facility:')) data.facilities[id.slice('facility:'.length)] = value;
  else if (id === 'contribution') data.guildPoints = value;
  else {
    const mode = id === 'challenge-start' ? 'challenge' : 'trial';
    const field = id === 'trial-clear' ? 'cleared' : id === 'trial-fail' ? 'expired' : 'started';
    data.runs[mode] = { 'Avery|Briar': { [field]: value / 2 }, 'Casey|Darcy': { [field]: value / 2 } };
  }
  return { data };
}

test('production tables notify every grade with three normal comments and four tag comments', () => {
  assert.deepEqual(FIFTEEN_LEVELS.map(level => level.label), ['D-', 'D', 'D+', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+', 'S-', 'S', 'S+']);
  assert.deepEqual(FIFTEEN_LEVELS.map(level => level.comment), [1,1,1,1,1,1,2,2,2,2,2,2,3,3,3]);
  assert.deepEqual(FIFTEEN_LEVELS.map(level => level.notice), Array.from({ length: 15 }, (_, index) => index + 1));
  assert.ok(ACHIEVEMENT_DEFINITIONS.filter(d => !d.id.startsWith('tag:')).every(d => d.levels === FIFTEEN_LEVELS && d.s === 15));
  assert.ok(ACHIEVEMENT_DEFINITIONS.filter(d => d.id.startsWith('tag:')).every(d => d.levels === SEVEN_LEVELS && d.s === 3));
  const tag = ACHIEVEMENT_DEFINITIONS.find(d => d.id === 'tag:valor');
  const tagEvaluator = new Achievements({ definitions: [tag] });
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 10].map(count => tagEvaluator.evaluate(fixture(tag, count)).entries[0].label),
    ['E', 'D', 'C', 'B', 'A', 'A+', 'S', 'S+', 'S+']);
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map(count => tagEvaluator.evaluate(fixture(tag, count)).entries[0].comment), [1, 1, 2, 2, 3, 3, 4]);
  const evaluator = new Achievements({ definitions: [{ id: 'sample', read: data => data.p, gradeFormula: p => p, levels: FIFTEEN_LEVELS }] });
  let previous = {};
  const milestones = [];
  for (let p = 1; p <= 15; p++) {
    const result = evaluator.evaluate({ data: { p } }, previous);
    if (result.notices.length) milestones.push(p);
    previous = result.grades;
  }
  assert.deepEqual(milestones, Array.from({ length: 15 }, (_, index) => index + 1));
  assert.deepEqual(evaluator.evaluate({ data: { p: 6 } }, { sample: 0 }).notices,
    [{ id: 'sample', oldGrade: 0, newGrade: 6 }]);
  const pair = ACHIEVEMENT_DEFINITIONS.find(d => d.id === 'pair-start:Avery|Briar');
  assert.equal(new Achievements({ definitions: [pair] }).evaluate(fixture(pair, 1)).entries[0].label, 'D+');
  assert.equal(new Achievements({ definitions: [pair] }).evaluate(fixture(pair, 20)).entries[0].label, 'S+');
});

test('68 formula definitions evaluate all boundaries, keeping unbounded G above the top grade', () => {
  assert.equal(ACHIEVEMENT_DEFINITIONS.length, 68);
  assert.equal(new Set(ACHIEVEMENT_DEFINITIONS.map(item => item.id)).size, 68);
  for (const definition of ACHIEVEMENT_DEFINITIONS) {
    const evaluator = new Achievements({ definitions: [definition] });
    definition.levels.forEach((level, index) => {
      const threshold = definition.id.startsWith('tag:') ? 2 * level.minG + 1 : definition.t * (level.minG / definition.s) ** 2;
      assert.equal(evaluator.evaluate(fixture(definition, threshold - 0.00000001)).grades[definition.id], index, definition.id);
      assert.equal(evaluator.evaluate(fixture(definition, threshold)).grades[definition.id], index + 1, definition.id);
    });
    const result = evaluator.evaluate(fixture(definition, definition.id.startsWith('tag:') ? 15 : definition.t * 8));
    assert.equal(result.grades[definition.id], definition.levels.length);
    assert.ok(result.entries[0].G > definition.s);
  }
});

test('square root grading gives B at twenty out of sixty and preserves target values', () => {
  const definition = ACHIEVEMENT_DEFINITIONS.find(item => item.id === 'trial-start');
  assert.equal(definition.t, 60);
  const entry = new Achievements({ definitions: [definition] }).evaluate(fixture(definition, 20)).entries[0];
  assert.ok(Math.abs(entry.G - 8.660254037844386) < 1e-12);
  assert.equal(entry.label, 'B');
});

test('all ten tags expose seven notices and retain four count-based comment bands', () => {
  for (const definition of ACHIEVEMENT_DEFINITIONS.filter(item => item.category === 'tag')) {
    const evaluator = new Achievements({ definitions: [definition] });
    let previous = {};
    for (let count = 1; count <= 7; count++) {
      const result = evaluator.evaluate(fixture(definition, count), previous);
      assert.equal(result.grades[definition.id], count);
      assert.equal(result.notices.length, 1);
      assert.equal(result.entries[0].comment, Math.floor((count - 1) / 2) + 1);
      previous = result.grades;
    }
    assert.equal(evaluator.evaluate(fixture(definition, 8), previous).notices.length, 0);
  }
});

test('missing values stay E and recorded zero is retained as a fact', () => {
  const evaluator = new Achievements();
  const statistics = new GameStatistics();
  const result = evaluator.evaluate(statistics);
  assert.ok(Object.values(result.grades).every(grade => grade === 0));
  assert.equal(result.entries.find(entry => entry.id === 'contribution').p, null);
  assert.equal(result.entries.find(entry => entry.id === 'tag:valor').p, null);
  statistics.data.guildPoints = 0;
  assert.equal(evaluator.evaluate(statistics).entries.find(entry => entry.id === 'contribution').p, 0);
  assert.deepEqual(result.notices, []);
});

test('all definitions have completed Japanese and English resources, including grade-specific tag skills', () => {
  assert.equal(ACHIEVEMENT_DEFINITIONS.filter(d => d.id.startsWith('enemy-defeat:')).length, 45);
  assert.equal(ACHIEVEMENT_DEFINITIONS.filter(d => d.id.startsWith('tag:')).length, 10);
  for (const definition of ACHIEVEMENT_DEFINITIONS) for (const language of ['ja', 'en']) {
    const resource = definition.resources[language];
    assert.ok(resource.label && resource.category && resource.condition && resource.unachieved);
    assert.equal(resource.comments.length, definition.category === 'tag' ? 4 : 3);
    assert.ok(resource.comments.every(comment => comment && !/\{|［/.test(comment)));
    assert.ok(!/\{|［/.test(resource.condition));
  }
  const valor = ACHIEVEMENT_DEFINITIONS.find(d => d.id === 'tag:valor').resources.ja.comments;
  assert.deepEqual(valor, ['勘所が使えるようになりましたね。','急所見切りを身につけましたね。','一撃必殺を身につけるまでに成長しましたね。','ついに英雄の一閃を身につけるまでになりましたね。']);
  assert.ok(ACHIEVEMENT_DEFINITIONS.find(d => d.id === 'enemy-defeat:small-valor').resources.ja.comments[0].includes('ゴブリン'));
});

test('grade-table selection separates display upgrades from notices without mutating snapshots', () => {
  const levels = [
    { minG: 1, label: 'D-', comment: 1, notice: 1 },
    { minG: 2, label: 'D', comment: 1, notice: 1 },
    { minG: 3, label: 'C-', comment: 1, notice: 2 },
  ];
  const evaluator = new Achievements({ definitions: [{ id: 'sample', category: 'test', read: data => data.p, gradeFormula: p => p, levels }] });
  const previous = Object.freeze({ sample: 1 });
  const result = evaluator.evaluate({ data: { p: 2.5 } }, previous);
  assert.equal(result.entries[0].label, 'D');
  assert.equal(result.entries[0].comment, 1);
  assert.deepEqual(result.gained, [{ id: 'sample', oldGrade: 1, newGrade: 2 }]);
  assert.deepEqual(result.notices, []);
  assert.equal(evaluator.evaluate({ data: { p: 9 } }, previous).notices.length, 1);
  assert.deepEqual(previous, { sample: 1 });
  const single = new Achievements({ definitions: [{ id: 'one', read: data => data.p, gradeFormula: p => p, levels: [{ minG: 1, label: 'S', comment: 1, notice: 1 }] }] });
  assert.equal(single.evaluate({ data: { p: 1 } }).entries[0].label, 'S');
});

test('run evaluation retains E candidates, cumulative grades, raw run G, and definition order', () => {
  const evaluator = new Achievements();
  const total = new GameStatistics();
  const run = new GameStatistics({ run: true });
  total.data.facilities.shop = 400;
  run.data.facilities.shop = 1;
  total.data.combat.enemies['small-valor'] = 30;
  run.data.combat.enemies['small-valor'] = 30;
  const before = structuredClone(total.data);
  const startG = Object.fromEntries(evaluator.evaluate(new GameStatistics()).entries.map(({ id, G }) => [id, G]));
  startG['facility:shop'] = 15;
  const result = evaluator.evaluateRun({ startGrades: { 'facility:shop': 15 }, startG, total, run });
  assert.equal(result.entries.length, 68);
  assert.deepEqual(result.entries.map(entry => entry.id), ACHIEVEMENT_DEFINITIONS.map(d => d.id));
  assert.equal(result.entries.find(entry => entry.id === 'facility:shop').grade, 15);
  assert.equal(result.entries.find(entry => entry.id === 'facility:shop').deltaG, 0);
  assert.ok(result.entries.find(entry => entry.id === 'facility:shop').runG < 15);
  assert.equal(result.entries.find(entry => entry.id === 'tag:valor').label, 'E');
  assert.ok(result.entries.find(entry => entry.id === 'enemy-defeat:small-valor').updated);
  assert.deepEqual(total.data, before);
});

test('guild actual spending updates run and lifetime, survives checkpoints, and ignores old earned points', () => {
  const stored = new Map();
  const storage = { getValue: key => stored.get(key), setValue: (key, value) => stored.set(key, structuredClone(value)) };
  const repository = new RunRecordsRepository(storage);
  repository.data.statistics.combat.points = 99999;
  const { total, run, sequence } = repository.beginRun();
  const notifications = [];
  const collector = new StatisticsCollector({ run, total, achievements: new Achievements(), onGradeRaised: changes => notifications.push(...changes) });
  assert.equal(collector.previousGrades.contribution, 0);
  let points = 1000;
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: 0, y: 0 });
  const guild = new GuildSystem({ begin() {} }, { getContributionPoints: () => points, setContributionPoints: value => { points = value; }, random: () => 1, onStatistics: collector.record.bind(collector) });
  guild.completeApplication(hero, {});
  assert.equal(points, 880);
  assert.equal(run.data.guildPoints, 120);
  assert.equal(total.data.guildPoints, 120);
  assert.equal(total.data.combat.points, 99999);
  points = 0;
  guild.completeApplication(hero, {});
  assert.equal(run.data.guildPoints, 120);
  assert.equal(guild.extensionHours, 25);
  repository.checkpoint({ total, run, sequence });
  const loaded = new RunRecordsRepository(storage).beginRun();
  assert.equal(loaded.total.data.guildPoints, 120);
  assert.equal(loaded.run.data.guildPoints, undefined);
});

test('collector only calls notification callback when notice stage rises', () => {
  const levels = [{ minG: 1, label: 'D-', comment: 1, notice: 1 }, { minG: 2, label: 'D', comment: 1, notice: 1 }, { minG: 3, label: 'C-', comment: 1, notice: 2 }];
  const evaluator = new Achievements({ definitions: [{ id: 'one', read: data => data.combat.defeats, gradeFormula: p => p, levels }] });
  const calls = [];
  const collector = new StatisticsCollector({ run: new GameStatistics({ run: true }), total: new GameStatistics(), achievements: evaluator, onGradeRaised: changes => calls.push(changes) });
  for(let i = 0; i < 3; i++) collector.record({ type: 'defeat', enemyId: 'small-valor', points: 0, level: 1 });
  assert.equal(calls.length, 2);
  assert.equal(collector.previousGrades.one, 3);
  assert.equal(collector.startGrades.one, 0);
});

test('collector retains starting cumulative G and measures growth instead of high run tag G', () => {
  const total = new GameStatistics();
  total.record({ type: 'hero-tags', heroId: 'Avery', counts: { valor: 7 } });
  total.data.combat.enemies['small-valor'] = 100;
  const collector = new StatisticsCollector({ run: new GameStatistics({ run: true }), total, achievements: new Achievements() });
  const start = structuredClone(collector.startG);
  collector.record({ type: 'hero-tags', hero: { heroId: 'Avery', getTags: () => Array(7).fill('valor') } });
  collector.record({ type: 'defeat', enemyId: 'small-valor', points: 0, level: 1 });
  const entries = collector.getRunAchievements().entries;
  const tag = entries.find(entry => entry.id === 'tag:valor');
  const enemy = entries.find(entry => entry.id === 'enemy-defeat:small-valor');
  assert.equal(tag.runG, 3);
  assert.equal(tag.deltaG, 0);
  assert.equal(tag.updated, false);
  assert.equal(enemy.updated, false);
  assert.ok(Math.abs(enemy.deltaG - (15 * Math.sqrt(101 / 100) - 15)) < 1e-12);
  assert.ok(enemy.deltaG > tag.deltaG);
  assert.deepEqual(collector.startG, start);
});
