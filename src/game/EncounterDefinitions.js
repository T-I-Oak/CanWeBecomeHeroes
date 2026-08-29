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
  elite: Object.freeze([Object.freeze({ main: 'medium-vitality', support1: 'small-iron', support2: 'small-fortune' })]),
  boss: Object.freeze([Object.freeze({ main: 'large-vitality', support1: 'small-iron', support2: 'small-fortune' })]),
});

const ROLE_SLOT_PREFERENCES = Object.freeze({
  main: Object.freeze({ small: Object.freeze([3, 4, 2, 5, 1, 6]), large: Object.freeze([3, 1, 5]) }),
  support1: Object.freeze({ small: Object.freeze([2, 5, 3, 4, 1, 6]), large: Object.freeze([1, 3, 5]) }),
  support2: Object.freeze({ small: Object.freeze([1, 6, 2, 5, 3, 4]), large: Object.freeze([1, 3, 5]) }),
});

function createSharedSettings(level) {
  const totalTagBudget = Math.max(0, Math.floor(level) + 2);
  const maximum = level / 3;
  const contributionMultiplier = (level + 9) / 12;
  const maximums = Object.freeze(Object.fromEntries(STATUS_KEYS.map((stat) => [stat, maximum])));
  return Object.freeze({ weaponCount: 2, totalTagBudget, maximumHp: maximum, maximums, contributionMultiplier });
}

function role(count, shared) {
  return Object.freeze({ count, ...shared });
}

function createNormalRoles(level) {
  const shared = createSharedSettings(level);
  let remainingCount = Math.min(Math.ceil(Math.max(0, level) * 2 / 3), 6);
  const allocateCount = (capacity) => {
    const count = Math.min(remainingCount, capacity);
    remainingCount -= count;
    return count;
  };
  return Object.freeze({ main: role(allocateCount(2), shared), support1: role(allocateCount(2), shared), support2: role(allocateCount(2), shared) });
}

function createEliteRoles(level) {
  const shared = createSharedSettings(level);
  return Object.freeze({
    main: role(Math.ceil(level / 7), shared),
    support1: role(Math.ceil(level / 14), shared),
    support2: role(Math.max(1, Math.ceil((level - 7) / 14)), shared),
  });
}

function createBossRoles(level) {
  const shared = createSharedSettings(level);
  // Boss scaling is intentionally deferred. The current baseline is one boss
  // with four supporting regular enemies, while allocation still guards spans.
  return Object.freeze({ main: role(1, shared), support1: role(2, shared), support2: role(2, shared) });
}

export function normalizeEnemyMaximum(value) {
  return Math.min(7, Math.max(0, Math.ceil(value)));
}

export const DIFFICULTIES = Object.freeze({
  regular: (level) => Object.freeze({ roles: createNormalRoles(level) }),
  elite: (level) => Object.freeze({ roles: createEliteRoles(level) }),
  boss: (level) => Object.freeze({ roles: createBossRoles(level) }),
});

function getSlotSpan(definition) {
  return definition.size === 'large' ? 2 : 1;
}

function allocateRoleSlots({ roleName, definition, count, occupied }) {
  const span = getSlotSpan(definition);
  const preferences = ROLE_SLOT_PREFERENCES[roleName][span === 2 ? 'large' : 'small'];
  const slots = [];
  preferences.forEach((slotPosition) => {
    if (slots.length >= count) return;
    const coveredSlots = Array.from({ length: span }, (_, index) => slotPosition + index);
    if (coveredSlots.some((slot) => slot > 6 || occupied.has(slot))) return;
    coveredSlots.forEach((slot) => occupied.add(slot));
    slots.push(slotPosition);
  });
  return slots;
}

export function createEncounterEnemies({ kind, level, pattern, enemyFactory, random = Math.random }) {
  const difficulty = DIFFICULTIES[kind]?.(level);
  if (!difficulty) throw new RangeError(`Unknown encounter difficulty kind: ${kind}`);
  const occupiedSlots = new Set();
  return Object.entries(difficulty.roles).flatMap(([roleName, settings]) => {
    const enemyDefinitionId = pattern[roleName];
    if (!enemyDefinitionId || settings.count === 0) return [];
    const definition = ENEMY_CATALOG[enemyDefinitionId];
    if (!definition) throw new Error(`Unknown enemy definition: ${enemyDefinitionId}`);
    return allocateRoleSlots({ roleName, definition, count: settings.count, occupied: occupiedSlots }).map((slotPosition) => enemyFactory.createFromDefinition({
      enemyDefinitionId,
      slotPosition,
      weaponCount: settings.weaponCount,
      totalTagCount: settings.totalTagBudget,
      maximumHp: normalizeEnemyMaximum(settings.maximumHp),
      maximums: Object.fromEntries(Object.entries(settings.maximums).map(([stat, value]) => [stat, normalizeEnemyMaximum(value)])),
      contributionMultiplier: settings.contributionMultiplier,
      random,
    }));
  });
}
