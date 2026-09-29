import test from 'node:test';
import assert from 'node:assert/strict';
import GameClock from '../../src/game/GameClock.js';
import InformationWindowManager, { INFORMATION_WINDOW_PAUSE_REASON } from '../../src/app/InformationWindowManager.js';
import EntityRegistry from '../../src/game/EntityRegistry.js';
import { createDefinitionInformationTarget } from '../../src/app/InformationTarget.js';

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

test('opening an already visible target does not create or close any window', () => {
  const manager = new InformationWindowManager();
  const tag = manager.open({ type: 'tag', data: { tag: 'valor' } });
  manager.open({ type: 'status', parentId: tag.id, data: { status: 'power' } });
  const repeated = manager.open({ type: 'tag', data: { tag: 'valor' } });

  assert.equal(repeated.id, tag.id);
  assert.deepEqual(manager.entries.map((entry) => entry.id), [tag.id, manager.entries[1].id]);
});

test('facility help windows use their facility identity to avoid duplicates', () => {
  const manager = new InformationWindowManager();
  const shop = manager.open({ type: 'facility', data: { facility: 'shop' } });
  const repeated = manager.open({ type: 'facility', data: { facility: 'shop' } });
  assert.equal(repeated.id, shop.id);
  assert.equal(manager.entries.length, 1);
});

test('area help windows use their area identity to avoid duplicates', () => {
  const manager = new InformationWindowManager();
  const home = manager.open({ type: 'area', data: { area: 'preparation' } });
  const repeated = manager.open({ type: 'area', data: { area: 'preparation' } });
  assert.equal(repeated.id, home.id);
  assert.equal(manager.entries.length, 1);
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

test('pinned windows survive outside focus and do not pause the game', () => {
  const clock = new GameClock();
  const manager = new InformationWindowManager({ clock });
  manager.setPauseOnOpen(true);
  const pinned = manager.open({ type: 'tag', data: { tag: 'valor' } });
  manager.togglePin(pinned.id);
  assert.equal(clock.pauseReasons.has(INFORMATION_WINDOW_PAUSE_REASON), false);

  const transient = manager.open({ type: 'status', data: { status: 'power' } });
  assert.equal(clock.pauseReasons.has(INFORMATION_WINDOW_PAUSE_REASON), true);
  manager.focus(null);

  assert.deepEqual(manager.entries.map((entry) => entry.id), [pinned.id]);
  assert.equal(clock.pauseReasons.has(INFORMATION_WINDOW_PAUSE_REASON), false);
  assert.equal(transient.pinned, false);
});

test('closing a window closes windows opened from it and keeps another pinned window', () => {
  const manager = new InformationWindowManager();
  const parent = manager.open({ type: 'tag', data: { tag: 'valor' } });
  manager.togglePin(parent.id);
  const child = manager.open({ type: 'status', parentId: parent.id, data: { status: 'power' } });
  manager.togglePin(child.id);
  const other = manager.open({ type: 'facility', data: { facility: 'shop' } });
  manager.togglePin(other.id);

  manager.close(parent.id);

  assert.deepEqual(manager.entries.map((entry) => entry.id), [other.id]);
});

test('closing the last unpinned window releases the information-window pause', () => {
  const clock = new GameClock();
  const manager = new InformationWindowManager({ clock });
  manager.setPauseOnOpen(true);
  const pinned = manager.open({ type: 'tag', data: { tag: 'valor' } });
  manager.togglePin(pinned.id);
  const open = manager.open({ type: 'status', data: { status: 'power' } });
  assert.equal(clock.pauseReasons.has(INFORMATION_WINDOW_PAUSE_REASON), true);

  manager.close(pinned.id);
  assert.equal(clock.pauseReasons.has(INFORMATION_WINDOW_PAUSE_REASON), true);

  manager.close(open.id);
  assert.deepEqual(manager.entries.map((entry) => entry.id), []);
  assert.equal(clock.pauseReasons.has(INFORMATION_WINDOW_PAUSE_REASON), false);
});

test('different entity instances with the same name open independently', () => {
  const registry = new EntityRegistry();
  const manager = new InformationWindowManager({ entityRegistry: registry });
  const first = { type: 'sword', name: '歩く世界樹', chip: { type: 'item' } };
  const second = { type: 'sword', name: '歩く世界樹', chip: { type: 'item' } };
  registry.register(first);
  registry.register(second);
  const firstEntry = manager.open({ type: 'instance', data: { target: manager.createInstanceTarget(first) } });
  manager.togglePin(firstEntry.id);
  const secondEntry = manager.open({ type: 'instance', data: { target: manager.createInstanceTarget(second) } });
  assert.equal(manager.entries.length, 2);
  assert.equal(manager.getInstance(secondEntry.data.target), second);
});

test('a pinned information window retains its dragged position', () => {
  const manager = new InformationWindowManager();
  const entry = manager.open({ type: 'tag', data: { tag: 'valor' } });
  manager.togglePin(entry.id);
  manager.setPosition(entry.id, { x: 120, y: 240 });
  assert.deepEqual(manager.entries[0].position, { x: 120, y: 240 });
});

test('an information window retains its scale independently of pinning', () => {
  const manager = new InformationWindowManager();
  const entry = manager.open({ type: 'tag', data: { tag: 'valor' } });
  assert.equal(manager.entries[0].scale, 1);
  manager.toggleCompact(entry.id);
  manager.togglePin(entry.id);

  assert.equal(manager.entries[0].scale, 0.5);
  assert.equal(manager.entries[0].pinned, true);
  manager.toggleCompact(entry.id);
  assert.equal(manager.entries[0].scale, 1);
});

test('the size button restores a dragged scale without moving the window', () => {
  const manager = new InformationWindowManager();
  const entry = manager.open({ type: 'tag', data: { tag: 'valor' } });
  manager.setFrame(entry.id, { scale: 1.4, position: { x: 30, y: 40 } });
  manager.toggleCompact(entry.id);

  assert.equal(manager.entries[0].scale, 1);
  assert.deepEqual(manager.entries[0].position, { x: 30, y: 40 });
});

test('language refresh redraws the same window entries without changing their presentation state', () => {
  const notifications = [];
  const manager = new InformationWindowManager({ onChange: (entries) => notifications.push(entries) });
  const entry = manager.open({ type: 'facility', data: { facility: 'training' }, anchor: { x: 30, y: 40 } });
  manager.togglePin(entry.id);
  manager.toggleCompact(entry.id);
  manager.setPosition(entry.id, { x: 120, y: 240 });
  const before = manager.entries[0];
  notifications.length = 0;

  manager.refreshEntries();

  assert.equal(notifications.length, 1);
  assert.deepEqual(notifications[0][0], before);
  assert.deepEqual(manager.entries[0], before);
});

test('dynamic entity and item entries refresh unless a window is being dragged', () => {
  let changes = 0;
  const registry = new EntityRegistry();
  const manager = new InformationWindowManager({ entityRegistry: registry, onChange: () => { changes += 1; } });
  const hero = { heroId: 'swordfighter', chip: { type: 'hero' } };
  const item = { type: 'sword', chip: { type: 'item' } };
  registry.register(hero);
  registry.register(item);
  manager.open({ type: 'instance', data: { target: manager.createInstanceTarget(hero) } });
  manager.open({ type: 'instance', data: { target: manager.createInstanceTarget(item) } });
  changes = 0;
  manager.refreshDynamicEntries();
  assert.equal(changes, 1);
  manager.setDragging(true);
  manager.refreshDynamicEntries();
  assert.equal(changes, 1);
  manager.setDragging(false);
  manager.setInteracting(true);
  manager.refreshDynamicEntries();
  assert.equal(changes, 1);
});

test('destroyed entity information windows close even when pinned', () => {
  const registry = new EntityRegistry();
  const manager = new InformationWindowManager({ entityRegistry: registry });
  const enemy = { hp: 3, definition: { id: 'small-valor' }, chip: { type: 'enemy' } };
  registry.register(enemy);
  const entry = manager.open({ type: 'instance', data: { target: manager.createInstanceTarget(enemy) } });
  manager.togglePin(entry.id);
  registry.destroy(enemy);
  manager.closeInvalidEntries();
  assert.equal(manager.entries.length, 0);
});

test('instance information targets identify live instances and close only their destroyed window', () => {
  const registry = new EntityRegistry();
  const manager = new InformationWindowManager({ entityRegistry: registry });
  const first = { type: 'sword', chip: { type: 'item' } };
  const second = { type: 'sword', chip: { type: 'item' } };
  registry.register(first);
  registry.register(second);

  const firstTarget = manager.createInstanceTarget(first);
  const secondTarget = manager.createInstanceTarget(second);
  const firstEntry = manager.open({ type: 'instance', data: { target: firstTarget } });
  manager.togglePin(firstEntry.id);
  const duplicate = manager.open({ type: 'instance', data: { target: firstTarget } });
  const secondEntry = manager.open({ type: 'instance', data: { target: secondTarget } });

  assert.equal(duplicate.id, firstEntry.id);
  assert.notEqual(firstTarget.instanceId, secondTarget.instanceId);
  assert.equal(manager.getInstance(firstTarget), first);
  assert.equal(manager.entries.length, 2);

  registry.destroy(first);
  manager.closeInvalidEntries();

  assert.deepEqual(manager.entries.map((entry) => entry.id), [secondEntry.id]);
  assert.equal(manager.getInstance(firstTarget), null);
  assert.equal(manager.getInstance(secondTarget), second);
});

test('static enemy definition information remains open when an unrelated instance is destroyed', () => {
  const registry = new EntityRegistry();
  const manager = new InformationWindowManager({ entityRegistry: registry });
  const source = { hp: 3, chip: { type: 'enemy' } };
  registry.register(source);
  manager.open({ type: 'definition', data: { target: createDefinitionInformationTarget('enemy', 'phantom-area-head') } });
  registry.destroy(source);
  manager.closeInvalidEntries();
  assert.equal(manager.entries.length, 1);
});

test('unique skill information is shared by Ex level', () => {
  const manager = new InformationWindowManager();
  const target = createDefinitionInformationTarget('unique-skill', 'area-head-rush');
  const ex1 = manager.open({ type: 'definition', data: { target } });
  const ex2 = manager.open({ type: 'definition', data: { target } });
  assert.equal(ex2.id, ex1.id);
  assert.equal(manager.entries.length, 1);
});

test('item information windows remain open when an item moves and close when it is destroyed', () => {
  const registry = new EntityRegistry();
  const manager = new InformationWindowManager({ entityRegistry: registry });
  const item = { type: 'sword', chip: { type: 'item' } };
  registry.register(item);
  manager.open({ type: 'instance', data: { target: manager.createInstanceTarget(item) } });
  manager.closeInvalidEntries();
  assert.equal(manager.entries.length, 1);

  registry.destroy(item);
  manager.closeInvalidEntries();
  assert.equal(manager.entries.length, 0);
});
