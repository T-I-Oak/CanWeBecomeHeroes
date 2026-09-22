// Development-only review fixture; not a Vite production entry point.
import '../../src/styles.css';
import GameTextRepository from '../../src/game/GameTextRepository.js';
import InformationWindowLayer from '../../src/app/InformationWindowLayer.js';
import InformationWindowManager from '../../src/app/InformationWindowManager.js';
import EntityRegistry from '../../src/game/EntityRegistry.js';
import { createDefinitionInformationTarget } from '../../src/app/InformationTarget.js';
import HeroFactory, { HERO_PROFESSION_IDS } from '../../src/game/HeroFactory.js';
import { setupLanguageSelector, onLanguageChange } from '../../../GameWorksOAK/src/lib/core/i18n.js';

setupLanguageSelector('#language', ['ja', 'en']);
const texts = await new GameTextRepository().load();
const layer = new InformationWindowLayer(document.querySelector('#windows'), null, texts);
const entityRegistry = new EntityRegistry();
const manager = new InformationWindowManager({ entityRegistry, onChange: entries => layer.render(entries) });
layer.setManager(manager);
const entries = new Map();
for (const kind of ['area', 'facility', 'status', 'tag', 'term']) {
  for (const id of Object.keys(texts.resource.information[kind])) {
    entries.set(kind + '/' + id, { type: kind, data: { [kind]: id } });
  }
}
for (const id of Object.keys(texts.resource.information.item)) {
  const item = { type: id, tags: ['valor', 'fire'], chip: { type: 'item', centerPath: '/assets/items/sword.png', weight: 3 }, value: 8 };
  entityRegistry.register(item);
  entries.set('item/' + id, { type: 'instance', data: { target: manager.createInstanceTarget(item) } });
}
for (const profession of HERO_PROFESSION_IDS) {
  const hero = new HeroFactory().create({ profession, x: 0, y: 0, stamina: 3 });
  entityRegistry.register(hero);
  entries.set('hero/' + profession, { type: 'instance', data: { target: manager.createInstanceTarget(hero) } });
}
for (const id of Object.keys(texts.resource.information['unique-skill'])) {
  entries.set('unique-skill/' + id, { type: 'definition', data: { target: createDefinitionInformationTarget('unique-skill', id) } });
}
const selector = document.querySelector('#detail');
for (const key of entries.keys()) selector.add(new Option(key, key));
function show() {
  manager.clear({ includePinned: true });
  manager.open({ ...entries.get(selector.value), anchor: { x: 12, y: 90 } });
}
selector.addEventListener('change', show);
onLanguageChange(async () => { await texts.refreshLanguage(); document.documentElement.lang = texts.getLabel('documentLanguage'); manager.refreshEntries(); });
window.addEventListener('resize', () => manager.refreshEntries());
show();
