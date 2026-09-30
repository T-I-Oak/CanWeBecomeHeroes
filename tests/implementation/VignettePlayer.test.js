import test from 'node:test';
import assert from 'node:assert/strict';
import gameText from '../../src/game/readGameText.js';
import { expandLanguageResource, setLanguage } from '../../../GameWorksOAK/src/lib/core/i18n.js';
import GameTextRepository, { textPart } from '../../src/game/GameTextRepository.js';
import { createStartVignette } from '../../src/game/StartVignette.js';
import { backgroundDrawOffset, createVignettePlayback, facingStepOffset, updateVignettePlayback } from '../../src/game/VignettePlayer.js';
import { vignetteStageScale, wrapVignetteDialogue, layoutVignetteBubble, VIGNETTE_FRAME_PADDING, VIGNETTE_STAGE_HEIGHT, VIGNETTE_STAGE_WIDTH } from '../../src/game/VignetteStage.js';

async function openingTexts(language) {
  setLanguage(language);
  const expanded = expandLanguageResource(gameText);
  return new GameTextRepository({ loadResource: async (path) => textPart(expanded, path) }).load();
}

test('a vignette stage uses one scale for the available screen', () => {
  assert.equal(vignetteStageScale(300, 800), 300 / 560);
  assert.equal(vignetteStageScale(1200, 400), 400 / 400);
});

test('start vignette lines come from the language resource', async () => {
  const texts = await openingTexts('ja');
  const vignette = createStartVignette({ professionIds: ['swordfighter', 'mage'], textRepository: texts });
  const lines = vignette.commands.filter((command) => command.type === 'line');
  assert.deepEqual(lines.map((command) => command.text), [
    texts.getVignetteLine('opening', 'lead', 'Avery'),
    texts.getVignetteLine('opening', 'partner', 'Casey'),
  ]);
  for (const heroId of ['Avery', 'Briar', 'Casey', 'Darcy', 'Ellis', 'Finley', 'Garnet', 'Harper']) {
    assert.equal(typeof texts.getVignetteLine('opening', 'lead', heroId), 'string');
    assert.equal(typeof texts.getVignetteLine('opening', 'partner', heroId), 'string');
  }
  assert.equal(lines[0].text, 'ついに試験が始まるね。私、気合で駆け抜けるから、一緒に頑張ろうね！');
  assert.equal(lines[1].text, 'うん！危なくなったら、あたしが魔法で助けるよ！');
  assert.ok(lines.every((command, index) => command.seconds === 3 && command.direction === (index === 0 ? 'up' : 'down')));
  assert.equal(vignette.instances[0].heroId, 'Avery');
  assert.equal(vignette.instances[1].heroId, 'Casey');
  assert.equal(vignette.commands.find((command) => command.type === 'facing').fillColor, '#bfdbfe');
  assert.equal(gameText.vignette.opening.lead.Avery['lang-store'].en, "The trial is finally starting. I'll charge through on spirit, so let's do our best together!");
  assert.throws(
    () => createStartVignette({
      professionIds: ['swordfighter', 'mage'],
      textRepository: { getVignetteLine: () => { throw new RangeError('Unknown vignette line: vignette.opening.partner.Casey'); } },
    }),
    /vignette\.opening\.partner\.Casey/,
  );
});

test('a start vignette walks the lead in, then the partner, then both leave', async () => {
  const texts = await openingTexts('ja');
  const playback = createVignettePlayback(createStartVignette({ professionIds: ['swordfighter', 'mage'], textRepository: texts }));
  assert.equal(playback.view.clip.width, 0);
  assert.equal(playback.background.scrollX, -48);
  assert.equal(playback.instances.get('lead').position, null);

  updateVignettePlayback(playback, 0.35);
  assert.equal(playback.view.clip.width, 280);
  assert.equal(playback.instances.get('lead').position, null);

  updateVignettePlayback(playback, 0.35);
  assert.equal(playback.view.clip.width, 560);
  assert.equal(playback.instances.get('lead').position.x, -80);
  assert.equal(playback.instances.get('lead').position.y, 248);

  updateVignettePlayback(playback, 0.5);
  assert.ok(playback.instances.get('lead').position.x > -80);
  assert.equal(playback.line, null);

  updateVignettePlayback(playback, 280 / 90 - 0.5);
  const lead = playback.instances.get('lead');
  assert.equal(lead.position.x, 200);
  assert.ok(lead.position.x < 280);
  assert.equal(playback.line.text, texts.getVignetteLine('opening', 'lead', 'Avery'));

  const returning = facingStepOffset(lead.facing, lead.facing.startedAt + 0.2);
  const later = facingStepOffset(lead.facing, lead.facing.startedAt + 0.3);
  assert.ok(Math.abs((returning - later) / 0.1 - 48) < 0.001);

  updateVignettePlayback(playback, 3);
  updateVignettePlayback(playback, 150 / 90);
  const partner = playback.instances.get('partner');
  assert.equal(partner.position.x, 70);
  assert.equal(lead.position.x, 200);
  assert.equal(playback.line.text, texts.getVignetteLine('opening', 'partner', 'Casey'));
  assert.equal(partner.facing.phase, 0.25);
  assert.notEqual(
    facingStepOffset(lead.facing, playback.time),
    facingStepOffset(partner.facing, playback.time),
  );

  updateVignettePlayback(playback, 3);
  assert.equal(playback.view.clip.width, 560);
  updateVignettePlayback(playback, 1.5);
  assert.equal(playback.view.clip.width, 560);
  updateVignettePlayback(playback, 0.7);
  assert.equal(playback.view.clip.width, 0);
  assert.equal(playback.done, true);
  assert.equal(backgroundDrawOffset(playback.background, 1, 1120), 1072);
});

test('a facing step fades its amplitude in over a tenth of a second and out the same way', () => {
  const playback = createVignettePlayback({
    instances: [{ id: 'lead' }],
    commands: [
      { type: 'position', instanceId: 'lead', x: 0, y: 0, seconds: 0, wait: 0 },
      { type: 'facing', instanceId: 'lead', direction: 'right', stepDistance: 24, forwardSeconds: 0.14, backSeconds: 0.5, phase: 0.25 },
      { type: 'position', instanceId: 'lead', x: 0, y: 0, seconds: 1, wait: -1 },
      { type: 'facing', instanceId: 'lead', direction: 'left', stepDistance: 0, forwardSeconds: 0.14, backSeconds: 0.5, phase: 0 },
      { type: 'position', instanceId: 'lead', x: 0, y: 0, seconds: 1, wait: -1 },
    ],
  });
  const started = playback.instances.get('lead').facing;
  assert.equal(facingStepOffset(started, playback.time), 0);
  updateVignettePlayback(playback, 0.05);
  const midFade = facingStepOffset(playback.instances.get('lead').facing, playback.time);
  const fullAtMidFade = facingStepOffset({ ...playback.instances.get('lead').facing, envelope: { from: 1, to: 1, startedAt: 0, seconds: 0 } }, playback.time);
  assert.ok(Math.abs(midFade * 2 - fullAtMidFade) < 0.001);
  updateVignettePlayback(playback, 0.05);
  const full = facingStepOffset(playback.instances.get('lead').facing, playback.time);
  assert.ok(Math.abs(full - fullAtMidFade) > 0.001);
  assert.ok(full > midFade);

  updateVignettePlayback(playback, 0.9);
  const stopping = playback.instances.get('lead').facing;
  assert.equal(stopping.stepDistance, 0);
  assert.equal(stopping.direction, 'left');
  const atStop = facingStepOffset(stopping, playback.time);
  assert.ok(atStop > 0);
  updateVignettePlayback(playback, 0.05);
  const fading = playback.instances.get('lead').facing;
  const fadingOut = facingStepOffset(fading, playback.time);
  const fullWhileFading = facingStepOffset({ ...fading, envelope: { from: 1, to: 1, startedAt: playback.time, seconds: 0 } }, playback.time);
  assert.ok(Math.abs(fadingOut * 2 - fullWhileFading) < 0.001);
  assert.ok(fadingOut < atStop);
  updateVignettePlayback(playback, 0.05);
  assert.equal(facingStepOffset(playback.instances.get('lead').facing, playback.time), 0);
});

test('an omitted line uses the bubble color defaults', () => {
  const playback = createVignettePlayback({
    instances: [{ id: 'speaker' }],
    commands: [{ type: 'line', instanceId: 'speaker', text: '……', seconds: 1, wait: -1 }],
  });
  assert.equal(playback.line.borderColor, '#9b7142');
  assert.equal(playback.line.backgroundColor, '#1c140c');
  assert.equal(playback.line.backgroundOpacity, 0.6);
  assert.equal(playback.line.color, '#f4ead2');
  assert.equal(playback.line.outlineColor, '#1c140c');
  assert.equal(playback.line.outlineWidth, 2);
  assert.equal(playback.line.backgroundColor, playback.line.outlineColor);
});

test('vignette dialogue wraps English at spaces and keeps Japanese punctuation with the previous character', () => {
  const byLength = (sample) => sample.length;
  assert.deepEqual(wrapVignetteDialogue('hello world', byLength, 8), ['hello ', 'world']);
  assert.deepEqual(wrapVignetteDialogue('abcdef', byLength, 4), ['abcd', 'ef']);
  const polite = wrapVignetteDialogue('得意だから、一緒', byLength, 5);
  assert.deepEqual(polite, ['得意だか', 'ら、一緒']);
  assert.deepEqual(wrapVignetteDialogue('あいうね！？', byLength, 4), ['あいう', 'ね！？']);
  assert.deepEqual(wrapVignetteDialogue('あいうね！！', byLength, 4), ['あいう', 'ね！！']);
  assert.deepEqual(wrapVignetteDialogue('あいうえ…', byLength, 4), ['あいう', 'え…']);
  assert.deepEqual(wrapVignetteDialogue('あい……', byLength, 3), ['あ', 'い……']);
  assert.deepEqual(wrapVignetteDialogue('あい「う', byLength, 3), ['あい', '「う']);
  assert.deepEqual(wrapVignetteDialogue('あいうっ', byLength, 3), ['あい', 'うっ']);
  assert.deepEqual(wrapVignetteDialogue('あいうー', byLength, 3), ['あい', 'うー']);
});

test('vignette dialogue keeps every wrapped character', () => {
  const text = 'あ'.repeat(40);
  const lines = wrapVignetteDialogue(text, (sample) => sample.length * 28);
  assert.equal(lines.join(''), text);
  assert.ok(lines.length > 2);
  const oneLine = layoutVignetteBubble({ chipCenterX: 280, chipCenterY: 192, chipRadius: 56, width: 496, lines: 1, inkHeight: 24 });
  const twoLines = layoutVignetteBubble({ chipCenterX: 280, chipCenterY: 192, chipRadius: 56, width: 496, lines: 2, inkHeight: 24 });
  assert.equal(oneLine.height, 56);
  assert.equal(twoLines.height, 96);
  assert.equal(twoLines.height - oneLine.height, 40);
});

test('a speech bubble stays inside the frame padding and points at the speaker', () => {
  const shared = { chipCenterY: 192, chipRadius: 56, direction: 'down', width: 496, lines: 2 };
  const avery = layoutVignetteBubble({ ...shared, chipCenterX: 200 });
  const briar = layoutVignetteBubble({ ...shared, chipCenterX: 70 });
  for (const bubble of [avery, briar]) {
    assert.ok(bubble.x >= VIGNETTE_FRAME_PADDING);
    assert.ok(bubble.y >= VIGNETTE_FRAME_PADDING);
    assert.ok(bubble.x + bubble.width <= VIGNETTE_STAGE_WIDTH - VIGNETTE_FRAME_PADDING);
    assert.ok(bubble.y + bubble.height <= VIGNETTE_STAGE_HEIGHT - VIGNETTE_FRAME_PADDING);
    for (const point of bubble.tail) {
      assert.ok(point.x >= VIGNETTE_FRAME_PADDING);
      assert.ok(point.x <= VIGNETTE_STAGE_WIDTH - VIGNETTE_FRAME_PADDING);
      assert.ok(point.y >= VIGNETTE_FRAME_PADDING);
      assert.ok(point.y <= VIGNETTE_STAGE_HEIGHT - VIGNETTE_FRAME_PADDING);
    }
  }
  assert.equal(avery.x, briar.x);
  assert.ok(avery.tail[0].x > briar.tail[0].x);
});
