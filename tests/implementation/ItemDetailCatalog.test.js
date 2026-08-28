import test from 'node:test';
import assert from 'node:assert/strict';
import { getItemDetail } from '../../src/game/ItemDetailCatalog.js';

test('item detail catalog names every current hand and body equipment type', () => {
  const types = [
    'sword', 'shield', 'staff', 'holy-book', 'claw', 'bow', 'banner', 'orb', 'holy-symbol', 'tarot-cards',
    'shopping-bag', 'hero-license', 'renewal-form',
    ...['head', 'torso', 'feet'].flatMap((part) => Array.from({ length: 5 }, (_, index) => `${part}-${index + 1}`)),
  ];
  types.forEach((type) => assert.notEqual(getItemDetail(type).name, type));
});
