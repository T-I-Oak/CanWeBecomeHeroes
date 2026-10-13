import test from 'node:test';
import assert from 'node:assert/strict';
import RunRecordsRepository from '../../src/game/RunRecordsRepository.js';
import TrialStatisticsSession from '../../src/game/TrialStatisticsSession.js';
import { HERO_PROFESSION_IDS, getHeroProfessionDefinition } from '../../src/game/HeroFactory.js';

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
