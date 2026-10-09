import test from 'node:test';
import assert from 'node:assert/strict';
import ChipBoard from '../../src/chips/ChipBoard.js';
import BattleSystem from '../../src/game/BattleSystem.js';
import CombatConditionSystem from '../../src/game/CombatConditionSystem.js';
import CombatEffectSystem from '../../src/game/CombatEffectSystem.js';
import EnemyFactory from '../../src/game/EnemyFactory.js';
import HeroFactory from '../../src/game/HeroFactory.js';
import ItemFactory from '../../src/game/ItemFactory.js';

test('reset removes bewilderment visuals before discarding conditions and allows reinfection', () => {
  const effects = new CombatEffectSystem();
  const conditions = new CombatConditionSystem({ effects });
  const actors = [{ chip: {} }, { chip: {} }];
  actors.forEach(actor => conditions.applyBewilderment(actor, 2));
  conditions.reset();
  assert.equal(effects.bewildered.size, 0);
  for (const actor of actors) {
    assert.equal(conditions.hasBewilderment(actor), false);
    assert.equal(actor.chip.bewildered, false);
    assert.equal(actor.chip.bewildermentLevel, 0);
  }
  conditions.reset();
  conditions.applyBewilderment(actors[0]);
  assert.equal(effects.bewildered.has(actors[0].chip), true);
  conditions.clearBewilderment(actors[0]);
  assert.equal(effects.bewildered.size, 0);
});

test('recovery and combatant removal clear bewilderment state and visuals', () => {
  for (const clear of ['clearBewilderment', 'clearCombatant']) {
    const effects = new CombatEffectSystem();
    const conditions = new CombatConditionSystem({ effects });
    const actor = { chip: {} };
    conditions.applyBewilderment(actor, 2);
    conditions[clear](actor);
    conditions[clear](actor);
    assert.equal(effects.bewildered.size, 0);
    assert.equal(conditions.hasBewilderment(actor), false);
    assert.equal(actor.chip.bewildermentLevel, 0);
  }
});

test('stage transitions and leaving battle remove bewilderment visuals through BattleSystem', () => {
  for (const exit of ['stage', 'leave']) {
    const board = new ChipBoard({ width: 3000, height: 2000 });
    const effects = new CombatEffectSystem();
    const hero = new HeroFactory().create({ profession: 'swordfighter', x: 0, y: 0, stamina: 3 });
    const battle = new BattleSystem(board, { controller: {}, itemFactory: new ItemFactory(), effects });
    battle.conditionSystem.applyBewilderment(hero, 2);
    if (exit === 'stage') battle.resetStageState();
    else {
      hero.currentArea = 'warehouse';
      battle.update({ heroes: [hero], enemies: [], tick: 1, tickDelta: 1 });
    }
    assert.equal(effects.bewildered.size, 0);
    assert.equal(hero.chip.bewildered, false);
    assert.equal(hero.chip.bewildermentLevel, 0);
  }
});

test('two-edged sword keeps the highest granted multiplier for one combatant', () => {
  const conditions = new CombatConditionSystem();
  const combatant = {};

  conditions.applyTwoEdgedSword(combatant, 2);
  conditions.applyTwoEdgedSword(combatant, 4);
  conditions.applyTwoEdgedSword(combatant, 2);

  assert.equal(conditions.getTwoEdgedSwordMultiplier(combatant), 4);
});

test('night familiars are replaced after an action, consumed on the next attack, and lost one at a time when damaged', () => {
  const conditions = new CombatConditionSystem();
  const actor = {};

  conditions.summonNightFamiliars(actor, 3);
  assert.equal(conditions.getNightFamiliarCount(actor), 3);
  assert.equal(conditions.removeNightFamiliar(actor), true);
  assert.equal(conditions.getNightFamiliarCount(actor), 2);
  assert.equal(conditions.consumeNightFamiliars(actor), 2);
  assert.equal(conditions.getNightFamiliarCount(actor), 0);
  conditions.summonNightFamiliars(actor, 6);
  assert.equal(conditions.getNightFamiliarCount(actor), 6);
});

test('a critical uses the higher two-edged sword multiplier of its attacker and target', () => {
  const conditions = new CombatConditionSystem();
  const attacker = {};
  const target = {};

  conditions.applyTwoEdgedSword(attacker, 2);
  conditions.applyTwoEdgedSword(target, 4);

  assert.equal(conditions.getCriticalDamageMultiplier(attacker, target), 4);
  conditions.clearTwoEdgedSword(target);
  assert.equal(conditions.getCriticalDamageMultiplier(attacker, target), 2);
  conditions.clearTwoEdgedSword(attacker);
  assert.equal(conditions.getCriticalDamageMultiplier(attacker, target), 1);
});

test('bewilderment lasts until the affected combatant completes or cannot perform its action', () => {
  const conditions = new CombatConditionSystem();
  const combatant = {};

  conditions.applyBewilderment(combatant);
  assert.equal(conditions.hasBewilderment(combatant), true);
  assert.equal(conditions.getBewildermentLevel(combatant), 1);
  conditions.applyBewilderment(combatant, 2);
  conditions.applyBewilderment(combatant, 1);
  assert.equal(conditions.getBewildermentLevel(combatant), 2);
  conditions.clearBewilderment(combatant);
  assert.equal(conditions.hasBewilderment(combatant), false);
  assert.equal(conditions.getBewildermentLevel(combatant), 0);
});

test('a lone bewildered enemy attacks self, can recover, and resolves lethal self damage once', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const itemFactory = new ItemFactory();
  const actor = new EnemyFactory({ itemFactory }).createInitialEncounter({ maximumHp: 3, totalTagCount: 0, random: () => 0 });
  actor.currentArea = 'battle';
  actor.chip.height = 0;
  board.addChip(actor.chip);
  const effects = new CombatEffectSystem();
  const battle = new BattleSystem(board, { controller: { remove: () => {}, addToWarehouse: () => {} }, itemFactory, effects, random: () => 0 });
  battle.targetingSystem.includeSelfWhenBewildered = true;
  battle.conditionSystem.applyBewilderment(actor, 2);
  assert.equal(battle.findTarget(actor, [actor]), actor);
  const initialHp = actor.hp;
  battle.resolveAction(actor, actor, [actor]);
  assert.ok(actor.hp < initialHp);
  assert.equal(battle.conditionSystem.hasBewilderment(actor), false);
  assert.equal(effects.bewildered.size, 0);
  actor.hp = 0.01;
  battle.conditionSystem.applyBewilderment(actor, 2);
  battle.resolveAction(actor, actor, [actor]);
  assert.equal(actor.hp, 0);
  assert.equal(board.chips.includes(actor.chip), false);
  assert.equal(battle.conditionSystem.hasBewilderment(actor), false);
  assert.equal(effects.bewildered.size, 0);
});

test('self attacks use independent inherited infection and recovery checks even when both weapons miss', () => {
  for (const [level, chance] of [[1, 0.6], [2, 0.65]]) {
    const board = new ChipBoard({ width: 3000, height: 2000 });
    const hero = new HeroFactory().create({ profession: 'swordfighter', x: 0, y: 0, stamina: 3 });
    hero.currentArea = 'battle';
    hero.currentSlotId = 'battle-2';
    hero.chip.height = 0;
    board.addChip(hero.chip);
    let rolls = 0;
    const battle = new BattleSystem(board, { controller: {}, itemFactory: new ItemFactory(), random: () => { rolls += 1; return chance - 0.001; } });
    battle.targetingSystem.includeSelfWhenBewildered = true;
    battle.actionResolutionSystem.isAttackMiss = () => true;
    battle.conditionSystem.applyBewilderment(hero, level);
    battle.resolveAction(hero, hero, [hero]);
    assert.equal(rolls, 2);
    assert.equal(battle.conditionSystem.getBewildermentLevel(hero), level);
    const values = [chance, 0];
    battle.actionResolutionSystem.random = () => values.shift();
    battle.resolveAction(hero, hero, [hero]);
    assert.equal(battle.conditionSystem.hasBewilderment(hero), false);
  }
});

test('a hero depleted by self attack stops its remaining weapon and cannot recover through vitality', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: 0, y: 0, stamina: 3 });
  hero.stamina = 0.01;
  hero.tags.push('vitality');
  hero.currentArea = 'battle';
  hero.currentSlotId = 'battle-2';
  hero.chip.height = 0;
  board.addChip(hero.chip);
  let damageEvents = 0;
  const battle = new BattleSystem(board, { controller: {}, itemFactory: new ItemFactory(), random: () => 0,
    returnSystem: { begin: () => {} }, onDamage: () => { damageEvents += 1; } });
  battle.targetingSystem.includeSelfWhenBewildered = true;
  battle.conditionSystem.applyBewilderment(hero, 2);
  battle.resolveAction(hero, hero, [hero]);
  assert.equal(hero.stamina, 0);
  assert.equal(damageEvents, 1);
  assert.equal(battle.conditionSystem.hasBewilderment(hero), false);
});

test('disabling lone self attacks consumes one action and checks recovery without an infection roll', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: 0, y: 0, stamina: 3 });
  hero.currentArea = 'battle';
  hero.chip.height = 0;
  board.addChip(hero.chip);
  let rolls = 0;
  const battle = new BattleSystem(board, { controller: {}, itemFactory: new ItemFactory(), random: () => { rolls += 1; return 0; } });
  battle.targetingSystem.includeSelfWhenAlone = false;
  battle.conditionSystem.applyBewilderment(hero, 2);
  hero.chip.actionGauge = battle.updateActionGaugeMaximum(hero);
  battle.updateActor(hero, [hero], 0);
  assert.equal(hero.chip.actionGauge, 0);
  assert.equal(hero.stamina, 3);
  assert.equal(battle.conditionSystem.hasBewilderment(hero), false);
  assert.equal(rolls, 1);
});

test('misfortune keeps its self-damage rate until the affected combatant action ends', () => {
  const conditions = new CombatConditionSystem();
  const combatant = {};

  conditions.applyMisfortune(combatant, 0.5);
  assert.equal(conditions.getMisfortuneDamageRate(combatant), 0.5);
  conditions.clearMisfortune(combatant);
  assert.equal(conditions.getMisfortuneDamageRate(combatant), 0);
});

test('combat conditions scale a critical by the higher multiplier and clear after damage or an action', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const actor = new EnemyFactory().createInitialEncounter();
  const target = new HeroFactory().create({ profession: 'swordfighter', x: 0, y: 0, stamina: 10, maximums: { stamina: 10 } });
  const battle = new BattleSystem(board, { controller: {}, itemFactory: new ItemFactory(), random: () => 0 });

  battle.conditionSystem.applyTwoEdgedSword(actor, 2);
  battle.conditionSystem.applyTwoEdgedSword(target, 4);

  assert.equal(battle.applyDamage(actor, target, 'magic', 0.5, true), 2);
  assert.equal(battle.conditionSystem.getTwoEdgedSwordMultiplier(target), 1);

  battle.actionResolutionSystem.resolve(actor, target, [actor, target]);

  assert.equal(battle.conditionSystem.getTwoEdgedSwordMultiplier(actor), 1);
});

