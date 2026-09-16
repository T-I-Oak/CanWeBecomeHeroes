import test from 'node:test';
import assert from 'node:assert/strict';
import HeroProgressRepository, { HERO_PROGRESS_KEY, INITIAL_UNLOCKED_PROFESSION_IDS } from '../../src/game/HeroProgressRepository.js';

test('hero progress starts with swordfighter and guard unlocked and persists newly unlocked heroes', () => {
  const values = new Map();
  const repository = new HeroProgressRepository({ getValue: (key) => values.get(key), setValue: (key, value) => values.set(key, value) });

  assert.deepEqual(repository.getUnlockedProfessionIds(), INITIAL_UNLOCKED_PROFESSION_IDS);
  assert.deepEqual(repository.unlock('mage'), ['swordfighter', 'guard', 'mage']);
  assert.deepEqual(values.get(HERO_PROGRESS_KEY), { unlockedProfessionIds: ['swordfighter', 'guard', 'mage'] });
  assert.deepEqual(repository.unlock('mage'), ['swordfighter', 'guard', 'mage']);
});

test('hero progress persists a trial roster without duplicate professions', () => {
  const values = new Map();
  const repository = new HeroProgressRepository({ getValue: (key) => values.get(key), setValue: (key, value) => values.set(key, value) });

  assert.deepEqual(repository.unlockMany(['mage', 'guard', 'mage']), ['swordfighter', 'guard', 'mage']);
  assert.deepEqual(values.get(HERO_PROGRESS_KEY), { unlockedProfessionIds: ['swordfighter', 'guard', 'mage'] });
});
