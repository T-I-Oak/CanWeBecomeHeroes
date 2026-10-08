import test from 'node:test';
import assert from 'node:assert/strict';
import ChipBoard from '../../src/chips/ChipBoard.js';
import BattleSystem from '../../src/game/BattleSystem.js';
import CombatTargetingSystem from '../../src/game/CombatTargetingSystem.js';
import EnemyFactory from '../../src/game/EnemyFactory.js';
import HeroFactory from '../../src/game/HeroFactory.js';
import ItemFactory from '../../src/game/ItemFactory.js';

function combatant(type, x, equipment = []) {
  return {
    chip: { type, x, y: 0 },
    equipment,
    getCarriedWeight: () => 0,
    getTagCount: () => 0,
  };
}

test('a bewildered combatant includes itself among allies and targets itself when alone', () => {
  const actor = combatant('hero', 0, [{ category: 'weapon', type: 'sword' }]);
  const ally = combatant('hero', 10);
  const opponent = combatant('enemy', 20);
  const board = { chips: [actor.chip, ally.chip, opponent.chip] };
  const targeting = new CombatTargetingSystem(board, { isBewildered: (candidate) => candidate === actor, includeSelfWhenBewildered: true });

  assert.deepEqual(targeting.getOpponents(actor, [actor, ally, opponent]), [actor, ally]);
  assert.equal(targeting.findTarget(actor, [actor, ally, opponent]), actor);
  assert.equal(targeting.findTarget(actor, [actor, opponent]), actor);
  targeting.isBewildered = () => false;
  assert.deepEqual(targeting.getOpponents(actor, [actor, ally, opponent]), [opponent]);
});

test('default bewilderment excludes self with allies and targets self only when alone', () => {
  const actor = combatant('hero', 0);
  const ally = combatant('hero', 10);
  const enemy = combatant('enemy', 20);
  const targeting = new CombatTargetingSystem({ chips: [actor.chip, ally.chip, enemy.chip] }, { isBewildered: () => true });
  assert.deepEqual(targeting.getOpponents(actor, [actor, ally, enemy]), [ally]);
  assert.equal(targeting.findTarget(actor, [actor, enemy]), actor);
  targeting.isTargetable = candidate => candidate !== ally;
  assert.equal(targeting.findTarget(actor, [actor, ally, enemy]), actor);
  targeting.includeSelfWhenAlone = false;
  assert.equal(targeting.findTarget(actor, [actor, enemy]), null);
});

test('bewildered area attacks preserve allied slots including self and large enemies', () => {
  for (const type of ['hero', 'enemy']) {
    const actor = combatant(type, 0);
    const ally = combatant(type, 10);
    actor.slotPosition = type === 'hero' ? 2 : 3;
    ally.slotPosition = type === 'hero' ? 4 : 6;
    if (type === 'enemy') actor.definition = { size: 'large' };
    actor.getTagCount = () => 4;
    const targeting = new CombatTargetingSystem({ chips: [actor.chip, ally.chip] }, { isBewildered: () => true, includeSelfWhenBewildered: true });
    const lane = targeting.createRangeLane(actor, [actor, ally]);
    assert.equal(lane.length, type === 'hero' ? 4 : 5);
    assert.deepEqual(targeting.rangeTargets(actor, ally, [actor, ally]).map(({ target, coefficient }) => [target, coefficient]), [[actor, 0.6], [ally, 0.9]]);
  }
});

test('area keeps empty enemy slots in its coefficient lane', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const factory = new EnemyFactory();
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: 0, y: 0, stamina: 3, maximums: { negotiation: 7 } });
  hero.currentArea = 'battle';
  hero.currentSlotId = 'battle-2';
  hero.tags.push('area', 'area', 'area', 'area');
  const left = factory.createInitialEncounter({ slotPosition: 2 });
  const target = factory.createInitialEncounter({ slotPosition: 4 });
  const right = factory.createInitialEncounter({ slotPosition: 5 });
  const outerRight = factory.createInitialEncounter({ slotPosition: 6 });
  [hero, left, target, right, outerRight].forEach((entity) => board.addChip(entity.chip));
  const battle = new BattleSystem(board, { controller: {}, itemFactory: new ItemFactory(), logger: { info: () => {} } });

  assert.deepEqual(
    battle.rangeTargets(hero, target, [hero, left, target, right, outerRight]).map(({ target: foe, coefficient }) => [foe.slotPosition, coefficient]),
    [[2, 0.6], [4, 0.9], [5, 0.8], [6, 0.6]],
  );
});

test('a large enemy occupies one area lane position despite using two board slots', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const factory = new EnemyFactory();
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: 0, y: 0, stamina: 3 });
  hero.currentArea = 'battle';
  hero.currentSlotId = 'battle-2';
  hero.tags.push('area', 'area');
  const boss = factory.createFromDefinition({ enemyDefinitionId: 'large-vitality', slotPosition: 3, maximumHp: 6, totalTagCount: 0 });
  const target = factory.createInitialEncounter({ slotPosition: 5 });
  const right = factory.createInitialEncounter({ slotPosition: 6 });
  [hero, boss, target, right].forEach((entity) => board.addChip(entity.chip));
  const battle = new BattleSystem(board, { controller: {}, itemFactory: new ItemFactory(), logger: { info: () => {} } });

  assert.equal(boss.chip.bounds.width, 448);
  assert.equal(boss.chip.bounds.height, 448);
  assert.equal(boss.chip.x, boss.chip.bounds.x + boss.chip.bounds.width / 2);
  assert.equal(boss.chip.y, boss.chip.bounds.y + boss.chip.bounds.height / 2);

  assert.deepEqual(
    battle.rangeTargets(hero, target, [hero, boss, target, right]).map(({ target: foe, coefficient }) => [foe.slotPosition, coefficient]),
    [[3, 0.7], [5, 0.8], [6, 0.7]],
  );
});

test('a knocked-back combatant is excluded from attack candidates', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: 500, y: 500, stamina: 3 });
  hero.currentArea = 'battle';
  hero.currentSlotId = 'battle-2';
  const enemy = new EnemyFactory().createInitialEncounter({ maximumHp: 10 });
  [hero, enemy].forEach((entity) => board.addChip(entity.chip));
  const battle = new BattleSystem(board, { controller: {}, itemFactory: new ItemFactory(), logger: { info: () => {} } });

  battle.knockbackSystem.begin(hero, 100);

  assert.equal(battle.findTarget(enemy, [hero, enemy]), null);
});

