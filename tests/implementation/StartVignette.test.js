import test from 'node:test';
import assert from 'node:assert/strict';
import gameText from '../../src/game/readGameText.js';
import { expandLanguageResource, setLanguage } from '../../../GameWorksOAK/src/lib/core/i18n.js';
import GameTextRepository, { textPart } from '../../src/game/GameTextRepository.js';
import { createStartVignette } from '../../src/game/StartVignette.js';
import { createVignettePlayback, updateVignettePlayback } from '../../src/game/VignettePlayer.js';

async function openingTexts(language) {
  setLanguage(language);
  const expanded = expandLanguageResource(gameText);
  return new GameTextRepository({ loadResource: async (path) => textPart(expanded, path) }).load();
}

test('Avery and Briar use a separate opening script and leave during it', async () => {
  const texts = await openingTexts('ja');
  const script = texts.getVignetteScript('opening', 'AveryBriar');
  const vignette = createStartVignette({ professionIds: ['swordfighter', 'guard'], textRepository: texts });
  const lines = vignette.commands.filter((command) => command.type === 'line');
  assert.deepEqual(lines.map((command) => command.text), script.map((line) => line.text));
  assert.deepEqual(lines.map((command) => command.instanceId), ['Avery', 'Briar', 'Avery', 'Avery', 'Avery', 'Briar', 'Briar']);
  assert.ok(lines.every((command) => command.seconds === 3 && command.direction === (command.instanceId === 'Avery' ? 'up' : 'down')));
  assert.equal(lines[4].wait, 0);
  assert.equal(lines[4].text, '時間がない、急がないと！！');
  assert.equal(script[0].text, 'ブライアー！小さい頃の勝負、先に勇者になるのは私になりそうね！');
  const departures = vignette.commands.filter((command) => command.type === 'position' && command.wait === 0);
  assert.deepEqual(departures.map((command) => command.instanceId), ['Avery', 'Briar']);
  assert.equal(departures[0].x, 200 + 90 * (2 * 3 + 0.7));
  assert.equal(departures[1].x, 70 + 180 * (3 + 0.7));
  const chaseFacing = vignette.commands.filter((command) => command.type === 'facing')[2];
  assert.equal(chaseFacing.instanceId, 'Briar');
  assert.equal(chaseFacing.forwardSeconds, 0.14 / 2);
  assert.equal(chaseFacing.backSeconds, 0.5 / 2);
  assert.equal(chaseFacing.stepDistance, 24);

  const reversed = createStartVignette({ professionIds: ['guard', 'swordfighter'], textRepository: texts });
  assert.deepEqual(reversed.instances, vignette.instances);
  assert.deepEqual(reversed.commands, vignette.commands);

  const playback = createVignettePlayback(vignette);
  updateVignettePlayback(playback, 0.7);
  updateVignettePlayback(playback, 280 / 90);
  assert.equal(playback.line.text, script[0].text);
  assert.equal(playback.instances.get('Avery').position.x, 200);
  assert.equal(playback.instances.get('Briar').position, null);

  updateVignettePlayback(playback, 3);
  updateVignettePlayback(playback, 150 / 90);
  assert.equal(playback.line.text, script[1].text);
  assert.equal(playback.instances.get('Avery').position.x, 200);
  assert.equal(playback.instances.get('Briar').position.x, 70);

  updateVignettePlayback(playback, 3);
  assert.equal(playback.line.text, script[2].text);
  assert.equal(playback.instances.get('Avery').position.x, 200);

  updateVignettePlayback(playback, 3);
  assert.equal(playback.line.text, script[3].text);
  assert.equal(playback.instances.get('Avery').position.x, 200);

  updateVignettePlayback(playback, 3);
  assert.deepEqual(playback.lines.map((line) => line.text), [script[4].text, script[5].text]);
  assert.equal(playback.lines[0].direction, 'up');
  assert.equal(playback.instances.get('Avery').position.x, 200);
  assert.equal(playback.instances.get('Briar').position.x, 70);

  updateVignettePlayback(playback, 3);
  assert.equal(playback.line.text, script[6].text);
  assert.equal(playback.lines.length, 1);
  assert.ok(Math.abs(playback.instances.get('Avery').position.x - 470) < 0.001);
  assert.equal(playback.instances.get('Briar').position.x, 70);
  assert.equal(playback.instances.get('Briar').facing.forwardSeconds, 0.07);

  updateVignettePlayback(playback, 3);
  assert.equal(playback.view.clip.width, 560);
  assert.ok(Math.abs(playback.instances.get('Avery').position.x - 740) < 0.001);
  assert.ok(Math.abs(playback.instances.get('Briar').position.x - 610) < 0.001);
  updateVignettePlayback(playback, 0.7);
  assert.equal(playback.done, true);
  assert.equal(playback.view.clip.width, 0);
  assert.equal(playback.instances.get('Avery').position.x, departures[0].x);
  assert.equal(playback.instances.get('Briar').position.x, departures[1].x);

  assert.throws(
    () => createStartVignette({
      professionIds: ['swordfighter', 'guard'],
      textRepository: { getVignetteScript: () => { throw new RangeError('Unknown vignette script: vignette.opening.scripts.AveryBriar'); } },
    }),
    /vignette\.opening\.scripts\.AveryBriar/,
  );
  assert.throws(
    () => createStartVignette({
      professionIds: ['swordfighter', 'guard'],
      textRepository: {
        getVignetteScript: () => script.map((line) => ({ heroId: line.heroId === 'Avery' ? 'Briar' : line.heroId, text: line.text })),
      },
    }),
    /vignette\.opening\.scripts\.AveryBriar/,
  );
});

test('Casey and Darcy use a separate opening script and meet facing each other', async () => {
  const texts = await openingTexts('ja');
  const script = texts.getVignetteScript('opening', 'CaseyDarcy');
  const vignette = createStartVignette({ professionIds: ['mage', 'cleric'], textRepository: texts });
  assert.deepEqual(vignette.instances, [
    { id: 'Casey', kind: 'character', heroId: 'Casey' },
    { id: 'Darcy', kind: 'character', heroId: 'Darcy' },
  ]);
  assert.equal(vignette.commands[0].scrollX, 0);
  const lines = vignette.commands.filter((command) => command.type === 'line');
  assert.deepEqual(lines.map((command) => command.text), script.map((line) => line.text));
  assert.deepEqual(lines.map((command) => command.instanceId), ['Casey', 'Darcy', 'Darcy', 'Casey', 'Darcy', 'Darcy']);
  assert.ok(lines.every((command) => command.seconds === 3 && command.direction === (command.instanceId === 'Casey' ? 'up' : 'down')));
  assert.equal(lines[1].text, 'あら、診療所で一緒に回復の研究をしたとき以来ね。私も試験を受けに来たのよ。');
  assert.equal(lines[2].text, 'せっかくなので、一緒に試験を受けませんか？');
  assert.equal(lines[3].text, 'もちろん！属性軽減が得意なダーシーには、サポート役はお願いするね！');
  assert.equal(lines[4].text, 'あなたは盾を無視する魔法攻撃が得意だから、一緒なら心強いです。');
  assert.equal(lines[5].text, '力を合わせて、試験を乗り切りましょう。');
  const facings = vignette.commands.filter((command) => command.type === 'facing');
  assert.equal(facings[0].direction, 'left');
  assert.equal(facings[0].stepDistance, 24);
  assert.equal(facings[1].direction, 'left');
  assert.equal(facings[1].stepDistance, 0);
  assert.equal(facings[3].direction, 'right');
  assert.equal(facings[3].stepDistance, 0);
  assert.equal(facings[4].direction, 'right');
  assert.equal(facings[4].stepDistance, 24);
  assert.equal(facings[5].instanceId, 'Darcy');
  assert.equal(facings[5].direction, 'right');
  const departures = vignette.commands.filter((command) => command.type === 'position' && command.wait === 0);
  assert.deepEqual(departures.map((command) => [command.instanceId, command.x, command.seconds]), [
    ['Casey', 350 + 90 * (3 + 0.7), 3.7],
    ['Darcy', 210 + 90 * (3 + 0.7), 3.7],
  ]);

  const reversed = createStartVignette({ professionIds: ['cleric', 'mage'], textRepository: texts });
  assert.deepEqual(reversed.instances, vignette.instances);
  assert.deepEqual(reversed.commands, vignette.commands);

  const playback = createVignettePlayback(vignette);
  updateVignettePlayback(playback, 0.7);
  updateVignettePlayback(playback, 290 / 90);
  assert.equal(playback.line.text, script[0].text);
  assert.equal(playback.instances.get('Casey').position.x, 350);
  assert.equal(playback.instances.get('Casey').facing.direction, 'left');
  assert.equal(playback.instances.get('Casey').facing.stepDistance, 0);
  assert.equal(playback.instances.get('Darcy').position, null);

  updateVignettePlayback(playback, 3);
  updateVignettePlayback(playback, 290 / 90);
  assert.equal(playback.line.text, script[1].text);
  assert.equal(playback.instances.get('Darcy').position.x, 210);
  assert.equal(playback.instances.get('Darcy').facing.direction, 'right');
  assert.equal(playback.instances.get('Darcy').facing.stepDistance, 0);
  assert.equal(playback.instances.get('Casey').position.x, 350);

  updateVignettePlayback(playback, 3);
  assert.equal(playback.line.text, script[2].text);
  assert.equal(playback.instances.get('Casey').position.x, 350);
  assert.equal(playback.instances.get('Casey').facing.direction, 'left');
  updateVignettePlayback(playback, 3);
  assert.equal(playback.line.text, script[3].text);
  assert.equal(playback.instances.get('Casey').facing.direction, 'left');
  updateVignettePlayback(playback, 3);
  assert.equal(playback.line.text, script[4].text);
  assert.equal(playback.instances.get('Casey').facing.direction, 'left');

  updateVignettePlayback(playback, 3);
  assert.equal(playback.line.text, script[5].text);
  assert.equal(playback.instances.get('Casey').facing.direction, 'right');
  assert.equal(playback.instances.get('Casey').facing.stepDistance, 24);
  assert.equal(playback.instances.get('Casey').position.x, 350);
  assert.equal(playback.instances.get('Darcy').position.x, 210);
  assert.equal(playback.view.clip.width, 560);

  updateVignettePlayback(playback, 3);
  assert.equal(playback.view.clip.width, 560);
  assert.ok(Math.abs(playback.instances.get('Casey').position.x - 620) < 0.001);
  assert.ok(Math.abs(playback.instances.get('Darcy').position.x - 480) < 0.001);
  updateVignettePlayback(playback, 0.7);
  assert.equal(playback.done, true);
  assert.equal(playback.view.clip.width, 0);
  assert.equal(playback.instances.get('Casey').position.x, departures[0].x);
  assert.equal(playback.instances.get('Darcy').position.x, departures[1].x);
});

test('Ellis and Finley use a separate opening script with a dash and a backward step', async () => {
  const texts = await openingTexts('ja');
  const script = texts.getVignetteScript('opening', 'EllisFinley');
  const vignette = createStartVignette({ professionIds: ['thief', 'hunter'], textRepository: texts });
  assert.deepEqual(vignette.instances, [
    { id: 'Ellis', kind: 'character', heroId: 'Ellis' },
    { id: 'Finley', kind: 'character', heroId: 'Finley' },
  ]);
  assert.equal(vignette.commands[0].scrollX, -90);
  const lines = vignette.commands.filter((command) => command.type === 'line');
  assert.deepEqual(lines.map((command) => command.text), script.map((line) => line.text));
  assert.deepEqual(lines.map((command) => command.instanceId), ['Ellis', 'Finley', 'Ellis', 'Finley', 'Ellis', 'Finley']);
  assert.equal(lines[1].text, 'エリスですか。今でも旅団から荷物を盗んでいるのですか？');
  assert.ok(lines.every((command) => command.wait === -1 && command.seconds === 3 && command.direction === (command.instanceId === 'Ellis' ? 'up' : 'down')));
  const facings = vignette.commands.filter((command) => command.type === 'facing');
  assert.equal(facings[0].instanceId, 'Finley');
  assert.equal(facings[0].direction, 'right');
  assert.equal(facings[1].instanceId, 'Ellis');
  assert.equal(facings[1].direction, 'right');
  assert.equal(facings[2].direction, 'left');
  assert.equal(facings[2].stepDistance, 24);
  assert.equal(facings[2].forwardSeconds, 0.5);
  assert.equal(facings[2].backSeconds, 0.14);
  assert.equal(facings[3].direction, 'right');
  assert.equal(facings[3].forwardSeconds, 0.14);
  assert.equal(facings[3].backSeconds, 0.5);
  assert.equal(facings[4].instanceId, 'Finley');
  assert.equal(facings[4].direction, 'right');
  const positions = vignette.commands.filter((command) => command.type === 'position');
  assert.deepEqual(positions.map((command) => [command.instanceId, command.x, command.seconds, command.wait]), [
    ['Finley', -80, 0, -1],
    ['Finley', 70, 150 / 90, -1],
    ['Ellis', -80, 0, -1],
    ['Ellis', 224, 304 / 720, -1],
    ['Ellis', 440, 2.4, 0],
    ['Finley', 286, 2.4, -1],
  ]);

  const reversed = createStartVignette({ professionIds: ['hunter', 'thief'], textRepository: texts });
  assert.deepEqual(reversed.instances, vignette.instances);
  assert.deepEqual(reversed.commands, vignette.commands);

  const playback = createVignettePlayback(vignette);
  updateVignettePlayback(playback, 0.7);
  updateVignettePlayback(playback, 150 / 90);
  assert.equal(playback.instances.get('Finley').position.x, 70);
  assert.equal(playback.instances.get('Finley').facing.direction, 'right');
  assert.equal(playback.instances.get('Ellis').position.x, -80);
  assert.equal(playback.line, null);

  updateVignettePlayback(playback, 304 / 720);
  assert.equal(playback.line.text, script[0].text);
  assert.equal(playback.instances.get('Ellis').position.x, 224);
  assert.equal(playback.instances.get('Ellis').facing.direction, 'left');
  assert.equal(playback.instances.get('Ellis').facing.forwardSeconds, 0.5);
  assert.equal(playback.instances.get('Ellis').facing.backSeconds, 0.14);
  assert.equal(playback.instances.get('Finley').position.x, 70);
  assert.equal(playback.instances.get('Finley').facing.direction, 'right');

  for (const line of script.slice(1)) {
    updateVignettePlayback(playback, 3);
    assert.equal(playback.line.text, line.text);
    assert.equal(playback.instances.get('Ellis').position.x, 224);
    assert.equal(playback.instances.get('Ellis').facing.direction, 'left');
  }

  updateVignettePlayback(playback, 3);
  assert.equal(playback.line, null);
  assert.equal(playback.instances.get('Ellis').facing.direction, 'right');
  assert.equal(playback.instances.get('Ellis').facing.forwardSeconds, 0.14);
  assert.equal(playback.instances.get('Finley').facing.direction, 'right');
  assert.equal(playback.instances.get('Ellis').position.x, 224);
  assert.equal(playback.instances.get('Finley').position.x, 70);
  assert.equal(playback.view.clip.width, 560);

  updateVignettePlayback(playback, 2.4);
  assert.equal(playback.view.clip.width, 560);
  assert.equal(playback.instances.get('Ellis').position.x, 440);
  assert.equal(playback.instances.get('Finley').position.x, 286);
  updateVignettePlayback(playback, 0.7);
  assert.equal(playback.done, true);
  assert.equal(playback.view.clip.width, 0);

  assert.throws(
    () => createStartVignette({
      professionIds: ['thief', 'hunter'],
      textRepository: {
        getVignetteScript: () => [
          { heroId: 'Finley', text: 'よう、フィンリー。久しぶりだな。' },
          { heroId: 'Finley', text: 'エリスですか。今でも旅団から荷物を盗んでいるのですか？' },
          { heroId: 'Ellis', text: '俺は荷物を盗んでいるわけじゃない。敵の装備を剝いで、戦力を落とすのが俺の戦術だ。' },
          { heroId: 'Finley', text: '確かに。あの盗賊団を追っていたときも、そんな戦い方でしたね。' },
          { heroId: 'Ellis', text: 'この技術を世の中に活かすため、勇者試験を受けに行くところだ。' },
          { heroId: 'Finley', text: '私も試験を受けに行くところです。これも何かの縁ですね。一緒に行きましょうか。' },
        ],
      },
    }),
    /vignette\.opening\.scripts\.EllisFinley/,
  );
});

test('Garnet and Harper use a separate opening script and step left to the basic stops', async () => {
  const texts = await openingTexts('ja');
  const script = texts.getVignetteScript('opening', 'GarnetHarper');
  const vignette = createStartVignette({ professionIds: ['merchant', 'negotiator'], textRepository: texts });
  assert.deepEqual(vignette.instances, [
    { id: 'Garnet', kind: 'character', heroId: 'Garnet' },
    { id: 'Harper', kind: 'character', heroId: 'Harper' },
  ]);
  assert.equal(vignette.commands[0].scrollX, -90);
  const lines = vignette.commands.filter((command) => command.type === 'line');
  assert.deepEqual(lines.map((command) => command.text), script.map((line) => line.text));
  assert.deepEqual(lines.map((command) => command.instanceId), ['Garnet', 'Garnet', 'Harper', 'Garnet', 'Harper', 'Garnet', 'Garnet', 'Harper']);
  assert.equal(lines[0].text, 'ハーパー、私はこの試験、戦いに勝つには仕入れが重要だと踏んでいます。');
  assert.equal(lines[1].text, '仕入れは私に任せてください。');
  assert.equal(lines[2].text, 'ギルドに行けば試験期間の延長の交渉ができるそうです。そちらは、わたくしが引き受けます。');
  assert.ok(lines.every((command) => command.wait === -1 && command.seconds === 3 && command.direction === (command.instanceId === 'Garnet' ? 'up' : 'down')));
  assert.ok(vignette.commands.filter((command) => command.type === 'facing').every((command) => command.direction === 'right'));
  const positions = vignette.commands.filter((command) => command.type === 'position');
  assert.deepEqual(positions.map((command) => [command.instanceId, command.x, command.seconds, command.wait]), [
    ['Garnet', -80, 0, -1],
    ['Harper', -210, 0, -1],
    ['Garnet', 460, 540 / 90, 0],
    ['Harper', 330, 540 / 90, -1],
    ['Garnet', 200, 260 / 360, -1],
    ['Harper', 70, 260 / 360, -1],
    ['Garnet', 416, 2.4, 0],
    ['Harper', 286, 2.4, 1.5],
  ]);

  const reversed = createStartVignette({ professionIds: ['negotiator', 'merchant'], textRepository: texts });
  assert.deepEqual(reversed.instances, vignette.instances);
  assert.deepEqual(reversed.commands, vignette.commands);

  const playback = createVignettePlayback(vignette);
  updateVignettePlayback(playback, 0.7);
  updateVignettePlayback(playback, 540 / 90);
  assert.equal(playback.line.text, script[0].text);
  assert.equal(playback.instances.get('Garnet').position.x, 460);
  assert.equal(playback.instances.get('Harper').position.x, 330);
  assert.equal(playback.instances.get('Garnet').facing.direction, 'right');
  assert.equal(playback.instances.get('Harper').facing.direction, 'right');

  updateVignettePlayback(playback, 3);
  assert.equal(playback.line.text, script[1].text);
  assert.equal(playback.instances.get('Harper').position.x, 330);
  assert.equal(playback.instances.get('Garnet').position.x, 460);

  updateVignettePlayback(playback, 3);
  assert.equal(playback.line.text, script[2].text);
  assert.equal(playback.instances.get('Harper').position.x, 330);
  assert.equal(playback.instances.get('Garnet').position.x, 460);

  updateVignettePlayback(playback, 3);
  assert.equal(playback.line.text, script[3].text);
  assert.equal(playback.instances.get('Garnet').position.x, 460);
  assert.equal(playback.instances.get('Harper').position.x, 330);

  updateVignettePlayback(playback, 3);
  assert.equal(playback.line, null);
  assert.equal(playback.instances.get('Garnet').position.x, 460);
  updateVignettePlayback(playback, 260 / 360);
  assert.equal(playback.line.text, script[4].text);
  assert.equal(playback.instances.get('Garnet').position.x, 200);
  assert.equal(playback.instances.get('Harper').position.x, 330);

  updateVignettePlayback(playback, 3);
  assert.equal(playback.line, null);
  assert.equal(playback.instances.get('Harper').position.x, 330);
  updateVignettePlayback(playback, 260 / 360);
  assert.equal(playback.line.text, script[5].text);
  assert.equal(playback.instances.get('Harper').position.x, 70);
  assert.equal(playback.instances.get('Garnet').position.x, 200);

  updateVignettePlayback(playback, 3);
  assert.equal(playback.line.text, script[6].text);
  assert.equal(playback.instances.get('Garnet').position.x, 200);
  assert.equal(playback.instances.get('Harper').position.x, 70);
  updateVignettePlayback(playback, 3);
  assert.equal(playback.line.text, script[7].text);
  assert.equal(playback.instances.get('Harper').position.x, 70);
  assert.equal(playback.view.clip.width, 560);

  updateVignettePlayback(playback, 3);
  assert.equal(playback.line, null);
  assert.equal(playback.instances.get('Garnet').position.x, 200);
  assert.equal(playback.instances.get('Harper').position.x, 70);
  updateVignettePlayback(playback, 1.5);
  assert.equal(playback.view.clip.width, 560);
  assert.ok(Math.abs(playback.instances.get('Garnet').position.x - 335) < 0.001);
  assert.ok(Math.abs(playback.instances.get('Harper').position.x - 205) < 0.001);
  updateVignettePlayback(playback, 0.7);
  assert.equal(playback.done, true);
  assert.equal(playback.view.clip.width, 0);

  assert.throws(
    () => createStartVignette({
      professionIds: ['merchant', 'negotiator'],
      textRepository: {
        getVignetteScript: () => script.map((line) => ({ heroId: line.heroId === 'Garnet' ? 'Harper' : line.heroId, text: line.text })),
      },
    }),
    /vignette\.opening\.scripts\.GarnetHarper/,
  );
});
