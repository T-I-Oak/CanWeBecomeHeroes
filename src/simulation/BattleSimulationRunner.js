import SimulationBattleDriver from './SimulationBattleDriver.js';

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
  return entities.map((entity, index) => ({ ...entity, label: entity.label ?? `${side}-${index + 1}`,
    ...(entity.tags !== undefined ? { tags: [...entity.tags] } : entity.enemyDefinitionId || entity.mainTag ? {} : { tags: [] }),
    weapons: [...(entity.weapons ?? [])] }));
}

function sourceForDamage(type) {
  if (type === 'fire') return 'tag:fire';
  if (type === 'reflection') return 'tag:iron';
  return `attack:${type}`;
}

function runTrial({ left, right, ticks, seed, collectPartyLoadouts }) {
  const random = createRandom(seed);
  const result = { ticks: 0, winner: 'draw', damageBySide: {}, damageBySource: {}, criticalHits: 0 };
  const driver = new SimulationBattleDriver({
    left, right,
    random,
    onDamage: ({ side, type, damage, critical }) => {
      addValue(result.damageBySide, side, damage);
      addValue(result.damageBySource, sourceForDamage(type), damage);
      if (critical) result.criticalHits += 1;
    },
  });

  if (collectPartyLoadouts) {
    result.partyLoadouts = ['left', 'right'].map(side => {
      const members = side === 'left' ? driver.controller.getHeroes() : driver.controller.getEnemies();
      const weapons = {}; const tags = {};
      members.forEach(entity => {
        Object.values(entity.equipment).filter(item => item?.category === 'weapon').forEach(item => addValue(weapons, item.type, 1));
        entity.getTags().forEach(tag => addValue(tags, tag, 1));
      });
      return { seed, side, weapons, tags };
    });
  }

  for (let tick = 1; tick <= ticks; tick += 1) {
    driver.step(tick);
    result.ticks = tick;
    const winner = driver.getWinner();
    if (winner !== null) {
      result.winner = winner;
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
  const collectPartyLoadouts = input.collectPartyLoadouts ?? false;
  const partyLoadouts = [];
  if (!Number.isInteger(ticks) || ticks <= 0) throw new Error('ticks must be a positive integer.');
  if (!Number.isInteger(trials) || trials <= 0) throw new Error('trials must be a positive integer.');

  const totals = { leftWins: 0, rightWins: 0, draws: 0, ticks: 0, damageBySide: {}, damageBySource: {}, criticalHits: 0 };
  for (let trial = 0; trial < trials; trial += 1) {
    const result = runTrial({ left, right, ticks, seed: seed + trial, collectPartyLoadouts });
    if (collectPartyLoadouts) result.partyLoadouts.forEach(party => partyLoadouts.push({ ...party, trial,
      outcome: result.winner === 'draw' ? 'draw' : result.winner === party.side ? 'win' : 'loss', ticks: result.ticks }));
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
    ...(collectPartyLoadouts ? { partyLoadouts } : {}),
  };
}

export { DEFAULT_TICKS, DEFAULT_TRIALS };
