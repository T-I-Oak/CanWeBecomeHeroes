import test from 'node:test';
import assert from 'node:assert/strict';
import ChipContactPairs from '../../../src/chips/ChipContactPairs.js';

const chip = x => ({ x, y: 100, radius: 10, height: 0 });
const overlaps = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) < a.radius + b.radius;

function visitPairs(pairs, chips, visit) {
  const rows = pairs.begin(chips);
  for (let i = 0; i < chips.length; i++) for (let j = i + 1; j < chips.length; j++) {
    if (rows !== null && !rows.get(i)?.includes(j)) continue;
    if (visit(chips[i], chips[j], i, j)) pairs.record(i, j);
  }
  pairs.finish();
}

test('settled unrelated chips stop generating pairs; a changed chip scans others once', () => {
  const pairs = new ChipContactPairs();
  const chips = Array.from({ length: 300 }, (_, i) => chip(i * 30));
  let calls = 0;
  const visit = (a, b) => { calls++; return overlaps(a, b); };
  visitPairs(pairs, chips, visit);
  assert.equal(calls, 44850);
  calls = 0; visitPairs(pairs, chips, visit); assert.equal(calls, 0);
  chips[150].x++;
  visitPairs(pairs, chips, visit); assert.equal(calls, 299);
  calls = 0;
  for (let i = 0; i < 5; i++) chips[i].x++;
  visitPairs(pairs, chips, visit); assert.equal(calls, 1485);
});

test('dense contacts use bounded retained state and recover when separated', () => {
  const pairs = new ChipContactPairs();
  const chips = Array.from({ length: 100 }, () => chip(100));
  visitPairs(pairs, chips, overlaps);
  assert.equal(pairs.dense, true);
  assert.equal(pairs.contacts.size, 0);
  let calls = 0;
  visitPairs(pairs, chips, (a, b) => { calls++; return overlaps(a, b); });
  assert.equal(calls, 4950);
  chips.forEach((c, i) => { c.x = 100 + i * 30; });
  visitPairs(pairs, chips, overlaps);
  calls = 0;
  visitPairs(pairs, chips, () => { calls++; return false; });
  assert.equal(calls, 0);
  visitPairs(pairs, [], overlaps);
  assert.equal(pairs.states.length, 0);
  assert.equal(pairs.contacts.size, 0);
});

test('overlapping pairs persist and height or eligibility changes revisit previously excluded pairs', () => {
  const pairs = new ChipContactPairs();
  const chips = [chip(100), chip(110), chip(300)];
  let calls = 0;
  const visit = (a, b) => { calls++; return !a.isPickupTarget && !b.isPickupTarget && overlaps(a, b); };
  visitPairs(pairs, chips, visit);
  calls = 0; visitPairs(pairs, chips, visit); assert.equal(calls, 1);
  chips[0].isPickupTarget = true;
  visitPairs(pairs, chips, visit);
  calls = 0; visitPairs(pairs, chips, visit); assert.equal(calls, 0);
  chips[0].isPickupTarget = false;
  visitPairs(pairs, chips, visit);
  calls = 0; visitPairs(pairs, chips, visit); assert.equal(calls, 1);
});

test('a separation discovers newly reached pairs on the next update', () => {
  const pairs = new ChipContactPairs();
  const chips = [chip(100), chip(110), chip(140), chip(500)];
  visitPairs(pairs, chips, overlaps);
  const visited = [];
  visitPairs(pairs, chips, (a, b, i, j) => {
    visited.push([i, j]);
    if (i === 0 && j === 1) b.x = 130;
    return overlaps(a, b);
  });
  assert.ok(!visited.some(([i, j]) => i === 1 && j === 2));
  assert.deepEqual(visited, visited.toSorted((a, b) => a[0] - b[0] || a[1] - b[1]));
  assert.equal(new Set(visited.map(p => p.join(':'))).size, visited.length);
  const next = [];
  visitPairs(pairs, chips, (a, b, i, j) => { next.push([i, j]); return overlaps(a, b); });
  assert.ok(next.some(([i, j]) => i === 1 && j === 2));
});

test('membership, order and radius edits invalidate candidate identities', () => {
  const pairs = new ChipContactPairs();
  const chips = [chip(100), chip(130), chip(500)];
  visitPairs(pairs, chips, overlaps);
  chips[0].radius = 40;
  let found = false;
  visitPairs(pairs, chips, (a, b) => { found ||= a === chips[0] && b === chips[1]; return overlaps(a, b); });
  assert.equal(found, true);
  chips.splice(1, 1, chip(105));
  let calls = 0;
  visitPairs(pairs, chips, (a, b) => { calls++; return overlaps(a, b); });
  assert.equal(calls, 3);
  chips.reverse(); calls = 0;
  visitPairs(pairs, chips, () => { calls++; return false; }); assert.equal(calls, 3);
});
