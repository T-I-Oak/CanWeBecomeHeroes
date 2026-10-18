import test from 'node:test';
import assert from 'node:assert/strict';
import GameLog from '../../../src/game/GameLog.js';
import GameClock from '../../../src/game/GameClock.js';
import GameTextRepository from '../../../src/game/GameTextRepository.js';
import { readGameText } from '../../../src/game/readGameText.js';
import { expandLanguageResource, setLanguage } from '../../../../GameWorksOAK/src/lib/core/i18n.js';
import InformationWindowManager from '../../../src/app/InformationWindowManager.js';
import { createAchievementNotifier } from '../../../src/game/AchievementLog.js';
import { createLogMessageParts } from '../../../src/game/LogPresentation.js';
import { matchesLogFilters, getLogWindow } from '../../../src/app/LogHistoryModel.js';
import TrialStatisticsSession from '../../../src/game/TrialStatisticsSession.js';
import RunRecordsRepository from '../../../src/game/RunRecordsRepository.js';
import { logUniqueSkill } from '../../../src/game/UniqueSkillLog.js';
import { DataManager } from '../../../../GameWorksOAK/src/lib/core/dataManager.js';
import { getAppVersion, setAppVersion } from '../../../../GameWorksOAK/src/lib/utils/env.js';
import { APP_VERSION } from '../../../src/game/AppMetadata.js';
import { readLogHistoryFilters, writeLogHistoryFilters } from '../../../src/game/LogHistorySettings.js';

test('history filters persist both false values through a fresh game data manager without changing other saves', t => {
  const previousVersion = getAppVersion();
  setAppVersion(APP_VERSION);
  t.after(() => setAppVersion(previousVersion));
  const previous = globalThis.localStorage;
  const storage = new Map();
  globalThis.localStorage = { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) };
  t.after(() => { globalThis.localStorage = previous; });
  const data = new DataManager('can-we-become-heroes');
  assert.deepEqual(readLogHistoryFilters(data), { ordinary: true, exSkill: true });
  assert.deepEqual(JSON.parse(storage.get('can-we-become-heroes')).logHistoryFilters.d, { ordinary: true, exSkill: true });
  data.setValue('otherSettings', { speed: 2 });
  writeLogHistoryFilters(data, { ordinary: false, exSkill: false });
  const reloaded = new DataManager('can-we-become-heroes');
  assert.deepEqual(readLogHistoryFilters(reloaded), { ordinary: false, exSkill: false });
  assert.deepEqual(reloaded.getValue('otherSettings'), { speed: 2 });
  writeLogHistoryFilters(reloaded, { ordinary: true, exSkill: false });
  assert.deepEqual(readLogHistoryFilters(new DataManager('can-we-become-heroes')), { ordinary: true, exSkill: false });
});

test('history filters use stable keys and channels, preserving critical, defeat and silent records', () => {
  const log = new GameLog();
  for (const key of ['logDamage','logMiss','logCritical','logDefeat']) log.logLocalized({ key }, { channel: 'battle' });
  logUniqueSkill(log, null, 'logNightFamiliars', {});
  log.log('silent', { notify: false });
  const snapshot = log.getRecords();
  assert.deepEqual(snapshot.filter(r => matchesLogFilters(r, { ordinary: false, exSkill: false })).map(r => r.localized?.key ?? r.message), ['logCritical', 'logDefeat', 'silent']);
  assert.equal(snapshot.filter(r => matchesLogFilters(r, {})).length, 6);
  assert.deepEqual(log.getRecords(), snapshot);
});

test('history uses standard pause, pinning, child closure and identity rules', () => {
  const clock = new GameClock({ paused: true });
  clock.pause('settings');
  const manager = new InformationWindowManager({ clock });
  manager.setPauseOnOpen(true);
  const history = manager.open({ type: 'log-history', data: {} });
  assert.equal(manager.open({ type: 'log-history', data: {} }).id, history.id);
  manager.togglePin(history.id);
  assert.deepEqual([...clock.pauseReasons], ['settings']);
  const child = manager.open({ type: 'term', data: { term: 'familiar' }, parentId: history.id });
  assert.equal(clock.pauseReasons.has('information-window'), true);
  manager.close(history.id);
  assert.equal(manager.entries.some(entry => entry.id === child.id), false);
  assert.equal(clock.paused, true);
  assert.deepEqual([...clock.pauseReasons], ['settings']);
});

test('virtual history includes the first and last entries with bounded DOM range and variable heights', () => {
  const records = Array.from({ length: 10000 }, (_, id) => ({ id }));
  const heights = new Map([[0, 200], [9999, 500]]);
  const first = getLogWindow(records, heights, 0, 400);
  assert.equal(first.start, 0);
  assert.ok(first.end < 20);
  const last = getLogWindow(records, heights, first.total - 400, 400);
  assert.equal(last.end, 10000);
  assert.ok(last.end - last.start < 20);
  assert.equal(last.offsets[1], 200);
});

test('achievement notices record once per delivered item and localize without reevaluation', t => {
  const previousStorage = globalThis.localStorage;
  const values = new Map();
  globalThis.localStorage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  t.after(() => { globalThis.localStorage = previousStorage; });
  setLanguage('ja');
  const texts = new GameTextRepository(); texts.resource = expandLanguageResource(readGameText());
  const log = new GameLog({ textRepository: texts });
  const enqueued = [];
  const notify = createAchievementNotifier(log, { enqueue: changes => enqueued.push(changes) });
  const repository = new RunRecordsRepository({ getValue: () => undefined, setValue() {} });
  new TrialStatisticsSession({ repository, professionIds: ['swordfighter'], onGradeRaised: notify });
  assert.ok(log.getRecords().length > 0, 'run-start notices are captured during construction');
  const first = log.getRecords()[0].localized.values.achievement;
  notify([{ id: first.id, oldGrade: 0, newGrade: 5 }, { id: first.id, oldGrade: 5, newGrade: 7 }]);
  const records = log.getRecords();
  assert.equal(records.length, enqueued.flat().length);
  assert.ok(records.every(r => r.notify === false));
  const japanese = log.getMessage(records[0]);
  setLanguage('en'); texts.resource = expandLanguageResource(readGameText());
  assert.notEqual(log.getMessage(records[0]), japanese);
  assert.equal(createLogMessageParts(texts, records[0].localized).map(p => p.value).join(''), log.getMessage(records[0]));
  assert.equal(log.getRecords().length, records.length);
  assert.deepEqual(records.slice(-2).map(r => r.localized.values.achievement.newGrade), [5,7]);
  const next = new GameLog({ textRepository: texts });
  assert.equal(next.getRecords().length, 0);
  setLanguage('ja');
});
