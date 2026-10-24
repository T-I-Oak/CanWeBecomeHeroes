import test from 'node:test';
import assert from 'node:assert/strict';
import InformationWindowLayer from '../../src/app/InformationWindowLayer.js';
import InformationWindowManager from '../../src/app/InformationWindowManager.js';
import { createDefinitionInformationTarget } from '../../src/app/InformationTarget.js';
import GameClock from '../../src/game/GameClock.js';
import EntityRegistry from '../../src/game/EntityRegistry.js';
import HeroFactory from '../../src/game/HeroFactory.js';
import EnemyFactory from '../../src/game/EnemyFactory.js';
import { ENEMY_CATALOG } from '../../src/game/EnemyCatalog.js';
import ItemFactory from '../../src/game/ItemFactory.js';
import GameTextRepository, { textPart } from '../../src/game/GameTextRepository.js';
import { readGameText } from '../../src/game/readGameText.js';
import { clearL10nCache } from '../../../GameWorksOAK/src/lib/core/i18n.js';

// Only DOM storage and event delivery are substituted; content and handlers use production code.
import Element from '../helpers/InformationDOM.js';

async function setup(t) {
  const raw = readGameText();
  t.mock.method(globalThis, 'fetch', async url => ({ ok: true, json: async () => textPart(raw, String(url)) }));
  const globals = {
    localStorage: { getItem: () => 'ja' }, innerWidth: 1280, innerHeight: 720,
    document: { createElement: tag => new Element(tag), createElementNS: (_, tag) => new Element(tag),
      createDocumentFragment: () => new Element('fragment') },
  };
  const previous = Object.fromEntries(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, value });
  clearL10nCache();
  t.after(() => {
    clearL10nCache();
    for (const [key, descriptor] of Object.entries(previous)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  const repository = await new GameTextRepository().load();
  const root = new Element('div');
  const registry = new EntityRegistry();
  const clock = new GameClock();
  const layer = new InformationWindowLayer(root, null, repository);
  const manager = new InformationWindowManager({ clock, entityRegistry: registry, onChange: entries => layer.render(entries) });
  layer.setManager(manager);
  const window = entry => root.children.find(element => element.dataset.informationWindowId === entry.id);
  const click = (entry, selector, index = 0) => {
    const button = window(entry).findAll(selector)[index];
    assert.ok(button, `Missing ${selector} at ${index}`);
    button.listeners.click({ clientX: 80, clientY: 80, stopPropagation() {} });
    return manager.entries.at(-1);
  };
  const open = (type, data) => manager.open({ type, data });
  const definition = (kind, id) => open('definition', { target: createDefinitionInformationTarget(kind, id) });
  const instance = entity => { registry.registerTree(entity); return open('instance', { target: manager.createInstanceTarget(entity) }); };
  const names = () => root.findAll('.InformationWindow__Name').map(element => element.textContent);
  return { root, registry, clock, layer, manager, window, click, open, definition, instance, names, repository };
}

test('05: dynamic updates retain windows, static content and scroll without measuring unchanged dimensions', async t => {
  const ui = await setup(t);
  const staticEntry = ui.definition('hero', 'Avery');
  ui.manager.togglePin(staticEntry.id);
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: 0, y: 0, stamina: 3 });
  const entry = ui.instance(hero);
  const window = ui.window(entry);
  const profile = window.querySelector('.InformationWindow__EntityProfile');
  const title = window.querySelector('.InformationWindow__Title');
  const staticWindow = ui.window(staticEntry);
  const content = window.querySelector('.InformationWindow__Content');
  assert.ok(!content.querySelector('.InformationWindow__Title'), 'the header is outside the scrollable body');
  assert.equal(title.parentElement, window, 'header controls remain attached to the window');
  content.scrollTop = 47;
  const gauge = window.findAll('.InformationWindow__EntityStatus')[5];
  const segment = gauge.querySelector('.InformationWindow__EntityStatusSegment');
  let measurements = 0;
  let created = 0;
  const create = document.createElement;
  t.mock.method(document, 'createElement', (...args) => { created++; return create(...args); });
  window.getBoundingClientRect = () => { measurements++; return { width: 300, height: 240 }; };
  ui.manager.refreshDynamicEntries();
  hero.stamina = 1.5;
  ui.manager.refreshDynamicEntries();
  assert.equal(ui.window(entry), window);
  assert.equal(ui.window(staticEntry), staticWindow);
  assert.equal(window.querySelector('.InformationWindow__EntityProfile'), profile);
  assert.equal(window.querySelector('.InformationWindow__Title'), title);
  assert.equal(content.scrollTop, 47);
  assert.equal(window.findAll('.InformationWindow__EntityStatus')[5], gauge);
  assert.equal(gauge.querySelector('.InformationWindow__EntityStatusSegment'), segment);
  assert.equal(created, 0);
  assert.equal(measurements, 0);
  ui.manager.setPosition(entry.id, { x: 30, y: 40 });
  assert.equal(measurements, 1);
  ui.manager.toggleCompact(entry.id);
  assert.equal(measurements, 2);
  let resizedEntry;
  ui.layer.resizeController.begin = (_event, _window, current) => { resizedEntry = current; };
  window.querySelector('.InformationWindow__Resize').listeners.pointerdown({});
  assert.equal(resizedEntry.scale, ui.manager.entries.at(-1).scale);
  assert.deepEqual(resizedEntry.position, { x: 30, y: 40 });
});

test('05: changed maximums, item values and tags update without rebuilding the title or profile', async t => {
  const ui = await setup(t);
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: 0, y: 0, stamina: 1 });
  const entry = ui.instance(hero);
  hero.maximums.stamina = 5;
  hero.tags.push('valor');
  ui.manager.refreshDynamicEntries();
  const segments = ui.window(entry).findAll('.InformationWindow__EntityStatus')[5].findAll('.InformationWindow__EntityStatusSegment');
  assert.ok(segments[4].className.includes('is-available'));
  assert.ok(!segments[5].className.includes('is-available'));
  assert.equal(ui.window(entry).querySelector('.InformationWindow__EntityTag').textContent, String(hero.getTagCount('valor')));
  const preview = ui.window(entry).querySelector('.InformationWindow__ChipPreview');
  hero.chip.flipped = !hero.chip.flipped;
  ui.manager.refreshDynamicEntries();
  assert.notEqual(ui.window(entry).querySelector('.InformationWindow__ChipPreview'), preview);
  const item = new ItemFactory().createWeapon({ weapon: 'sword', tags: ['valor'], x: 0, y: 0 });
  const itemEntry = ui.instance(item);
  const title = ui.window(itemEntry).querySelector('.InformationWindow__Title');
  const profile = ui.window(itemEntry).querySelector('.InformationWindow__EntityProfile');
  item.value = 17;
  item.chip.weight = 8;
  item.tags.push('fire', 'fire');
  ui.manager.refreshDynamicEntries();
  assert.equal(ui.window(itemEntry).querySelector('.InformationWindow__ItemValueAmount').textContent, '17');
  assert.equal(ui.window(itemEntry).querySelector('.InformationWindow__ItemWeightAmount').textContent, '8');
  assert.deepEqual(ui.window(itemEntry).findAll('.InformationWindow__ItemTag').map(node => node.textContent), ['1', '2']);
  assert.equal(ui.window(itemEntry).querySelector('.InformationWindow__Title'), title);
  assert.equal(ui.window(itemEntry).querySelector('.InformationWindow__EntityProfile'), profile);
});

test('05: viewport invalidation and manager replacement do not retain an old window with a reused id', async t => {
  const ui = await setup(t);
  const entry = ui.definition('hero', 'Avery');
  const window = ui.window(entry);
  let measurements = 0;
  window.getBoundingClientRect = () => { measurements++; return { width: 300, height: 240 }; };
  Object.defineProperty(globalThis, 'innerWidth', { configurable: true, value: 390 });
  ui.manager.refreshEntries();
  assert.equal(measurements, 1);
  const manager = new InformationWindowManager({ onChange: entries => ui.layer.render(entries) });
  ui.layer.setManager(manager);
  const replacement = manager.open({ type: 'status', data: { status: 'stamina' } });
  assert.equal(replacement.id, entry.id);
  assert.notEqual(ui.root.children[0], window);
  assert.equal(ui.root.querySelector('.InformationWindow__Name').textContent, ui.repository.getName('status', 'stamina'));
});

test('05: equipment replacement updates links while unchanged gauges survive', async t => {
  const ui = await setup(t);
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: 0, y: 0, stamina: 3 });
  const first = new ItemFactory().createWeapon({ weapon: 'sword', tags: ['valor'], x: 0, y: 0 });
  hero.equip(first);
  const entry = ui.instance(hero);
  const vital = ui.window(entry).findAll('.InformationWindow__EntityStatus')[5];
  const second = new ItemFactory().createWeapon({ weapon: 'sword', tags: ['valor'], x: 0, y: 0 });
  hero.equipment.rightHand = second;
  ui.registry.registerTree(hero);
  ui.manager.refreshDynamicEntries();
  assert.equal(ui.window(entry).findAll('.InformationWindow__EntityStatus')[5], vital);
  const child = ui.click(entry, '.InformationWindow__Equipment', 2);
  assert.equal(child.data.target.instanceId, ui.manager.createInstanceTarget(second).instanceId);
});

test('05: equipment → tag → status keeps ancestors; another equipment property replaces the unpinned branch', async t => {
  const ui = await setup(t);
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: 0, y: 0, stamina: 3 });
  const sword = new ItemFactory().createWeapon({ weapon: 'sword', tags: ['valor'], x: 0, y: 0 });
  hero.equip(sword);
  const parent = ui.instance(hero);
  const item = ui.click(parent, '.InformationWindow__Equipment', 2);
  const tag = ui.click(item, '.InformationWindow__ItemTag');
  const weight = ui.click(tag, '.InformationWindow__TagWeightReference');
  assert.deepEqual(ui.names(), [`【${ui.repository.getHeroLabel(hero)}】`, '剣', '武勇', '重量']);
  assert.deepEqual(ui.manager.entries.map(entry => entry.parentId), [null, parent.id, item.id, tag.id]);
  ui.manager.focus(weight.id);
  assert.equal(ui.root.children.length, 4, 'focusing the deepest window retains every ancestor');
  ui.click(item, '.InformationWindow__ItemValue');
  assert.deepEqual(ui.names(), [`【${ui.repository.getHeroLabel(hero)}】`, '剣', ui.repository.getName('term', 'item-value')]);
});

test('05: inner/outer focus, pinned branches, and close controls preserve only the requested windows', async t => {
  const ui = await setup(t);
  const parent = ui.open('tag', { tag: 'valor' });
  const pinned = ui.click(parent, '.InformationWindow__TagWeightReference');
  ui.click(pinned, '.InformationWindow__Pin');
  const child = ui.click(parent, '.InformationWindow__InlineReference');
  ui.manager.focus(child.id);
  assert.equal(ui.root.children.length, 3);
  ui.manager.focus(parent.id);
  assert.deepEqual(ui.names(), ['武勇', '重量']);
  ui.manager.focus(null);
  assert.deepEqual(ui.names(), ['重量']);
  ui.click(pinned, '.InformationWindow__Close');
  assert.deepEqual(ui.names(), []);

  const another = ui.open('tag', { tag: 'valor' });
  const descendant = ui.click(another, '.InformationWindow__TagWeightReference');
  ui.click(another, '.InformationWindow__Pin');
  ui.click(descendant, '.InformationWindow__Pin');
  ui.click(another, '.InformationWindow__Close');
  assert.equal(ui.root.children.length, 0);
});

test('05: pause setting and pin controls compose with manual, selection, and automatic pauses', async t => {
  const ui = await setup(t);
  const advance = () => ui.clock.advance(1 / 60, () => {});
  const entry = ui.open('tag', { tag: 'valor' });
  assert.equal(advance(), 1, 'setting off allows time to advance with an open window');
  ui.manager.setPauseOnOpen(true);
  assert.equal(advance(), 0);
  ui.click(entry, '.InformationWindow__Pin');
  assert.equal(ui.window(entry).querySelector('.InformationWindow__Pin').attributes['aria-pressed'], 'true');
  ui.manager.focus(null);
  assert.equal(ui.root.children.length, 1);
  assert.equal(advance(), 1);
  for (const reason of ['manual', 'stage-selection', 'auto-pause']) {
    if (reason === 'manual') ui.clock.togglePaused();
    else ui.clock.pause(reason);
    ui.click(entry, '.InformationWindow__Pin');
    ui.click(entry, '.InformationWindow__Pin');
    assert.equal(advance(), 0, `${reason} survives releasing the information pause`);
    if (reason === 'manual') ui.clock.togglePaused();
    else ui.clock.resume(reason);
    assert.equal(advance(), 1);
  }
  ui.click(entry, '.InformationWindow__Pin');
  assert.equal(advance(), 0);
  ui.manager.setPauseOnOpen(false);
  assert.equal(advance(), 1);
  ui.manager.setPauseOnOpen(true);
  ui.click(entry, '.InformationWindow__Close');
  assert.equal(advance(), 1);
});

test('05: definitions identify Hero, Enemy, Item and unique skill without instance values', async t => {
  const ui = await setup(t);
  for (const [kind, id] of [['hero', 'Avery'], ['enemy', 'small-valor'], ['item', 'sword'], ['unique-skill', 'area-head-rush']]) {
    ui.manager.clear({ includePinned: true });
    const entry = ui.definition(kind, id);
    assert.deepEqual(ui.names(), [ui.repository.getInformationDetail(kind, id).name]);
    assert.ok(ui.window(entry).textContent.length > ui.names()[0].length);
    assert.equal(ui.window(entry).findAll('.InformationWindow__EntityStatus').length, 0);
    assert.equal(ui.window(entry).findAll('.InformationWindow__Equipment').length, 0);
    assert.equal(ui.window(entry).findAll('.InformationWindow__ItemWeight').length, 0);
    assert.equal(ui.window(entry).findAll('.InformationWindow__UniqueSkill').length, 0);
  }
});

test('05: every static boss definition opens its catalog Ex skill while keeping its parent', async t => {
  const ui = await setup(t);
  for (const enemy of Object.values(ENEMY_CATALOG).filter(enemy => enemy.uniqueSkill)) {
    ui.manager.clear({ includePinned: true });
    const parent = ui.definition('enemy', enemy.id);
    const button = ui.window(parent).querySelector('.InformationWindow__UniqueSkill');
    const level = enemy.size === 'medium' ? 1 : 2;
    assert.ok(button, enemy.id);
    assert.equal(button.textContent, `Ex${level}`);
    assert.ok(button.className.includes(`level-${level}`));
    assert.equal(ui.window(parent).findAll('.InformationWindow__EntityStatus').length, 0);
    const child = ui.click(parent, '.InformationWindow__UniqueSkill');
    assert.equal(child.parentId, parent.id);
    assert.deepEqual(child.data.target, createDefinitionInformationTarget('unique-skill', enemy.uniqueSkill.id));
    assert.deepEqual(ui.names(), [ui.repository.getName('enemy', enemy.id),
      ui.repository.getInformationDetail('unique-skill', enemy.uniqueSkill.id).name]);
    ui.click(parent, '.InformationWindow__UniqueSkill');
    assert.equal(ui.manager.entries.length, 2, 'opening again replaces the unpinned child');
    ui.click(parent, '.InformationWindow__Close');
    assert.equal(ui.manager.entries.length, 0);
  }
});

test('05: live bosses retain their Ex skill links', async t => {
  const ui = await setup(t);
  for (const size of ['medium', 'large']) {
    ui.manager.clear({ includePinned: true });
    const enemy = new EnemyFactory().create({ size, tagAffinity: 'valor', slotPosition: 1,
      maximumHp: 3, totalTagCount: 5, random: () => 0 });
    const parent = ui.instance(enemy);
    assert.equal(ui.window(parent).querySelector('.InformationWindow__UniqueSkill').textContent,
      `Ex${size === 'medium' ? 1 : 2}`);
    const child = ui.click(parent, '.InformationWindow__UniqueSkill');
    assert.deepEqual(child.data.target, createDefinitionInformationTarget('unique-skill', enemy.uniqueSkill.id));
  }
});

test('05: live values, equipment, tags and weight render and refresh; destroyed instances close while definitions remain', async t => {
  const ui = await setup(t);
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: 0, y: 0, stamina: 3 });
  const sword = new ItemFactory().createWeapon({ weapon: 'sword', tags: ['valor'], x: 0, y: 0 });
  hero.equip(sword);
  const enemy = new EnemyFactory().create({ size: 'small', tagAffinity: 'valor', slotPosition: 1,
    maximumHp: 3, totalTagCount: 5, random: () => 0 });
  const staticEntry = ui.definition('hero', 'Avery');
  ui.click(staticEntry, '.InformationWindow__Pin');
  const heroEntry = ui.instance(hero);
  ui.click(heroEntry, '.InformationWindow__Pin');
  const enemyEntry = ui.instance(enemy);
  const fills = entry => ui.window(entry).findAll('.InformationWindow__EntityStatus')[5]
    .findAll('.InformationWindow__EntityStatusSegment').map(segment => segment.style['--status-segment-fill'] ?? '0%');
  assert.deepEqual(fills(heroEntry), ['100%', '100%', '100%', '0%', '0%', '0%', '0%']);
  assert.deepEqual(fills(enemyEntry), fills(heroEntry));
  assert.equal(ui.window(heroEntry).querySelector('.InformationWindow__WeightValue').textContent, String(hero.getCarriedWeight()));
  assert.equal(ui.window(heroEntry).findAll('.InformationWindow__Equipment').length, 5);
  assert.equal(ui.window(heroEntry).findAll('.InformationWindow__EntityTag')[0].textContent, '3');
  hero.stamina = 1.5;
  enemy.hp = 2;
  ui.manager.refreshDynamicEntries();
  assert.deepEqual(fills(heroEntry), ['100%', '50%', '0%', '0%', '0%', '0%', '0%']);
  assert.deepEqual(fills(enemyEntry), ['100%', '100%', '0%', '0%', '0%', '0%', '0%']);
  const itemEntry = ui.click(heroEntry, '.InformationWindow__Equipment', 2);
  assert.equal(ui.window(itemEntry).querySelector('.InformationWindow__ItemWeightAmount').textContent, String(sword.chip.weight));
  assert.equal(ui.window(itemEntry).querySelector('.InformationWindow__ItemValueAmount').textContent, String(sword.value));
  assert.equal(ui.window(itemEntry).querySelector('.InformationWindow__ItemTag').textContent, '1');
  ui.registry.destroy(hero);
  ui.manager.closeInvalidEntries();
  assert.equal(ui.window(heroEntry), undefined);
  assert.ok(ui.window(itemEntry), 'a separately live equipment instance remains available');
  assert.ok(ui.window(staticEntry));
  assert.ok(ui.window(enemyEntry));
  ui.registry.destroy(enemy);
  ui.registry.destroy(sword);
  ui.manager.closeInvalidEntries();
  assert.deepEqual(ui.names(), [ui.repository.getName('hero', 'Avery')]);
});
