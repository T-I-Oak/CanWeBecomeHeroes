import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import GameTextRepository from '../../src/game/GameTextRepository.js';
import InformationWindowLayer from '../../src/app/InformationWindowLayer.js';
import InformationWindowManager from '../../src/app/InformationWindowManager.js';
import { STATUS_VISUALS } from '../../src/game/StatusVisualCatalog.js';
import { TAGS } from '../../src/game/TagCatalog.js';
import { ENEMY_CATALOG } from '../../src/game/EnemyCatalog.js';
import { UNIQUE_SKILL_CATALOG } from '../../src/game/UniqueSkillCatalog.js';
import StageSelectionModal from '../../src/app/StageSelectionModal.js';
import BattleSystem from '../../src/game/BattleSystem.js';
import HeroFactory, { HERO_PROFESSION_IDS } from '../../src/game/HeroFactory.js';
import { clearL10nCache, setLanguage } from '../../../GameWorksOAK/src/lib/core/i18n.js';

// Minimal DOM supporting the production information-window renderer and click handlers.
class Element {
  constructor(tag) {
    this.tag = tag;
    this.children = [];
    this.dataset = {};
    this.style = { setProperty() {} };
    this.classList = { add() {} };
    this.listeners = {};
    this.attributes = {};
  }
  append(...children) { this.children.push(...children.flatMap(c => c?.tag === 'fragment' ? c.children : [c])); }
  replaceChildren(...children) { this.children = []; this.append(...children); }
  set textContent(value) { this.children = [value]; }
  get textContent() { return this.children.map(c => typeof c === 'object' ? c.textContent : c).join(''); }
  setAttribute(key, value) { this.attributes[key] = value; }
  addEventListener(type, fn) { this.listeners[type] = fn; }
  querySelector(selector) { return this.findAll(selector)[0] ?? null; }
  findAll(selector) {
    return this.children.filter(c => c instanceof Element).flatMap(c =>
      [...(c.className?.split(' ').includes(selector.slice(1)) ? [c] : []), ...c.findAll(selector)]);
  }
  getBoundingClientRect() { return { x: 0, y: 0, width: 300, height: 240 }; }
}

test('status resources render, switch language from cache, and preserve links and window state', async (t) => {
  const raw = JSON.parse(await readFile(new URL('../../public/data/game_text.json', import.meta.url)));
  let language = 'ja';
  let fetches = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    fetches += 1;
    return { ok: true, json: async () => raw };
  });
  const globals = { localStorage: { getItem: () => language, setItem: (_, value) => { language = value; } },
    document: { createElement: tag => new Element(tag), createElementNS: (_, tag) => new Element(tag),
      createDocumentFragment: () => new Element('fragment') }, innerWidth: 1280, innerHeight: 720 };
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
  const layer = new InformationWindowLayer(root, null, repository);
  const manager = new InformationWindowManager({ onChange: entries => layer.render(entries) });
  layer.manager = manager;
  const ids = Object.keys(STATUS_VISUALS);
  assert.equal(ids.length, 9);
  for (const id of ids) {
    const entry = manager.open({ type: 'status', data: { status: id }, anchor: { x: 20, y: 40 } });
    const detail = repository.getInformationDetail('status', id);
    assert.equal(root.querySelector('.InformationWindow__Name').textContent, detail.name);
    for (const token of detail.description) {
      if (token.type === 'reference') {
        assert.equal('label' in token, false);
        assert.ok(token.kind === 'tag' ? TAGS[token.id] : repository.getInformationDetail(token.kind, token.id));
      } else assert.equal(typeof token.value, 'string');
    }
    assert.ok(entry.id);
  }
  manager.clear({ includePinned: true });
  const parent = manager.open({ type: 'status', data: { status: 'stamina' }, anchor: { x: 20, y: 40 } });
  root.findAll('.InformationWindow__InlineReference')[0].listeners.click({ clientX: 70, clientY: 80 });
  const child = manager.entries[1];
  assert.equal(child.data.status, 'durability');
  assert.equal(child.parentId, parent.id);
  manager.togglePin(parent.id);
  manager.toggleCompact(parent.id);
  manager.setPosition(parent.id, { x: 100, y: 200 });
  const before = manager.entries;
  setLanguage('en');
  await repository.refreshLanguage();
  manager.refreshEntries();
  assert.deepEqual(manager.entries, before);
  assert.deepEqual(root.findAll('.InformationWindow__Name').map(el => el.textContent), ['Stamina', 'Durability']);
  assert.equal(root.children[0].style.left, '100px');
  assert.ok(root.children[0].className.includes('is-compact'));
  assert.match(root.textContent, /An ally's Durability/);
  for (const id of ids) {
    const detail = repository.getInformationDetail('status', id);
    assert.doesNotMatch(detail.name + detail.description.filter(p => p.type === 'text').map(p => p.value).join(''), /[ぁ-んァ-ヶ一-龠]/);
    manager.clear({ includePinned: true });
    manager.open({ type: 'status', data: { status: id }, anchor: { x: 20, y: 40 } });
    assert.equal(root.querySelector('.InformationWindow__Name').textContent, detail.name);
  }
  setLanguage('ja');
  await repository.refreshLanguage();
  manager.refreshEntries();
  assert.equal(root.querySelector('.InformationWindow__Name').textContent, '重量');
  for (const lang of ['ja', 'en']) {
    setLanguage(lang);
    await repository.refreshLanguage();
    for (const tag of Object.keys(TAGS)) {
      manager.clear({ includePinned: true });
      const parent = manager.open({ type: 'tag', data: { tag }, anchor: { x: 20, y: 40 } });
      const detail = repository.getInformationDetail('tag', tag);
      assert.equal(root.querySelector('.InformationWindow__Name').textContent, detail.name);
      if (lang === 'en') assert.doesNotMatch(root.textContent, /[ぁ-んァ-ヶ一-龠]/);
      const skillNames = root.findAll('.InformationWindow__SkillName').map(el => el.textContent);
      assert.deepEqual(skillNames, detail.skillNames ?? []);
      if (TAGS[tag].group === 'status') {
        assert.deepEqual(root.findAll('.InformationWindow__SkillRequirement').map(el => el.textContent), ['1', '3', '5', '7']);
        const links = root.findAll('.InformationWindow__InlineReference');
        links[0].listeners.click({ clientX: 70, clientY: 80 });
        assert.equal(manager.entries[1].data.status, TAGS[tag].stat);
        assert.equal(manager.entries[1].parentId, parent.id);
        links[1].listeners.click({ clientX: 70, clientY: 80 });
        assert.equal(manager.entries[1].data.term, 'tag-skill');
        assert.equal(root.findAll('.InformationWindow__Name')[1].textContent, repository.getName('term', 'tag-skill'));
      }
    }
  }
  const itemTypes = [
    'sword', 'shield', 'staff', 'holy-book', 'claw', 'bow', 'banner', 'orb', 'holy-symbol', 'tarot-cards',
    'shopping-bag', 'hero-license', 'renewal-form',
    ...['head', 'torso', 'feet'].flatMap(part => Array.from({ length: 5 }, (_, i) => `${part}-${i + 1}`)),
  ];
  const item = { type: 'sword', category: 'weapon', tags: ['valor'], chip: { centerPath: '/assets/items/sword.png', weight: 3 }, value: 2 };
  for (const lang of ['ja', 'en']) {
    setLanguage(lang);
    await repository.refreshLanguage();
    for (const type of itemTypes) {
      manager.clear({ includePinned: true });
      item.type = type;
      const parent = manager.open({ type: 'item', data: { item }, anchor: { x: 20, y: 40 } });
      const detail = repository.getInformationDetail('item', type);
      assert.ok(detail.name);
      assert.ok(detail.flavor);
      assert.equal(root.querySelector('.InformationWindow__Name').textContent, detail.name);
      assert.equal(root.querySelector('.InformationWindow__Description').textContent, detail.flavor);
      assert.equal(root.querySelector('.InformationWindow__ItemValue').textContent, '2');
      assert.equal(root.findAll('.InformationWindow__ItemValueIcon').length, 1);
      assert.equal(root.findAll('.InformationWindow__AttributeBadge').length, 2);
      assert.equal(root.findAll('.InformationWindow__ItemBadgeList').length, 1);
      assert.equal(root.findAll('.InformationWindow__ItemBadge').length, 3);
      if (type === 'sword') assert.equal(root.querySelector('.InformationWindow__ItemTargetingNote').textContent, repository.getLabel('weaponTargetingNote'));
      if (lang === 'en') assert.doesNotMatch(root.textContent, /[ぁ-んァ-ヶ一-龠]/);
      const refs = (detail.description ?? []).filter(p => p.type === 'reference');
      const buttons = root.findAll('.InformationWindow__InlineReference');
      assert.equal(buttons.length, refs.length);
      refs.forEach((ref, index) => {
        buttons[index].listeners.click({ clientX: 70, clientY: 80 });
        assert.equal(manager.entries[1].type, ref.kind);
        assert.equal(manager.entries[1].data[ref.kind], ref.id);
        assert.equal(manager.entries[1].parentId, parent.id);
      });
      root.querySelector('.InformationWindow__ItemValue').listeners.click({ clientX: 70, clientY: 80 });
      assert.equal(manager.entries[1].type, 'term');
      assert.equal(manager.entries[1].data.term, 'item-value');
      assert.equal(manager.entries[1].parentId, parent.id);
    }
  }
  manager.clear({ includePinned: true });
  item.type = 'sword';
  const itemEntry = manager.open({ type: 'item', data: { item }, anchor: { x: 20, y: 40 } });
  manager.togglePin(itemEntry.id);
  manager.toggleCompact(itemEntry.id);
  manager.setPosition(itemEntry.id, { x: 90, y: 110 });
  const itemState = manager.entries;
  setLanguage('ja');
  await repository.refreshLanguage();
  manager.refreshEntries();
  assert.equal(root.querySelector('.InformationWindow__Name').textContent, '剣');
  assert.deepEqual(manager.entries, itemState);
  setLanguage('en');
  await repository.refreshLanguage();
  manager.refreshEntries();
  assert.equal(root.querySelector('.InformationWindow__Name').textContent, 'Sword');
  assert.deepEqual(manager.entries, itemState);
  const enemy = {
    definition: ENEMY_CATALOG['large-area'], uniqueSkill: null,
    chip: { type: 'enemy', radius: 64, centerPath: '/assets/enemies/large-area.png' },
    equipment: [], tags: [], hp: 3, maximumHp: 3, maximums: {},
    getStatus: () => 0, getTagCount: () => 0, getCarriedWeight: () => 0,
  };
  for (const lang of ['ja', 'en']) {
    setLanguage(lang);
    await repository.refreshLanguage();
    assert.deepEqual(Object.keys(raw.information.enemy).sort(), Object.keys(ENEMY_CATALOG).sort());
    for (const definition of Object.values(ENEMY_CATALOG)) {
      manager.clear({ includePinned: true });
      enemy.definition = definition;
      enemy.uniqueSkill = definition.uniqueSkill;
      const parent = manager.open({ type: 'entity', data: { entity: enemy }, anchor: { x: 20, y: 40 } });
      assert.equal(root.querySelector('.InformationWindow__Name').textContent, repository.getName('enemy', definition.id));
      assert.equal(root.findAll('.InformationWindow__EntityTagList').length, 1);
      assert.equal(root.findAll('.InformationWindow__ItemTagList').length, 0);
      assert.equal(root.findAll('.InformationWindow__ItemBadge').length, 0);
      if (lang === 'en') assert.doesNotMatch(root.textContent, /[ぁ-んァ-ヶ一-龠]/);
      if (definition.id.endsWith('-area') && definition.size !== 'small') {
        root.findAll('.InformationWindow__InlineReference')[0].listeners.click({ clientX: 70, clientY: 80 });
        assert.equal(manager.entries[1].data.enemyId, 'phantom-area-head');
        assert.equal(manager.entries[1].data.source, enemy);
        assert.equal(manager.entries[1].parentId, parent.id);
      }
    }
    for (const skill of Object.values(UNIQUE_SKILL_CATALOG)) {
      for (const level of [1, 2]) {
        manager.clear({ includePinned: true });
        manager.open({ type: 'unique-skill', data: { uniqueSkill: { id: skill.id, level }, source: enemy }, anchor: { x: 20, y: 40 } });
        assert.equal(root.querySelector('.InformationWindow__Name').textContent, repository.getName('unique-skill', skill.id));
        assert.equal(root.findAll('.InformationWindow__UniqueSkillLevelEffect').length, 2);
        if (lang === 'en') assert.doesNotMatch(root.textContent, /[ぁ-んァ-ヶ一-龠]/);
        if (skill.id === 'area-head-rush') {
          root.findAll('.InformationWindow__InlineReference')[0].listeners.click({ clientX: 70, clientY: 80 });
          assert.equal(manager.entries[1].data.enemyId, 'phantom-area-head');
        }
      }
    }
  }
  const modal = new StageSelectionModal(new Element('div'), { assets: {}, textRepository: repository });
  modal.drawChipPreview = () => {};
  enemy.definition = ENEMY_CATALOG['small-valor'];
  const slot = modal.createEnemySlot(enemy, { slotPosition: 1, span: 1 });
  assert.equal(slot.querySelector('.StageSelection__EnemyName').textContent, 'Goblin');
  const battle = new BattleSystem(null, { textRepository: repository });
  assert.equal(battle.getEntityLabel(enemy), '【Goblin】');
  setLanguage('ja');
  await repository.refreshLanguage();
  modal.refreshLanguage();
  assert.equal(slot.querySelector('.StageSelection__EnemyName').textContent, 'ゴブリン');
  assert.equal(battle.getEntityLabel(enemy), '【ゴブリン】');
  const heroes = HERO_PROFESSION_IDS.map(profession => new HeroFactory().create({ profession, x: 0, y: 0, stamina: 3 }));
  assert.equal(heroes.length, 8);
  for (const lang of ['ja', 'en']) {
    setLanguage(lang);
    await repository.refreshLanguage();
    for (const hero of heroes) {
      manager.clear({ includePinned: true });
      const entry = manager.open({ type: 'entity', data: { entity: hero }, anchor: { x: 20, y: 40 } });
      const label = repository.getHeroLabel(hero);
      assert.equal(root.querySelector('.InformationWindow__Name').textContent, `【${label}】`);
      assert.equal(battle.getEntityLabel(hero), `【${label}】`);
      if (lang === 'en') assert.doesNotMatch(root.textContent, /[ぁ-んァ-ヶ一-龠]/);
      assert.ok(repository.getInformationDetail('hero', hero.heroId).description.length);
      manager.togglePin(entry.id);
      manager.toggleCompact(entry.id);
      manager.setPosition(entry.id, { x: 80, y: 120 });
      const before = manager.entries;
      setLanguage(lang === 'ja' ? 'en' : 'ja');
      await repository.refreshLanguage();
      manager.refreshEntries();
      assert.deepEqual(manager.entries, before);
      assert.equal(root.querySelector('.InformationWindow__Name').textContent, `【${repository.getHeroLabel(hero)}】`);
      setLanguage(lang);
      await repository.refreshLanguage();
    }
  }
  assert.equal(repository.getHeroLabel(heroes[0]), 'Avery the Swordfighter');
  for (const lang of ['ja', 'en']) {
    setLanguage(lang);
    await repository.refreshLanguage();
    for (const kind of ['area', 'facility']) {
      for (const id of Object.keys(raw.information[kind])) {
        manager.clear({ includePinned: true });
        const parent = manager.open({ type: kind, data: { [kind]: id }, anchor: { x: 20, y: 40 } });
        const detail = repository.getInformationDetail(kind, id);
        assert.equal(root.querySelector('.InformationWindow__Name').textContent, detail.name);
        assert.equal(root.querySelector('.InformationWindow__Description').textContent, detail.flavor);
        if (lang === 'en') assert.doesNotMatch(root.textContent, /[ぁ-んァ-ヶ一-龠]/);
        const refs = detail.description.filter(p => p.type === 'reference');
        const buttons = root.findAll('.InformationWindow__InlineReference');
        assert.equal(buttons.length, refs.length);
        refs.forEach((ref, index) => {
          buttons[index].listeners.click({ clientX: 70, clientY: 80 });
          const target = manager.entries.find(e => e.type === ref.kind && e.data[ref.kind] === ref.id);
          assert.ok(target);
          assert.equal(target.parentId, parent.id);
        });
        manager.togglePin(parent.id);
        manager.toggleCompact(parent.id);
        manager.setPosition(parent.id, { x: 90, y: 100 });
        const state = manager.entries;
        setLanguage(lang === 'ja' ? 'en' : 'ja');
        await repository.refreshLanguage();
        manager.refreshEntries();
        assert.deepEqual(manager.entries, state);
        assert.equal(root.querySelector('.InformationWindow__Name').textContent, repository.getName(kind, id));
        setLanguage(lang);
        await repository.refreshLanguage();
      }
    }
  }
  manager.clear({ includePinned: true });
  const centered = manager.open({ type: 'status', data: { status: 'weight' } });
  assert.ok(root.querySelector('.InformationWindow').style.left.endsWith('px'));
  manager.setPosition(centered.id, { x: 9999, y: 9999 });
  const constrained = root.querySelector('.InformationWindow');
  assert.ok(parseFloat(constrained.style.left) < globalThis.innerWidth);
  assert.ok(parseFloat(constrained.style.top) < globalThis.innerHeight);
  assert.deepEqual(manager.entries[0].position, { x: 9999, y: 9999 });
  assert.equal(fetches, 1);
});
