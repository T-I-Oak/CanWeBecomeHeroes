import ChipBoard from '../chips/ChipBoard.js';
import BattleSystem from '../game/BattleSystem.js';
import EnemyFactory from '../game/EnemyFactory.js';
import HeroFactory from '../game/HeroFactory.js';
import ItemFactory from '../game/ItemFactory.js';
import HeroSlotManager from '../game/HeroSlotManager.js';
import ItemPickupController from '../game/ItemPickupController.js';
import HeroItemInteractionController from '../game/HeroItemInteractionController.js';
import FacilityReturnSystem from '../game/FacilityReturnSystem.js';
import { WORLD_SIZE, getPreparationSubareaBounds } from '../game/GameAreas.js';
import { getEnemyDefinitionById } from '../game/EnemyCatalog.js';
import { GAME_TICK_SECONDS } from '../game/GameClock.js';
import { getTagBaseColors, getTagGlyphScales, getTagPaths, getTagWeight } from '../game/TagCatalog.js';
import { getUniqueSkillLevelDetail } from '../game/UniqueSkillCatalog.js';

const DEFAULT_MAXIMUMS = Object.freeze({ power: 3, magic: 3, speed: 3, negotiation: 3, luck: 3, stamina: 3 });

function settle(chip) {
  chip.height = 0;
  chip.verticalVelocity = 0;
  chip.step = null;
}

function refresh(entity) {
  entity.chip.weight = getTagWeight(entity.getTags());
  entity.chip.tagPaths = getTagPaths(entity.tags);
  entity.chip.tagBaseColors = getTagBaseColors(entity.tags);
  entity.chip.tagGlyphScales = getTagGlyphScales(entity.tags);
  entity.refreshDerivedValues?.();
  settle(entity.chip);
}

/** Offline driver: uses production objects, with no renderer or DOM. */
export default class SimulationBattleDriver {
  constructor({ left, right, random = Math.random, onDamage = null }) {
    if (left.length > 4) throw new RangeError('Battle simulation supports at most four (4) Hero slots.');
    this.random = random;
    this.onDamage = onDamage;
    this.board = new ChipBoard(WORLD_SIZE);
    this.itemFactory = new ItemFactory();
    this.enemyFactory = new EnemyFactory({ itemFactory: this.itemFactory });
    this.slotManager = new HeroSlotManager();
    this.controller = new HeroItemInteractionController(this.board, new ItemPickupController(this.board, this.slotManager));
    this.returnSystem = new FacilityReturnSystem(this.board, this.slotManager, {
      random,
      onItemReturned: item => this.controller.addToWarehouse(item),
      onItemDiscarded: item => this.controller.destroy(item, { includeRelated: true }),
    });
    this.battle = new BattleSystem(this.board, {
      controller: this.controller,
      itemFactory: this.itemFactory,
      enemyFactory: this.enemyFactory,
      returnSystem: this.returnSystem,
      random,
      onDamage: event => this.onDamage?.({ ...event, side: !event.actor ? 'unattributed' : event.actor.chip.type === 'hero' ? 'left' : 'right' }),
    });
    left.forEach((entity, index) => this.createHero(entity, index));
    const occupied = new Set();
    right.forEach(entity => this.createEnemy(entity, occupied));
  }

  createWeapons(entity) {
    return (entity.weapons ?? []).filter(weapon => weapon !== 'unarmed').map(weapon => {
      const definition = typeof weapon === 'string' ? { weapon, tags: [] } : weapon;
      return this.itemFactory.createWeapon({ ...definition, x: 0, y: 0 });
    });
  }

  validateEquipmentBudget(entity) {
    if (!Number.isInteger(entity.equipmentTagBudget) || entity.equipmentTagBudget < 0 || entity.equipmentTagBudget > 15) {
      throw new RangeError('equipmentTagBudget must be an integer from 0 to 15.');
    }
    if (entity.weapons?.length) throw new RangeError('Random equipment cannot be combined with explicit weapons.');
  }

  createHero(entity, index) {
    const bounds = getPreparationSubareaBounds(index);
    const maximums = { ...DEFAULT_MAXIMUMS, ...entity.maximums };
    const hero = new HeroFactory().create({ profession: entity.profession ?? 'swordfighter',
      x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2,
      bounds, maximums, stamina: entity.stamina ?? maximums.stamina });
    hero.tags = [...(entity.tags ?? (entity.mainTag ? [entity.mainTag, entity.mainTag] : []))];
    if ((entity.weapons ?? []).length > 2) throw new RangeError('A Hero can have at most two weapons.');
    let equipment;
    if (entity.equipmentTagBudget !== undefined) {
      this.validateEquipmentBudget(entity);
      equipment = this.enemyFactory.createFromDefinition({ enemyDefinitionId: `small-${entity.mainTag}`,
        slotPosition: 1, totalTagCount: entity.equipmentTagBudget, weaponCount: 2, random: this.random }).equipment;
    } else equipment = this.createWeapons(entity);
    equipment.forEach(item => hero.equip(item));
    this.controller.add(hero);
    const slot = this.slotManager.reserve(hero, 'battle');
    Object.assign(hero.chip, { x: slot.x, y: slot.y });
    this.slotManager.arrive(hero);
    refresh(hero);
  }

  createEnemy(entity, occupied) {
    const definition = getEnemyDefinitionById(entity.enemyDefinitionId ?? 'small-valor');
    if (!definition) throw new RangeError(`Unknown enemy definition: ${entity.enemyDefinitionId}`);
    const span = definition.size === 'large' ? 2 : 1;
    const slotPosition = entity.slotPosition ?? [1, 2, 3, 4, 5, 6].find(slot => slot + span - 1 <= 6
      && Array.from({ length: span }, (_, offset) => slot + offset).every(slot => !occupied.has(slot)));
    if (!Number.isInteger(slotPosition) || slotPosition < 1 || slotPosition + span - 1 > 6
      || Array.from({ length: span }, (_, offset) => slotPosition + offset).some(slot => occupied.has(slot))) {
      throw new RangeError('Enemy slots must fit without overlap within the six battle slots.');
    }
    // Keep bounds and large-enemy spans consistent with the production factory.
    if (entity.equipmentTagBudget !== undefined) this.validateEquipmentBudget(entity);
    const positioned = this.enemyFactory.createFromDefinition({
      enemyDefinitionId: entity.enemyDefinitionId ?? 'small-valor', slotPosition,
      totalTagCount: entity.equipmentTagBudget ?? 0, weaponCount: 2, maximumHp: entity.maximumHp ?? 3,
      maximums: { ...DEFAULT_MAXIMUMS, ...entity.maximums }, random: this.random,
    });
    Array.from({ length: span }, (_, offset) => occupied.add(slotPosition + offset));
    if (entity.tags !== undefined) positioned.tags = [...entity.tags];
    if (entity.equipmentTagBudget === undefined) positioned.equipment = this.createWeapons(entity);
    if (Object.hasOwn(entity, 'uniqueSkill')) {
      getUniqueSkillLevelDetail(entity.uniqueSkill);
      positioned.uniqueSkill = entity.uniqueSkill ? { ...entity.uniqueSkill } : null;
    }
    refresh(positioned);
    this.controller.add(positioned);
  }

  step(tick) {
    this.board.update(GAME_TICK_SECONDS);
    this.controller.update(GAME_TICK_SECONDS);
    this.battle.update({ heroes: this.controller.getHeroes(), enemies: this.controller.getEnemies(), tick, tickDelta: 1 });
  }

  getWinner() {
    const leftAlive = this.controller.getHeroes().some(hero => hero.stamina > 0
      && (hero.currentArea === 'battle' || hero.targetArea === 'battle' || hero.targetArea === 'warehouse'));
    const rightAlive = this.controller.getEnemies().some(enemy => !enemy.isPhantomHead && this.board.chips.includes(enemy.chip));
    if (leftAlive && rightAlive) return null;
    return leftAlive ? 'left' : rightAlive ? 'right' : 'draw';
  }
}
