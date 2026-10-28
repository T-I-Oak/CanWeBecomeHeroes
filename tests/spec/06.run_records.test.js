import test from 'node:test';
import assert from 'node:assert/strict';
import RunRecordsRepository from '../../src/game/RunRecordsRepository.js';
import TrialStatisticsSession from '../../src/game/TrialStatisticsSession.js';
import { HERO_PROFESSION_IDS, getHeroProfessionDefinition } from '../../src/game/HeroFactory.js';
import { createTrialRunResult } from '../../src/game/TrialRunResult.js';
import { ACHIEVEMENT_DEFINITIONS } from '../../src/game/AchievementDefinitions.js';
import { getRecordAchievements } from '../../src/app/RecordScreenData.js';

test('初期Heroの全28組を区別し、逆順の開始は同じ組へ集計して再読込後も保持する', () => {
  const values = new Map();
  const storage = { getValue: key => values.get(key), setValue: (key, value) => values.set(key, structuredClone(value)) };
  const repository = new RunRecordsRepository(storage);
  HERO_PROFESSION_IDS.forEach((profession, index) => HERO_PROFESSION_IDS.slice(index + 1).forEach(other => {
    const session = new TrialStatisticsSession({ repository, professionIds: [profession, other] });
    session.checkpoint();
  }));
  const reverse = new TrialStatisticsSession({ repository, professionIds: ['guard', 'swordfighter'] });
  reverse.checkpoint();
  const loaded = new RunRecordsRepository(storage);
  const pairs = loaded.data.statistics.runs.trial;
  const key = ['guard', 'swordfighter'].map(id => getHeroProfessionDefinition(id).heroId).sort().join('|');
  assert.equal(Object.keys(pairs).length, 28);
  assert.equal(Object.values(pairs).reduce((sum, pair) => sum + pair.started, 0), 29);
  assert.equal(pairs[key].started, 2);
  assert.equal(loaded.data.history.length, 0, '途中ランを不合格の終了履歴として生成しない');
  assert.equal(loaded.data.summary.completed, 0);
});

function storage() {
  const values = new Map();
  return { getValue: key => values.get(key), setValue: (key, value) => values.set(key, structuredClone(value)) };
}

test('D- is visible from evaluation without setting flags, independently of notices; E stays hidden', () => {
  const repository = new RunRecordsRepository(storage());
  const queue = [];
  const session = new TrialStatisticsSession({ repository, professionIds: ['swordfighter', 'guard'], onGradeRaised: items => queue.push(...items) });
  assert.equal(repository.data.knownAchievements['trial-start'], false);
  assert.equal(repository.data.knownAchievements['trial-clear'], false);
  assert.equal(repository.data.knownAchievements['tag:valor'], false);
  session.record({ type: 'hero-tags', hero: { heroId: 'Avery', getTags: () => ['valor'] } });
  assert.equal(repository.data.knownAchievements['tag:valor'], false);
  assert.ok(queue.length > 0, 'notices remain queued without being rendered');
  session.collector.onGradeRaised = () => {};
  session.record({ type: 'hero-tags', hero: { heroId: 'Avery', getTags: () => ['fortune'] } });
  assert.equal(repository.data.knownAchievements['tag:fortune'], false);
  session.checkpoint();
  const before = structuredClone(repository.data);
  const rows = getRecordAchievements(repository.data.statistics, 'ja', repository.data.knownAchievements);
  assert.ok(rows.some(entry => entry.id === 'trial-start' && entry.gradeLabel === 'D-'));
  assert.ok(rows.some(entry => entry.id === 'tag:valor'));
  assert.ok(rows.some(entry => entry.id === 'tag:fortune'));
  assert.ok(!rows.some(entry => entry.id === 'trial-clear'));
  assert.ok(Object.values(repository.data.knownAchievements).every(value => value === false));
  assert.deepEqual(repository.data, before);
  assert.equal(repository.data.summary.completed, 0);
});

test('selected result entries discover E before opening the reverse; retries never replay completion', () => {
  const manager = storage();
  const repository = new RunRecordsRepository(manager);
  const session = new TrialStatisticsSession({ repository, professionIds: ['swordfighter', 'guard'] });
  const input = { outcome: { state: 'expired', stageNumber: 1 }, members: session.startMembers, tick: 10, remainingHours: 0 };
  const record = session.finish(input);
  const result = createTrialRunResult({ ...input, record });
  const displayedE = result.achievements.filter(entry => entry.grade === 0);
  assert.ok(displayedE.length > 0);
  assert.ok(displayedE.every(entry => !repository.data.knownAchievements[entry.id]));
  repository.markAchievementsKnown(result.achievements.map(entry => entry.id));
  const state = structuredClone(repository.data);
  const original = manager.setValue;
  manager.setValue = () => { throw new DOMException('full', 'QuotaExceededError'); };
  assert.throws(() => repository.save(), { name: 'QuotaExceededError' });
  assert.equal(repository.hasUnsavedChanges, true);
  repository.markAchievementsKnown(result.achievements.map(entry => entry.id));
  session.finish(input);
  assert.deepEqual(repository.data, state);
  manager.setValue = original;
  repository.save();
  const loaded = new RunRecordsRepository(manager);
  assert.deepEqual(loaded.data, state);
  const selected = new Set(result.achievements.map(entry => entry.id));
  assert.ok(record.achievements.entries.filter(entry => entry.grade === 0 && !selected.has(entry.id)).every(entry => !loaded.data.knownAchievements[entry.id]));
  loaded.markAchievementsKnown([...selected]);
  assert.equal(loaded.hasUnsavedChanges, false);
});

test('new saves are distinct from unsupported or malformed saves and never infer flags', () => {
  const manager = storage();
  const repository = new RunRecordsRepository(manager);
  assert.equal(Object.hasOwn(repository.data, 'version'), false);
  assert.ok(Object.values(repository.data.knownAchievements).every(value => value === false));
  for (const saved of [null, false, 0, '', { ...repository.data, knownAchievements: undefined },
    { ...repository.data, knownAchievements: {} }, { ...repository.data, knownAchievements: { ...repository.data.knownAchievements, 'trial-start': 1 } }]) {
    manager.setValue('runRecords', saved);
    assert.throws(() => new RunRecordsRepository(manager), RangeError);
    assert.deepEqual(manager.getValue('runRecords'), saved);
  }
});

test('records show only known entries in definition order without saving or changing statistics', () => {
  const repository = new RunRecordsRepository(storage());
  const data = repository.data.statistics;
  assert.deepEqual(getRecordAchievements(data, 'ja', repository.data.knownAchievements), []);
  const ids = [ACHIEVEMENT_DEFINITIONS.at(-1).id, ACHIEVEMENT_DEFINITIONS[0].id];
  repository.markAchievementsKnown(ids);
  const before = structuredClone(repository.data);
  for (const language of ['ja', 'en']) {
    const rows = getRecordAchievements(data, language, repository.data.knownAchievements);
    assert.deepEqual(rows.map(row => row.id), ids.toReversed());
    assert.ok(rows.every(row => row.gradeLabel === 'E'));
  }
  assert.deepEqual(repository.data, before);
});
