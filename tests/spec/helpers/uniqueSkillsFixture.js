import assert from 'node:assert/strict';
import ChipBoard from '../../../src/chips/ChipBoard.js';
import BattleSystem from '../../../src/game/BattleSystem.js';
import EnemyFactory from '../../../src/game/EnemyFactory.js';
import HeroFactory from '../../../src/game/HeroFactory.js';
import ItemFactory from '../../../src/game/ItemFactory.js';
import HeroSlotManager from '../../../src/game/HeroSlotManager.js';
import ItemPickupController from '../../../src/game/ItemPickupController.js';
import HeroItemInteractionController from '../../../src/game/HeroItemInteractionController.js';
import FacilityReturnSystem from '../../../src/game/FacilityReturnSystem.js';
import { GAME_AREAS, WORLD_SIZE } from '../../../src/game/GameAreas.js';

export function near(actual, expected) { assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`); }

export function fixture({ effects = null } = {}) {
  const board = new ChipBoard(WORLD_SIZE);
  const slots = new HeroSlotManager();
  const pickup = new ItemPickupController(board, slots);
  const controller = new HeroItemInteractionController(board, pickup);
  const items = new ItemFactory();
  const enemies = new EnemyFactory({ itemFactory: items });
  let roll = 0;
  const draws = [];
  const random = () => draws.length ? draws.shift() : roll;
  const returns = new FacilityReturnSystem(board, slots);
  const damage = [];
  const battle = new BattleSystem(board, { controller, itemFactory: items, enemyFactory: enemies, returnSystem: returns, effects, random, onDamage: (event) => damage.push(event) });
  const settle = (entity) => {
    entity.chip.height = 0;
    entity.chip.verticalVelocity = 0;
    entity.chip.impactOnLanding = false;
    return entity;
  };
  const enemy = (tag, ex = 1, options = {}) => {
    const entity = enemies.createFromDefinition({ enemyDefinitionId: `${ex === 2 ? 'large' : ex === 0 ? 'small' : 'medium'}-${tag}`, slotPosition: 3, maximumHp: 100, totalTagCount: 0, weaponCount: 2, random: () => 0, ...options });
    controller.add(entity);
    return settle(entity);
  };
  const hero = (profession = 'swordfighter', x = GAME_AREAS.battle.x + 600) => {
    const bounds = { ...GAME_AREAS.preparation };
    const entity = new HeroFactory().create({ profession, x: bounds.x + 120, y: bounds.y + 120, bounds, stamina: 100, maximums: { stamina: 100 } });
    entity.currentArea = 'battle';
    entity.chip.bounds = null;
    entity.chip.x = x;
    entity.chip.y = 650;
    controller.add(entity);
    return settle(entity);
  };
  const weapon = (type = 'sword', tags = []) => items.createWeapon({ weapon: type, tags, x: 0, y: 0 });
  const act = (actor, target, participants = [actor, target]) => battle.resolveAction(actor, target, participants);
  const update = (tickDelta = 0) => battle.update({ heroes: [...controller.entities.values()].filter((e) => e.chip.type === 'hero'), enemies: controller.getEnemies(), tick: 1, tickDelta });
  return { board, controller, items, enemy, hero, weapon, battle, act, update, pickup, returns, damage, settle,
    roll: (value) => { roll = value; }, draws: (...values) => draws.push(...values),
    warehouse: () => [...controller.entities.values()].filter((e) => e.chip.type === 'item'),
  };
}
