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

test('night familiar visuals use one asset at distinct positions around the owner', () => {
  const effects = new CombatEffectSystem();
  const source = { chip: { x: 100, y: 120, height: 20, radius: 64 } };

  effects.summonNightFamiliars(source, 3);
  const positions = [0, 1, 2].map((index) => effects.getNightFamiliarOrbitPosition(source.chip, index, 3));

  assert.equal(effects.nightFamiliars.get(source.chip).count, 3);
  assert.equal(new Set(positions.map(({ x, y }) => `${x},${y}`)).size, 3);
  effects.removeNightFamiliar(source);
  assert.equal(effects.nightFamiliars.get(source.chip).count, 2);
  effects.clearNightFamiliars(source);
  assert.equal(effects.nightFamiliars.has(source.chip), false);
});
