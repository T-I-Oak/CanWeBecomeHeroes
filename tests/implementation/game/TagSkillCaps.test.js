import test from 'node:test';
import assert from 'node:assert/strict';
import HeroFactory from '../../../src/game/HeroFactory.js';
import EnemyFactory from '../../../src/game/EnemyFactory.js';
import GameStatistics from '../../../src/game/GameStatistics.js';
import StatisticsCollector from '../../../src/game/StatisticsCollector.js';
import Achievements from '../../../src/game/Achievements.js';
import { TAGS } from '../../../src/game/TagCatalog.js';
import { getEpithetTagSkillWords } from '../../../src/game/EpithetTagSkill.js';
import { selectEpithetTargets, createHeroEpithets } from '../../../src/game/HeroEpithets.js';
import TrainingSystem from '../../../src/game/TrainingSystem.js';
import RunRecordsRepository from '../../../src/game/RunRecordsRepository.js';
import { getRecordAchievements } from '../../../src/app/RecordScreenData.js';

function setup(total = new GameStatistics()) {
  const run = new GameStatistics({ run: true });
  const achievements = new Achievements();
  const collector = new StatisticsCollector({ run, total, achievements });
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: 0, y: 0 });
  hero.onStatistics = event => collector.record(event);
  return { run, total, achievements, collector, hero };
}

test('ten skill tags use the same capped count for Hero, Enemy, records, grade and skill words', () => {
  for (const [tag, definition] of Object.entries(TAGS).filter(([, value]) => value.group === 'status')) {
    for (let maximum = 3; maximum <= 7; maximum++) for (const count of [0, 1, 3, 5, 7, 9]) {
      const { hero, run, total, collector, achievements } = setup();
      hero.tags = Array(count).fill(tag);
      hero.maximums[definition.stat] = maximum;
      const enemy = new EnemyFactory().create({ size: 'small', tagAffinity: tag, slotPosition: 0, maximumHp: 3, totalTagCount: 0 });
      enemy.tags = [...hero.tags];
      enemy.maximums[definition.stat] = maximum;
      collector.record({ type: 'hero-tags', hero });
      const effective = Math.min(count, maximum, 7);
      assert.equal(hero.getTagCount(tag), effective);
      assert.equal(enemy.getTagCount(tag), effective);
      assert.equal(hero.getTagSkillLevel(tag), Math.floor((effective + 1) / 2));
      assert.equal(enemy.getTagSkillLevel(tag), hero.getTagSkillLevel(tag));
      for (const stats of [run, total]) {
        assert.equal(stats.data.heroes.Avery.tags[tag] ?? 0, count);
        assert.equal(stats.data.heroes.Avery.effectiveTags[tag] ?? 0, effective);
        const entry = achievements.evaluate(stats).entries.find(item => item.id === `tag:${tag}`);
        assert.equal(entry.grade, effective);
        assert.equal(entry.comment, hero.getTagSkillLevel(tag));
      }
      if (effective > 0) for (const language of ['ja', 'en']) {
        assert.deepEqual(getEpithetTagSkillWords(tag, run.data.heroes.Avery.effectiveTags[tag], language), getEpithetTagSkillWords(tag, effective, language));
      }
    }
  }
});

test('equipment and training sample simultaneous counts and maxima, never combine separate peaks', () => {
  const { hero, run, total, collector } = setup();
  hero.tags = ['valor'];
  hero.equip({ category: 'weapon', tags: Array(8).fill('valor') });
  assert.equal(run.data.heroes.Avery.tags.valor, 9);
  assert.equal(run.data.heroes.Avery.effectiveTags.valor, 3);
  hero.clearEquipment();
  hero.maximums.power = 4;
  const training = new TrainingSystem(null, null, { random: () => 0, onStatistics: event => collector.record(event) });
  hero.stamina = 3;
  training.train(hero, { gainedCells: [] });
  assert.equal(hero.maximums.power, 5);
  assert.equal(run.data.heroes.Avery.effectiveTags.valor, 3, 'old nine-tag peak must not become five');
  hero.equip({ category: 'weapon', tags: Array(8).fill('valor') });
  assert.equal(run.data.heroes.Avery.effectiveTags.valor, 5);
  hero.stamina = 3;
  training.train(hero, { gainedCells: [] });
  assert.equal(run.data.heroes.Avery.effectiveTags.valor, 6, 'training records without an equipment change');
  assert.equal(total.data.heroes.Avery.effectiveTags.valor, 6);
  assert.equal(run.data.heroes.Avery.tags.valor, 9);
});

test('raw and effective records survive checkpoint and reload with capped achievement progress', () => {
  const values = new Map();
  const storage = { getValue: key => values.get(key), setValue: (key, value) => values.set(key, structuredClone(value)) };
  const repository = new RunRecordsRepository(storage);
  const session = repository.beginRun();
  const { hero, collector } = setup(session.total);
  hero.tags = Array(9).fill('valor');
  collector.record({ type: 'hero-tags', hero });
  repository.checkpoint(session);
  const reloaded = new RunRecordsRepository(storage);
  assert.equal(reloaded.data.statistics.heroes.Avery.tags.valor, 9);
  assert.equal(reloaded.data.statistics.heroes.Avery.effectiveTags.valor, 3);
  const row = getRecordAchievements(reloaded.data.statistics, 'ja', reloaded.data.knownAchievements).find(entry => entry.id === 'tag:valor');
  assert.equal(row.gradeLabel, 'B');
  assert.equal(row.progress.current, 3);
});

test('only higher effective observations grant upgrades even as raw counts increase', () => {
  const { hero, total, collector, achievements } = setup();
  hero.tags = Array(3).fill('valor');
  collector.record({ type: 'hero-tags', hero });
  const notifications = [];
  collector.onGradeRaised = changes => notifications.push(...changes);
  hero.tags = Array(9).fill('valor');
  collector.record({ type: 'hero-tags', hero });
  assert.deepEqual(notifications, []);
  assert.equal(achievements.evaluate(total).grades['tag:valor'], 3);
  hero.maximums.power = 5;
  collector.record({ type: 'hero-tags', hero });
  assert.deepEqual(notifications, [{ id: 'tag:valor', oldGrade: 3, newGrade: 5 }]);
  assert.equal(achievements.evaluate(total).grades['tag:valor'], 5);
});

test('generated skill titles use capped records in both languages', () => {
  const stats = { heroes: { Avery: { tags: { valor: 9 }, effectiveTags: { valor: 3 } } } };
  assert.equal(selectEpithetTargets(stats, ['Avery'], 'Avery')[0].id, 'valor');
  for (const language of ['ja', 'en']) {
    const words = getEpithetTagSkillWords('valor', 3, language).tagSkill.common[0];
    const choices = [.999, 0, .999, .999, .999];
    let index = 0;
    const title = createHeroEpithets(stats, [{ heroId: 'Avery' }], { language, random: () => choices[index++ % choices.length] }).Avery;
    assert.ok(title.includes(words), title);
  }
});
