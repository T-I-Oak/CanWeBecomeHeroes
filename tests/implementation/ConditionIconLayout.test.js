import test from 'node:test';
import assert from 'node:assert/strict';
import { CONDITION_ICON_GAP, CONDITION_ICON_PADDING, CONDITION_ICON_SIZE, getConditionIconAtPoint, getConditionIconColor, getConditionIconEntries, getConditionIconInformationTarget, layoutConditionIcons } from '../../src/chips/ConditionIconLayout.js';
import { BATTLE_AREA_HEIGHT, BATTLE_CONDITION_ICON_ROW_HEIGHT, BATTLE_ENEMY_AREA_HEIGHT, BATTLE_FRIENDLY_AREA_HEIGHT, HERO_SLOT_SIZE } from '../../src/game/HeroSlotLayout.js';
import CombatConditionSystem from '../../src/game/CombatConditionSystem.js';

test('a standard slot shows four icons and leaves 8px on the right', () => {
  const entries = ['fire', 'water', 'lightning', 'physical-defense', 'two-edged-sword'].map((id) => ({ id }));
  const four = layoutConditionIcons(entries.slice(0, 4), HERO_SLOT_SIZE);
  const five = layoutConditionIcons(entries, HERO_SLOT_SIZE);
  const last = four[3];

  assert.equal(CONDITION_ICON_SIZE, 49);
  assert.equal(CONDITION_ICON_GAP, 4);
  assert.equal(CONDITION_ICON_PADDING, 8);
  assert.equal(four[0].x, CONDITION_ICON_PADDING);
  assert.equal(four.length, 4);
  assert.equal(four.some((icon) => icon.ellipsis), false);
  assert.equal(HERO_SLOT_SIZE - (last.x + CONDITION_ICON_SIZE), CONDITION_ICON_PADDING);
  assert.equal(five.length, 4);
  assert.deepEqual(five.map((icon) => icon.ellipsis), [false, false, false, true]);
  assert.equal(five[3].x, last.x);
});

test('condition icons open their existing static information, except the ellipsis', () => {
  const bounds = { x: 100, y: 200, width: HERO_SLOT_SIZE, height: HERO_SLOT_SIZE };
  const fire = getConditionIconAtPoint({ bounds, attributeValues: { fire: 1 } }, { x: 108, y: 424 });
  const physicalDefense = getConditionIconAtPoint({ bounds, physicalDamageReduction: 0.2 }, { x: 108, y: 424 });
  const overflow = getConditionIconAtPoint({
    bounds,
    attributeValues: { fire: 1, water: 1, lightning: 1 },
    physicalDamageReduction: 0.2,
    twoEdgedSwordMultiplier: 2,
  }, { x: 267, y: 424 });

  assert.deepEqual(getConditionIconInformationTarget(fire), { type: 'tag', data: { tag: 'fire' } });
  assert.deepEqual(getConditionIconInformationTarget(physicalDefense), { type: 'term', data: { term: 'physical-defense' } });
  assert.equal(overflow.ellipsis, true);
  assert.equal(getConditionIconInformationTarget(overflow), null);
  assert.deepEqual(getConditionIconInformationTarget({ id: 'night-familiar' }), { type: 'term', data: { term: 'familiar' } });
  assert.equal(getConditionIconAtPoint({ bounds, attributeValues: { fire: 1 } }, { x: 107, y: 424 }), null);
});

test('condition icon color moves from matte blue toward matte red as the value rises', () => {
  assert.deepEqual(getConditionIconColor(0, 0, 7), [0, 51, 255]);
  assert.deepEqual(getConditionIconColor(7, 0, 7), [230, 0, 0]);
  assert.deepEqual(getConditionIconColor(1, 1, 1), [0, 51, 255]);
});

test('active combat states keep a fixed icon order', () => {
  const entries = getConditionIconEntries({
    attributeValues: { fire: 2, water: 0, lightning: 7 },
    physicalDamageReduction: 0.2,
    twoEdgedSwordMultiplier: 4,
    bewildered: true,
    misfortuneDamageRate: 1,
    nightFamiliarCount: 3,
  });

  assert.deepEqual(entries.map((entry) => entry.id), [
    'fire', 'lightning', 'physical-defense', 'two-edged-sword', 'bewilderment', 'misfortune', 'night-familiar',
  ]);
});

test('the battle area grows by one condition icon row under the allied slots', () => {
  assert.equal(BATTLE_FRIENDLY_AREA_HEIGHT, HERO_SLOT_SIZE + BATTLE_CONDITION_ICON_ROW_HEIGHT);
  assert.equal(BATTLE_AREA_HEIGHT, BATTLE_ENEMY_AREA_HEIGHT + BATTLE_FRIENDLY_AREA_HEIGHT);
  assert.equal(BATTLE_CONDITION_ICON_ROW_HEIGHT, CONDITION_ICON_SIZE + CONDITION_ICON_PADDING);
});

test('condition changes are copied onto the combatant chip', () => {
  const conditions = new CombatConditionSystem();
  const combatant = { chip: {} };

  conditions.applyTwoEdgedSword(combatant, 2);
  conditions.applyBewilderment(combatant);
  conditions.applyMisfortune(combatant, 0.5);
  conditions.summonNightFamiliars(combatant, 3);

  assert.equal(combatant.chip.twoEdgedSwordMultiplier, 2);
  assert.equal(combatant.chip.bewildered, true);
  assert.equal(combatant.chip.misfortuneDamageRate, 0.5);
  assert.equal(combatant.chip.nightFamiliarCount, 3);

  conditions.clearCombatant(combatant);
  assert.equal(combatant.chip.twoEdgedSwordMultiplier, 0);
  assert.equal(combatant.chip.bewildered, false);
  assert.equal(combatant.chip.nightFamiliarCount, 0);
});
