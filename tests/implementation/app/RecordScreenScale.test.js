import test from 'node:test';
import assert from 'node:assert/strict';
import { getRecordScreenLayout } from '../../../src/app/RecordScreenScale.js';

test('record content stops shrinking at 75 percent and uses logical width for horizontal scroll', () => {
  assert.deepEqual(getRecordScreenLayout(378), { scale: .75, width: 1080 });
  assert.deepEqual(getRecordScreenLayout(824), { scale: 824 / 1080, width: 1080 });
  assert.deepEqual(getRecordScreenLayout(1026), { scale: .95, width: 1080 });
  assert.deepEqual(getRecordScreenLayout(1200), { scale: 1, width: 1200 });
});
