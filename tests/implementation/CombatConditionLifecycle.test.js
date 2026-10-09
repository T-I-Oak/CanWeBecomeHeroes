import test from 'node:test';
import assert from 'node:assert/strict';
import CombatConditionSystem from '../../src/game/CombatConditionSystem.js';
import CombatEffectSystem from '../../src/game/CombatEffectSystem.js';
import BattleSystem from '../../src/game/BattleSystem.js';
import ChipBoard from '../../src/chips/ChipBoard.js';
import HeroFactory from '../../src/game/HeroFactory.js';
import EnemyFactory from '../../src/game/EnemyFactory.js';
import ItemFactory from '../../src/game/ItemFactory.js';
import CombatActionResolutionSystem from '../../src/game/CombatActionResolutionSystem.js';

function grantAll(conditions, actor) {
  conditions.applyTwoEdgedSword(actor, 4);
  conditions.applyBewilderment(actor, 2);
  conditions.applyMisfortune(actor, 0.5);
  conditions.summonNightFamiliars(actor, 3);
}

function assertCleared(conditions, effects, actor) {
  assert.equal(conditions.getTwoEdgedSwordMultiplier(actor), 1);
  assert.equal(conditions.getBewildermentLevel(actor), 0);
  assert.equal(conditions.getMisfortuneDamageRate(actor), 0);
  assert.equal(conditions.getNightFamiliarCount(actor), 0);
  for (const key of ['twoEdgedSwordMultiplier', 'bewildermentLevel', 'misfortuneDamageRate', 'nightFamiliarCount']) assert.equal(actor.chip[key], 0);
  assert.equal(actor.chip.bewildered, false);
  assert.equal(effects.bewildered.has(actor.chip), false);
  assert.equal(effects.nightFamiliars.has(actor.chip), false);
  assert.equal(effects.nightFamiliarFlights.some(flight => flight.source === actor.chip), false);
}

test('each condition owns the synchronization of its state, chip and persistent visuals', () => {
  const effects = new CombatEffectSystem();
  const conditions = new CombatConditionSystem({ effects });
  const actor = { chip: { x: 0, y: 0, height: 0, radius: 64 } };
  grantAll(conditions, actor);
  assert.equal(effects.nightFamiliars.get(actor.chip)?.count, 3);
  assert.equal(effects.bewildered.has(actor.chip), true);
  conditions.removeNightFamiliar(actor);
  assert.equal(actor.chip.nightFamiliarCount, 2);
  assert.equal(effects.nightFamiliars.get(actor.chip).count, 2);
  assert.equal(conditions.consumeNightFamiliars(actor), 2);
  assert.equal(effects.nightFamiliars.has(actor.chip), false);
  conditions.clearTwoEdgedSword(actor);
  conditions.clearBewilderment(actor);
  conditions.clearMisfortune(actor);
  conditions.clearNightFamiliars(actor);
  assertCleared(conditions, effects, actor);
});

test('combatant removal and reset share full cleanup, remain repeatable and preserve other actors', () => {
  const effects = new CombatEffectSystem();
  const conditions = new CombatConditionSystem({ effects });
  const actors = [0, 1].map(x => ({ chip: { x, y: 0, height: 0, radius: 64 } }));
  actors.forEach(actor => grantAll(conditions, actor));
  actors.forEach(actor => effects.launchNightFamiliar(actor, actors[1], 0, 3));
  conditions.clearCombatant(actors[0]);
  conditions.clearCombatant(actors[0]);
  assertCleared(conditions, effects, actors[0]);
  assert.equal(effects.nightFamiliars.get(actors[1].chip).count, 3);
  assert.equal(effects.bewildered.has(actors[1].chip), true);
  conditions.reset();
  conditions.reset();
  actors.forEach(actor => assertCleared(conditions, effects, actor));
  assert.equal(conditions.trackedCombatants.size, 0);
  grantAll(conditions, actors[0]);
  assert.equal(effects.nightFamiliars.get(actors[0].chip).count, 3);
});

test('all battle exit paths use complete condition cleanup', () => {
  for (const exit of ['stage', 'leave', 'depart', 'defeat', 'depleted', 'projection', 'gust']) {
    const board = new ChipBoard({ width: 3000, height: 2000 });
    const effects = new CombatEffectSystem();
    const itemFactory = new ItemFactory();
    const controller = { remove() {}, addToWarehouse() {}, pickupController: { leaveForWarehouse() {} } };
    const battle = new BattleSystem(board, { controller, effects, itemFactory, random: () => 0 });
    const hero = new HeroFactory().create({ profession: 'swordfighter', x: 0, y: 0, stamina: 3 });
    const enemy = new EnemyFactory({ itemFactory }).createInitialEncounter();
    const actor = ['defeat', 'projection'].includes(exit) ? enemy : hero;
    actor.currentArea = 'battle';
    board.addChip(actor.chip);
    grantAll(battle.conditionSystem, actor);
    effects.launchNightFamiliar(actor, enemy, 0, 3);
    if (exit === 'stage') battle.resetStageState();
    else if (exit === 'gust') assert.equal(battle.gustSystem.begin(actor), true);
    else if (exit === 'defeat') battle.defeatEnemy(actor);
    else if (exit === 'depleted') battle.damageSystem.onHeroDepleted(actor);
    else if (exit === 'projection') {
      battle.projectionSystem.areaHeads.push(actor);
      battle.projectionSystem.returnAreaHead(actor, { animate: false });
    } else {
      if (exit === 'leave') actor.currentArea = 'warehouse';
      else actor.targetArea = 'warehouse';
      battle.update({ heroes: [actor], enemies: [], tick: 1, tickDelta: 1 });
    }
    assertCleared(battle.conditionSystem, effects, actor);
  }
});

test('familiar attacks consume state and orbit together while retaining the actual flight origins', () => {
  const effects = new CombatEffectSystem();
  const conditions = new CombatConditionSystem({ effects });
  const actor = { chip: { x: 50, y: 70, height: 0, radius: 64 }, getStatus: () => 3 };
  const target = { chip: { x: 100, y: 100, height: 0, radius: 64 } };
  effects.update(0.3);
  conditions.summonNightFamiliars(actor, 3);
  effects.update(0.2);
  const origins = effects.getNightFamiliarLaunchPositions(actor);
  const resolution = new CombatActionResolutionSystem({
    effects, conditionSystem: conditions,
    targetingSystem: { getOpponents: () => [target] },
    damageSystem: { applyPhysicalDamage: () => {
      assert.equal(conditions.getNightFamiliarCount(actor), 0);
      assert.equal(actor.chip.nightFamiliarCount, 0);
      assert.equal(effects.nightFamiliars.has(actor.chip), false);
      return 0.1;
    } },
    random: () => 0,
  });
  resolution.resolveNightFamiliarAttacks(actor, [actor, target]);
  assert.deepEqual(effects.nightFamiliarFlights.map(flight => flight.from), origins);
  assert.equal(conditions.consumeNightFamiliars(actor), 0);
  assert.equal(effects.nightFamiliarFlights.length, 3);
  conditions.clearCombatant(actor);
  assert.equal(effects.nightFamiliarFlights.length, 0);
});

test('repeated individual clears remove stale visuals even when their condition data is absent', () => {
  const effects = new CombatEffectSystem();
  const conditions = new CombatConditionSystem({ effects });
  const actor = { chip: { x: 0, y: 0, height: 0, radius: 64 } };
  effects.bewilder(actor);
  effects.summonNightFamiliars(actor, 3);
  effects.launchNightFamiliar(actor, actor, 0, 3);
  for (let repeat = 0; repeat < 2; repeat += 1) {
    conditions.clearBewilderment(actor);
    conditions.clearNightFamiliars(actor);
    conditions.clearTwoEdgedSword(actor);
    conditions.clearMisfortune(actor);
    assertCleared(conditions, effects, actor);
  }
});
