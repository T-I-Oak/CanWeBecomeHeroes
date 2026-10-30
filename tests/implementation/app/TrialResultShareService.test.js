import test from 'node:test';
import assert from 'node:assert/strict';
import { createTrialResultShareText, shareTrialResultImage } from '../../../src/app/TrialResultShareService.js';
import GameTextRepository from '../../../src/game/GameTextRepository.js';
import resource from '../../../src/game/readGameText.js';

const blob = new Blob(['image'], { type: 'image/png' });
function environment(navigatorRef = {}) {
  const events = [];
  return {
    events, navigatorRef, FileCtor: File,
    ClipboardItemCtor: class { constructor(data) { this.data = data; } },
  };
}

test('approved result messages use the public URL, title and both hashtags', () => {
  const texts = language => {
    const repository = new GameTextRepository();
    repository.resource = { ui: Object.fromEntries(Object.entries(resource.ui).map(([id, value]) => [id, value['lang-store'][language]])) };
    return repository;
  };
  for (const [type, message] of Object.entries({
    certificate: '勇者認定試験に合格しました！',
    'failure-notice': '勇者認定試験に挑戦しました！',
    'challenge-notice': '実力判定試験を終えました！',
  })) {
    assert.equal(createTrialResultShareText(type, texts('ja')), `【Can We Become Heroes?】\n${message}\nhttps://t-i-oak.github.io/CanWeBecomeHeroes/\n#CanWeBecomeHeroes #GameWorksOAK`);
    assert.doesNotMatch(createTrialResultShareText(type, texts('en')), /試験/);
  }
  assert.throws(() => createTrialResultShareText('unknown', texts('ja')), RangeError);
});

test('file sharing passes PNG and text without downloading', async () => {
  let shared;
  const env = environment({ canShare: ({ files }) => files[0].type === 'image/png', share: async payload => { shared = payload; } });
  assert.equal(await shareTrialResultImage(blob, 'result text', env), 'shared');
  assert.equal(shared.title, 'Can We Become Heroes?');
  assert.equal(shared.text, 'result text');
  assert.equal(await shared.files[0].text(), 'image');
  assert.equal(env.events.length, 0);
});

test('user cancellation neither downloads nor reports failure', async () => {
  const env = environment({ canShare: () => true, share: async () => { throw new DOMException('cancelled', 'AbortError'); } });
  assert.equal(await shareTrialResultImage(blob, 'text', env), 'cancelled');
  assert.deepEqual(env.events, []);
});

test('desktop copies the PNG even when native file sharing is available', async () => {
  for (const userAgent of ['Windows NT 10.0', 'Macintosh', 'X11; Linux x86_64']) {
    let copied;
    const env = environment({ userAgent, canShare: () => true,
      share: () => assert.fail('desktop must not open native sharing'),
      clipboard: { write: async items => { copied = items; } } });
    assert.equal(await shareTrialResultImage(blob, 'text', env), 'copied');
    assert.equal(copied[0].data['image/png'], blob);
  }
});

test('Android and iPad desktop user agents use native sharing', async () => {
  for (const device of [{ userAgent: 'Linux; Android 14' }, { userAgent: 'Macintosh', maxTouchPoints: 5 }, { userAgent: 'iPad' }]) {
    let called = false;
    const env = environment({ ...device, canShare: () => true, share: async () => { called = true; } });
    assert.equal(await shareTrialResultImage(blob, 'text', env), 'shared');
    assert.equal(called, true);
  }
});

test('unsupported mobile sharing and unavailable desktop clipboard report failures', async () => {
  await assert.rejects(shareTrialResultImage(blob, 'text', environment({ userAgent: 'iPhone' })), /sharing is unavailable/);
  await assert.rejects(shareTrialResultImage(blob, 'text', environment({ userAgent: 'Windows NT 10.0' })), /clipboard is unavailable/);
});

test('clipboard and native share failures propagate for the retry UI', async () => {
  const failure = new Error('failed');
  const env = environment({ canShare: () => true, share: async () => { throw failure; } });
  await assert.rejects(shareTrialResultImage(blob, 'text', env), failure);
  assert.deepEqual(env.events, []);
  const desktop = environment({ userAgent: 'Windows NT 10.0', clipboard: { write: async () => { throw failure; } } });
  await assert.rejects(shareTrialResultImage(blob, 'text', desktop), failure);
});
