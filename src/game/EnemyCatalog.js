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
});

export function getEnemyDefinition({ size, tagAffinity }) {
  return ENEMY_CATALOG[`${size}-${tagAffinity}`] ?? null;
}
