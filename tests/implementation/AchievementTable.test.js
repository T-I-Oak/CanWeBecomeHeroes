import test from 'node:test';
import assert from 'node:assert/strict';
import { createAchievementTable } from '../../src/app/AchievementTable.js';

class Node {
  constructor(tag) { this.tagName = tag; this.children = []; this.style = {}; }
  set textContent(value) { this.text = value; this.children = []; }
  get textContent() { return this.text; }
  append(...nodes) { this.children.push(...nodes); }
}
const entry = (categoryId, label) => ({ categoryId, category: `category-${categoryId}`, label,
  condition: 'a < b & c', gradeLabel: 'E', comment: 'Keep working.', updated: false,
  progressLabel: '3 / 5', progress: { current: 3, target: 5, ratio: .6 } });

test('result mode draws supplied order, merges only adjacent categories, and marks updated grades', t => {
  const old = globalThis.document;
  globalThis.document = { createElement: tag => new Node(tag) };
  t.after(() => { globalThis.document = old; });
  const entries = [entry('a','first'), entry('a','second'), entry('b','third'), entry('a','fourth')];
  entries[1].updated = true;
  const before = structuredClone(entries);
  const table = createAchievementTable({ mode:'result', entries, headings:{category:'Category',item:'Item',grade:'Grade',comment:'Comment'} });
  assert.deepEqual(table.children[0].children[0].children.map(c=>c.textContent),['Category','Item','Grade','Comment']);
  const rows = table.children[1].children;
  assert.equal(rows[0].children[0].rowSpan,2);
  assert.equal(rows[1].children.length,3);
  assert.equal(rows[2].children[0].rowSpan,1);
  assert.equal(rows[3].children[0].rowSpan,1);
  assert.deepEqual(rows.map(r=>r.children.find(c=>c.className==='AchievementTable__Item').textContent),['first','second','third','fourth']);
  assert.match(rows[1].children[1].className,/state-updated/);
  assert.equal(rows[0].children[2].textContent,'E');
  assert.equal(rows[0].children[3].textContent,'Keep working.');
  assert.equal(rows[0].children[1].children.length,0);
  assert.deepEqual(entries,before);
});

test('record exposes conditions while toast draws only one label and grade', t => {
  const old = globalThis.document;
  globalThis.document = { createElement: tag => new Node(tag) };
  t.after(() => { globalThis.document = old; });
  const record = createAchievementTable({mode:'record',entries:[entry('a','<example>')]});
  const item = record.children[1].children[0].children[1];
  assert.equal(item.textContent,'<example>');
  assert.equal(item.children.length,0);
  const row = record.children[1].children[0];
  assert.equal(row.children.length,5);
  assert.equal(row.children[3].textContent,'a < b & c');
  assert.equal(row.children[4].textContent,'3 / 5');
  assert.equal(row.children[4].children[0].children[0].style.width,'60%');
  const toast = createAchievementTable({mode:'toast',entries:[entry('a','Title')]});
  assert.equal(toast.children.length,1);
  assert.deepEqual(toast.children[0].children[0].children.map(c=>c.textContent),['Title','E']);
  assert.throws(()=>createAchievementTable({mode:'toast',entries:[]}),/one entry/);
  assert.throws(()=>createAchievementTable({mode:'unknown',entries:[]}),/Unknown/);
});
