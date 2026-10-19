import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, near } from './helpers/uniqueSkillsFixture.js';
import { GAME_AREAS } from '../../src/game/GameAreas.js';
import { HERO_PROFESSION_IDS } from '../../src/game/HeroFactory.js';

const affinities = ['vitality', 'gem', 'area', 'valor', 'iron', 'arcane', 'cloth', 'fire', 'water', 'lightning', 'blessing', 'dexterity', 'reputation', 'fortune', 'feather'];

test('固有スキルはEnemy専用で、通常敵は持たず中ボスはEx1・ボスはEx2を持つ', () => {
  const f = fixture();
  for (const profession of HERO_PROFESSION_IDS) {
    const hero = f.hero(profession);
    assert.equal(hero.uniqueSkill, undefined);
    f.act(hero, f.enemy('valor', 0));
    assert.equal(hero.uniqueSkill, undefined);
  }
  for (const tag of affinities) {
    assert.equal(f.enemy(tag, 0).uniqueSkill, null);
    assert.equal(f.enemy(tag, 1).uniqueSkill.level, 1);
    assert.equal(f.enemy(tag, 2).uniqueSkill.level, 2);
  }
});

for (const ex of [1, 2]) {
  test(`最後の芽吹きEx${ex}は撃破時に内側から2体を召喚し、個体値だけを継承する`, () => {
    const f = fixture();
    const owner = f.enemy('vitality', ex, { maximumHp: 20, totalTagCount: 4, weaponCount: 1, contributionMultiplier: 2, maximums: { power: 5 } });
    owner.attributes.fire = 9;
    f.battle.conditionSystem.applyBewilderment(owner, 2);
    f.battle.applyDamage(null, owner, 'fire', 20);
    const summons = f.controller.getEnemies();
    assert.equal(summons.length, 2);
    assert.deepEqual(summons.map((e) => e.slotPosition), [3, 4]);
    for (const summon of summons) {
      assert.equal(summon.definition.id, ex === 1 ? 'small-vitality' : 'medium-vitality');
      assert.equal(summon.hp, 20);
      assert.equal(summon.maximumHp, 20);
      assert.deepEqual(summon.maximums, owner.maximums);
      assert.equal(summon.totalTagCount, 4);
      assert.equal(summon.weaponCount, 1);
      assert.equal(summon.contributionMultiplier, 2);
      assert.ok(summon.equipment.every((item) => !owner.equipment.includes(item)));
      assert.deepEqual(summon.attributes, { fire: 0, water: 0, lightning: 0 });
      assert.equal(summon.chip.bewildered, false);
    }
  });

  test(`宝珠の雨Ex${ex}は適用ダメージごとに50%でExに応じた宝珠を倉庫へ落とす`, () => {
    for (const type of ['sword', 'staff', 'fire', 'reflection']) {
      const f = fixture();
      const owner = f.enemy('gem', ex);
      const hero = f.hero();
      const damage = (value) => {
        if (type === 'sword') return f.battle.applyPhysicalDamage(hero, owner, type, value, false, [hero, owner]);
        if (type === 'staff') return f.battle.damageSystem.applyDamage(hero, owner, type, value, false, { category: 'magic' });
        return f.battle.applyDamage(hero, owner, type, value);
      };
      f.roll(0.499);
      damage(1);
      assert.equal(f.warehouse().length, ex);
      assert.ok(f.warehouse().every((item) => item.type === 'orb' && item.tags.length === ex && item.tags.every((tag) => tag === 'gem')));
      assert.ok(f.warehouse().every((item) => item.chip.bounds.x === GAME_AREAS.warehouse.x));
      f.roll(0.5);
      damage(1);
      f.roll(0);
      damage(0);
      assert.equal(f.warehouse().length, ex);
    }
  });

  test(`多頭の猛攻Ex${ex}は行動後に首を伸ばし、次の戦闘更新で攻撃して報酬なしで戻る`, () => {
    const f = fixture();
    const owner = f.enemy('area', ex);
    owner.equipment[0].addTag('valor');
    const hero = f.hero();
    f.act(owner, hero);
    const heads = [...f.battle.phantomHeads];
    assert.equal(heads.length, ex);
    assert.deepEqual(heads.map((h) => h.slotPosition), ex === 1 ? [4] : [2, 5]);
    assert.equal(f.battle.findTarget(hero, [hero, ...heads]), null);
    for (const head of heads) {
      assert.deepEqual(head.getTags(), owner.getTags());
      assert.deepEqual(head.equipment, owner.equipment);
      assert.deepEqual(head.maximums, owner.maximums);
      assert.equal(head.uniqueSkill, null);
      assert.equal(head.contributionPoints, 0);
    }
    const before = hero.stamina;
    f.controller.updateItemTransfers(0.28);
    f.update();
    assert.ok(hero.stamina < before);
    assert.equal(f.battle.phantomHeads.length, 0);
    assert.equal(f.battle.contributionPoints, 0);
    assert.equal(f.warehouse().length, 0);
  });

  test(`戦鬼の高揚Ex${ex}は戦場へ付与し、会心に最大倍率だけを使い被弾・行動後に解除する`, () => {
    const f = fixture();
    const owner = f.enemy('valor', ex);
    const ally = f.enemy('valor', 0, { slotPosition: 1 });
    const hero = f.hero();
    const second = f.hero('mage', hero.chip.x + 250);
    f.act(owner, hero, [owner, ally, hero, second]);
    const multiplier = ex === 1 ? 2 : 4;
    assert.equal(second.chip.twoEdgedSwordMultiplier, multiplier);
    assert.equal(ally.chip.twoEdgedSwordMultiplier, multiplier);
    assert.equal(owner.chip.twoEdgedSwordMultiplier, 0);
    f.battle.conditionSystem.applyTwoEdgedSword(second, 2);
    const before = ally.hp;
    f.battle.applyPhysicalDamage(second, ally, 'sword', 1, true, [second, ally]);
    near(before - ally.hp, multiplier);
    assert.equal(ally.chip.twoEdgedSwordMultiplier, 0);
    f.act(second, ally);
    assert.equal(second.chip.twoEdgedSwordMultiplier, 0);
  });

  test(`巨像の反撃Ex${ex}は全武器攻撃の後に攻撃者を飛ばし、ゲージを維持して歩いて戻す`, () => {
    const f = fixture();
    const owner = f.enemy('iron', ex);
    const hero = f.hero();
    hero.equip(f.weapon());
    hero.equip(f.weapon());
    hero.chip.actionGauge = 5;
    const origin = { x: hero.chip.x, y: hero.chip.y };
    f.act(hero, owner);
    assert.ok(owner.hp < 100);
    assert.equal(hero.chip.actionGauge, 5);
    assert.ok(hero.chip.step.targetY > origin.y);
    const distance = hero.chip.step.targetY - origin.y;
    assert.ok(distance > (ex === 1 ? 100 : 200));
    for (let frame = 0; frame < 600 && f.battle.knockbackSystem.isKnockedBack(hero); frame += 1) {
      f.board.update(1 / 60);
      f.battle.knockbackSystem.update();
    }
    near(hero.chip.x, origin.x);
    near(hero.chip.y, origin.y);
    assert.equal(f.battle.knockbackSystem.isKnockedBack(hero), false);
    f.battle.applyDamage(hero, owner, 'fire', 1);
    assert.equal(hero.chip.step, null);
  });

  test(`反照の呪術Ex${ex}は炎・水・雷を軽減して返し、既存の強い属性を弱めない`, () => {
    for (const attribute of ['fire', 'water', 'lightning']) {
      const f = fixture();
      const owner = f.enemy('arcane', ex);
      const attacker = f.enemy('arcane', 1, { slotPosition: 1 });
      f.battle.attributeSystem.applyAttribute(attacker, owner, attribute, 8);
      assert.equal(owner.attributes[attribute], ex === 1 ? 4 : 2);
      assert.equal(attacker.attributes[attribute], ex === 1 ? 4 : 6);
      f.battle.attributeSystem.applyAttribute(attacker, owner, attribute, 1);
      assert.equal(owner.attributes[attribute], ex === 1 ? 4 : 2);
      assert.equal(attacker.attributes[attribute], ex === 1 ? 4 : 6);
    }
  });

  test(`夜の使い魔Ex${ex}は攻撃後に召喚し、被弾で1体減り、次の攻撃で残りを使い切る`, () => {
    const f = fixture();
    const owner = f.enemy('cloth', ex);
    const hero = f.hero();
    f.act(owner, hero);
    assert.equal(owner.chip.nightFamiliarCount, ex === 1 ? 3 : 6);
    f.battle.applyDamage(hero, owner, 'fire', 1);
    assert.equal(owner.chip.nightFamiliarCount, ex === 1 ? 2 : 5);
    f.damage.length = 0;
    f.act(owner, hero);
    const hits = f.damage.filter((e) => e.type === 'night-familiar');
    assert.equal(hits.length, ex === 1 ? 2 : 5);
    assert.ok(hits.every((e) => e.target === hero && e.damage > 0));
    assert.equal(owner.chip.nightFamiliarCount, ex === 1 ? 3 : 6);
  });

  test(`報復の火種Ex${ex}は物理・魔法の適用ダメージに確定反応し、弱い炎で上書きしない`, () => {
    const f = fixture();
    const owner = f.enemy('fire', ex);
    const hero = f.hero();
    f.roll(0.999);
    f.battle.applyPhysicalDamage(hero, owner, 'sword', 1, false, [hero, owner]);
    near(hero.attributes.fire, ex === 1 ? 0.2 : 0.8);
    hero.attributes.fire = 0;
    f.battle.damageSystem.applyDamage(hero, owner, 'staff', 1, false, { category: 'magic' });
    near(hero.attributes.fire, ex === 1 ? 0.2 : 0.8);
    hero.attributes.fire = 9;
    f.battle.applyPhysicalDamage(hero, owner, 'sword', 1, false, [hero, owner]);
    assert.equal(hero.attributes.fire, 9);
    hero.attributes.fire = 0;
    f.battle.applyDamage(hero, owner, 'fire', 1);
    f.battle.applyPhysicalDamage(hero, owner, 'sword', 0, false, [hero, owner]);
    assert.equal(hero.attributes.fire, 0);
  });

  test(`深海のうねりEx${ex}は攻撃時に水を付け、命中時の水で会心と追加倍率を適用する`, () => {
    const f = fixture();
    const owner = f.enemy('water', ex);
    owner.attributes.water = 3;
    const hero = f.hero();
    f.act(owner, hero);
    assert.equal(owner.attributes.water, 3);
    const hits = f.damage.filter((e) => e.actor === owner && e.target === hero);
    assert.ok(hits.length > 0 && hits.every((e) => e.critical));
    const g = fixture();
    const plain = g.enemy('water', ex);
    plain.uniqueSkill = null;
    plain.attributes.water = 3;
    const other = g.hero();
    g.act(plain, other);
    near(100 - hero.stamina, (100 - other.stamina) * (ex === 1 ? 4 : 7));
  });

  test(`雷鳴の収奪Ex${ex}は雷を帯びた相手からの被弾で相手全員の現在ゲージを奪う`, () => {
    const f = fixture();
    const owner = f.enemy('lightning', ex);
    const hero = f.hero();
    const ally = f.hero('mage');
    owner.chip.actionGauge = 1;
    hero.chip.actionGauge = 5;
    ally.chip.actionGauge = 3;
    const participants = [owner, hero, ally];
    f.battle.applyPhysicalDamage(hero, owner, 'sword', 1, false, participants);
    assert.equal(owner.chip.actionGauge, 1);
    hero.attributes.lightning = 1;
    f.battle.applyPhysicalDamage(hero, owner, 'sword', 1, false, participants);
    near(owner.chip.actionGauge, ex === 1 ? 1.8 : 2.6);
    near(hero.chip.actionGauge, ex === 1 ? 4.5 : 4);
    near(ally.chip.actionGauge, ex === 1 ? 2.7 : 2.4);
  });

  test(`影の指先Ex${ex}は命中前に1行動1タグを消去または移転し、ミスしても結果を維持する`, () => {
    const f = fixture();
    const owner = f.enemy('dexterity', ex);
    const hero = f.hero();
    const source = f.weapon('sword', ['fire', 'water']);
    hero.equip(source);
    f.draws(0, 0, 0);
    f.roll(0.999);
    f.act(owner, hero);
    assert.deepEqual(source.tags, ['water']);
    assert.equal(hero.stamina, 100);
    assert.equal(owner.equipment.flatMap((i) => i.tags).filter((tag) => tag === 'fire').length, ex === 1 ? 0 : 1);
    f.act(owner, hero);
    assert.deepEqual(source.tags, ['water']);
  });

  test(`惑いの言葉Ex${ex}は運に関係なく固定確率で命中前に付与し、ミス後も残る`, () => {
    for (const [roll, infected] of [[ex === 1 ? 0.599 : 0.649, true], [ex === 1 ? 0.6 : 0.65, false]]) {
      const f = fixture();
      const owner = f.enemy('reputation', ex);
      const hero = f.hero();
      f.draws(roll);
      f.roll(0.999);
      f.act(owner, hero);
      assert.equal(hero.stamina, 100);
      assert.equal(hero.chip.bewildermentLevel, infected ? ex : 0);
      if (!infected) continue;
      const ally = f.hero('mage');
      assert.equal(f.battle.findTarget(hero, [owner, hero, ally]), ally);
      f.roll(0);
      f.act(hero, ally, [owner, hero, ally]);
      assert.equal(ally.chip.bewildermentLevel, ex);
      assert.equal(hero.chip.bewildermentLevel, 0);
      assert.equal(f.battle.findTarget(ally, [owner, ally]), ally);
      f.roll(0.999);
      f.act(ally, ally, [owner, ally]);
      assert.equal(ally.chip.bewildermentLevel, ex);
      ally.currentArea = 'warehouse';
      f.update();
      assert.equal(ally.chip.bewildermentLevel, 0);
    }
  });

  test(`逆運の呪いEx${ex}は会心を自傷へ分配し、残余に防御を適用し、行動後に解除する`, () => {
    const f = fixture();
    const owner = f.enemy('fortune', ex);
    const hero = f.hero();
    f.act(owner, hero);
    near(hero.chip.misfortuneDamageRate, ex === 1 ? 0.5 : 1);
    const before = hero.stamina;
    f.battle.setPhysicalDamageReduction(owner, 2);
    f.battle.applyPhysicalDamage(hero, owner, 'sword', 4, true, [hero, owner]);
    near(before - hero.stamina, ex === 1 ? 2 : 4);
    near(100 - owner.hp, ex === 1 ? 1 : 0);
    f.act(hero, owner);
    assert.equal(hero.chip.misfortuneDamageRate, 0);
  });

  test(`暴風の翼Ex${ex}はHeroだけを上へ飛ばし、倉庫で装備と同時に落下し、第1武器を拾い直す`, () => {
    const f = fixture();
    const owner = f.enemy('feather', ex);
    const hero = f.hero();
    const sword = f.weapon();
    hero.equip(sword);
    f.act(owner, hero);
    assert.equal(f.battle.gustSystem.isGusting(hero), true);
    const start = { x: hero.chip.x, y: hero.chip.y };
    f.board.update(0.1);
    f.battle.gustSystem.update();
    assert.ok(hero.chip.x !== start.x || hero.chip.y !== start.y);
    assert.ok(hero.chip.height > 0 && hero.chip.height < hero.chip.dropHeight);
    assert.ok(hero.chip.height > 0);
    assert.equal(hero.chip.scale, 1);
    assert.equal(f.controller.hasEntity(sword), false);
    assert.equal(f.board.chips.includes(sword.chip), true);
    assert.equal(sword.chip.height, hero.chip.height);
    f.board.update(2);
    const beforeDrop = { x: hero.chip.x, y: hero.chip.y };
    f.battle.gustSystem.update();
    assert.deepEqual({ x: hero.chip.x, y: hero.chip.y }, beforeDrop);
    assert.equal(hero.chip.bounds.y, GAME_AREAS.warehouse.y);
    assert.equal(f.controller.hasEntity(sword), true);
    assert.equal(hero.chip.height, hero.chip.dropHeight);
    assert.equal(sword.chip.height, hero.chip.height);
    assert.ok(Math.hypot(sword.chip.x - hero.chip.x, sword.chip.y - hero.chip.y) > hero.chip.radius * 2);
    assert.ok(sword.chip.x - sword.chip.radius >= GAME_AREAS.warehouse.x);
    assert.ok(sword.chip.y - sword.chip.radius >= GAME_AREAS.warehouse.y);
    assert.ok(hero.chip.height > 0 && sword.chip.height > 0);
    assert.equal(hero.chip.verticalVelocity, sword.chip.verticalVelocity);
    assert.equal(f.pickup.states.has(hero), false);
    for (let frame = 0; frame < 600 && f.battle.gustSystem.isGusting(hero); frame += 1) {
      f.board.update(1 / 60);
      f.battle.gustSystem.update();
    }
    assert.equal(f.pickup.states.get(hero).item, sword);
    const ally = f.enemy('valor', 0);
    f.act(owner, ally, [owner, ally]);
    assert.equal(f.battle.gustSystem.isGusting(ally), false);
  });
}

test('最後の芽吹きは空きスロットが1つなら1体だけ召喚し、空きなしなら召喚しない', () => {
  for (const ex of [1, 2]) for (const available of [0, 1]) {
    const f = fixture();
    const owner = f.enemy('vitality', ex);
    for (const slot of [1, 2, 3, 4, 5, 6].slice(available)) f.enemy('valor', 0, { slotPosition: slot });
    const before = f.controller.getEnemies().length;
    f.battle.applyDamage(null, owner, 'fire', 100);
    assert.equal(f.controller.getEnemies().length, before - 1 + available);
  }
});

test('影の指先Ex2は移転先の装備が満杯なら選んだタグを消去する', () => {
  const f = fixture();
  const owner = f.enemy('dexterity', 2);
  owner.equipment.forEach((item) => { while (item.tags.length < 3) item.addTag('cloth'); });
  const hero = f.hero();
  const sword = f.weapon('sword', ['fire']);
  hero.equip(sword);
  f.act(owner, hero);
  assert.deepEqual(sword.tags, []);
  assert.ok(owner.equipment.every((item) => !item.tags.includes('fire')));
});

test('堕ちた加護は戦闘開始・行動後・被弾後に再抽選し、Exを保ち、戦闘リセットで消える', () => {
  for (const ex of [1, 2]) {
    const f = fixture();
    const owner = f.enemy('blessing', ex);
    const hero = f.hero();
    // 最後の芽吹きから暴風の翼まで14種を独立抽選し、使い魔だけを授ける。
    f.draws(...Array.from({ length: 14 }, (_, index) => index === 7 ? 0.069 : 0.07));
    f.roll(0.999);
    f.update();
    f.act(owner, hero);
    assert.equal(owner.chip.nightFamiliarCount, ex === 1 ? 3 : 6);
    f.act(owner, hero);
    assert.equal(owner.chip.nightFamiliarCount, 0);
    // 被弾時の傾き判定の後に抽選する。
    f.draws(0.9, ...Array.from({ length: 14 }, (_, index) => index === 7 ? 0.069 : 0.07));
    f.battle.applyDamage(hero, owner, 'fire', 0.1);
    f.act(owner, hero);
    assert.equal(owner.chip.nightFamiliarCount, ex === 1 ? 3 : 6);
    f.battle.resetStageState();
    assert.equal(owner.chip.nightFamiliarCount, 0);
    f.act(owner, hero);
    assert.equal(owner.chip.nightFamiliarCount, 0);
    assert.equal(owner.uniqueSkill.id, 'blessing-random');
  }
});

test('多頭の猛攻は空きが足りなければ入る数だけ伸ばす', () => {
  for (const available of [0, 1]) {
    const f = fixture();
    const owner = f.enemy('area', 2);
    const hero = f.hero();
    for (const slotPosition of [1, 2, 5, 6].slice(available)) f.enemy('arcane', 0, { slotPosition });
    f.act(owner, hero, [owner, hero]);
    assert.equal(f.battle.phantomHeads.length, available);
  }
});

test('深海のうねりは水タグがなくても既存水を利用し、水なしでは会心にならない', () => {
  for (const water of [0, 3]) {
    const f = fixture();
    const owner = f.enemy('water');
    owner.tags = [];
    owner.equipment[0].addTag('cloth');
    owner.attributes.water = water;
    const hero = f.hero();
    f.act(owner, hero);
    assert.equal(owner.attributes.water, water);
    const hits = f.damage.filter((event) => event.target === hero);
    assert.ok(hits.length > 0);
    assert.ok(hits.every((event) => event.critical === (water > 0)));
  }
});

test('暴風の翼の運判定はEx1が幸運度の25%、Ex2が50%で判定する', () => {
  for (const ex of [1, 2]) for (const succeeds of [true, false]) {
    const f = fixture();
    const owner = f.enemy('feather', ex);
    const hero = f.hero();
    const threshold = owner.getLuckDegree() * (ex === 1 ? 0.25 : 0.5);
    f.draws(succeeds ? threshold - 0.00001 : threshold);
    f.act(owner, hero);
    assert.equal(f.battle.gustSystem.isGusting(hero), succeeds);
  }
});

test('暴風の翼でスタミナ3未満のHeroは倉庫への着地後に準備へ戻る', () => {
  const f = fixture();
  const owner = f.enemy('feather');
  const hero = f.hero();
  hero.stamina = 2.99;
  hero.equip(f.weapon());
  f.act(owner, hero);
  for (let frame = 0; frame < 600 && f.battle.gustSystem.isGusting(hero); frame += 1) {
    f.board.update(1 / 60);
    f.battle.gustSystem.update();
  }
  assert.equal(hero.targetArea, 'preparation');
  assert.equal(f.pickup.states.has(hero), false);
  assert.equal(f.warehouse().length, 1);
});
