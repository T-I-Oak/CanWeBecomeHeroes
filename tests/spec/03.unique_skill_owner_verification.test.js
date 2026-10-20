import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, near } from './helpers/uniqueSkillsFixture.js';
import CombatEffectSystem from '../../src/game/CombatEffectSystem.js';
import ChipRenderer from '../../src/chips/ChipRenderer.js';
import { getConditionIconEntries, getConditionIconColor } from '../../src/chips/ConditionIconLayout.js';

const icon = (entity, id) => getConditionIconEntries(entity.chip).find((entry) => entry.id === id);
const color = (entry) => getConditionIconColor(entry.value, entry.minimum, entry.maximum);

function render(entity) {
  const images = [];
  const fills = [];
  const context = {
    save() {}, restore() {}, beginPath() {}, roundRect() {}, translate() {}, scale() {},
    fill() { fills.push(this.fillStyle); },
    drawImage(image, x, y, width, height) { images.push({ path: image.path, width, height }); },
  };
  const assets = { load: (path) => ({ path, complete: true, naturalWidth: 1024, naturalHeight: 1024 }) };
  const renderer = new ChipRenderer(context, assets);
  const chip = { ...entity.chip, bounds: { x: 0, y: 0, width: 224, height: 224 } };
  renderer.drawAttributeOverlays(chip, 0, 0, 0);
  renderer.drawConditionIcons(chip);
  return { images, fills };
}

const overlay = (entity, attribute) => render(entity).images.find((image) => image.path === `/assets/effects/attributes/${attribute}.png`);

function finishGust(f, hero) {
  for (let frame = 0; frame < 600 && f.battle.gustSystem.isGusting(hero); frame += 1) {
    f.board.update(1 / 60);
    f.battle.gustSystem.update();
  }
  assert.equal(f.battle.gustSystem.isGusting(hero), false);
}

for (const ex of [1, 2]) {
  test(`OV-FORTUNE-${ex === 1 ? '03' : '12'}/14 Ex${ex}: 会心ポップアップの対象・量と行動後のアイコン消去`, () => {
    const effects = new CombatEffectSystem();
    const f = fixture({ effects });
    const owner = f.enemy('fortune', ex);
    const hero = f.hero();
    f.act(owner, hero);
    assert.equal(icon(hero, 'misfortune').value, ex === 1 ? 0.5 : 1);
    assert.ok(render(hero).images.some((image) => image.path === '/assets/conditions/misfortune.png'));
    effects.popups.length = 0;
    f.damage.length = 0;
    const before = hero.stamina;
    f.battle.applyPhysicalDamage(hero, owner, 'sword', 4, true, [hero, owner]);
    near(before - hero.stamina, ex === 1 ? 2 : 4);
    near(100 - owner.hp, ex === 1 ? 2 : 0);
    assert.deepEqual(effects.popups.map((p) => [p.chip, p.key, p.values.amount]),
      ex === 1 ? [[hero.chip, 'combatCritical', 200], [owner.chip, 'combatCritical', 200]]
        : [[hero.chip, 'combatCritical', 400]]);
    f.act(hero, owner);
    assert.equal(f.battle.conditionSystem.getMisfortuneDamageRate(hero), 0);
    assert.equal(icon(hero, 'misfortune'), undefined);
    assert.ok(render(hero).images.every((image) => image.path !== '/assets/conditions/misfortune.png'));
  });

  test(`OV-ARCANE-03/13/14 Ex${ex}: 炎水雷の描画値同期・強い既存値維持・反射の再帰と追加演出なし`, () => {
    for (const attribute of ['fire', 'water', 'lightning']) {
      const effects = new CombatEffectSystem();
      const f = fixture({ effects });
      const owner = f.enemy('arcane', ex);
      const attacker = f.enemy('arcane', 2, { slotPosition: 1 });
      let reactions = 0;
      const resolve = f.battle.attributeReactionSystem.resolve.bind(f.battle.attributeReactionSystem);
      f.battle.attributeReactionSystem.resolve = (event) => { reactions += 1; return resolve(event); };
      f.battle.attributeSystem.applyAttribute(attacker, owner, attribute, 8);
      assert.equal(reactions, 1);
      assert.equal(icon(owner, attribute).value, ex === 1 ? 4 : 2);
      assert.equal(icon(attacker, attribute).value, ex === 1 ? 4 : 6);
      const reducedSize = overlay(owner, attribute).width;
      const fullSize = overlay({ chip: { ...owner.chip, attributeValues: { [attribute]: 8 } } }, attribute).width;
      assert.ok(reducedSize < fullSize);
      const previousColor = color(icon(owner, attribute));
      f.battle.attributeSystem.applyAttribute(attacker, owner, attribute, 1);
      assert.deepEqual(color(icon(owner, attribute)), previousColor);
      assert.equal(overlay(owner, attribute).width, reducedSize);
      f.battle.attributeSystem.applySelfAttribute(attacker, attribute, 9);
      f.battle.attributeSystem.applyAttribute(attacker, owner, attribute, 8);
      assert.equal(icon(attacker, attribute).value, 9);
      assert.ok(overlay(attacker, attribute).width > reducedSize);
      assert.equal(icon(owner, attribute).value, ex === 1 ? 4 : 2);
      assert.equal(reactions, 2);
      assert.deepEqual([effects.popups, effects.lightning, effects.tagTransfers, effects.attacks], [[], [], [], []]);
    }
  });

  test(`OV-WATER-06/07 Ex${ex}: 攻撃開始時の水アイコンと命中時の会心表示`, () => {
    const effects = new CombatEffectSystem();
    const f = fixture({ effects });
    const owner = f.enemy('water', ex);
    const hero = f.hero();
    assert.equal(icon(owner, 'water'), undefined);
    f.act(owner, hero);
    assert.equal(icon(owner, 'water').value, owner.getTagCount('water'));
    assert.ok(icon(owner, 'water').value > 0);
    assert.ok(overlay(owner, 'water').width > 0);
    const popups = effects.popups.filter((p) => p.chip === hero.chip);
    assert.equal(popups.length, 1);
    assert.equal(popups[0].key, 'combatCritical');
    assert.ok(popups[0].values.amount > 0);
  });

  test(`OV-FIRE-${ex === 1 ? '02' : '10'}/12 Ex${ex}: 武器攻撃の報復炎アイコンと強い炎の保持`, () => {
    for (const weapon of ['sword', 'staff']) {
      const f = fixture();
      const owner = f.enemy('fire', ex);
      const hero = f.hero(weapon === 'staff' ? 'mage' : 'swordfighter');
      hero.equip(f.weapon(weapon));
      f.act(hero, owner);
      near(icon(hero, 'fire').value, ex === 1 ? 0.2 : 0.8);
      const weakSize = overlay(hero, 'fire').width;
      f.battle.attributeSystem.applySelfAttribute(hero, 'fire', 9);
      const before = color(icon(hero, 'fire'));
      const strongSize = overlay(hero, 'fire').width;
      assert.ok(strongSize > weakSize);
      f.act(hero, owner);
      assert.equal(icon(hero, 'fire').value, 9);
      assert.deepEqual(color(icon(hero, 'fire')), before);
      assert.equal(overlay(hero, 'fire').width, strongSize);
    }
  });

  test(`OV-LIGHTNING-02/12 Ex${ex}: 実戦更新で参加者だけのゲージ移転と雷光`, () => {
    const effects = new CombatEffectSystem();
    const f = fixture({ effects });
    const owner = f.enemy('lightning', ex);
    const hero = f.hero();
    const waiting = f.hero('mage');
    waiting.currentArea = 'preparation';
    hero.attributes.lightning = 1;
    owner.chip.actionGauge = 1;
    hero.chip.actionGauge = 5;
    waiting.chip.actionGauge = 3;
    // 戦闘更新が構成する参加者を使って攻撃し、待機者の除外も検証する。
    f.battle.updateActor = (actor, participants) => {
      if (actor === hero) f.battle.applyPhysicalDamage(hero, owner, 'sword', 1, false, participants);
    };
    f.update();
    near(hero.chip.actionGauge, ex === 1 ? 4.5 : 4);
    near(owner.chip.actionGauge, ex === 1 ? 1.5 : 2);
    // 非参加者の戦闘表示はライフサイクルによって消去される。
    assert.equal(waiting.chip.actionGauge, null);
    assert.equal(effects.lightning.length, 1);
    assert.equal(effects.lightning[0].from, hero.chip);
    assert.equal(effects.lightning[0].to, owner.chip);
  });

  test(`OV-REPUTATION-12/14/15 Ex${ex}: アイコン色・継続成功・他候補なしの実際の自傷`, () => {
    const effects = new CombatEffectSystem();
    const f = fixture({ effects });
    const owner = f.enemy('reputation', ex);
    const hero = f.hero();
    f.act(owner, hero);
    assert.deepEqual(color(icon(hero, 'bewilderment')), ex === 1 ? [0, 51, 255] : [230, 0, 0]);
    assert.ok(render(hero).fills.includes(ex === 1 ? 'rgb(0,51,255)' : 'rgb(230,0,0)'));
    assert.ok(render(hero).images.some((image) => image.path === '/assets/conditions/bewilderment.png'));
    assert.equal(f.battle.findTarget(hero, [owner, hero]), hero);
    const before = hero.stamina;
    f.roll(0);
    // 伝染・命中・ダメージ・被弾傾きは0で進め、継続判定だけ成功側へ固定する。
    const resolution = f.battle.actionResolutionSystem;
    const continueBewilderment = resolution.resolveBewildermentContinuation.bind(resolution);
    resolution.resolveBewildermentContinuation = (actor) => {
      f.roll(0.999);
      continueBewilderment(actor);
    };
    effects.popups.length = 0;
    f.act(hero, hero, [owner, hero]);
    assert.ok(hero.stamina < before);
    assert.ok(f.damage.some((e) => e.actor === hero && e.target === hero && e.damage > 0));
    assert.ok(effects.popups.some((p) => p.chip === hero.chip && p.values.amount > 0));
    assert.equal(f.battle.conditionSystem.getBewildermentLevel(hero), ex);
    assert.deepEqual(color(icon(hero, 'bewilderment')), ex === 1 ? [0, 51, 255] : [230, 0, 0]);
  });

  test(`OV-FEATHER-03/14 Ex${ex}: 全武器攻撃後に一度だけHeroを運び全5装備を散乱`, () => {
    const f = fixture();
    const owner = f.enemy('feather', ex);
    const hero = f.hero();
    hero.equip(f.weapon());
    hero.equip(f.weapon('shield'));
    for (const part of ['head', 'torso', 'feet']) hero.equip(f.items.createBodyItem({ part, tags: [], x: 0, y: 0, random: () => 0 }));
    const equipment = Object.values(hero.equipment).filter(Boolean);
    const begin = f.battle.gustSystem.begin.bind(f.battle.gustSystem);
    const hitsAtLaunch = [];
    f.battle.gustSystem.begin = (target) => {
      hitsAtLaunch.push(f.damage.filter((e) => e.actor === owner && e.target === hero).length);
      return begin(target);
    };
    f.act(owner, hero);
    assert.deepEqual(hitsAtLaunch, [f.battle.attackTypes(owner).length]);
    assert.ok(hitsAtLaunch[0] > 1);
    assert.equal(f.battle.gustSystem.isGusting(hero), true);
    f.board.update(2);
    f.battle.gustSystem.update();
    assert.equal(equipment.length, 5);
    assert.deepEqual(new Set(f.warehouse()), new Set(equipment));
    assert.ok(Object.values(hero.equipment).every((item) => item === null));
    assert.ok(equipment.every((item) => Math.hypot(item.chip.x - hero.chip.x, item.chip.y - hero.chip.y) > hero.chip.radius * 2));
    const ally = f.enemy('valor', 0);
    f.act(owner, ally);
    assert.equal(hitsAtLaunch.length, 1);
    assert.equal(f.battle.gustSystem.isGusting(ally), false);
  });
}

test('OV-FEATHER-12: スタミナ3未満なら拾得せず準備へ歩いて戻る', () => {
  const f = fixture();
  const hero = f.hero();
  const sword = f.weapon();
  hero.equip(sword);
  hero.stamina = 2.99;
  assert.equal(f.battle.gustSystem.begin(hero), true);
  finishGust(f, hero);
  assert.equal(f.pickup.states.has(hero), false);
  assert.equal(hero.targetArea, 'preparation');
  assert.ok(hero.chip.step);
  assert.ok(f.warehouse().includes(sword));
  for (let frame = 0; frame < 10000 && hero.currentArea !== 'preparation'; frame += 1) {
    f.board.update(1 / 60);
    f.returns.update(hero);
  }
  assert.equal(hero.currentArea, 'preparation');
  assert.equal(hero.equipment.rightHand, null);
});

test('OV-FEATHER-13: スタミナ3以上なら第1武器と残りの装備を回収して戦闘へ戻る', () => {
  const f = fixture();
  const hero = f.hero();
  const sword = f.weapon();
  const shield = f.weapon('shield');
  hero.equip(sword);
  hero.equip(shield);
  hero.stamina = 3;
  assert.equal(f.battle.gustSystem.begin(hero), true);
  finishGust(f, hero);
  assert.equal(f.pickup.states.get(hero).item, sword);
  for (let frame = 0; frame < 10000 && hero.currentArea !== 'battle'; frame += 1) {
    f.board.update(1 / 60);
    f.pickup.update(f.warehouse(), 1 / 60);
  }
  assert.equal(hero.currentArea, 'battle');
  assert.equal(hero.targetArea, null);
  assert.equal(f.pickup.states.has(hero), false);
  assert.equal(hero.equipment.rightHand, sword);
  assert.equal(hero.equipment.leftHand, shield);
  assert.equal(f.board.chips.includes(sword.chip), false);
  assert.equal(f.board.chips.includes(shield.chip), false);
});
