import test from 'node:test';
import assert from 'node:assert/strict';
import { selectEpithetTargets, createHeroEpithets } from '../../src/game/HeroEpithets.js';

test('epithets use each category highest share among ending members, rather than highest raw count', () => {
  const statistics = { heroes: {
    Avery: { tags: { valor: 6, fire: 2 }, weapons: { shield: 4 }, facilities: { shop: 3, guild: 6 }, defeats: { 'small-valor': { count: 2 } } },
    Briar: { tags: { valor: 10, fire: 0 }, weapons: { shield: 1 }, facilities: { shop: 7, guild: 4 }, defeats: { 'small-valor': { count: 8 } } },
    Casey: { tags: { fire: 100 } },
  } };
  const targets = selectEpithetTargets(statistics, ['Avery', 'Briar'], 'Avery', { random: () => 0 });
  assert.deepEqual(targets.map(t => t.id), ['fire', 'shield', 'facility-2', 'small-valor']);
  assert.deepEqual(targets.map(t => t.share), [1, .8, .6, .2]);
});

test('missing and zero-valued categories are excluded; equal top shares can select either target', () => {
  const statistics = { heroes: { Avery: { tags: { valor: 2, arcane: 2 } }, Briar: {} } };
  assert.equal(selectEpithetTargets(statistics, ['Avery', 'Briar'], 'Avery', { random: () => 0 })[0].id, 'valor');
  assert.equal(selectEpithetTargets(statistics, ['Avery', 'Briar'], 'Avery', { random: () => .99 })[0].id, 'arcane');
  assert.deepEqual(selectEpithetTargets(statistics, ['Avery', 'Briar'], 'Briar'), []);
});

test('default-only heroes and enemy titles expand to completed names in both languages', () => {
  const members = [{ heroId: 'Avery' }, { heroId: 'Briar' }];
  const stats = { heroes: { Avery: { tags: { valor: 4 }, defeats: { 'small-valor': { count: 3 } } } } };
  for (const language of ['ja', 'en']) for (let index = 0; index < 100; index++) {
    const names = createHeroEpithets(stats, members, { language });
    for (const name of Object.values(names)) {
      assert.ok(name.length > 0 && !name.includes('['));
      if (language === 'en') assert.doesNotMatch(name, /[ぁ-んァ-ヶ一-龯]/);
    }
  }
});
