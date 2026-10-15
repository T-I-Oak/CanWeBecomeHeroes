import test from 'node:test';
import assert from 'node:assert/strict';
import AchievementToast from '../../src/app/AchievementToast.js';

class Element {
  constructor(tagName) {
    this.tagName = tagName; this.children = []; this.style = {}; this.scrollHeight = 36;
    this.className = ''; this.attributes = {};
    this.classList = {
      add: name => { this.className += ` ${name}`; },
      toggle: (name, enabled) => {
        this.className = this.className.split(' ').filter(value => value !== name).join(' ');
        if (enabled) this.className += ` ${name}`;
      },
    };
  }
  append(...children) { children.forEach(child => { child.parent = this; this.children.push(child); }); }
  replaceChildren(...children) { this.children = []; this.append(...children); }
  setAttribute(name, value) { this.attributes[name] = value; }
  remove() { this.parent.children = this.parent.children.filter(child => child !== this); }
  querySelector(tag) {
    for (const child of this.children) {
      if (child.tagName === tag) return child;
      const match = child.querySelector(tag);
      if (match) return match;
    }
    return null;
  }
}
function setup(t, height = 720) {
  const previous = { document: globalThis.document, window: globalThis.window };
  globalThis.document = { createElement: tag => new Element(tag), body: new Element('body'), documentElement: { lang: 'ja' } };
  globalThis.window = { innerWidth: 864, innerHeight: height };
  t.after(() => Object.assign(globalThis, previous));
  return new AchievementToast({ textRepository: { getLabel: () => 'アチーブメント達成' } });
}
const change = (oldGrade = 0, newGrade = 6) => ({ id: 'pair-start:Avery|Briar', oldGrade, newGrade });

test('toast animates old to latest grade and keeps independent rows and expiration times', t => {
  const toast = setup(t);
  toast.enqueue([change()]);
  toast.update(9000);
  assert.equal(toast.entries.length, 1, 'new entries do not inherit time before admission');
  const first = toast.entries[0];
  assert.equal(first.grade.textContent, 'E');
  toast.update(500);
  assert.equal(first.grade.textContent, 'E');
  assert.ok(Number(first.grade.style.transform.match(/[\d.]+/)[0]) > 1);
  assert.equal(first.grade.tagName, 'span');
  assert.equal(first.cells[1].content.style.transform, undefined, 'the cell carrying the rules stays stationary');
  assert.equal(first.cells[1].content.children[0], first.grade);
  toast.update(100);
  assert.equal(first.grade.textContent, 'C+');
  assert.match(first.grade.className, /state-updated/);
  toast.enqueue([change(4, 5)]);
  toast.update(1000);
  assert.equal(toast.entries.length, 2);
  assert.equal(toast.entries[1].grade.textContent, 'C-');
  toast.update(2300);
  assert.ok(parseFloat(first.cells[0].clip.style.height) < 36);
  toast.update(201);
  assert.equal(toast.entries.length, 1);
  toast.update(1600);
  assert.equal(toast.entries.length, 0);
  assert.equal(toast.heading.style.height, '0px');
});

test('toast waits at capacity and during modals, then disposes all notifications', t => {
  const toast = setup(t, 720);
  toast.enqueue([change(), change(4, 5), change(5, 6)]);
  document.createElement = tag => { const element = new Element(tag); element.scrollHeight = 100; return element; };
  toast.update(100, true);
  assert.equal(toast.pending.length, 3);
  assert.equal(toast.container.hidden, true);
  toast.update(0);
  assert.equal(toast.entries.length, 1);
  assert.equal(toast.pending.length, 2);
  toast.update(500);
  const age = toast.entries[0].age;
  toast.update(10000, true);
  assert.equal(toast.entries[0].age, age);
  toast.update(4000);
  assert.equal(toast.entries.length, 1);
  assert.equal(toast.pending.length, 1);
  assert.equal(toast.entries[0].grade.textContent, 'C-');
  toast.dispose();
  toast.enqueue([change()]);
  toast.update(1000);
  assert.equal(toast.entries.length, 0);
  assert.equal(toast.pending.length, 0);
  assert.equal(document.body.children.length, 0);
});

test('toast shares ending scale and limits rendered height to thirty percent after rotation', t => {
  const toast = setup(t, 667);
  window.innerWidth = 375;
  toast.enqueue(Array.from({ length: 20 }, () => change()));
  toast.update(0);
  const portraitScale = (375 - 24) / 840;
  assert.equal(toast.container.style.transform, `scale(${portraitScale})`);
  assert.ok((28 + toast.entries.length * 36) * portraitScale <= 667 * .3);
  const portraitCount = toast.entries.length;
  window.innerWidth = 667;
  window.innerHeight = 375;
  toast.update(500);
  const landscapeScale = (375 - 24) / 600;
  assert.equal(toast.container.style.transform, `scale(${landscapeScale})`);
  assert.ok((28 + toast.entries.length * 36) * landscapeScale <= 375 * .3);
  assert.ok(toast.entries.length < portraitCount);
  assert.equal(toast.entries.length + toast.pending.length, 20);
});
