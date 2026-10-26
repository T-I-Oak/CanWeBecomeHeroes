import { GAME_AREAS } from '../../src/game/GameAreas.js';
import { getWarehouseItemCapacity } from '../../src/game/WarehouseCapacity.js';

export function warehouseLayout(area, radius) {
  const layouts = [false, true].map(transpose => {
    const points = [];
    const width = transpose ? area.height : area.width;
    const height = transpose ? area.width : area.height;
    for (let row = 0; radius + row * radius * Math.sqrt(3) <= height - radius + 1e-8; row++) {
      for (let x = radius + (row % 2) * radius; x <= width - radius + 1e-8; x += radius * 2) {
        const y = radius + row * radius * Math.sqrt(3);
        points.push({ x: area.x + (transpose ? y : x), y: area.y + (transpose ? x : y) });
      }
    }
    return points;
  });
  return layouts[0].length >= layouts[1].length ? layouts[0] : layouts[1];
}

export function targetItemCount(capacity, initial, fraction) {
  const target = fraction === null ? initial : Math.round(capacity * fraction);
  if (!Number.isInteger(target) || target < initial || target > capacity) throw new RangeError('Invalid warehouse target');
  return target;
}

export function distribution(values) {
  if (!values.length) return null;
  const sorted = values.toSorted((a, b) => a - b);
  const percentile = p => sorted[Math.floor((sorted.length - 1) * p)];
  return { n: sorted.length, mean: sorted.reduce((a, b) => a + b, 0) / sorted.length,
    p50: percentile(.5), p95: percentile(.95), p99: percentile(.99), max: sorted.at(-1) };
}

export function summarizeFrames(intervals, rows, seconds) {
  if (!intervals.length || !rows.length || !(seconds > 0)) throw new Error('Empty performance sample');
  return { intervals: distribution(intervals), over33: intervals.filter(x => x > 1000 / 30).length / intervals.length,
    over50: intervals.filter(x => x > 50).length / intervals.length,
    ticksPerSecond: (rows.at(-1).tick - rows[0].tick) / seconds };
}

export const chipCases = [];
for (const cpu of [1, 4]) {
  for (const fraction of [null, .25, .5, .75, 1]) {
    const level = fraction === null ? 'normal' : Math.round(fraction * 100);
    chipCases.push({ name: `chips-${level}-cpu${cpu}`, scene: 'idle', chipFixture: true, fraction, cpu, dpr: 1 });
  }
  for (const fraction of [null, 1]) {
    const level = fraction === null ? 'normal' : '100';
    for (const mode of ['paused', 'drag']) chipCases.push({ name: `chips-${level}-${mode}-cpu${cpu}`,
      scene: 'idle', chipFixture: true, fraction, cpu, dpr: 1, chipMode: mode });
  }
}
chipCases.push({ name: 'chips-normal-no-probe-cpu4', scene: 'idle', chipFixture: true, fraction: null, cpu: 4, dpr: 1, measured: false });
chipCases.push({ name: 'chips-normal-desktop-cpu4', scene: 'idle', chipFixture: true, fraction: null, cpu: 4, dpr: 1, width: 1280, height: 900 });
for (const cpu of [1, 4]) for (const fraction of [null, 1]) chipCases.push({
  name: `chips-${fraction === null ? 'normal' : '100'}-implementation-cpu${cpu}`, scene: 'idle', chipFixture: true,
  fraction, cpu, dpr: 1, chipPaired: 'implementation',
});
for (const option of ['no-probe', 'pairs', 'draw', 'moving', 'desktop']) {
  chipCases.push({ name: `chips-100-${option}-cpu4`, scene: 'idle', chipFixture: true, fraction: 1, cpu: 4, dpr: 1,
    measured: option !== 'no-probe', chipMode: option === 'moving' ? 'moving' : undefined,
    chipPaired: ['pairs', 'draw'].includes(option) ? option : undefined,
    ...(option === 'desktop' ? { width: 1280, height: 900 } : {}) });
}

export async function prepareChipFixture(page, config) {
  const area = GAME_AREAS.warehouse;
  const capacity = getWarehouseItemCapacity();
  const points = warehouseLayout(area, 37.5);
  const initial = await page.evaluate(() => __session.controller.getWarehouseItemCount());
  const target = targetItemCount(capacity, initial, config.fraction);
  return page.evaluate(({ initial, target, capacity, points, area }) => {
    const s = __session;
    s.clock.paused = true;
    __perf.reseed();
    // Fixed preconditioning, independent of navigation and requestAnimationFrame timing.
    s.clock.tick = 600;
    s.enemySpawn.update(s.clock.tick);
    s.stageController.update();
    while (s.controller.getWarehouseItemCount() < target) {
      if (!s.controller.addToWarehouse(s.makeItem())) throw new Error('Warehouse rejected fixture item');
    }
    const items = [...s.controller.entities.values()].filter(e => e.chip.type === 'item' && e.chip.bounds?.x === area.x && !e.isStored);
    items.forEach((e, i) => Object.assign(e.chip, points[i], { height: 0, verticalVelocity: 0, tilt: 0, tiltVelocity: 0,
      step: null, rise: null, impact: 0, impactOnLanding: false }));
    for (let i = 0; i < 300; i++) s.board.update(1 / 60);
    s.stageController.battleSystem.update({ heroes: s.controller.getHeroes(), enemies: s.controller.getEnemies(), tick: s.clock.tick, tickDelta: 0 });
    s.stageController.update();
    s.camera.zoom = Math.min(s.camera.maxZoom, s.camera.viewport.width / (area.width + 160));
    s.camera.centerOnWorldPoint({ x: area.x + area.width / 2, y: area.y + area.height / 2 });
    s.controller.clearSelection();
    s.clock.pauseReasons.clear();
    __perf.chipFixture = { capacity, initial, target, sourceId: items[0].chip.id };
    return __perf.chipFixture;
  }, { initial, target, capacity, points, area });
}

export async function chipSnapshot(page) {
  return page.evaluate(() => {
    const s = __session;
    return { ...__perf.chipFixture, items: s.controller.getWarehouseItemCount(), chips: s.board.chips.length,
      tick: s.clock.tick, speed: s.clock.speed, paused: s.clock.isPaused, stage: s.stageController.state,
      pending: s.stageController.enemySpawn.pending.length, enemies: s.controller.getEnemies().map(e => e.nameKey),
      camera: { x: s.camera.x, y: s.camera.y, zoom: s.camera.zoom },
      imageLevels: __perf.imageLevels(),
      unsettled: s.board.chips.filter(c => !c.isSettled).length,
      positions: s.board.chips.map(c => ({ id: c.id, type: c.type, x: c.x, y: c.y, height: c.height })),
      pairCandidatesPerScan: s.board.chips.length * (s.board.chips.length - 1) / 2 };
  });
}

export async function exerciseChipInput(page, seconds, mode) {
  if (mode === 'moving') {
    const end = Date.now() + seconds * 1000;
    while (Date.now() < end) {
      await page.evaluate(() => {
        const s = __session;
        const chip = s.board.chips.find(c => c.id === __perf.chipFixture.sourceId);
        s.board.moveTo(chip, chip.x + (chip.x > chip.bounds.x + chip.bounds.width / 2 ? -200 : 200), chip.y + 80);
      });
      await page.waitForTimeout(1000);
    }
    return [];
  }
  const source = await page.evaluate(() => {
    const s = __session;
    const c = s.board.chips.find(c => c.id === __perf.chipFixture.sourceId);
    const bounds = document.querySelector('#chip-canvas').getBoundingClientRect();
    return { x: (c.x - s.camera.x) * s.camera.zoom + bounds.left,
      y: (c.y - s.camera.y) * s.camera.zoom + bounds.top };
  });
  await page.mouse.move(source.x, source.y);
  await page.mouse.down();
  const end = Date.now() + seconds * 1000;
  let step = 0;
  const observations = [];
  while (Date.now() < end) {
    const x = source.x + 35 + (step++ % 10) * 3;
    const y = source.y + 45;
    // Install before CDP dispatch: includes delivery and ends after guide draw submission.
    await page.evaluate(() => {
      __perf.inputPending = { sent: performance.now(), event: null };
    });
    await page.mouse.move(x, y);
    await page.waitForFunction(() => __perf.inputResult !== null);
    observations.push(await page.evaluate(() => { const r = __perf.inputResult; __perf.inputResult = null; return r; }));
    await page.waitForTimeout(50);
  }
  await page.mouse.up();
  if (!observations.length || observations.some(o => !o.selected || !o.hoverMatches)) throw new Error('Drag source/guide mismatch');
  return observations;
}
