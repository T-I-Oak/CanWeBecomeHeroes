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

test('initial enemy has five tagless equipment items and its affinity as an intrinsic tag', () => {
  const enemy = new EnemyFactory().createInitialEncounter();
  assert.equal(enemy.equipment.length, 5);
  assert.equal(enemy.tags.filter((tag) => tag === 'valor').length, 1);
  assert.equal(enemy.equipment.flatMap((item) => item.tags).length, 0);
  assert.equal(enemy.getStatus('power'), 1);
  assert.equal(enemy.chip.tagPaths.length, 1);
  assert.equal(enemy.hp, 2);
  assert.equal(enemy.chip.radius, 64);
});

test('small arcane enemy resolves to the ghost catalog entry', () => {
  const enemy = new EnemyFactory().create({ size: 'small', tagAffinity: 'arcane', slotPosition: 4, maximumHp: 2, contributionPoints: 2, totalTagCount: 0 });

  assert.equal(enemy.definition.id, 'small-arcane');
  assert.equal(enemy.chip.centerPath, '/assets/enemies/small-arcane.png');
  assert.deepEqual(enemy.tags, ['arcane']);
});

test('new small enemy catalog entries resolve their names and assets', () => {
  assert.deepEqual(getEnemyDefinition({ size: 'small', tagAffinity: 'reputation' }), {
    id: 'small-reputation',
    size: 'small',
    tagAffinity: 'reputation',
    nameKey: 'enemy.smallReputation',
    assetPath: '/assets/enemies/small-reputation.png',
    intrinsicTags: ['reputation'],
    baseHp: 2,
    baseContributionPoints: 10,
  });
  assert.deepEqual(getEnemyDefinition({ size: 'small', tagAffinity: 'lightning' }), {
    id: 'small-lightning',
    size: 'small',
    tagAffinity: 'lightning',
    nameKey: 'enemy.smallLightning',
    assetPath: '/assets/enemies/small-lightning.png',
    intrinsicTags: ['lightning'],
    baseHp: 2,
    baseContributionPoints: 10,
  });
});

test('vitality mid-boss and boss catalog entries carry the shared unique skill at their respective levels', () => {
  assert.deepEqual(getEnemyDefinition({ size: 'medium', tagAffinity: 'vitality' }).uniqueSkill, { id: 'vitality-summon', level: 1 });
  assert.deepEqual(getEnemyDefinition({ size: 'large', tagAffinity: 'vitality' }).uniqueSkill, { id: 'vitality-summon', level: 2 });
});

test('gem mid-boss and boss carry orb-rain at their respective levels', () => {
  assert.deepEqual(getEnemyDefinition({ size: 'medium', tagAffinity: 'gem' }).uniqueSkill, { id: 'gem-orb-rain', level: 1 });
  assert.deepEqual(getEnemyDefinition({ size: 'large', tagAffinity: 'gem' }).uniqueSkill, { id: 'gem-orb-rain', level: 2 });
});

test('area mid-boss and boss carry head rush at their respective levels', () => {
  assert.deepEqual(getEnemyDefinition({ size: 'medium', tagAffinity: 'area' }).uniqueSkill, { id: 'area-head-rush', level: 1 });
  assert.deepEqual(getEnemyDefinition({ size: 'large', tagAffinity: 'area' }).uniqueSkill, { id: 'area-head-rush', level: 2 });
});

test('dexterity mid-boss and boss define their names, assets, and shadow fingertips levels', () => {
  const werewolf = getEnemyDefinition({ size: 'medium', tagAffinity: 'dexterity' });
  const tengu = getEnemyDefinition({ size: 'large', tagAffinity: 'dexterity' });

  assert.equal(textRepository.getName('enemy', werewolf.id), 'ウェアウルフ');
  assert.equal(werewolf.assetPath, '/assets/enemies/medium-dexterity.png');
  assert.deepEqual(werewolf.uniqueSkill, { id: 'shadow-fingertips', level: 1 });
  assert.equal(textRepository.getName('enemy', tengu.id), '天狗');
  assert.equal(tengu.assetPath, '/assets/enemies/large-dexterity.png');
  assert.deepEqual(tengu.uniqueSkill, { id: 'shadow-fingertips', level: 2 });
});

test('valor mid-boss and boss define battle frenzy at their respective levels', () => {
  const ogre = getEnemyDefinition({ size: 'medium', tagAffinity: 'valor' });
  const cyclops = getEnemyDefinition({ size: 'large', tagAffinity: 'valor' });

  assert.equal(ogre.nameKey, 'enemy.mediumValor');
  assert.equal(ogre.assetPath, '/assets/enemies/medium-valor.png');
  assert.deepEqual(ogre.uniqueSkill, { id: 'battle-frenzy', level: 1 });
  assert.equal(cyclops.nameKey, 'enemy.largeValor');
  assert.equal(cyclops.assetPath, '/assets/enemies/large-valor.png');
  assert.deepEqual(cyclops.uniqueSkill, { id: 'battle-frenzy', level: 2 });
});
