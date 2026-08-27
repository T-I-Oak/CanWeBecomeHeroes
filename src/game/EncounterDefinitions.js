import { ENEMY_CATALOG } from './EnemyCatalog.js';

export const COMBINATION_PATTERNS = Object.freeze({
  normal: Object.freeze([
    Object.freeze({ main: 'small-valor', support1: 'small-iron', support2: 'small-arcane' }),
    Object.freeze({ main: 'small-iron', support1: 'small-arcane', support2: 'small-valor' }),
    Object.freeze({ main: 'small-arcane', support1: 'small-valor', support2: 'small-iron' }),
  ]),
  encounter: Object.freeze([]),
  boss: Object.freeze([]),
});

const DEMO_ROLES = Object.freeze({
  main: Object.freeze({ count: 2, slotPositions: Object.freeze([3, 4]), weaponCount: 2, totalTagBudget: 0 }),
  support1: Object.freeze({ count: 0, slotPositions: Object.freeze([]), weaponCount: 0, totalTagBudget: 0 }),
  support2: Object.freeze({ count: 0, slotPositions: Object.freeze([]), weaponCount: 0, totalTagBudget: 0 }),
});

export const DIFFICULTIES = Object.freeze({
  normal: (_level) => Object.freeze({ roles: DEMO_ROLES }),
  encounter: (_level) => Object.freeze({ roles: DEMO_ROLES }),
  boss: (_level) => Object.freeze({ roles: DEMO_ROLES }),
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
      random,
    }));
  });
}
