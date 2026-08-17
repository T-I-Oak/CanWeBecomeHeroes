const HERO_ASSETS = [
  'cleric', 'guard', 'hunter', 'mage', 'merchant', 'negotiator', 'swoardfighter', 'thief',
];

const ITEM_ASSETS = [
  'hand-banner', 'hand-bow', 'hand-claw', 'hand-holy-book', 'hand-holy-symbol',
  'hand-orb', 'hand-shield', 'hand-staff', 'hand-sword', 'hand-tarot-cards',
];

const TAG_ASSETS = [
  'arcane', 'area', 'blessing', 'cloth', 'dexterity', 'feather', 'fire', 'fortune',
  'gem', 'iron', 'lightning', 'reputation', 'valor', 'vitality', 'water',
];

function imagePath(category, name) {
  return `/assets/${category}/${name}.png`;
}

function randomEntry(entries, random) {
  return entries[Math.floor(random() * entries.length)];
}

export function createRandomChipAssets(type, random = Math.random) {
  const category = type === 'hero' ? 'heroes' : 'items';
  const names = type === 'hero' ? HERO_ASSETS : ITEM_ASSETS;
  const tagCount = Math.floor(random() * 4);

  return {
    centerPath: imagePath(category, randomEntry(names, random)),
    tagPaths: Array.from({ length: tagCount }, () => imagePath('tags', randomEntry(TAG_ASSETS, random))),
  };
}
