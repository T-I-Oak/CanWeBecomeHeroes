import test from 'node:test';
import assert from 'node:assert/strict';
import SimulationBattleDriver from '../../src/simulation/SimulationBattleDriver.js';
import EnemyFactory from '../../src/game/EnemyFactory.js';

function fixture(enemyDefinitionId = 'medium-valor') {
  return new SimulationBattleDriver({
    random: () => 0.01,
    left: [{ tags: ['valor', 'valor', 'valor'], weapons: ['sword', 'shield'], stamina: 10, maximums: { stamina: 10 } }],
    right: [{ enemyDefinitionId, maximumHp: 10, weapons: ['sword'] }],
  });
}

test('driver constructs production enemies with their intrinsic tags and Ex skills', () => {
  const driver = fixture('large-water');
  const enemy = driver.controller.getEnemies()[0];
  assert.equal(enemy.uniqueSkill.id, 'water-deep-sea-surge');
  assert.equal(enemy.uniqueSkill.level, 2);
  assert.equal(enemy.rank, 'boss');
  assert.deepEqual(enemy.tags, ['water', 'water']);
});

test('random equipment uses the production enemy generator for both sides with a six-tag budget', () => {
  const driver = new SimulationBattleDriver({ random: () => 0.01,
    left: [{ mainTag: 'water', tags: ['water'], equipmentTagBudget: 6 }],
    right: [{ enemyDefinitionId: 'small-water', tags: ['water'], equipmentTagBudget: 6 }] });
  const reference = new EnemyFactory().createFromDefinition({ enemyDefinitionId: 'small-water', slotPosition: 1, weaponCount: 2, totalTagCount: 6, random: () => 0.01 });
  const describe = items => items.map(item => ({ type: item.type, category: item.category, tags: item.tags })).toSorted((a, b) => a.category.localeCompare(b.category));
  for (const entity of [...driver.controller.getHeroes(), ...driver.controller.getEnemies()]) {
    const equipment = Array.isArray(entity.equipment) ? entity.equipment : Object.values(entity.equipment);
    assert.deepEqual(describe(equipment), describe(reference.equipment));
    assert.equal(equipment.reduce((sum, item) => sum + item.tags.length, 0), 6);
    assert.equal(equipment.filter(item => item.category === 'weapon').length, 2);
    assert.equal(equipment.length, 5);
    assert.deepEqual(entity.tags, ['water']);
  }
});

test('equipment regenerates for each trial and remains reproducible for the same random sequence', () => {
  function random(seed) { let value = seed; return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; }; }
  const input = { left: [{ mainTag: 'blessing', tags: ['blessing'], equipmentTagBudget: 6 }], right: [{ enemyDefinitionId: 'small-water', equipmentTagBudget: 6 }] };
  const describe = seed => {
    const driver = new SimulationBattleDriver({ ...input, random: random(seed) });
    return [...driver.controller.getHeroes(), ...driver.controller.getEnemies()].map(entity => Object.values(entity.equipment).map(item => [item.type, item.tags]));
  };
  assert.deepEqual(describe(1), describe(1));
  assert.notDeepEqual(describe(1), describe(2));
});

test('driver keeps death summons in the battle and damage attribution', () => {
  const damage = [];
  const driver = fixture('medium-vitality');
  driver.onDamage = event => damage.push(event);
  const enemy = driver.controller.getEnemies()[0];
  driver.battle.defeatEnemy(enemy);
  assert.equal(driver.controller.getEnemies().length, 2);
  assert.equal(driver.getWinner(), null);
  for (let tick = 1; tick <= 100; tick++) driver.step(tick);
  assert.ok(driver.controller.getEnemies().every(actor => actor.chip.isSettled));
  const summon = driver.controller.getEnemies()[0];
  driver.battle.applyDamage(summon, driver.controller.getHeroes()[0], 'summon-probe', 0.1);
  assert.equal(damage.at(-1).side, 'right');
});

test('driver waits for gust equipment recovery and battle reentry', () => {
  const driver = fixture('medium-feather');
  const hero = driver.controller.getHeroes()[0];
  assert.equal(driver.battle.gustSystem.begin(hero), true);
  assert.equal(driver.getWinner(), null);
  let reentered = false;
  for (let tick = 1; tick <= 6000; tick++) {
    driver.board.update(1 / 60);
    driver.controller.update(1 / 60);
    driver.battle.gustSystem.update();
    if (hero.currentArea === 'battle' && !hero.targetArea) { reentered = true; break; }
  }
  assert.equal(reentered, true);
  assert.ok(hero.equipment.rightHand && hero.equipment.leftHand);
});

test('driver treats a depleted returning hero as defeated without removing the production object', () => {
  const driver = fixture();
  const hero = driver.controller.getHeroes()[0];
  driver.battle.applyDamage(driver.controller.getEnemies()[0], hero, 'probe', 20);
  assert.equal(driver.controller.hasEntity(hero), true);
  assert.equal(driver.getWinner(), 'right');
});

test('driver completes phantom transfer callbacks and attacks without a renderer', () => {
  const driver = fixture('medium-area');
  const enemy = driver.controller.getEnemies()[0];
  driver.battle.resolveActionUniqueSkill(enemy, [enemy, ...driver.controller.getHeroes()]);
  assert.equal(driver.battle.projectionSystem.areaHeads.length, 1);
  const head = driver.battle.projectionSystem.areaHeads[0];
  for (let tick = 1; tick <= 30; tick++) driver.step(tick);
  assert.equal(driver.battle.projectionSystem.areaHeads.includes(head), false);
});

test('driver rejects impossible slot layouts and invalid explicit skill definitions', () => {
  assert.throws(() => new SimulationBattleDriver({ left: Array.from({ length: 5 }, () => ({})), right: [{}] }), /four|4/);
  assert.throws(() => new SimulationBattleDriver({ left: [{}], right: [{ uniqueSkill: { id: 'unknown', level: 1 } }] }), /Unknown unique skill/);
});
