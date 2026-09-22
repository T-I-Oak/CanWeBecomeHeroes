import Chip, { CHIP_RADIUS } from '../chips/Chip.js';
import { getEnemyDefinitionById } from '../game/EnemyCatalog.js';
import { ENEMY_CHIP_DIAMETER } from '../game/HeroSlotLayout.js';
import { getHeroDefinitionById } from '../game/HeroFactory.js';
import { getItemDefinitionAssetPath } from '../game/ItemFactory.js';
import { AREA_THEME } from '../game/AreaTheme.js';
import { getTagBaseColors, getTagGlyphScales, getTagPaths, getTagWeight } from '../game/TagCatalog.js';

function createDefinitionChip({ type, radius, centerPath, tags, fillColor }) {
  return new Chip({
    id: 'information-definition-preview',
    type,
    radius,
    x: 0,
    y: 0,
    weight: getTagWeight(tags),
    centerPath,
    tagPaths: getTagPaths(tags),
    tagBaseColors: getTagBaseColors(tags),
    tagGlyphScales: getTagGlyphScales(tags),
    fillColor,
  });
}

export function createInformationDefinitionChip(kind, definitionId) {
  if (kind === 'hero') {
    const definition = getHeroDefinitionById(definitionId);
    return createDefinitionChip({
      type: 'hero', radius: CHIP_RADIUS.hero, centerPath: `/assets/heroes/${definition.asset}.png`,
      tags: [definition.tag, definition.tag], fillColor: AREA_THEME.preparation.chipFill,
    });
  }
  if (kind === 'enemy') {
    const definition = getEnemyDefinitionById(definitionId);
    if (!definition) throw new RangeError(`Unknown enemy definition: ${definitionId}`);
    return createDefinitionChip({
      type: 'enemy', radius: ENEMY_CHIP_DIAMETER[definition.size] / 2, centerPath: definition.assetPath,
      tags: definition.intrinsicTags, fillColor: AREA_THEME.battle.chipFill,
    });
  }
  if (kind === 'item') {
    return createDefinitionChip({
      type: 'item', radius: CHIP_RADIUS.item, centerPath: getItemDefinitionAssetPath(definitionId),
      tags: [], fillColor: AREA_THEME.warehouse.chipFill,
    });
  }
  throw new RangeError(`Unsupported information definition chip kind: ${kind}`);
}
