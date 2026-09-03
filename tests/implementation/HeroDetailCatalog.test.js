import test from 'node:test';
import assert from 'node:assert/strict';
import { HERO_DETAILS, getHeroDetail } from '../../src/game/HeroDetailCatalog.js';

test('hero detail catalog gives every hero a flavor description and a combat style', () => {
  ['Avery', 'Briar', 'Casey', 'Darcy', 'Ellis', 'Finley', 'Garnet', 'Harper'].forEach((name) => {
    assert.ok(HERO_DETAILS[name].description);
    assert.ok(HERO_DETAILS[name].combatStyle);
    assert.equal(getHeroDetail({ name: { en: name } }), HERO_DETAILS[name]);
  });
});
