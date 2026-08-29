import { ENEMY_CATALOG } from './EnemyCatalog.js';
import { STATUS_KEYS } from './TagCatalog.js';

export const COMBINATION_PATTERNS = Object.freeze({
  regular: Object.freeze([
    Object.freeze({ main: 'small-valor', support1: 'small-lightning', support2: 'small-arcane' }),
    Object.freeze({ main: 'small-iron', support1: 'small-fire', support2: 'small-vitality' }),
    Object.freeze({ main: 'small-arcane', support1: 'small-area', support2: 'small-iron' }),
    Object.freeze({ main: 'small-cloth', support1: 'small-arcane', support2: 'small-feather' }),
    Object.freeze({ main: 'small-dexterity', support1: 'small-water', support2: 'small-blessing' }),
    Object.freeze({ main: 'small-feather', support1: 'small-cloth', support2: 'small-fire' }),
    Object.freeze({ main: 'small-reputation', support1: 'small-dexterity', support2: 'small-gem' }),
    Object.freeze({ main: 'small-gem', support1: 'small-blessing', support2: 'small-reputation' }),
    Object.freeze({ main: 'small-blessing', support1: 'small-feather', support2: 'small-water' }),
    Object.freeze({ main: 'small-fortune', support1: 'small-gem', support2: 'small-dexterity' }),
    Object.freeze({ main: 'small-fire', support1: 'small-reputation', support2: 'small-valor' }),
    Object.freeze({ main: 'small-water', support1: 'small-fortune', support2: 'small-cloth' }),
    Object.freeze({ main: 'small-lightning', support1: 'small-valor', support2: 'small-area' }),
    Object.freeze({ main: 'small-vitality', support1: 'small-iron', support2: 'small-fortune' }),
    Object.freeze({ main: 'small-area', support1: 'small-vitality', support2: 'small-lightning' }),
  ]),
  encounter: Object.freeze([]),
  boss: Object.freeze([]),
});

function createNormalRoles(level) {
  const totalTagBudget = Math.max(0, Math.floor(level) + 2);
  const maximum = level / 3;
  const maximums = Object.freeze(Object.fromEntries(STATUS_KEYS.map((stat) => [stat, maximum])));
  let remainingCount = Math.min(Math.ceil(Math.max(0, level) * 2 / 3), 6);
  const allocateCount = (capacity) => {
    const count = Math.min(remainingCount, capacity);
    remainingCount -= count;
    return count;
  };
  return Object.freeze({
    main: Object.freeze({ count: allocateCount(2), slotPositions: Object.freeze([3, 4]), weaponCount: 2, totalTagBudget, maximumHp: maximum, maximums }),
    support1: Object.freeze({ count: allocateCount(2), slotPositions: Object.freeze([2, 5]), weaponCount: 2, totalTagBudget, maximumHp: maximum, maximums }),
    support2: Object.freeze({ count: allocateCount(2), slotPositions: Object.freeze([1, 6]), weaponCount: 2, totalTagBudget, maximumHp: maximum, maximums }),
  });
}

const PLACEHOLDER_ROLES = Object.freeze({
  main: Object.freeze({ count: 2, slotPositions: Object.freeze([3, 4]), weaponCount: 2, totalTagBudget: 0, maximumHp: 1, maximums: Object.freeze({ power: 1, magic: 1, speed: 1, negotiation: 1, luck: 1 }) }),
  support1: Object.freeze({ count: 0, slotPositions: Object.freeze([2, 5]), weaponCount: 0, totalTagBudget: 0, maximumHp: 1, maximums: Object.freeze({ power: 1, magic: 1, speed: 1, negotiation: 1, luck: 1 }) }),
  support2: Object.freeze({ count: 0, slotPositions: Object.freeze([1, 6]), weaponCount: 0, totalTagBudget: 0, maximumHp: 1, maximums: Object.freeze({ power: 1, magic: 1, speed: 1, negotiation: 1, luck: 1 }) }),
});

export function normalizeEnemyMaximum(value) {
  return Math.min(7, Math.max(0, Math.ceil(value)));
}

export const DIFFICULTIES = Object.freeze({
  regular: (level) => Object.freeze({ roles: createNormalRoles(level) }),
  encounter: (_level) => Object.freeze({ roles: PLACEHOLDER_ROLES }),
  boss: (_level) => Object.freeze({ roles: PLACEHOLDER_ROLES }),
});

export function createEncounterEnemies({ kind, level, pattern, enemyFactory, random = Math.random }) {
  const difficulty = DIFFICULTIES[kind]?.(level);
  if (!difficulty) throw new RangeError(`Unknown encounter difficulty kind: ${kind}`);
  return Object.entries(difficulty.roles).flatMap(([role, settings]) => {
    const enemyDefinitionId = pattern[role];
    if (!enemyDefinitionId || settings.count === 0) return [];
    if (!ENEMY_CATALOG[enemyDefinitionId]) throw new Error(`Unknown enemy definition: ${enemyDefinitionId}`);
    return Array.from({ length: settings.count }, (_, index) => enemyFactory.createFromDefinition({
      enemyDefinitionId,
      slotPosition: settings.slotPositions[index],
      weaponCount: settings.weaponCount,
      totalTagCount: settings.totalTagBudget,
      maximumHp: normalizeEnemyMaximum(settings.maximumHp),
      maximums: Object.fromEntries(Object.entries(settings.maximums).map(([stat, value]) => [stat, normalizeEnemyMaximum(value)])),
      random,
    }));
  });
}
