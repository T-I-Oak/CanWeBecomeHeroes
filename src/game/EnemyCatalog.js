export const ENEMY_CATALOG = Object.freeze({
  'small-valor': Object.freeze({
    id: 'small-valor',
    size: 'small',
    tagAffinity: 'valor',
    nameKey: 'enemy.smallValor',
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
    assetPath: '/assets/enemies/small-lightning.png',
    intrinsicTags: Object.freeze(['lightning']),
    baseHp: 2,
    baseContributionPoints: 10,
  }),
  'small-cloth': Object.freeze({ id: 'small-cloth', size: 'small', tagAffinity: 'cloth', nameKey: 'enemy.smallCloth', assetPath: '/assets/enemies/small-cloth.png', intrinsicTags: Object.freeze(['cloth']), baseHp: 2, baseContributionPoints: 10 }),
  'small-dexterity': Object.freeze({ id: 'small-dexterity', size: 'small', tagAffinity: 'dexterity', nameKey: 'enemy.smallDexterity', assetPath: '/assets/enemies/small-dexterity.png', intrinsicTags: Object.freeze(['dexterity']), baseHp: 2, baseContributionPoints: 10 }),
  'small-feather': Object.freeze({ id: 'small-feather', size: 'small', tagAffinity: 'feather', nameKey: 'enemy.smallFeather', assetPath: '/assets/enemies/small-feather.png', intrinsicTags: Object.freeze(['feather']), baseHp: 2, baseContributionPoints: 10 }),
  'small-gem': Object.freeze({ id: 'small-gem', size: 'small', tagAffinity: 'gem', nameKey: 'enemy.smallGem', assetPath: '/assets/enemies/small-gem.png', intrinsicTags: Object.freeze(['gem']), baseHp: 2, baseContributionPoints: 10 }),
  'small-blessing': Object.freeze({ id: 'small-blessing', size: 'small', tagAffinity: 'blessing', nameKey: 'enemy.smallBlessing', assetPath: '/assets/enemies/small-blessing.png', intrinsicTags: Object.freeze(['blessing']), baseHp: 2, baseContributionPoints: 10 }),
  'small-fortune': Object.freeze({ id: 'small-fortune', size: 'small', tagAffinity: 'fortune', nameKey: 'enemy.smallFortune', assetPath: '/assets/enemies/small-fortune.png', intrinsicTags: Object.freeze(['fortune']), baseHp: 2, baseContributionPoints: 10 }),
  'small-fire': Object.freeze({ id: 'small-fire', size: 'small', tagAffinity: 'fire', nameKey: 'enemy.smallFire', assetPath: '/assets/enemies/small-fire.png', intrinsicTags: Object.freeze(['fire']), baseHp: 2, baseContributionPoints: 10 }),
  'small-water': Object.freeze({ id: 'small-water', size: 'small', tagAffinity: 'water', nameKey: 'enemy.smallWater', assetPath: '/assets/enemies/small-water.png', intrinsicTags: Object.freeze(['water']), baseHp: 2, baseContributionPoints: 10 }),
  'small-vitality': Object.freeze({ id: 'small-vitality', size: 'small', tagAffinity: 'vitality', nameKey: 'enemy.smallVitality', assetPath: '/assets/enemies/small-vitality.png', intrinsicTags: Object.freeze(['vitality']), baseHp: 2, baseContributionPoints: 10 }),
  'small-area': Object.freeze({ id: 'small-area', size: 'small', tagAffinity: 'area', nameKey: 'enemy.smallArea', assetPath: '/assets/enemies/small-area.png', intrinsicTags: Object.freeze(['area']), baseHp: 2, baseContributionPoints: 10 }),
  'medium-vitality': Object.freeze({
    id: 'medium-vitality', size: 'medium', tagAffinity: 'vitality', nameKey: 'enemy.mediumVitality', assetPath: '/assets/enemies/medium-vitality.png', intrinsicTags: Object.freeze(['vitality']), baseHp: 2, baseContributionPoints: 50,
    uniqueSkill: Object.freeze({ id: 'vitality-summon', level: 1 }),
  }),
  'large-vitality': Object.freeze({
    id: 'large-vitality', size: 'large', tagAffinity: 'vitality', nameKey: 'enemy.largeVitality', assetPath: '/assets/enemies/large-vitality.png', intrinsicTags: Object.freeze(['vitality']), baseHp: 2, baseContributionPoints: 250,
    uniqueSkill: Object.freeze({ id: 'vitality-summon', level: 2 }),
  }),
  'medium-gem': Object.freeze({
    id: 'medium-gem', size: 'medium', tagAffinity: 'gem', nameKey: 'enemy.mediumGem', assetPath: '/assets/enemies/medium-gem.png', intrinsicTags: Object.freeze(['gem']), baseHp: 2, baseContributionPoints: 50,
    uniqueSkill: Object.freeze({ id: 'gem-orb-rain', level: 1 }),
  }),
  'large-gem': Object.freeze({
    id: 'large-gem', size: 'large', tagAffinity: 'gem', nameKey: 'enemy.largeGem', assetPath: '/assets/enemies/large-gem.png', intrinsicTags: Object.freeze(['gem']), baseHp: 2, baseContributionPoints: 250,
    uniqueSkill: Object.freeze({ id: 'gem-orb-rain', level: 2 }),
  }),
  'medium-area': Object.freeze({
    id: 'medium-area', size: 'medium', tagAffinity: 'area', nameKey: 'enemy.mediumArea', assetPath: '/assets/enemies/medium-area.png', intrinsicTags: Object.freeze(['area']), baseHp: 2, baseContributionPoints: 50,
    uniqueSkill: Object.freeze({ id: 'area-head-rush', level: 1 }),
  }),
  'large-area': Object.freeze({
    id: 'large-area', size: 'large', tagAffinity: 'area', nameKey: 'enemy.largeArea', assetPath: '/assets/enemies/large-area.png', intrinsicTags: Object.freeze(['area']), baseHp: 2, baseContributionPoints: 250,
    uniqueSkill: Object.freeze({ id: 'area-head-rush', level: 2 }),
  }),
  'medium-dexterity': Object.freeze({
    id: 'medium-dexterity', size: 'medium', tagAffinity: 'dexterity', nameKey: 'enemy.mediumDexterity', assetPath: '/assets/enemies/medium-dexterity.png', intrinsicTags: Object.freeze(['dexterity']), baseHp: 2, baseContributionPoints: 50,
    uniqueSkill: Object.freeze({ id: 'shadow-fingertips', level: 1 }),
  }),
  'large-dexterity': Object.freeze({
    id: 'large-dexterity', size: 'large', tagAffinity: 'dexterity', nameKey: 'enemy.largeDexterity', assetPath: '/assets/enemies/large-dexterity.png', intrinsicTags: Object.freeze(['dexterity']), baseHp: 2, baseContributionPoints: 250,
    uniqueSkill: Object.freeze({ id: 'shadow-fingertips', level: 2 }),
  }),
  'medium-valor': Object.freeze({
    id: 'medium-valor', size: 'medium', tagAffinity: 'valor', nameKey: 'enemy.mediumValor', assetPath: '/assets/enemies/medium-valor.png', intrinsicTags: Object.freeze(['valor']), baseHp: 2, baseContributionPoints: 50,
    uniqueSkill: Object.freeze({ id: 'battle-frenzy', level: 1 }),
  }),
  'large-valor': Object.freeze({
    id: 'large-valor', size: 'large', tagAffinity: 'valor', nameKey: 'enemy.largeValor', assetPath: '/assets/enemies/large-valor.png', intrinsicTags: Object.freeze(['valor']), baseHp: 2, baseContributionPoints: 250,
    uniqueSkill: Object.freeze({ id: 'battle-frenzy', level: 2 }),
  }),
  'medium-iron': Object.freeze({
    id: 'medium-iron', size: 'medium', tagAffinity: 'iron', nameKey: 'enemy.mediumIron', assetPath: '/assets/enemies/medium-iron.png', intrinsicTags: Object.freeze(['iron']), baseHp: 2, baseContributionPoints: 50,
    uniqueSkill: Object.freeze({ id: 'iron-counterblow', level: 1 }),
  }),
  'large-iron': Object.freeze({
    id: 'large-iron', size: 'large', tagAffinity: 'iron', nameKey: 'enemy.largeIron', assetPath: '/assets/enemies/large-iron.png', intrinsicTags: Object.freeze(['iron']), baseHp: 2, baseContributionPoints: 250,
    uniqueSkill: Object.freeze({ id: 'iron-counterblow', level: 2 }),
  }),
  'medium-arcane': Object.freeze({
    id: 'medium-arcane', size: 'medium', tagAffinity: 'arcane', nameKey: 'enemy.mediumArcane', assetPath: '/assets/enemies/medium-arcane.png', intrinsicTags: Object.freeze(['arcane']), baseHp: 2, baseContributionPoints: 50,
    uniqueSkill: Object.freeze({ id: 'arcane-reflection', level: 1 }),
  }),
  'large-arcane': Object.freeze({
    id: 'large-arcane', size: 'large', tagAffinity: 'arcane', nameKey: 'enemy.largeArcane', assetPath: '/assets/enemies/large-arcane.png', intrinsicTags: Object.freeze(['arcane']), baseHp: 2, baseContributionPoints: 250,
    uniqueSkill: Object.freeze({ id: 'arcane-reflection', level: 2 }),
  }),
  'medium-cloth': Object.freeze({
    id: 'medium-cloth', size: 'medium', tagAffinity: 'cloth', nameKey: 'enemy.mediumCloth', assetPath: '/assets/enemies/medium-cloth.png', intrinsicTags: Object.freeze(['cloth']), baseHp: 2, baseContributionPoints: 50,
    uniqueSkill: Object.freeze({ id: 'cloth-night-familiars', level: 1 }),
  }),
  'large-cloth': Object.freeze({
    id: 'large-cloth', size: 'large', tagAffinity: 'cloth', nameKey: 'enemy.largeCloth', assetPath: '/assets/enemies/large-cloth.png', intrinsicTags: Object.freeze(['cloth']), baseHp: 2, baseContributionPoints: 250,
    uniqueSkill: Object.freeze({ id: 'cloth-night-familiars', level: 2 }),
  }),
  'phantom-area-head': Object.freeze({
    id: 'phantom-area-head', size: 'small', tagAffinity: 'area', nameKey: 'enemy.phantomAreaHead', assetPath: '/assets/enemies/small-area-head.png', intrinsicTags: Object.freeze(['area']), baseHp: 0, baseContributionPoints: 0,
  }),
});

export function getEnemyDefinition({ size, tagAffinity }) {
  return ENEMY_CATALOG[`${size}-${tagAffinity}`] ?? null;
}

export function getEnemyDefinitionById(id) {
  return ENEMY_CATALOG[id] ?? null;
}
