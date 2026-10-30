import test from 'node:test';
import assert from 'node:assert/strict';
import ChipBoard from '../../../src/chips/ChipBoard.js';
import BattleSystem from '../../../src/game/BattleSystem.js';
import CombatEffectSystem from '../../../src/game/CombatEffectSystem.js';
import EnemyFactory from '../../../src/game/EnemyFactory.js';
import HeroFactory from '../../../src/game/HeroFactory.js';
import ItemFactory from '../../../src/game/ItemFactory.js';
import { getEnemyDefinition } from '../../../src/game/EnemyCatalog.js';
import { WEAPON_ATTACKS, getAttackDamage, getRandomModifier } from '../../../src/game/CombatWeaponAttack.js';
import { getActionGaugeMaximum } from '../../../src/game/CombatActionGaugeSystem.js';
import gameText from '../../../src/game/readGameText.js';
import GameTextRepository, { textPart } from '../../../src/game/GameTextRepository.js';
import { expandLanguageResource } from '../../../../GameWorksOAK/src/lib/core/i18n.js';

const textRepository = await new GameTextRepository({ loadResource: async (path) => textPart(expandLanguageResource(gameText), path) }).load();

test('familiar uses its asset without a canvas filter and retains flap geometry', () => {
  const effects = new CombatEffectSystem();
  const transforms = [];
  const image = { complete: true, naturalWidth: 1280 };
  const pose = { x: 120, y: 240, size: 55.68, angle: 0.1, flap: 0.56 };
  const context = {
    save() {}, restore() {},
    translate: (...args) => transforms.push(['translate', ...args]),
    rotate: (...args) => transforms.push(['rotate', ...args]),
    scale: (...args) => transforms.push(['scale', ...args]),
    drawImage: (...args) => transforms.push(['image', ...args]),
    set filter(value) { assert.fail(`Unexpected canvas filter: ${value}`); },
  };
  effects.drawNightFamiliar(context, { load(path) {
    assert.equal(path, '/assets/effects/night-familiar.png');
    return image;
  } }, pose);
  assert.deepEqual(transforms, [
    ['translate', pose.x, pose.y], ['rotate', pose.angle], ['scale', pose.flap, 1],
    ['image', image, -pose.size / 2, -pose.size / 2, pose.size, pose.size],
  ]);
});

test('lightning preserves its stroke and isolates canvas state from subsequent sprites and text', () => {
  const effects = new CombatEffectSystem();
  const chip = { x: 10, y: 20, height: 0, radius: 30 };
  effects.lightningPropagation({ chip }, { chip: { ...chip, x: 100 } });
  effects.nightFamiliars.set(chip, { source: chip, count: 1, appearedAt: 0 });
  effects.popups.push({ chip, elapsed: 0, duration: 1, color: 'red', key: 'damage' });
  let state = { shadowColor: 'transparent', shadowBlur: 0, strokeStyle: 'black', lineWidth: 1 };
  const stack = [];
  const draws = [];
  const context = new Proxy({
    save() { stack.push({ ...state }); },
    restore() { state = stack.pop(); },
    beginPath() {}, moveTo() {}, lineTo() {},
    stroke() { draws.push(['lightning', { ...state }]); },
    strokeText() { draws.push(['text', { ...state }]); }, fillText() {},
  }, {
    get(target, key) { return key in target ? target[key] : state[key]; },
    set(target, key, value) { state[key] = value; return true; },
  });
  effects.drawNightFamiliar = ctx => draws.push(['familiar', { shadowColor: ctx.shadowColor, shadowBlur: ctx.shadowBlur }]);
  effects.draw(context, {});
  assert.equal(draws[0][1].shadowColor, '#9d62ff');
  assert.equal(draws[0][1].shadowBlur, 10);
  assert.equal(draws[0][1].lineWidth, 3);
  for (const [, drawn] of draws.slice(1)) {
    assert.equal(drawn.shadowColor, 'transparent');
    assert.equal(drawn.shadowBlur, 0);
  }
  assert.deepEqual(state, { shadowColor: 'transparent', shadowBlur: 0, strokeStyle: 'black', lineWidth: 1 });
  assert.equal(stack.length, 0);
});

test('one action aggregates miss and damage feedback by target with critical priority', () => {
  const effects = new CombatEffectSystem();
  const target = { chip: {} };

  effects.beginAction();
  effects.miss(target);
  effects.damage(target, 0.1);
  effects.damage(target, 0.2, true);
  effects.endAction();

  assert.equal(effects.popups.length, 1);
  assert.equal(effects.popups[0].key, 'combatCritical');
  assert.deepEqual(effects.popups[0].values, { amount: 30 });
  assert.equal(effects.hits.length, 1);
});

test('orb animates a gem tag from its owner when the tag is successfully added', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const effects = new CombatEffectSystem();
  const item = new ItemFactory().createWeapon({ weapon: 'sword', tags: ['valor'], x: 0, y: 0 });
  const actor = { chip: { x: 10, y: 10, height: 0 }, getLuckDegree: () => 1 };
  const target = { chip: { type: 'enemy', x: 20, y: 20, height: 0 }, equipment: [item], refreshDerivedValues: () => {} };
  const battle = new BattleSystem(board, { effects, random: () => 0 });

  battle.applyOrb(actor, target, 1);

  assert.equal(item.tags.includes('gem'), true);
  assert.equal(effects.tagTransfers.length, 1);
  assert.equal(effects.tagTransfers[0].tag, 'gem');
  assert.equal(effects.tagTransfers[0].from, actor.chip);
  assert.equal(effects.tagTransfers[0].to, target.chip);
});

