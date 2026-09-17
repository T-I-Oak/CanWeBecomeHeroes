import test from 'node:test';
import assert from 'node:assert/strict';
import { ATTRIBUTE_TAGS, STATUS_KEYS, STATUS_TAGS } from '../../src/game/TagCatalog.js';
import { TAG_DISPLAY_GRID } from '../../src/game/TagDisplayLayout.js';

test('tag display layout follows the catalog status columns and attributes', () => {
  assert.deepEqual(TAG_DISPLAY_GRID, [
    STATUS_KEYS.map((status) => STATUS_TAGS[status][0]),
    STATUS_KEYS.map((status) => STATUS_TAGS[status][1]),
    [...ATTRIBUTE_TAGS],
  ]);
});
