import ChipBoard from '../chips/ChipBoard.js';
import BattleSystem from '../game/BattleSystem.js';
import EnemyFactory from '../game/EnemyFactory.js';
import HeroFactory from '../game/HeroFactory.js';
import ItemFactory from '../game/ItemFactory.js';
import { getTagBaseColors, getTagGlyphScales, getTagPaths, getTagWeight } from '../game/TagCatalog.js';

const DEFAULT_MAXIMUMS = Object.freeze({ power: 3, magic: 3, speed: 3, negotiation: 3, luck: 3, stamina: 3 });
const DEFAULT_TICKS = 10000;
const DEFAULT_TRIALS = 1000;

function createRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let result = value;
    result = Math.imul(result ^ result >>> 15, result | 1);
    result ^= result + Math.imul(result ^ result >>> 7, result | 61);
    return ((result ^ result >>> 14) >>> 0) / 4294967296;
  };
}

function addValue(record, key, value) {
  record[key] = (record[key] ?? 0) + value;
}

function normalizeEntities(entities, side) {
  if (!Array.isArray(entities) || entities.length === 0) throw new Error(`${side} requires at least one entity.`);
  return entities.map((entity, index) => ({ ...entity, label: entity.label ?? `${side}-${index + 1}`, tags: [...(entity.tags ?? [])], weapons: [...(entity.weapons ?? [])] }));
}

function settle(chip) {
  chip.height = 0;
  chip.verticalVelocity = 0;
  chip.step = null;
}

function createWeaponItems(entity, itemFactory) {
  return entity.weapons.filter((weapon) => weapon !== 'unarmed').map((weapon) => itemFactory.createWeapon({ weapon, tags: [], x: 0, y: 0 }));
}

function refreshEntity(entity) {
  entity.chip.weight = getTagWeight(entity.getTags());
  entity.chip.tagPaths = getTagPaths(entity.tags);
  entity.chip.tagBaseColors = getTagBaseColors(entity.tags);
  entity.chip.tagGlyphScales = getTagGlyphScales(entity.tags);
  entity.refreshDerivedValues?.();
}

function createHero(entity, index, board, itemFactory) {
  const maximums = { ...DEFAULT_MAXIMUMS, ...entity.maximums };
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: 500 + index * 240, y: 760, maximums, stamina: entity.stamina ?? maximums.stamina });
  hero.tags = entity.tags;
  createWeaponItems(entity, itemFactory).slice(0, 2).forEach((item) => hero.equip(item));
  hero.currentArea = 'battle';
  hero.targetArea = null;
  settle(hero.chip);
  refreshEntity(hero);
  board.addChip(hero.chip);
  return hero;
}

function createEnemy(entity, index, board, itemFactory, random) {
  const enemy = new EnemyFactory({ itemFactory }).createInitialEncounter({ slotPosition: Math.min(6, index + 1), maximumHp: entity.maximumHp ?? 3, maximums: { ...DEFAULT_MAXIMUMS, ...entity.maximums }, totalTagCount: 0, random });
  enemy.tags = entity.tags;
  enemy.equipment = createWeaponItems(entity, itemFactory);
  enemy.chip.x = 500 + index * 240;
  enemy.chip.y = 280;
  enemy.chip.bounds = null;
  settle(enemy.chip);
  refreshEntity(enemy);
  board.addChip(enemy.chip);
  return enemy;
}

function sourceForDamage(type) {
  if (type === 'fire') return 'tag:fire';
  if (type === 'reflection') return 'tag:iron';
  return `attack:${type}`;
}

function runTrial({ left, right, ticks, seed }) {
  const random = createRandom(seed);
  const board = new ChipBoard({ width: 2000, height: 1200 });
  const itemFactory = new ItemFactory();
  const heroes = left.map((entity, index) => createHero(entity, index, board, itemFactory));
  const enemies = right.map((entity, index) => createEnemy(entity, index, board, itemFactory, random));
  const sides = new Map([...heroes.map((entity) => [entity, 'left']), ...enemies.map((entity) => [entity, 'right'])]);
  const result = { ticks: 0, winner: 'draw', damageBySide: {}, damageBySource: {}, criticalHits: 0 };
  const returnSystem = { begin: (hero) => board.removeChip(hero.chip), update: () => false };
  const battle = new BattleSystem(board, {
    itemFactory,
    random,
    logger: null,
    returnSystem,
    controller: { remove: () => {}, addToWarehouse: () => {} },
    onDamage: ({ actor, type, damage, critical }) => {
      const side = actor ? sides.get(actor) : 'unattributed';
      addValue(result.damageBySide, side, damage);
      addValue(result.damageBySource, sourceForDamage(type), damage);
      if (critical) result.criticalHits += 1;
    },
  });

  for (let tick = 1; tick <= ticks; tick += 1) {
    battle.update({ heroes, enemies, tick, tickDelta: 1 });
    result.ticks = tick;
    const leftAlive = heroes.some((hero) => board.chips.includes(hero.chip));
    const rightAlive = enemies.some((enemy) => board.chips.includes(enemy.chip));
    if (!leftAlive || !rightAlive) {
      result.winner = leftAlive ? 'left' : rightAlive ? 'right' : 'draw';
      break;
    }
  }
  return result;
}

export function runBattleSimulation(input) {
  const left = normalizeEntities(input.left, 'left');
  const right = normalizeEntities(input.right, 'right');
  const ticks = input.ticks ?? DEFAULT_TICKS;
  const trials = input.trials ?? DEFAULT_TRIALS;
  const seed = input.seed ?? 1;
  if (!Number.isInteger(ticks) || ticks <= 0) throw new Error('ticks must be a positive integer.');
  if (!Number.isInteger(trials) || trials <= 0) throw new Error('trials must be a positive integer.');

  const totals = { leftWins: 0, rightWins: 0, draws: 0, ticks: 0, damageBySide: {}, damageBySource: {}, criticalHits: 0 };
  for (let trial = 0; trial < trials; trial += 1) {
    const result = runTrial({ left, right, ticks, seed: seed + trial });
    if (result.winner === 'left') totals.leftWins += 1;
    else if (result.winner === 'right') totals.rightWins += 1;
    else totals.draws += 1;
    totals.ticks += result.ticks;
    totals.criticalHits += result.criticalHits;
    Object.entries(result.damageBySide).forEach(([key, value]) => addValue(totals.damageBySide, key, value));
    Object.entries(result.damageBySource).forEach(([key, value]) => addValue(totals.damageBySource, key, value));
  }
  const average = (value) => value / trials;
  return {
    conditions: { ticks, trials, seed, left, right },
    outcomes: { leftWins: totals.leftWins, rightWins: totals.rightWins, draws: totals.draws, leftWinRate: totals.leftWins / trials, rightWinRate: totals.rightWins / trials },
    averages: {
      elapsedTicks: average(totals.ticks),
      criticalHits: average(totals.criticalHits),
      damageBySide: Object.fromEntries(Object.entries(totals.damageBySide).map(([key, value]) => [key, average(value)])),
      damageBySource: Object.fromEntries(Object.entries(totals.damageBySource).map(([key, value]) => [key, average(value)])),
    },
  };
}

export { DEFAULT_TICKS, DEFAULT_TRIALS };
