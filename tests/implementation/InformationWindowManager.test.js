import test from 'node:test';
import assert from 'node:assert/strict';
import GameClock from '../../src/game/GameClock.js';
import InformationWindowManager, { INFORMATION_WINDOW_PAUSE_REASON } from '../../src/app/InformationWindowManager.js';

test('information windows retain the tapped branch and close its descendants', () => {
  const manager = new InformationWindowManager();
  const first = manager.open({ type: 'tag', data: { tag: 'valor' } });
  const second = manager.open({ type: 'tag-skill', parentId: first.id, data: { name: '勘所' } });

  manager.focus(first.id);
  assert.deepEqual(manager.entries.map((entry) => entry.id), [first.id]);

  const replacement = manager.open({ type: 'tag-skill', parentId: first.id, data: { name: '急所見切り' } });
  const child = manager.open({ type: 'tag-skill', parentId: replacement.id, data: { name: '詳細' } });
  manager.focus(child.id);
  assert.deepEqual(manager.entries.map((entry) => entry.id), [first.id, replacement.id, child.id]);
  assert.notEqual(second.id, replacement.id);
});

test('opening a sibling replaces the previous child branch', () => {
  const manager = new InformationWindowManager();
  const parent = manager.open({ type: 'tag', data: { tag: 'valor' } });
  const previousChild = manager.open({ type: 'tag-skill', parentId: parent.id, data: { name: '勘所' } });
  manager.open({ type: 'tag-skill', parentId: previousChild.id, data: { name: '詳細' } });
  const replacement = manager.open({ type: 'tag-skill', parentId: parent.id, data: { name: '急所見切り' } });

  assert.deepEqual(manager.entries.map((entry) => entry.id), [parent.id, replacement.id]);
});

test('focusing the current leaf does not notify or replace an unchanged window branch', () => {
  let changes = 0;
  const manager = new InformationWindowManager({ onChange: () => { changes += 1; } });
  const parent = manager.open({ type: 'tag', data: { tag: 'valor' } });
  const child = manager.open({ type: 'tag-skill', parentId: parent.id, data: { name: '勘所' } });
  changes = 0;

  manager.focus(child.id);

  assert.equal(changes, 0);
  assert.deepEqual(manager.entries.map((entry) => entry.id), [parent.id, child.id]);
});

test('information window pause reason composes with other game clock pauses', () => {
  const clock = new GameClock();
  const manager = new InformationWindowManager({ clock });
  manager.setPauseOnOpen(true);
  manager.open({ type: 'tag', data: { tag: 'valor' } });
  assert.equal(clock.pauseReasons.has(INFORMATION_WINDOW_PAUSE_REASON), true);
  clock.pause('stage-selection');
  manager.clear();
  assert.equal(clock.pauseReasons.has(INFORMATION_WINDOW_PAUSE_REASON), false);
  assert.equal(clock.isPaused, true);
  clock.resume('stage-selection');
  assert.equal(clock.isPaused, false);
});
