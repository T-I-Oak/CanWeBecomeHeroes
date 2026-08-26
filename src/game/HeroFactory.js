import Chip from '../chips/Chip.js';
import Hero from './Hero.js';
import { getTagBaseColors, getTagFramePaths, getTagPaths, getTagWeight } from './TagCatalog.js';

const PROFESSIONS = Object.freeze({
  swordfighter: { asset: 'swoardfighter', tag: 'valor', profession: '剣士', name: { en: 'Avery', ja: 'アヴェリー' } },
  guard: { asset: 'guard', tag: 'iron', profession: '衛兵', name: { en: 'Briar', ja: 'ブライアー' } },
  mage: { asset: 'mage', tag: 'arcane', profession: '魔法使い', name: { en: 'Casey', ja: 'ケイシー' } },
  cleric: { asset: 'cleric', tag: 'cloth', profession: '僧侶', name: { en: 'Darcy', ja: 'ダーシー' } },
  thief: { asset: 'thief', tag: 'dexterity', profession: '盗賊', name: { en: 'Ellis', ja: 'エリス' } },
  hunter: { asset: 'hunter', tag: 'feather', profession: '狩人', name: { en: 'Finley', ja: 'フィンリー' } },
  merchant: { asset: 'merchant', tag: 'gem', profession: '商人', name: { en: 'Garnet', ja: 'ガーネット' } },
  negotiator: { asset: 'negotiator', tag: 'reputation', profession: '交渉人', name: { en: 'Harper', ja: 'ハーパー' } },
});

export const HERO_PROFESSION_IDS = Object.freeze(Object.keys(PROFESSIONS));

export default class HeroFactory {
  createRandom({ x, y, random = Math.random, bounds = null, stamina = 0 }) {
    return this.create({ profession: HERO_PROFESSION_IDS[Math.floor(random() * HERO_PROFESSION_IDS.length)], x, y, bounds, stamina });
  }

  create({ profession, x, y, maximums, bounds = null, stamina = 0 }) {
    const definition = PROFESSIONS[profession];
    const tags = [definition.tag, definition.tag];
    const chip = new Chip({ id: 0, type: 'hero', x, y, weight: getTagWeight(tags), centerPath: `/assets/heroes/${definition.asset}.png`, tagPaths: getTagPaths(tags), tagFramePaths: getTagFramePaths(tags), tagBaseColors: getTagBaseColors(tags), bounds });
    return new Hero({ profession: definition.profession, name: definition.name, tags, chip, maximums, stamina });
  }
}
