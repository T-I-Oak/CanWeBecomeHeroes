import test from 'node:test';
import assert from 'node:assert/strict';
import { selectRecruitmentCast, selectRecruitmentContext } from '../../../src/game/RecruitmentCast.js';

const pairs = [['Avery', 'Briar'], ['Casey', 'Darcy'], ['Ellis', 'Finley'], ['Garnet', 'Harper']];
const hero = (heroId, index) => ({ heroId, currentArea: 'battle', currentSlotId: ['battle-2', 'battle-3', 'battle-1'][index] });

test('all acquaintance directions reserve B or C while retaining other members priority', () => {
  for (const pair of pairs) for (const recruitedId of pair) {
    const friend = pair.find((id) => id !== recruitedId);
    const others = pairs.flat().filter((id) => !pair.includes(id));
    for (const count of [2, 3]) for (let position = 0; position < count; position += 1) {
      const ids = others.slice(0, count - 1);
      ids.splice(position, 0, friend);
      const members = ids.map(hero);
      const context = { members, recruitedHero: { heroId: recruitedId } };
      const cast = selectRecruitmentCast(context);
      assert.deepEqual(Object.values(cast), [...ids.filter((id) => id !== friend), friend, recruitedId]);
      assert.equal(new Set(Object.values(cast)).size, count + 1);
      assert.deepEqual(selectRecruitmentContext(context), { cast, acquaintance: true });
      assert.deepEqual(members.map((member) => member.heroId), ids);
    }
  }
});

test('unacquainted parties retain battle and preparation priority', () => {
  const members = [hero('Ellis', 1), hero('Avery', 0), { heroId: 'Garnet', currentArea: 'shop' }];
  assert.deepEqual(selectRecruitmentContext({ members, recruitedHero: { heroId: 'Darcy' } }), {
    cast: { A: 'Avery', B: 'Ellis', C: 'Garnet', X: 'Darcy' }, acquaintance: false,
  });
});
