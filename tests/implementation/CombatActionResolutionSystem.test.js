import test from 'node:test';
import assert from 'node:assert/strict';
import CombatActionResolutionSystem from '../../src/game/CombatActionResolutionSystem.js';
import CombatEffectSystem from '../../src/game/CombatEffectSystem.js';

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

  resolution.resolveWeapon(actor, target, 'sword', [actor, target], { waterDamageBonusRate: 0.5 });

  assert.equal(physicalDamages.length, 1);
  assert.equal(physicalDamages[0][4], true);
  assert.equal(physicalDamages[0][3], 4.2);
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
