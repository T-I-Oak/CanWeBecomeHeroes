import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const bootstrap = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
function start() {
  const listeners = new Map();
  const documentListeners = new Map();
  const shell = { hidden: false };
  const notice = { hidden: true };
  let retry;
  let ready = false;
  let reloads = 0;
  const errors = [];
  const window = { addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) };
  const document = {
    querySelector: () => shell,
    getElementById: id => id === 'startup-error' ? (ready ? notice : null) : { addEventListener: (_, fn) => { retry = fn; } },
    addEventListener: (name, fn) => documentListeners.set(name, fn),
  };
  runInNewContext(bootstrap, { window, document, location: { reload: () => reloads++ }, console: { error: error => errors.push(error) } });
  return { window, listeners, shell, notice, errors, domReady() { ready = true; documentListeners.get('DOMContentLoaded')(); }, retry() { retry(); }, get reloads() { return reloads; } };
}

test('a failed startup script before DOM readiness still exposes Retry after the document arrives', () => {
  const app = start();
  app.listeners.get('error')({ target: { src: '/assets/index.js', matches: () => true } });
  app.window.gameStartup.complete();
  app.domReady();
  assert.equal(app.shell.hidden, true);
  assert.equal(app.notice.hidden, false);
  app.retry();
  assert.equal(app.reloads, 1);
  assert.equal(app.errors.length, 1);
});

test('all initialization failures use the startup screen, and later errors retain their original exception', () => {
  const app = start();
  app.domReady();
  const failure = new Error('image decode or storage initialization failed');
  app.window.gameStartup.fail(failure);
  assert.equal(app.notice.hidden, false);
  assert.equal(app.errors[0], failure);
  const running = start();
  running.domReady();
  running.window.gameStartup.complete();
  assert.equal(running.listeners.has('error'), false);
  assert.throws(() => running.window.gameStartup.fail(failure), error => error === failure);
  assert.equal(running.notice.hidden, true);
});
