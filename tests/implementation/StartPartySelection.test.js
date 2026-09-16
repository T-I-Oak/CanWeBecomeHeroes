import test from 'node:test';
import assert from 'node:assert/strict';
import StartPartySelection from '../../src/game/StartPartySelection.js';

test('start party selection keeps two heroes and makes a newly selected roster hero first', () => {
  const selection = new StartPartySelection({ unlockedProfessionIds: ['swordfighter', 'guard', 'mage'] });
  assert.deepEqual(selection.professionIds, ['swordfighter', 'guard']);

  selection.selectRosterHero('mage');

  assert.deepEqual(selection.professionIds, ['mage', 'swordfighter']);
  assert.equal(selection.isSelected('swordfighter'), true);
  assert.equal(selection.isSelected('guard'), false);
  assert.equal(selection.isSelected('mage'), true);
});

test('selecting the second hero promotes it to first and moves the first hero to second', () => {
  const selection = new StartPartySelection({ unlockedProfessionIds: ['swordfighter', 'guard'] });
  selection.selectRosterHero('guard');
  assert.deepEqual(selection.professionIds, ['guard', 'swordfighter']);
});

test('selecting the first hero leaves the party order unchanged', () => {
  const selection = new StartPartySelection({ unlockedProfessionIds: ['swordfighter', 'guard'] });
  selection.selectRosterHero('swordfighter');
  assert.deepEqual(selection.professionIds, ['swordfighter', 'guard']);
});
