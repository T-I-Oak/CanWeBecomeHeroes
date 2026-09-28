import test from 'node:test';
import gameText from '../../src/game/readGameText.js';
import GameTextRepository, { textPart } from '../../src/game/GameTextRepository.js';
import { expandLanguageResource } from '../../../GameWorksOAK/src/lib/core/i18n.js';
const textRepository = await new GameTextRepository({ loadResource: async (path) => textPart(expandLanguageResource(gameText), path) }).load();
import assert from 'node:assert/strict';
import HeroFactory from '../../src/game/HeroFactory.js';
import GuildSystem, { GUILD_APPLICATION_TICKS } from '../../src/game/GuildSystem.js';
import { calculateGuildExtension } from '../../src/game/GuildTime.js';

function guildHero(profession = 'mage', stamina = 3) {
  const hero = new HeroFactory().create({ profession, x: 300, y: 300, stamina, bounds: { x: 0, y: 0, width: 600, height: 400 } });
  hero.currentArea = 'guild';
  return hero;
}

test('guild guarantees one hour when the calculated extension is below one hour, including zero contribution points', () => {
  assert.deepEqual(calculateGuildExtension({ contributionPoints: 0 }), {
    extensionHours: 1, consumedPoints: 0, rate: 0.2, isMinimumGuarantee: true,
  });
  assert.equal(calculateGuildExtension({ contributionPoints: 9, reputationSkillLevel: 1, isLucky: true }).isMinimumGuarantee, false);
});

test('guild completes after six hundred ticks using completion-time points and returns the hero', () => {
  let points = 100;
  const returned = [];
  const logs = [];
  const returnSystem = { begin: (hero) => returned.push(hero), update: () => false };
  const hero = guildHero('mage', 5);
  hero.tags = ['reputation', 'reputation'];
  const guild = new GuildSystem(returnSystem, {
    getContributionPoints: () => points,
    setContributionPoints: (value) => { points = value; },
    random: () => 0,
    textRepository, gameLog: { log: (message, options) => logs.push({ message, options }) },
  });

  guild.update([hero], GUILD_APPLICATION_TICKS / 60);

  assert.equal(points, 16);
  assert.equal(guild.getExtensionHours(), 24);
  assert.ok(Math.abs(hero.stamina - 2) < 0.000000001);
  assert.deepEqual(returned, [hero]);
  assert.deepEqual(logs, [{
    message: '【魔法使い・ケイシー】はギルドとの巧みな交渉で好条件を引き出し、試験期限を24時間延長した。',
    options: { subject: 'hero', level: 'luck', channel: 'guild' },
  }]);
});
