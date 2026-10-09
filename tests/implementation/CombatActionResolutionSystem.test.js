import test from 'node:test';
import assert from 'node:assert/strict';
import ChipBoard from '../../src/chips/ChipBoard.js';
import BattleSystem from '../../src/game/BattleSystem.js';
import CombatActionResolutionSystem from '../../src/game/CombatActionResolutionSystem.js';
import CombatEffectSystem from '../../src/game/CombatEffectSystem.js';
import EnemyFactory from '../../src/game/EnemyFactory.js';
import HeroFactory from '../../src/game/HeroFactory.js';
import ItemFactory from '../../src/game/ItemFactory.js';
import { UNIQUE_SKILL_CATALOG } from '../../src/game/UniqueSkillCatalog.js';
import CombatConditionSystem from '../../src/game/CombatConditionSystem.js';

test('infection and continuation independently use one catalog chance for the inherited Ex level', () => {
  for (const [level, chance] of [[1, 0.6], [2, 0.65]]) {
    assert.deepEqual(UNIQUE_SKILL_CATALOG['reputation-bewildering-words'].levels[level], { chance });
    const recoveryChance = 1 - chance;
    for (const infectionSucceeded of [false, true]) {
      for (const recovered of [false, true]) {
        const actor = { chip: { type: 'hero' } };
        const conditions = new CombatConditionSystem();
        conditions.applyBewilderment(actor, level);
        const values = [infectionSucceeded ? chance - 1e-6 : chance, recovered ? recoveryChance - 1e-6 : recoveryChance];
        const resolution = new CombatActionResolutionSystem({ conditionSystem: conditions, random: () => values.shift() });
        resolution.resolveBewildermentTransmission(actor, actor);
        resolution.resolveBewildermentContinuation(actor);
        assert.equal(conditions.getBewildermentLevel(actor), recovered ? 0 : level);
        assert.equal(values.length, 0);
      }
    }
  }
});

test('bewilderment spreads once per action before missed weapons, preserving Ex level across generations', () => {
  for (const [level, chance] of [[1, 0.6], [2, 0.65]]) {
    const conditions = new CombatConditionSystem();
    const makeActor = () => ({ chip: { type: 'hero' }, getTagCount: () => 0, luckBonus: 0 });
    const first = makeActor();
    const second = makeActor();
    const third = makeActor();
    conditions.applyBewilderment(first, level);
    let rolls = 0;
    const resolution = new CombatActionResolutionSystem({
      board: { chips: [first.chip, second.chip, third.chip] },
      conditionSystem: conditions,
      targetingSystem: { rangeTargets: () => [] },
      actionLog: { begin: () => {}, flush: () => {}, recordMiss: () => {} },
      weaponEffectSystem: { applySupportEffect: () => {} },
      projectionSystem: { areaHeads: [] },
      uniqueSkillEffectSystem: { resolve: () => [] },
      uniqueSkillSystem: { refreshBlessingSkills: () => {} },
      random: () => { rolls += 1; return chance - 0.001; },
    });
    resolution.attackTypes = () => ['sword', 'sword'];
    resolution.isAttackMiss = () => true;
    resolution.resolve(first, second, [first, second, third]);
    assert.equal(rolls, 2);
    assert.equal(conditions.getBewildermentLevel(first), level);
    assert.equal(conditions.getBewildermentLevel(second), level);
    resolution.resolve(second, third, [first, second, third]);
    assert.equal(rolls, 4);
    assert.equal(conditions.getBewildermentLevel(third), level);
    conditions.clearBewilderment(third);
    conditions.applyBewilderment(first, level);
    resolution.random = () => chance;
    resolution.resolveBewildermentTransmission(first, third);
    assert.equal(conditions.hasBewilderment(third), false);
  }
});

test('hit probability preserves water-free luck comparisons and attenuates water without eliminating hits', () => {
  const cases = [
    [0.05, 0.05, 0, 0, 0, 0.5],
    [0.15, 0.05, 0, 0, 0, 5 / 6],
    [0.05, 0.15, 0, 0, 0, 1 / 6],
    [0.05, 0.05, 1, 0, 0, 0.25],
    [0.05, 0.05, 7, 0, 0, 1 / 16],
    [0.05, 0.05, 1, 3, 0, 1 / 3.4],
    [0.05, 0.05, 0, 0, 1, 1 / 6],
    [0, 0.05, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 1],
  ];
  for (const [luck, targetLuck, water, cloth, feather, hitRate] of cases) {
    const actor = { attributes: { water }, getLuckDegree: () => luck, getTagSkillLevel: () => cloth };
    const target = { getLuckDegree: () => targetLuck, getTagSkillLevel: () => feather };
    const resolution = new CombatActionResolutionSystem({ random: () => Math.max(0, hitRate - 1e-9) });
    assert.equal(resolution.isAttackMiss(actor, target), hitRate === 0);
    resolution.random = () => Math.min(1 - 1e-9, hitRate + 1e-9);
    assert.equal(resolution.isAttackMiss(actor, target), hitRate < 1);
  }
});

test('night familiars consume their owner state and independently attack random remaining opponents', () => {
  const actor = { getStatus: () => 3 };
  const firstTarget = {};
  const secondTarget = {};
  const launches = [];
  const damages = [];
  const conditionSystem = {
    consumeNightFamiliars: () => 3,
  };
  const targetingSystem = {
    getOpponents: () => [firstTarget, secondTarget],
  };
  const effects = {
    consumeNightFamiliars: (source) => assert.equal(source, actor),
    launchNightFamiliar: (...arguments_) => launches.push(arguments_),
  };
  const damageSystem = {
    applyPhysicalDamage: (...arguments_) => damages.push(arguments_),
  };
  const resolution = new CombatActionResolutionSystem({
    conditionSystem,
    targetingSystem,
    effects,
    damageSystem,
    projectionSystem: { propagate: () => {} },
    random: () => 0.75,
  });

  resolution.resolveNightFamiliarAttacks(actor, [actor, firstTarget, secondTarget]);

  assert.equal(launches.length, 3);
  assert.deepEqual(launches.map(([, target]) => target), [secondTarget, secondTarget, secondTarget]);
  assert.equal(damages.length, 3);
  assert.deepEqual(damages.map(([, target, type]) => [target, type]), [[secondTarget, 'night-familiar'], [secondTarget, 'night-familiar'], [secondTarget, 'night-familiar']]);
});

test('night familiars stop after the last opponent has left the candidates', () => {
  const actor = { getStatus: () => 3 };
  const target = {};
  let candidateChecks = 0;
  const damages = [];
  const resolution = new CombatActionResolutionSystem({
    conditionSystem: { consumeNightFamiliars: () => 3 },
    targetingSystem: { getOpponents: () => (candidateChecks++ === 0 ? [target] : []) },
    effects: { consumeNightFamiliars: () => {}, launchNightFamiliar: () => {} },
    damageSystem: { applyPhysicalDamage: (...arguments_) => damages.push(arguments_) },
    projectionSystem: { propagate: () => {} },
    random: () => 0,
  });

  resolution.resolveNightFamiliarAttacks(actor, [actor, target]);

  assert.equal(damages.length, 1);
});

test('deep sea surge applies its water value to the owner before resolving all weapon damage', () => {
  const actor = { getTagCount: (tag) => tag === 'water' ? 4 : 0 };
  const target = {};
  const appliedAttributes = [];
  const resolution = new CombatActionResolutionSystem({
    conditionSystem: { applyTwoEdgedSword: () => {} },
    attributeSystem: { applySelfAttribute: (...arguments_) => appliedAttributes.push(arguments_) },
    uniqueSkillEffectSystem: {
      resolve: () => [{
        selfAttribute: { attribute: 'water', value: 4 },
        waterDamageBonusRate: 0.5,
      }],
    },
  });

  const modifiers = resolution.resolveActionStartedUniqueSkill(actor, target, [actor, target]);

  assert.deepEqual(appliedAttributes, [[actor, 'water', 4]]);
  assert.equal(modifiers.waterDamageBonusRate, 0.5);
});

test('curse of misfortune applies its rate to the selected target at action start', () => {
  const actor = {};
  const target = {};
  const appliedMisfortune = [];
  const resolution = new CombatActionResolutionSystem({
    conditionSystem: { applyMisfortune: (...arguments_) => appliedMisfortune.push(arguments_) },
    uniqueSkillEffectSystem: { resolve: () => [{ misfortuneTarget: { target, damageRate: 0.5 } }] },
  });

  resolution.resolveActionStartedUniqueSkill(actor, target, [actor, target]);

  assert.deepEqual(appliedMisfortune, [[target, 0.5]]);
});

test('storm wings gusts only after every weapon of the action has resolved', () => {
  const order = [];
  const actor = { chip: {}, getTagCount: () => 0, luckBonus: 0, isPhantomHead: false };
  const target = {};
  const resolution = new CombatActionResolutionSystem({
    targetingSystem: { rangeTargets: () => [] },
    actionLog: { begin: () => {}, flush: () => {} },
    projectionSystem: {},
    uniqueSkillSystem: { refreshBlessingSkills: () => {} },
    conditionSystem: { consumeNightFamiliars: () => 0, clearTwoEdgedSword: () => {}, clearBewilderment: () => {}, clearMisfortune: () => {} },
    gustSystem: { begin: () => order.push('gust') },
  });
  resolution.attackTypes = () => ['sword', 'bow'];
  resolution.resolveWeapon = (_actor, _target, type) => order.push(type);
  resolution.resolveVitality = () => order.push('vitality');
  resolution.resolveActionUniqueSkill = () => {};
  resolution.resolveActionStartedUniqueSkill = () => ({ waterDamageBonusRate: 0, gustTargets: [target] });

  resolution.resolve(actor, target, [actor, target]);

  assert.deepEqual(order, ['sword', 'bow', 'vitality', 'gust']);
});

test('deep sea surge turns every successful weapon hit critical and adds the current water value to damage', () => {
  const actor = {
    chip: { type: 'hero' },
    attributes: { water: 4 },
    getStatus: () => 3,
    getTagSkillLevel: () => 0,
    getLuckDegree: () => 1,
  };
  const target = { chip: { type: 'enemy' }, attributes: { water: 0 }, getLuckDegree: () => 0, getTagSkillLevel: () => 0 };
  const physicalDamages = [];
  const resolution = new CombatActionResolutionSystem({
    board: { chips: [target.chip] },
    targetingSystem: { rangeTargets: () => [{ target, coefficient: 1 }] },
    attributeSystem: { propagate: () => {} },
    weaponEffectSystem: { applySupportEffect: () => {} },
    damageSystem: { applyPhysicalDamage: (...arguments_) => physicalDamages.push(arguments_) },
    random: () => 0,
  });

  for (const [level, expectedMultiplier] of [[1, 5], [2, 9]]) {
    resolution.resolveWeapon(actor, target, 'sword', [actor, target], UNIQUE_SKILL_CATALOG['water-deep-sea-surge'].levels[level]);
    const damage = physicalDamages.at(-1);
    assert.equal(damage[4], true);
    assert.ok(Math.abs(damage[3] - 1.4 * expectedMultiplier) < 1e-9);
  }
  assert.equal(physicalDamages.length, 2);
});

test('night familiar visuals use one asset at distinct positions around the owner', () => {
  const effects = new CombatEffectSystem();
  const source = { chip: { x: 100, y: 120, height: 20, radius: 64 } };

  effects.summonNightFamiliars(source, 3);
  effects.elapsedSeconds = 0.45;
  const familiars = effects.nightFamiliars.get(source.chip);
  const positions = [0, 1, 2].map((index) => effects.getNightFamiliarOrbitPosition(familiars, index));

  assert.equal(effects.nightFamiliars.get(source.chip).count, 3);
  assert.equal(new Set(positions.map(({ x, y }) => `${x},${y}`)).size, 3);
  effects.removeNightFamiliar(source);
  assert.equal(effects.nightFamiliars.get(source.chip).count, 2);
  effects.clearNightFamiliars(source);
  assert.equal(effects.nightFamiliars.has(source.chip), false);
});

test('night familiar flight starts at its displayed orbit position and keeps that origin', () => {
  const effects = new CombatEffectSystem();
  const source = { chip: { x: 100, y: 120, height: 20, radius: 64 } };
  const target = { chip: { x: 350, y: 120, height: 20, radius: 64 } };
  effects.summonNightFamiliars(source, 3);
  effects.update(0.2);
  const position = effects.getNightFamiliarOrbitPosition(effects.nightFamiliars.get(source.chip), 1);
  effects.launchNightFamiliar(source, target, 1, 3);
  effects.consumeNightFamiliars(source);
  assert.deepEqual(effects.nightFamiliarFlights[0].from, position);
  source.chip.x += 100;
  effects.update(0.1);
  assert.deepEqual(effects.nightFamiliarFlights[0].from, position);
  effects.update(0.18);
  assert.equal(effects.nightFamiliarFlights.length, 0);
});

test('area head inherits its source tags, attacks immediately, and returns after its action', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const itemFactory = new ItemFactory();
  const enemyFactory = new EnemyFactory({ itemFactory });
  const hydra = enemyFactory.createFromDefinition({ enemyDefinitionId: 'medium-area', slotPosition: 3, maximumHp: 5, totalTagCount: 3, maximums: { power: 4, magic: 4, speed: 4, negotiation: 4, luck: 4 }, random: () => 0 });
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: hydra.chip.x, y: hydra.chip.y + 224, stamina: 10, maximums: { stamina: 10 } });
  hero.currentArea = 'battle';
  hydra.chip.height = 0;
  hero.chip.height = 0;
  board.addChip(hydra.chip);
  board.addChip(hero.chip);
  const controller = { getEnemies: () => [hydra] };
  const battle = new BattleSystem(board, { controller, itemFactory, enemyFactory, random: () => 0 });

  battle.resolveActionUniqueSkill(hydra);

  assert.equal(battle.phantomHeads.length, 1);
  const [head] = battle.phantomHeads;
  assert.equal(head.definition.id, 'phantom-area-head');
  assert.equal(head.uniqueSkill, null);
  assert.deepEqual(head.getTags(), hydra.getTags());
  assert.equal(head.chip.actionGauge, head.chip.actionGaugeMaximum);
  assert.equal(board.chips.includes(head.chip), true);

  battle.updateActor(head, [hero, hydra, head], 0);

  assert.equal(board.chips.includes(head.chip), false);
  assert.equal(battle.phantomHeads.length, 0);
});

test('area head returns instead of remaining when no hero can be targeted', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const itemFactory = new ItemFactory();
  const enemyFactory = new EnemyFactory({ itemFactory });
  const hydra = enemyFactory.createFromDefinition({ enemyDefinitionId: 'medium-area', slotPosition: 3, maximumHp: 5, totalTagCount: 0, random: () => 0 });
  hydra.chip.height = 0;
  board.addChip(hydra.chip);
  const battle = new BattleSystem(board, { controller: { getEnemies: () => [hydra] }, itemFactory, enemyFactory, random: () => 0 });

  battle.resolveActionUniqueSkill(hydra);
  const [head] = battle.phantomHeads;
  battle.updateActor(head, [hydra, head], 0);

  assert.equal(board.chips.includes(head.chip), false);
  assert.equal(battle.phantomHeads.length, 0);
});

test('area head rush lets an Ex2 boss and its Ex1 mid-boss chain their minion attacks without consuming gauges', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const itemFactory = new ItemFactory();
  const enemyFactory = new EnemyFactory({ itemFactory });
  const yamata = enemyFactory.createFromDefinition({ enemyDefinitionId: 'large-area', slotPosition: 3, maximumHp: 7, totalTagCount: 0, random: () => 0 });
  const regularLeft = enemyFactory.createInitialEncounter({ slotPosition: 1, random: () => 0 });
  const midBoss = enemyFactory.createFromDefinition({ enemyDefinitionId: 'medium-area', slotPosition: 5, maximumHp: 5, totalTagCount: 0, random: () => 0 });
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: yamata.chip.x, y: yamata.chip.y + 224, stamina: 20, maximums: { stamina: 20 } });
  hero.currentArea = 'battle';
  [yamata, regularLeft, midBoss, hero].forEach((entity) => { entity.chip.height = 0; board.addChip(entity.chip); });
  regularLeft.chip.actionGauge = 1.25;
  const effects = new CombatEffectSystem();
  const enemies = [yamata, regularLeft, midBoss];
  const battle = new BattleSystem(board, { controller: { getEnemies: () => enemies }, itemFactory, enemyFactory, effects, random: () => 0 });

  battle.resolveAction(yamata, hero, [hero, ...enemies]);

  assert.deepEqual(effects.attacks.map((effect) => effect.chip), [yamata.chip, regularLeft.chip, midBoss.chip, regularLeft.chip]);
  assert.equal(battle.phantomHeads.length, 2);
  assert.equal(regularLeft.chip.actionGauge, 1.25);
  assert.equal(regularLeft.chip.actionVisualCount, 0);
  assert.equal(midBoss.chip.actionVisualCount, 0);
});

test('area Ex2 and a cooperating Ex1 mid-boss launch three heads when three enemy positions are free', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const itemFactory = new ItemFactory();
  const enemyFactory = new EnemyFactory({ itemFactory });
  const yamata = enemyFactory.createFromDefinition({ enemyDefinitionId: 'large-area', slotPosition: 3, maximumHp: 7, totalTagCount: 0, random: () => 0 });
  const midBoss = enemyFactory.createFromDefinition({ enemyDefinitionId: 'medium-area', slotPosition: 5, maximumHp: 5, totalTagCount: 0, random: () => 0 });
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: yamata.chip.x, y: yamata.chip.y + 224, stamina: 20, maximums: { stamina: 20 } });
  hero.currentArea = 'battle';
  [yamata, midBoss, hero].forEach((entity) => { entity.chip.height = 0; board.addChip(entity.chip); });
  const enemies = [yamata, midBoss];
  const battle = new BattleSystem(board, { controller: { getEnemies: () => enemies }, itemFactory, enemyFactory, random: () => 0 });

  battle.resolveAction(yamata, hero, [hero, ...enemies]);

  assert.equal(battle.phantomHeads.length, 3);
});

test('shadow fingertips removes a target tag before a missed attack, and Ex2 transfers it to the attacker', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const itemFactory = new ItemFactory();
  const enemy = new EnemyFactory({ itemFactory }).createInitialEncounter({ random: () => 0 });
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: enemy.chip.x, y: enemy.chip.y + 224, stamina: 3 });
  const sourceItem = itemFactory.createWeapon({ weapon: 'sword', tags: ['valor'], x: 0, y: 0 });
  hero.equip(sourceItem);
  hero.currentArea = 'battle';
  enemy.uniqueSkill = { id: 'shadow-fingertips', level: 2 };
  enemy.getLuckDegree = () => 1;
  enemy.chip.height = 0;
  hero.chip.height = 0;
  board.addChip(enemy.chip);
  board.addChip(hero.chip);
  const battle = new BattleSystem(board, { controller: {}, itemFactory, random: () => 0 });
  battle.actionResolutionSystem.isAttackMiss = () => true;

  battle.resolveAction(enemy, hero, [enemy, hero]);

  assert.deepEqual(sourceItem.tags, []);
  assert.equal(sourceItem.value, 1);
  assert.equal(hero.getCarriedWeight(), 6);
  assert.equal(enemy.equipment.some((item) => item.tags.includes('valor')), true);
});

test('shadow fingertips Ex1 removes the tag without adding it to the attacker', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const itemFactory = new ItemFactory();
  const enemy = new EnemyFactory({ itemFactory }).createInitialEncounter({ random: () => 0 });
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: enemy.chip.x, y: enemy.chip.y + 224, stamina: 3 });
  const sourceItem = itemFactory.createWeapon({ weapon: 'sword', tags: ['valor'], x: 0, y: 0 });
  hero.equip(sourceItem);
  hero.currentArea = 'battle';
  enemy.uniqueSkill = { id: 'shadow-fingertips', level: 1 };
  enemy.getLuckDegree = () => 1;
  enemy.chip.height = 0;
  hero.chip.height = 0;
  board.addChip(enemy.chip);
  board.addChip(hero.chip);
  const battle = new BattleSystem(board, { controller: {}, itemFactory, random: () => 0 });
  battle.actionResolutionSystem.isAttackMiss = () => true;

  battle.resolveAction(enemy, hero, [enemy, hero]);

  assert.deepEqual(sourceItem.tags, []);
  assert.equal(enemy.equipment.some((item) => item.tags.includes('valor')), false);
});

test('vitality recovers a fixed 0.2 per tag after a successful luck check', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const itemFactory = new ItemFactory();
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: 100, y: 100, stamina: 1 });
  hero.tags.push('vitality', 'vitality');
  const enemy = new EnemyFactory({ itemFactory }).createInitialEncounter({ maximumHp: 3, totalTagCount: 0 });
  enemy.tags.push('vitality', 'vitality', 'vitality');
  enemy.hp = 2.5;
  const battle = new BattleSystem(board, { controller: {}, itemFactory, random: () => 0, logger: { info: () => {} } });

  assert.ok(Math.abs(battle.resolveVitality(hero) - 0.4) < 1e-9);
  assert.equal(hero.stamina, 1.4);
  assert.equal(battle.resolveVitality(enemy), 0.5);
  assert.equal(enemy.hp, 3);
});

