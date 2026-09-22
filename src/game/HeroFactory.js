import Chip from '../chips/Chip.js';
import Hero from './Hero.js';
import { getTagBaseColors, getTagGlyphScales, getTagPaths, getTagWeight } from './TagCatalog.js';

const PROFESSIONS = Object.freeze({
  swordfighter: { asset: 'swoardfighter', tag: 'valor', heroId: 'Avery' },
  guard: { asset: 'guard', tag: 'iron', heroId: 'Briar' },
  mage: { asset: 'mage', tag: 'arcane', heroId: 'Casey' },
  cleric: { asset: 'cleric', tag: 'cloth', heroId: 'Darcy' },
  thief: { asset: 'thief', tag: 'dexterity', heroId: 'Ellis' },
  hunter: { asset: 'hunter', tag: 'feather', heroId: 'Finley' },
  merchant: { asset: 'merchant', tag: 'gem', heroId: 'Garnet' },
  negotiator: { asset: 'negotiator', tag: 'reputation', heroId: 'Harper' },
});

export const HERO_PROFESSION_IDS = Object.freeze(Object.keys(PROFESSIONS));

export function getHeroProfessionDefinition(profession) {
  const definition = PROFESSIONS[profession];
  if (!definition) throw new RangeError(`Unknown hero profession: ${profession}`);
  return definition;
}

export function getHeroDefinitionById(heroId) {
  const profession = HERO_PROFESSION_IDS.find((id) => PROFESSIONS[id].heroId === heroId);
  if (!profession) throw new RangeError(`Unknown hero definition: ${heroId}`);
  return PROFESSIONS[profession];
}

export function getHeroDefinitionAssetPath(heroId) {
  return `/assets/heroes/${getHeroDefinitionById(heroId).asset}.png`;
}

export default class HeroFactory {
  createRandom({ x, y, random = Math.random, bounds = null, stamina = 0 }) {
    return this.create({ profession: HERO_PROFESSION_IDS[Math.floor(random() * HERO_PROFESSION_IDS.length)], x, y, bounds, stamina });
  }

  create({ profession, x, y, maximums, bounds = null, stamina = 0 }) {
    const definition = getHeroProfessionDefinition(profession);
    const tags = [definition.tag, definition.tag];
    const chip = new Chip({ id: 0, type: 'hero', x, y, weight: getTagWeight(tags), centerPath: `/assets/heroes/${definition.asset}.png`, tagPaths: getTagPaths(tags), tagBaseColors: getTagBaseColors(tags), tagGlyphScales: getTagGlyphScales(tags), bounds });
    return new Hero({ profession, heroId: definition.heroId, tags, chip, maximums, stamina });
  }
}
