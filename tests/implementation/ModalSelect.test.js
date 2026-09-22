import test from 'node:test';
import assert from 'node:assert/strict';
import { getModalSelectOptionsPlacement } from '../../src/app/ModalSelect.js';

test('modal select opens toward the side that can show its options', () => {
  assert.deepEqual(
    getModalSelectOptionsPlacement({ availableAbove: 80, availableBelow: 20, optionsHeight: 60 }),
    { direction: 'above', maximumHeight: 80 },
  );
  assert.deepEqual(
    getModalSelectOptionsPlacement({ availableAbove: 20, availableBelow: 80, optionsHeight: 60 }),
    { direction: 'below', maximumHeight: 80 },
  );
});

test('modal select keeps the list on the roomier side when neither side fits', () => {
  assert.deepEqual(
    getModalSelectOptionsPlacement({ availableAbove: 30, availableBelow: 20, optionsHeight: 60 }),
    { direction: 'above', maximumHeight: 30 },
  );
});
