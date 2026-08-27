export const ENEMY_CATALOG = Object.freeze({
  'small-valor': Object.freeze({
    id: 'small-valor',
    size: 'small',
    tagAffinity: 'valor',
    nameKey: 'enemy.smallValor',
    nameJa: 'ゴブリン',
    assetPath: '/assets/enemies/small-valor.png',
    intrinsicTags: Object.freeze(['valor']),
    baseHp: 2,
    baseContributionPoints: 10,
  }),
  'small-iron': Object.freeze({
    id: 'small-iron',
    size: 'small',
    tagAffinity: 'iron',
    nameKey: 'enemy.smallIron',
    nameJa: 'リビングアーマー',
    assetPath: '/assets/enemies/small-iron.png',
    intrinsicTags: Object.freeze(['iron']),
    baseHp: 2,
    baseContributionPoints: 10,
  }),
  'small-arcane': Object.freeze({
    id: 'small-arcane',
    size: 'small',
    tagAffinity: 'arcane',
    nameKey: 'enemy.smallArcane',
    nameJa: 'ウィスプ',
    assetPath: '/assets/enemies/small-arcane.png',
    intrinsicTags: Object.freeze(['arcane']),
    baseHp: 2,
    baseContributionPoints: 10,
  }),
});

export function getEnemyDefinition({ size, tagAffinity }) {
  return ENEMY_CATALOG[`${size}-${tagAffinity}`] ?? null;
}

export function getEnemyDefinitionById(id) {
  return ENEMY_CATALOG[id] ?? null;
}
