import test from 'node:test';
import assert from 'node:assert/strict';
import ChipBoard from '../../src/chips/ChipBoard.js';
import BattleSystem from '../../src/game/BattleSystem.js';
import CombatEffectSystem from '../../src/game/CombatEffectSystem.js';
import EnemyFactory from '../../src/game/EnemyFactory.js';
import HeroFactory from '../../src/game/HeroFactory.js';
import ItemFactory from '../../src/game/ItemFactory.js';
import { getEnemyDefinition } from '../../src/game/EnemyCatalog.js';
import { WEAPON_ATTACKS, getAttackDamage, getRandomModifier } from '../../src/game/CombatWeaponAttack.js';
import { getActionGaugeMaximum } from '../../src/game/CombatActionGaugeSystem.js';
import gameText from '../../src/game/readGameText.js';
import GameTextRepository, { textPart } from '../../src/game/GameTextRepository.js';
import { expandLanguageResource } from '../../../GameWorksOAK/src/lib/core/i18n.js';

const textRepository = await new GameTextRepository({ loadResource: async (path) => textPart(expandLanguageResource(gameText), path) }).load();

test('last sprout summons into the inner available slots and inherits the defeated enemy battle parameters', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const itemFactory = new ItemFactory();
  const enemyFactory = new EnemyFactory({ itemFactory });
  const parent = enemyFactory.createFromDefinition({
    enemyDefinitionId: 'medium-vitality', slotPosition: 3, maximumHp: 5, totalTagCount: 7,
    maximums: { power: 4, magic: 3, speed: 2, negotiation: 1, luck: 5 }, weaponCount: 3, contributionMultiplier: 1.5, random: () => 0,
  });
  const blockers = [1, 2, 4, 5, 6].map((slotPosition) => enemyFactory.createInitialEncounter({ slotPosition }));
  const entities = [parent, ...blockers];
  entities.forEach((entity) => board.addChip(entity.chip));
  const controller = {
    getEnemies: () => entities,
    remove: (entity) => { const index = entities.indexOf(entity); if (index >= 0) entities.splice(index, 1); },
    add: (entity) => { entities.push(entity); board.addChip(entity.chip); },
    addToWarehouse: () => {},
  };
  const battle = new BattleSystem(board, { controller, itemFactory, enemyFactory, random: () => 0, logger: { info: () => {} } });

  battle.defeatEnemy(parent);

  const summons = entities.filter((entity) => entity.definition.id === 'small-vitality');
  assert.equal(summons.length, 1);
  assert.equal(summons[0].slotPosition, 3);
  assert.equal(summons[0].maximumHp, 5);
  assert.equal(summons[0].totalTagCount, 7);
  assert.equal(summons[0].weaponCount, 3);
  assert.deepEqual(summons[0].maximums, parent.maximums);
  assert.equal(summons[0].contributionMultiplier, 1.5);
});

test('enemy rank determines the number and tag budgets of dropped equipment sets', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const itemFactory = new ItemFactory();
  const battle = new BattleSystem(board, { controller: {}, itemFactory, random: () => 0, logger: { info: () => {} } });
  const enemyFactory = new EnemyFactory({ itemFactory });
  const midBoss = enemyFactory.createInitialEncounter({ rank: 'midBoss' });
  const boss = enemyFactory.createInitialEncounter({ rank: 'boss' });

  const midBossDrops = battle.createEnemyDrops(midBoss);
  const bossDrops = battle.createEnemyDrops(boss);

  assert.equal(midBossDrops.length, 10);
  assert.equal(midBossDrops.reduce((total, item) => total + item.tags.length, 0), 20);
  assert.equal(bossDrops.length, 15);
  assert.equal(bossDrops.reduce((total, item) => total + item.tags.length, 0), 45);
  assert.equal(midBoss.contributionPoints, 50);
  assert.equal(boss.contributionPoints, 250);
});
