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
    nameJa: 'ゴースト',
    assetPath: '/assets/enemies/small-arcane.png',
    intrinsicTags: Object.freeze(['arcane']),
    baseHp: 2,
    baseContributionPoints: 10,
  }),
  'small-reputation': Object.freeze({
    id: 'small-reputation',
    size: 'small',
    tagAffinity: 'reputation',
    nameKey: 'enemy.smallReputation',
    nameJa: 'ドワーフ',
    assetPath: '/assets/enemies/small-reputation.png',
    intrinsicTags: Object.freeze(['reputation']),
    baseHp: 2,
    baseContributionPoints: 10,
  }),
  'small-lightning': Object.freeze({
    id: 'small-lightning',
    size: 'small',
    tagAffinity: 'lightning',
    nameKey: 'enemy.smallLightning',
    nameJa: '雷狼',
    assetPath: '/assets/enemies/small-lightning.png',
    intrinsicTags: Object.freeze(['lightning']),
    baseHp: 2,
    baseContributionPoints: 10,
  }),
  'small-cloth': Object.freeze({ id: 'small-cloth', size: 'small', tagAffinity: 'cloth', nameKey: 'enemy.smallCloth', nameJa: 'ミイラ', assetPath: '/assets/enemies/small-cloth.png', intrinsicTags: Object.freeze(['cloth']), baseHp: 2, baseContributionPoints: 10 }),
  'small-dexterity': Object.freeze({ id: 'small-dexterity', size: 'small', tagAffinity: 'dexterity', nameKey: 'enemy.smallDexterity', nameJa: 'コボルト', assetPath: '/assets/enemies/small-dexterity.png', intrinsicTags: Object.freeze(['dexterity']), baseHp: 2, baseContributionPoints: 10 }),
  'small-feather': Object.freeze({ id: 'small-feather', size: 'small', tagAffinity: 'feather', nameKey: 'enemy.smallFeather', nameJa: 'ハーピー', assetPath: '/assets/enemies/small-feather.png', intrinsicTags: Object.freeze(['feather']), baseHp: 2, baseContributionPoints: 10 }),
  'small-gem': Object.freeze({ id: 'small-gem', size: 'small', tagAffinity: 'gem', nameKey: 'enemy.smallGem', nameJa: 'ミミック', assetPath: '/assets/enemies/small-gem.png', intrinsicTags: Object.freeze(['gem']), baseHp: 2, baseContributionPoints: 10 }),
  'small-blessing': Object.freeze({ id: 'small-blessing', size: 'small', tagAffinity: 'blessing', nameKey: 'enemy.smallBlessing', nameJa: 'インプ', assetPath: '/assets/enemies/small-blessing.png', intrinsicTags: Object.freeze(['blessing']), baseHp: 2, baseContributionPoints: 10 }),
  'small-fortune': Object.freeze({ id: 'small-fortune', size: 'small', tagAffinity: 'fortune', nameKey: 'enemy.smallFortune', nameJa: 'ピクシー', assetPath: '/assets/enemies/small-fortune.png', intrinsicTags: Object.freeze(['fortune']), baseHp: 2, baseContributionPoints: 10 }),
  'small-fire': Object.freeze({ id: 'small-fire', size: 'small', tagAffinity: 'fire', nameKey: 'enemy.smallFire', nameJa: 'サラマンダー', assetPath: '/assets/enemies/small-fire.png', intrinsicTags: Object.freeze(['fire']), baseHp: 2, baseContributionPoints: 10 }),
  'small-water': Object.freeze({ id: 'small-water', size: 'small', tagAffinity: 'water', nameKey: 'enemy.smallWater', nameJa: '半魚人', assetPath: '/assets/enemies/small-water.png', intrinsicTags: Object.freeze(['water']), baseHp: 2, baseContributionPoints: 10 }),
  'small-vitality': Object.freeze({ id: 'small-vitality', size: 'small', tagAffinity: 'vitality', nameKey: 'enemy.smallVitality', nameJa: 'マンドラゴラ', assetPath: '/assets/enemies/small-vitality.png', intrinsicTags: Object.freeze(['vitality']), baseHp: 2, baseContributionPoints: 10 }),
  'small-area': Object.freeze({ id: 'small-area', size: 'small', tagAffinity: 'area', nameKey: 'enemy.smallArea', nameJa: 'ケルベロス', assetPath: '/assets/enemies/small-area.png', intrinsicTags: Object.freeze(['area']), baseHp: 2, baseContributionPoints: 10 }),
  'medium-vitality': Object.freeze({
    id: 'medium-vitality', size: 'medium', tagAffinity: 'vitality', nameKey: 'enemy.mediumVitality', nameJa: 'トレント', assetPath: '/assets/enemies/medium-vitality.png', intrinsicTags: Object.freeze(['vitality']), baseHp: 2, baseContributionPoints: 50,
    uniqueSkill: Object.freeze({ id: 'vitality-summon', level: 1 }),
  }),
  'large-vitality': Object.freeze({
    id: 'large-vitality', size: 'large', tagAffinity: 'vitality', nameKey: 'enemy.largeVitality', nameJa: '歩く世界樹', assetPath: '/assets/enemies/large-vitality.png', intrinsicTags: Object.freeze(['vitality']), baseHp: 2, baseContributionPoints: 250,
    uniqueSkill: Object.freeze({ id: 'vitality-summon', level: 2 }),
  }),
});

export function getEnemyDefinition({ size, tagAffinity }) {
  return ENEMY_CATALOG[`${size}-${tagAffinity}`] ?? null;
}

export function getEnemyDefinitionById(id) {
  return ENEMY_CATALOG[id] ?? null;
}
