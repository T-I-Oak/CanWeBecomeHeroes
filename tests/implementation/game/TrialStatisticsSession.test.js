import test from 'node:test';
import assert from 'node:assert/strict';
import TrialStatisticsSession from '../../../src/game/TrialStatisticsSession.js';
import RunRecordsRepository from '../../../src/game/RunRecordsRepository.js';
import HeroProgressRepository from '../../../src/game/HeroProgressRepository.js';
import { createTrialRunResult } from '../../../src/game/TrialRunResult.js';
import HeroFactory from '../../../src/game/HeroFactory.js';

test('challenge save retries retain one completion and coexist with trial records after reload', () => {
  const values = new Map();
  let fail = true;
  const storage = { getValue: key => values.get(key), setValue: (key, value) => {
    if (fail) throw Object.assign(new Error('storage full'), { name: 'QuotaExceededError' });
    values.set(key, structuredClone(value));
  } };
  const repository = new RunRecordsRepository(storage);
  const challenge = new TrialStatisticsSession({ repository, mode: 'challenge', professionIds: ['swordfighter', 'guard'] });
  challenge.finish({ outcome: { state: 'completed', stageNumber: 1 }, members: challenge.startMembers, tick: 84000, remainingHours: 0 });
  assert.throws(() => repository.save(), { name: 'QuotaExceededError' });
  assert.equal(repository.hasUnsavedChanges, true);
  fail = false;
  repository.save(); repository.save();
  const loaded = new RunRecordsRepository(storage);
  const trial = new TrialStatisticsSession({ repository: loaded, professionIds: ['swordfighter', 'guard'] });
  trial.finish({ outcome: { state: 'expired', stageNumber: 1 }, members: trial.startMembers, tick: 84000, remainingHours: 0 });
  assert.equal(loaded.data.summary.completed, 2);
  assert.equal(loaded.data.summary.expired, 1);
  assert.equal(loaded.data.statistics.runs.challenge['Avery|Briar'].completed, 1);
  assert.equal(loaded.data.statistics.runs.trial['Avery|Briar'].expired, 1);
  assert.deepEqual(loaded.data.rankings.map(row => row.mode), ['challenge', 'trial']);
});

test('challenge records reached task separately from clears, saves once, and never grants a trial pass or failure', () => {
  for (const cleared of [0, 7]) {
    const values = new Map();
    const repository = new RunRecordsRepository({ getValue: key => values.get(key), setValue: (key, value) => values.set(key, structuredClone(value)) });
    const session = new TrialStatisticsSession({ repository, mode: 'challenge', professionIds: ['swordfighter', 'guard'] });
    for (let n = 0; n < cleared; n++) session.record({ type: 'stage-clear', kind: 'regular', patternIndex: 0, level: n + 1, clearedAt: '2026-10-18T00:00:00Z' });
    const input = { outcome: { state: 'completed', stageNumber: cleared + 1, stageKind: 'regular' }, members: session.startMembers, tick: 84000, remainingHours: 0 };
    const record = session.finish(input);
    assert.equal(session.finish(input), record);
    repository.save(); repository.save();
    assert.equal(record.mode, 'challenge');
    assert.equal(record.stageNumber, cleared + 1);
    assert.equal(record.clearedStages, cleared);
    assert.equal(repository.data.summary.completed, 1);
    assert.equal(repository.data.summary.cleared, 0);
    assert.equal(repository.data.summary.expired, 0);
    assert.equal(repository.data.clear.count, 0);
    assert.equal(repository.data.statistics.runs.trial, undefined);
    assert.equal(repository.data.statistics.runs.challenge['Avery|Briar'].started, 1);
    assert.equal(repository.data.rankings[0].mode, 'challenge');
    const result = createTrialRunResult({ ...input, record });
    assert.equal(result.type, 'challenge-notice');
    assert.equal(result.stageNumber, cleared + 1);
    assert.ok(result.members.every(member => member.epithet));
  }
});

test('startup and initial Hero notifications are captured without replaying saved grades', () => {
  const values = new Map();
  const dataManager = { getValue: key => values.get(key), setValue: (key, value) => values.set(key, structuredClone(value)) };
  const repository = new RunRecordsRepository(dataManager);
  const changes = [];
  const first = new TrialStatisticsSession({ repository, professionIds: ['swordfighter', 'guard'],
    onGradeRaised: items => changes.push(...items) });
  assert.ok(changes.some(item => item.id === 'trial-start' && item.oldGrade === 0));
  assert.equal(first.collector.startG['trial-start'], 0);
  assert.ok(first.collector.getRunAchievements().entries.find(entry => entry.id === 'trial-start').deltaG > 0);
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: 0, y: 0 });
  hero.getTags = () => Array(7).fill('valor');
  first.attachHero(hero);
  assert.deepEqual(changes.find(item => item.id === 'tag:valor'), { id: 'tag:valor', oldGrade: 0, newGrade: 3 });
  first.checkpoint();
  const next = [];
  const second = new TrialStatisticsSession({ repository, professionIds: ['swordfighter', 'guard'],
    onGradeRaised: items => next.push(...items) });
  second.attachHero(hero);
  assert.ok(!next.some(item => item.id === 'tag:valor'));
  assert.ok(next.every(item => item.oldGrade > 0));
});

test('completion keeps ordered members and run-only facts; repeating finish or saving cannot double count', () => {
  const values = new Map();
  const dataManager = { getValue: key => values.get(key), setValue: (key, value) => values.set(key, structuredClone(value)) };
  const repository = new RunRecordsRepository(dataManager);
  const session = new TrialStatisticsSession({ repository, professionIds: ['swordfighter', 'guard'], startedAt: '2026-10-11T01:00:00Z' });
  session.record({ type: 'defeat', enemyId: 'small-valor', heroId: 'Avery', points: 5, level: 7 });
  session.record({ type: 'defeat', enemyId: 'small-valor', heroId: 'Avery', points: 5, level: 11 });
  const members = [{ heroId: 'Avery', profession: 'swordfighter' }, { heroId: 'Briar', profession: 'guard' }, { heroId: 'Casey', profession: 'mage' }];
  const input = { outcome: { state: 'cleared', stageNumber: 7, stageKind: 'boss' }, members, tick: 1000, remainingHours: 24, endedAt: '2026-10-11T02:00:00Z' };
  const record = session.finish(input);
  assert.equal(session.finish(input), record);
  repository.save(); repository.save();
  assert.deepEqual(record.members.map(member => member.heroId), ['Avery', 'Briar', 'Casey']);
  assert.deepEqual(record.statistics.heroes.Avery.defeats['small-valor'], { count: 2, highestLevel: 11 });
  assert.equal(repository.data.statistics.heroes.Avery, undefined);
  assert.equal(repository.data.summary.completed, 1);
  assert.equal(repository.data.statistics.runs.trial['Avery|Briar'].cleared, 1);
  const progress = new HeroProgressRepository(dataManager);
  assert.equal(progress.hasClearedTrial(), true);
  assert.ok(progress.getUnlockedProfessionIds().includes('mage'));
  const result = createTrialRunResult({ ...input, record });
  members[2].heroId = 'Changed';
  record.statistics.combat.points = 999;
  assert.equal(result.members[2].heroId, 'Casey');
  assert.equal(result.record.statistics.combat.points, 10);
  assert.ok(Object.isFrozen(result.record.statistics.heroes.Avery.defeats));
});
