import test from 'node:test';
import assert from 'node:assert/strict';
import ChipBoard from '../../src/chips/ChipBoard.js';
import Chip from '../../src/chips/Chip.js';
import HeroItemInteractionController from '../../src/game/HeroItemInteractionController.js';
import HeroSlotManager from '../../src/game/HeroSlotManager.js';
import HeroFactory, { HERO_PROFESSION_IDS } from '../../src/game/HeroFactory.js';
import ItemFactory from '../../src/game/ItemFactory.js';
import ItemPickupController from '../../src/game/ItemPickupController.js';
import RecruitmentController from '../../src/game/RecruitmentController.js';
import PreparationHeroProvisioner from '../../src/game/PreparationHeroProvisioner.js';
import FacilityReturnSystem from '../../src/game/FacilityReturnSystem.js';
import StaminaRecoverySystem from '../../src/game/StaminaRecoverySystem.js';
import ShopState from '../../src/game/ShopState.js';
import ShopSystem, { getGemAttempts, getSaleTagCount, SHOP_PURCHASE_DELIVERY_TICKS } from '../../src/game/ShopSystem.js';
import EntityRegistry from '../../src/game/EntityRegistry.js';
import GameClock from '../../src/game/GameClock.js';
import TrainingSystem, { TRAINING_INTERVAL_TICKS } from '../../src/game/TrainingSystem.js';
import { getHeroStepDistance } from '../../src/game/MovementSettings.js';
import { getWarehouseItemCapacity } from '../../src/game/WarehouseCapacity.js';

function createHeroSlotCandidate(id) {
  return { chip: new Chip({ id, type: 'hero', x: 0, y: 0, weight: 1, centerPath: '', tagPaths: [] }), targetSlotId: null, currentSlotId: null };
}

test('買い物袋には倉庫Itemを3個まで格納でき、行き先Itemは格納できない', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const controller = new HeroItemInteractionController(board, new ItemPickupController(board, new HeroSlotManager()));
  const itemFactory = new ItemFactory();
  const bag = itemFactory.createDestination({ destination: 'shopping-bag', x: 700, y: 700 });
  const items = ['sword', 'shield', 'bow', 'staff'].map((weapon, index) => itemFactory.createWeapon({ weapon, tags: [], x: 800 + index * 40, y: 700 }));
  const destination = itemFactory.createDestination({ destination: 'hero-license', x: 1000, y: 700 });
  controller.addToWarehouse(bag);
  items.forEach((item) => controller.addToWarehouse(item));
  controller.addToWarehouse(destination);

  assert.deepEqual(items.map((item) => controller.storeInShoppingBag(item, bag)), [true, true, true, false]);
  assert.equal(controller.storeInShoppingBag(destination, bag), false);
  assert.equal(bag.storedItems.length, 3);
});

test('倉庫は配置上限までItemを受け取り、上限を超えるItemは追加しない', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const controller = new HeroItemInteractionController(board, new ItemPickupController(board, new HeroSlotManager()));
  const itemFactory = new ItemFactory();
  const capacity = getWarehouseItemCapacity();
  const items = Array.from({ length: capacity + 1 }, (_, index) => itemFactory.createWeapon({
    weapon: 'sword', tags: [], x: 800 + index, y: 700,
  }));

  items.slice(0, capacity).forEach((item) => assert.ok(controller.addToWarehouse(item)));

  assert.equal(controller.addToWarehouse(items.at(-1)), null);
  assert.equal(controller.getWarehouseItemCount(), capacity);
  assert.equal(board.chips.includes(items.at(-1).chip), false);
});

test('買い物袋を持つHeroは売却後に2組の装備を受け取り、袋を消費して準備エリアへ帰還する', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const hero = new HeroFactory().create({ profession: 'mage', x: 500, y: 500, stamina: 3, bounds: { x: 0, y: 0, width: 600, height: 400 } });
  hero.currentArea = 'shop';
  const itemFactory = new ItemFactory();
  const bag = itemFactory.createDestination({ destination: 'shopping-bag', x: 0, y: 0 });
  bag.store(itemFactory.createBodyItem({ part: 'head', tags: ['fire'], x: 0, y: 0 }));
  hero.equip(bag);
  const purchasedItems = [];
  const entityRegistry = new EntityRegistry();
  entityRegistry.registerTree(bag);
  const returns = new FacilityReturnSystem(board, new HeroSlotManager(), { random: () => 0.5 });
  const shop = new ShopSystem(board, new ShopState({ saleTag: 'fire', nextTag: 'water' }), returns, {
    entityRegistry,
    random: () => 0,
    onItemPurchased: (item) => purchasedItems.push(item),
  });

  const deliverySeconds = (SHOP_PURCHASE_DELIVERY_TICKS + 1) / 60;
  shop.update([hero], deliverySeconds);
  shop.update([hero], deliverySeconds);

  assert.equal(purchasedItems.length, 10);
  assert.equal(bag.storedItems.length, 0);
  assert.equal(hero.targetArea, 'preparation');
});

test('ショップの購入タグ数は価値と交渉力で決まり、宝石は購入品強化の判定回数を増やす', () => {
  assert.equal(getSaleTagCount(0, 0), 5);
  assert.equal(getSaleTagCount(10, 0), 6);
  assert.equal(getSaleTagCount(117, 7), 15);
  assert.deepEqual([0, 1, 2, 3, 4].map(getGemAttempts), [0, 1, 2, 3, 4]);
});

test('Heroの目的Itemが盤面から消えた場合は、次に装備可能なItemへ目標を切り替える', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const pickupController = new ItemPickupController(board, new HeroSlotManager());
  const hero = new HeroFactory().create({ profession: 'mage', x: 700, y: 700 });
  const selectedItem = new ItemFactory().createWeapon({ weapon: 'staff', tags: [], x: 800, y: 700 });
  const replacementItem = new ItemFactory().createWeapon({ weapon: 'sword', tags: [], x: 900, y: 700 });
  [hero, selectedItem, replacementItem].forEach((entity) => board.addChip(entity.chip));

  pickupController.start(hero, selectedItem);
  board.removeChip(selectedItem.chip);
  pickupController.update([selectedItem, replacementItem], 0.01);

  assert.equal(pickupController.states.get(hero).item, replacementItem);
});

test('Heroは指定Itemを拾った後に未装備部位を自動探索し、探索後は戦闘スロットへ向かう', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const pickupController = new ItemPickupController(board, new HeroSlotManager());
  const itemFactory = new ItemFactory();
  const hero = new HeroFactory().create({ profession: 'mage', x: 700, y: 700, stamina: 3 });
  const selectedItem = itemFactory.createWeapon({ weapon: 'staff', tags: [], x: 700, y: 700 });
  const automaticItem = itemFactory.createBodyItem({ part: 'head', tags: [], x: 700, y: 700 });
  [hero, selectedItem, automaticItem].forEach((entity) => board.addChip(entity.chip));

  pickupController.start(hero, selectedItem);
  pickupController.update([selectedItem, automaticItem], 0);
  pickupController.update([selectedItem, automaticItem], 0.3);
  pickupController.update([selectedItem, automaticItem], 0);
  pickupController.update([selectedItem, automaticItem], 0.3);

  assert.equal(hero.equipment.rightHand, selectedItem);
  assert.equal(hero.equipment.head, automaticItem);
  assert.equal(hero.targetArea, 'battle');
  assert.equal(hero.targetSlotId, 'battle-2');
});

test('エリート課題の完了時は8人から抽選し、既加入のHeroなら新たに加入しない', () => {
  const recruited = [];
  const recruitment = new RecruitmentController({
    random: () => 0.5,
    onRecruit: (profession) => {
      recruited.push(profession);
      return { profession };
    },
  });
  const heroes = [{ profession: HERO_PROFESSION_IDS[0] }, { profession: HERO_PROFESSION_IDS[1] }];
  const stage = { id: 'elite-recruitment', kind: 'elite' };

  const joined = recruitment.processCompletedStage({ stage, stageState: 'complete', heroes });
  const duplicate = new RecruitmentController({ random: () => 0, onRecruit: () => assert.fail('既加入Heroは加入しない。') })
    .processCompletedStage({ stage, stageState: 'complete', heroes });

  assert.equal(joined.candidateProfession, HERO_PROFESSION_IDS[4]);
  assert.equal(joined.recruited, true);
  assert.deepEqual(recruited, [HERO_PROFESSION_IDS[4]]);
  assert.equal(duplicate.candidateProfession, HERO_PROFESSION_IDS[0]);
  assert.equal(duplicate.recruited, false);
  assert.equal(duplicate.reason, 'already-joined');
});

test('加入したHeroは落下して準備エリアへ加わり、対応装備2組が倉庫へ追加される', () => {
  const heroes = [];
  const warehouseItems = [];
  const provisioner = new PreparationHeroProvisioner({
    controller: {
      add: (hero) => heroes.push(hero),
      addToWarehouse: (item) => warehouseItems.push(item),
    },
    random: () => 0,
  });
  const recruitment = new RecruitmentController({
    random: () => 0.5,
    onRecruit: (profession) => provisioner.provision({ profession, preparationIndex: 2 }),
  });

  const result = recruitment.processCompletedStage({
    stage: { id: 'elite-provision', kind: 'elite' },
    stageState: 'complete',
    heroes: [{ profession: HERO_PROFESSION_IDS[0] }, { profession: HERO_PROFESSION_IDS[1] }],
  });

  assert.equal(result.recruited, true);
  assert.equal(heroes.length, 1);
  assert.equal(heroes[0].profession, HERO_PROFESSION_IDS[4]);
  assert.ok(heroes[0].chip.height > 0);
  assert.equal(warehouseItems.filter((item) => item.category !== 'destination').length, 10);
});

test('訓練中のHeroは対象ステータスを成長させてスタミナを消費し、待機エリアでだけ回復する', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const hero = new HeroFactory().create({ profession: 'mage', x: 300, y: 300, stamina: 3, bounds: { x: 0, y: 0, width: 600, height: 400 } });
  hero.currentArea = 'training';
  board.addChip(hero.chip);
  const training = new TrainingSystem(board, new HeroSlotManager(), { random: () => 0 });

  training.update([hero], TRAINING_INTERVAL_TICKS / 60);

  assert.equal(hero.maximums.magic, 4);
  assert.equal(hero.stamina, 2);
  hero.currentArea = 'preparation';
  new StaminaRecoverySystem().update([hero], 200 / 60);
  assert.ok(Math.abs(hero.stamina - 3) < 0.000000001);
  hero.currentArea = 'warehouse';
  hero.stamina = 0;
  new StaminaRecoverySystem().update([hero], 200 / 60);
  assert.equal(hero.stamina, 0);
});

test('手動で一時停止している間はゲーム状態を更新しない', () => {
  const clock = new GameClock();
  clock.togglePaused();
  let elapsed = 0;

  assert.equal(clock.advance(0.02, (deltaSeconds) => { elapsed += deltaSeconds; }), 0);
  assert.equal(elapsed, 0);
});

test('課題選択などのモーダル停止は手動停止とは別の理由として解除できる', () => {
  const clock = new GameClock();
  let elapsed = 0;
  clock.pause('stage-selection');

  assert.equal(clock.advance(0.02, (deltaSeconds) => { elapsed += deltaSeconds; }), 0);
  assert.equal(clock.paused, false);
  clock.resume('stage-selection');
  assert.ok(clock.advance(0.02, (deltaSeconds) => { elapsed += deltaSeconds; }) > 0);
  assert.ok(elapsed > 0);
});

test('戦闘Heroは予約済みスロットを除き、2、3、1、4の順に戦闘スロットを確保する', () => {
  const manager = new HeroSlotManager();
  const heroes = [1, 2, 3, 4].map(createHeroSlotCandidate);

  assert.deepEqual(heroes.map((hero) => manager.reserve(hero, 'battle').id), ['battle-2', 'battle-3', 'battle-1', 'battle-4']);
  assert.equal(manager.reserve(createHeroSlotCandidate(5), 'battle'), null);
});

test('Heroはスロット到着時に予約を占有へ移し、移動範囲をスロット内に制限する', () => {
  const manager = new HeroSlotManager();
  const hero = createHeroSlotCandidate(1);
  manager.reserve(hero, 'shop');

  assert.equal(hero.targetSlotId, 'shop-1');
  assert.equal(manager.arrive(hero), true);
  assert.equal(hero.targetSlotId, null);
  assert.equal(hero.currentSlotId, 'shop-1');
  assert.equal(hero.chip.bounds.width, 224);
});

test('Heroの1回の移動量は所持重量の二乗に応じて小さくなる', () => {
  assert.equal(getHeroStepDistance(0), 96);
  assert.equal(getHeroStepDistance(25), 48);
  assert.equal(getHeroStepDistance(75), 9.6);
  assert.ok(Math.abs(getHeroStepDistance(100) - 5.647058823529412) < 0.000000001);
});
