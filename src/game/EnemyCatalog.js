export const ENEMY_CATALOG = Object.freeze({
  'small-valor': Object.freeze({
    id: 'small-valor',
    size: 'small',
    tagAffinity: 'valor',
    nameKey: 'enemy.smallValor',
    nameJa: 'ゴブリン',
    assetPath: '/assets/enemies/small-valor.png',
  }),
  'small-iron': Object.freeze({
    id: 'small-iron',
    size: 'small',
    tagAffinity: 'iron',
    nameKey: 'enemy.smallIron',
    nameJa: 'リビングアーマー',
    assetPath: '/assets/enemies/small-iron.png',
  }),
  'small-arcane': Object.freeze({
    id: 'small-arcane',
    size: 'small',
    tagAffinity: 'arcane',
    nameKey: 'enemy.smallArcane',
    nameJa: 'ウィスプ',
    assetPath: '/assets/enemies/small-arcane.png',
  }),
});

export function getEnemyDefinition({ size, tagAffinity }) {
  return ENEMY_CATALOG[`${size}-${tagAffinity}`] ?? null;
}
