import test from 'node:test';
import assert from 'node:assert/strict';
import { getEpithetTagSkillWords } from '../../src/game/EpithetTagSkill.js';
import { createHeroEpithets } from '../../src/game/HeroEpithets.js';
import data from '../../public/data/epithet.json' with { type: 'json' };
import tagTexts from '../../public/data/text/information/tag.json' with { type: 'json' };

test('tag skill epithet uses canonical name at 1/3/5/7 thresholds, capped above seven', () => {
  for (const [count, level] of [[1,1],[2,1],[3,2],[4,2],[5,3],[6,3],[7,4],[10,4]]) {
    for (const language of ['ja','en']) {
      const name = tagTexts.valor.skillNames['lang-store'][language][level - 1];
      assert.equal(getEpithetTagSkillWords('valor', count, language).tagSkill.common[0], language === 'ja' ? `「${name}」` : `“${name}”`);
    }
  }
  for (const tag of ['fire','water','lightning','area','vitality']) assert.equal(getEpithetTagSkillWords(tag,7),null);
  assert.equal(getEpithetTagSkillWords('valor',0),null);
  assert.equal(data.defaults.tagSkill,undefined);
});

test('generation uses the selected hero maximum instead of another hero skill or a random level', () => {
  const stats = { heroes: { Avery: { tags: { valor: 3 } }, Briar: { tags: { valor: 7 } } } };
  const choices = [.999, 0, .999, .999, .999];
  let index = 0;
  const names = createHeroEpithets(stats,[{heroId:'Avery'},{heroId:'Briar'}],{ random:()=>choices[index++ % choices.length] });
  assert.equal(names.Avery,'「急所見切り」の匠');
  assert.equal(names.Briar,'「英雄の一閃」の匠');
});

test('only the ten status tag definitions add skill people, with four approved alternatives', () => {
  assert.equal(data.targets.filter(t=>t.group==='tag'&&t.words.person_base?.ally.includes('[tagSkill]の[skillPerson(ally)]')).length,10);
  assert.equal(data.targets.filter(t=>t.words.person?.ally.includes('[tagSkill]の[skillPerson(ally)]')).length,0);
  assert.deepEqual(data.generic.skillPerson.ally,['使い手','達人','名人','匠']);
});

test('skill people also expand after a modifier and an enemy action without cycling', async () => {
  const { aggregate, generate } = await import('../../src/game/EpithetExpansion.js');
  const valor = data.targets.find(t=>t.group==='tag'&&t.id==='valor');
  const pool = aggregate([
    { source:'generic',words:data.generic }, { source:'valor',words:valor.words },
    { source:'skill',words:getEpithetTagSkillWords('valor',3) },
    { source:'enemy',words:{person_base:{enemy:['ゴブリン']},action:{enemy:['を討つ']}} },
  ]);
  const result=generate('[person_base(enemy)][action(enemy)][modifier(ally)][person_base(ally)]',pool,data.defaults,{random:()=>.999});
  assert.equal(result.text,'ゴブリンを討つ一撃必殺の「急所見切り」の匠');
  assert.ok(result.trace.every(step=>step.depth<=1));
});
