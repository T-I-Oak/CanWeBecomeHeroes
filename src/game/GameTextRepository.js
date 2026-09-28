import { loadJsonWithL10nCached } from '../../../GameWorksOAK/src/lib/core/i18n.js';
import { resolvePublicAssetPath } from '../chips/PublicAssetPath.js';
import { TEXT_RESOURCE_PARTS, assignTextPart, createTextResource, textPart } from './textResourceParts.js';

const TEXT_RESOURCE_PATHS = TEXT_RESOURCE_PARTS.map((part) => resolvePublicAssetPath(part.path));

export default class GameTextRepository {
  constructor({ loadResource = loadJsonWithL10nCached } = {}) {
    this.loadResource = loadResource;
    this.resource = null;
  }

  async load() {
    const resource = createTextResource();
    const values = await Promise.all(TEXT_RESOURCE_PARTS.map((_, index) => this.loadResource(TEXT_RESOURCE_PATHS[index])));
    TEXT_RESOURCE_PARTS.forEach((part, index) => assignTextPart(resource, part, values[index]));
    this.resource = resource;
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

  getLabelTemplate(id) {
    const template = this.resource?.ui?.[id];
    if (typeof template !== 'string') throw new RangeError(`Unknown localized label: ${id}`);
    return template;
  }

  getLabel(id, values = {}) {
    const template = this.getLabelTemplate(id);
    return template.replace(/\{(\w+)\}/g, (_, key) => {
      if (!(key in values)) throw new RangeError(`Missing label parameter: ${key}`);
      return String(values[key]);
    });
  }

  getVignetteLine(playId, lineId, heroId) {
    const text = this.resource?.vignette?.[playId]?.[lineId]?.[heroId];
    if (typeof text !== 'string' || text.length === 0) throw new RangeError(`Unknown vignette line: vignette.${playId}.${lineId}.${heroId}`);
    return text;
  }

  getVignetteScript(playId, scriptId) {
    const script = this.resource?.vignette?.[playId]?.scripts?.[scriptId];
    if (!Array.isArray(script) || script.length === 0) throw new RangeError(`Unknown vignette script: vignette.${playId}.scripts.${scriptId}`);
    return script.map((line, index) => {
      if (typeof line?.heroId !== 'string' || typeof line.text !== 'string' || line.text.length === 0) {
        throw new RangeError(`Unknown vignette script line: vignette.${playId}.scripts.${scriptId}.${index}`);
      }
      return { heroId: line.heroId, text: line.text };
    });
  }

  getName(kind, id, context = 'information') {
    const source = context === 'nameplate' ? this.resource?.nameplate : this.resource?.information;
    const name = source?.[kind]?.[id]?.name;
    if (!name) throw new RangeError(`Unknown localized name: ${context}/${kind}/${id}`);
    return name;
  }
}

export { TEXT_RESOURCE_PATHS, textPart };
