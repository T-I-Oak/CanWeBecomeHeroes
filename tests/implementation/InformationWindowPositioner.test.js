import test from 'node:test';
import assert from 'node:assert/strict';
import InformationWindowPositioner from '../../src/app/InformationWindowPositioner.js';

test('information window positioner centers unanchored windows and keeps them on screen', () => {
  const positioner = new InformationWindowPositioner({ getViewport: () => ({ width: 400, height: 300 }) });

  assert.deepEqual(positioner.getPosition({ width: 100, height: 80 }, {}), { x: 150, y: 110 });
  assert.deepEqual(positioner.getPosition({ width: 100, height: 80 }, { position: { x: -50, y: 500 } }), { x: 12, y: 208 });
});

test('information window positioner places an anchor window on its available side', () => {
  const positioner = new InformationWindowPositioner({ getViewport: () => ({ width: 400, height: 300 }) });

  assert.deepEqual(positioner.getPosition({ width: 100, height: 80 }, { anchor: { x: 360, y: 150 } }), { x: 244, y: 126 });
});
