import { loadJsonWithL10nCached } from '../../../GameWorksOAK/src/lib/core/i18n.js';
import { resolvePublicAssetPath } from '../chips/PublicAssetPath.js';

const TEXT_RESOURCE_PATH = resolvePublicAssetPath('/data/game_text.json');

export default class GameTextRepository {
  constructor({ loadResource = loadJsonWithL10nCached } = {}) {
    this.loadResource = loadResource;
    this.resource = null;
  }

  async load() {
    this.resource = await this.loadResource(TEXT_RESOURCE_PATH);
    return this;
  }

  async refreshLanguage() {
    return this.load();
  }

  getInformationDetail(kind, id) {
    return this.resource?.information?.[kind]?.[id] ?? null;
  }

  getHeroLabel(hero) {
    return this.getLabel('heroIdentity', {
      profession: this.getName('profession', hero.profession),
      name: this.getName('hero', hero.heroId),
    });
  }

  formatLog({ key, values = {} }) {
    const resolved = Object.fromEntries(Object.entries(values).map(([id, value]) => {
      if (!value || typeof value !== 'object') return [id, value];
      let name;
      if (value.kind === 'hero') name = this.getHeroLabel(value);
      else if (value.kind === 'label') name = this.getLabel(value.id, value.values);
      else name = this.getName(value.kind, value.id);
      return [id, value.framed ? `【${name}】` : name];
    }));
    return this.getLabel(key, resolved);
  }

  getLabel(id, values = {}) {
    const template = this.resource?.ui?.[id];
    if (typeof template !== 'string') throw new RangeError(`Unknown localized label: ${id}`);
    return template.replace(/\{(\w+)\}/g, (_, key) => {
      if (!(key in values)) throw new RangeError(`Missing label parameter: ${key}`);
      return String(values[key]);
    });
  }

  getName(kind, id, context = 'information') {
    const source = context === 'nameplate' ? this.resource?.nameplate : this.resource?.information;
    const name = source?.[kind]?.[id]?.name;
    if (!name) throw new RangeError(`Unknown localized name: ${context}/${kind}/${id}`);
    return name;
  }
}

export { TEXT_RESOURCE_PATH };
