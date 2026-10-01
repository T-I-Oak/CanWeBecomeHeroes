import test from 'node:test';
import assert from 'node:assert/strict';
import { getHeroDirectionIndicatorAtPoint, getHeroDirectionIndicators } from '../../src/game/HeroDirectionIndicator.js';

function createCamera({ x = 0, y = 0, zoom = 1, width = 400, height = 300 } = {}) {
  return { x, y, zoom, viewport: { width, height } };
}

function createHero(id, x, y, fillColor = '#d2a4c8') {
  return {
    id,
    currentArea: 'battle',
    stamina: 1,
    maximums: { stamina: 3 },
    chip: { x, y, fillColor, centerPath: `/assets/heroes/${id}.png` },
  };
}

test('an on-screen Hero has no direction indicator', () => {
  assert.deepEqual(getHeroDirectionIndicators([createHero('one', 200, 150)], createCamera()), []);
});

test('a stamina-full Hero in preparation marks its direction indicator as ready', () => {
  const hero = createHero('one', 900, 150);
  hero.currentArea = 'preparation';
  hero.stamina = 3;

  assert.equal(getHeroDirectionIndicators([hero], createCamera())[0].staminaReady, true);
});

test('off-screen Heroes are placed at the matching viewport edge and retain their area color', () => {
  const indicators = getHeroDirectionIndicators([
    createHero('right', 900, 150, '#aabbcc'),
    createHero('top', 200, -200),
    createHero('diagonal', 900, 700),
  ], createCamera());
  const right = indicators.find(({ hero }) => hero.id === 'right');
  const top = indicators.find(({ hero }) => hero.id === 'top');
  const diagonal = indicators.find(({ hero }) => hero.id === 'diagonal');

  assert.equal(right.color, '#aabbcc');
  assert.ok(right.x > 350);
  assert.ok(top.y < 60);
  assert.ok(diagonal.x > 300 && diagonal.y > 220);
});

test('nearby off-screen Heroes are separated while remaining inside the viewport', () => {
  const camera = createCamera();
  const indicators = getHeroDirectionIndicators([
    createHero('one', 900, 150),
    createHero('two', 900, 151),
    createHero('three', 900, 152),
  ], camera);

  assert.equal(indicators.length, 3);
  indicators.forEach((indicator) => {
    assert.ok(indicator.x >= indicator.radius);
    assert.ok(indicator.x <= camera.viewport.width - indicator.radius);
    assert.ok(indicator.y >= indicator.radius);
    assert.ok(indicator.y <= camera.viewport.height - indicator.radius);
  });
  assert.ok(new Set(indicators.map(({ x, y }) => `${x.toFixed(2)}:${y.toFixed(2)}`)).size > 1);
});

test('hit testing returns the touched indicator only', () => {
  const indicator = getHeroDirectionIndicators([createHero('one', 900, 150)], createCamera())[0];
  assert.equal(getHeroDirectionIndicatorAtPoint([indicator], { x: indicator.x, y: indicator.y }), indicator);
  assert.equal(getHeroDirectionIndicatorAtPoint([indicator], { x: indicator.x - indicator.radius - 1, y: indicator.y }), null);
  assert.equal(getHeroDirectionIndicatorAtPoint([indicator]), null);
});
