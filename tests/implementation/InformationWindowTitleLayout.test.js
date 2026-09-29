import test from 'node:test';
import assert from 'node:assert/strict';
import { titleActionClearance } from '../../src/app/InformationWindowTitleLayout.js';

test('a centered title stays on one line when it does not meet the header buttons', () => {
  const fit = titleActionClearance(
    { left: 80, right: 280, top: 48, bottom: 76, width: 200 },
    { left: 300, right: 400, top: 12, bottom: 44 },
    320,
  );

  assert.equal(fit.whiteSpace, 'nowrap');
  assert.equal(fit.maxWidth, '');
});

test('a title that meets the header buttons wraps before those buttons', () => {
  const fit = titleActionClearance(
    { left: 80, right: 360, top: 20, bottom: 48, width: 280 },
    { left: 300, right: 400, top: 12, bottom: 44 },
    320,
  );

  assert.equal(fit.whiteSpace, 'normal');
  assert.equal(fit.maxWidth, '212px');
});

test('a title below the buttons wraps across the header when it does not fit on one line', () => {
  const fit = titleActionClearance(
    { left: 80, right: 500, top: 50, bottom: 78, width: 420 },
    { left: 300, right: 400, top: 12, bottom: 44 },
    320,
  );

  assert.equal(fit.whiteSpace, 'normal');
  assert.equal(fit.maxWidth, '');
});

test('header button clearance uses the window scale when measuring the title width', () => {
  const fit = titleActionClearance(
    { left: 40, right: 180, top: 10, bottom: 24, width: 140 },
    { left: 150, right: 200, top: 6, bottom: 22 },
    160,
    0.5,
  );

  assert.equal(fit.maxWidth, '212px');
});
