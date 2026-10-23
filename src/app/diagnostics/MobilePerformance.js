import RenderExperiment from './RenderExperiment.js';
import { summarizeFrames } from './PerformanceStats.js';
import './mobile-performance.css';

const SAMPLE_MS = 6000;
const WARMUP_MS = 1000;
const MAX_FRAMES = 3600;
const PHASES = [
  ['frozen-unwrapped', '停止画面・計測用ラッパーなし', null, false],
  ['baseline-1', '停止画面・基準1', 'baseline', true],
  ['small-images', '事前縮小画像', 'smallImages', true],
  ['baseline-2', '停止画面・基準2', 'baseline', true],
  ['no-images', '画像描画を省略（模様背景は残す）', 'noImages', true],
  ['no-stroke', '輪郭線を省略', 'noStroke', true],
  ['no-clip', 'クリップを省略', 'noClip', true],
  ['no-paint', 'Canvas描画命令を省略', 'noPaint', true],
  ['baseline-3', '停止画面・基準3', 'baseline', true],
];

function createPanel(version) {
  const root = document.createElement('aside');
  root.className = 'PerformancePanel';
  root.innerHTML = `<details open><summary>性能測定 v${version}</summary>
    <p>遅くなる通常画面で開始してください。約80秒間、操作を止めて比較します。
    途中で画像や線が消えるのは調査用です。画面の向き・zoomは変えず、他のアプリへ切り替えないでください。</p>
    <button type="button" data-action="start">測定開始</button>
    <button type="button" data-action="cancel" disabled>中止</button>
    <button type="button" data-action="save" disabled>結果を保存</button>
    <button type="button" data-action="copy" disabled>結果をコピー</button>
    <textarea aria-label="測定結果 JSON" readonly hidden></textarea></details>
    <p role="status" data-status>通常画面へ進んでから測定開始を押してください。</p>`;
  document.body.append(root);
  return root;
}

export function installMobilePerformance({ trial, clock, camera, assets, canvases, version, getImageLevelDiagnostics }) {
  const panel = createPanel(version);
  const status = panel.querySelector('[data-status]');
  const buttons = Object.fromEntries([...panel.querySelectorAll('button')].map(button => [button.dataset.action, button]));
  const textarea = panel.querySelector('textarea');
  const errors = [];
  const longTasks = [];
  let observer;
  if (globalThis.PerformanceObserver?.supportedEntryTypes.includes('longtask')) {
    observer = new PerformanceObserver(list => {
      if (state.running) for (const entry of list.getEntries()) {
        if (longTasks.length < 500) longTasks.push({ start: entry.startTime, duration: entry.duration });
      }
    });
    observer.observe({ type: 'longtask' });
  }
  window.addEventListener('error', event => { if (errors.length < 30) errors.push(String(event.message)); });
  window.addEventListener('unhandledrejection', event => { if (errors.length < 30) errors.push(String(event.reason)); });
  let abortController;
  let report;
  let currentPhase;
  let phaseStart;
  let rows = [];
  let frame;
  let frameStart;
  let section;
  let sectionStart;
  let previous;
  let detailed = false;
  let experiment;
  const state = {
    running: false, frozen: false, frozenTime: undefined,
    begin(time) {
      if (!currentPhase) return;
      frameStart = performance.now();
      frame = {};
      if (previous !== undefined) frame.interval = time - previous;
      previous = time;
      section = undefined;
    },
    mark(name) {
      if (!currentPhase || !detailed) return;
      const now = performance.now();
      if (section) frame[section] = now - sectionStart;
      section = name; sectionStart = now;
    },
    end() {
      if (experiment?.capture) experiment.captureFrames = (experiment.captureFrames ?? 0) + 1;
      if (!currentPhase) return;
      const now = performance.now();
      if (section) frame[section] = now - sectionStart;
      frame.main = now - frameStart;
      if (rows.length < MAX_FRAMES) rows.push(frame);
    },
  };

  function snapshot() {
    if (!trial.controller) return { sessionEnded: true };
    const chips = trial.controller.board.chips;
    return { tick: clock.tick, paused: clock.isPaused, speed: clock.speed, chips: chips.length,
      imageLevels: getImageLevelDiagnostics(),
      heroes: trial.controller.getHeroes().length, enemies: trial.controller.getEnemies().length,
      informationWindows: document.querySelectorAll('.InformationWindow').length,
      camera: { x: camera.x, y: camera.y, zoom: camera.zoom },
      canvases: canvases.map(canvas => ({ id: canvas.id, width: canvas.width, height: canvas.height,
        cssWidth: canvas.clientWidth, cssHeight: canvas.clientHeight, contextAttributes: canvas.getContext('2d').getContextAttributes?.() ?? null })) };
  }

  function wait(ms) {
    const signal = abortController.signal;
    if (signal.aborted) return Promise.reject(signal.reason);
    return new Promise((resolve, reject) => {
      const onAbort = () => { clearTimeout(timer); reject(signal.reason); };
      const timer = setTimeout(() => { signal.removeEventListener('abort', onAbort); resolve(); }, ms);
      signal.addEventListener('abort', onAbort, { once: true });
    });
  }

  async function sample(id, label, detail) {
    status.textContent = `測定中：${label}`;
    await wait(WARMUP_MS);
    rows = []; previous = undefined; detailed = detail;
    const before = snapshot();
    currentPhase = id;
    phaseStart = performance.now();
    try { await wait(SAMPLE_MS); }
    finally {
      currentPhase = undefined;
      report.phases.push({ id, detailed: detail, wallMs: performance.now() - phaseStart,
        before, after: snapshot(), metrics: summarizeFrames(rows), rows, insufficientSamples: rows.length < 2,
        sampleLimitReached: rows.length === MAX_FRAMES });
    }
    if (!rows.length && errors.length) throw new Error('実行時エラーにより描画フレームを記録できませんでした。');
    if (snapshot().sessionEnded) throw new Error('測定中にゲームが終了しました。');
  }

  function rejectChangedEnvironment() {
    if (state.running) abortController.abort(new Error('画面の非表示・サイズ変更を検出したため中止しました。結果は途中まで保存できます。'));
  }
  document.addEventListener('visibilitychange', rejectChangedEnvironment);
  window.addEventListener('resize', rejectChangedEnvironment);
  // Prevent changes to the game state during comparisons, including settings and pointer input.
  const block = event => {
    if (state.running && !panel.contains(event.target)) { event.preventDefault(); event.stopImmediatePropagation(); }
  };
  for (const name of ['pointerdown', 'pointermove', 'pointerup', 'wheel', 'click']) {
    document.addEventListener(name, block, { capture: true, passive: false });
  }

  buttons.start.addEventListener('click', async () => {
    if (!trial.controller || !trial.update || document.querySelector('.ModalLayer.state-open, #tutorial-layer:not([hidden]), .InformationWindow')) {
      status.textContent = 'ステージ選択や説明を閉じ、通常画面で開始してください。';
      return;
    }
    state.running = true;
    abortController = new AbortController();
    errors.length = longTasks.length = 0;
    buttons.start.disabled = true; buttons.cancel.disabled = false;
    buttons.copy.disabled = buttons.save.disabled = true;
    textarea.hidden = true;
    panel.querySelector('details').open = false;
    report = { schema: 1, version, startedAt: new Date().toISOString(), completed: false,
      environment: { userAgent: navigator.userAgent, hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemoryGiB: navigator.deviceMemory ?? null, devicePixelRatio, screen: { width: screen.width, height: screen.height },
        viewport: { width: innerWidth, height: innerHeight }, visualViewportScale: visualViewport?.scale ?? null,
        canvasGPUAcceleration: 'unknown: not exposed by browser',
        jsHeap: performance.memory ? { used: performance.memory.usedJSHeapSize, limit: performance.memory.jsHeapSizeLimit } : null },
      notes: ['Times are milliseconds. Main/sections measure JS call duration, not GPU completion.',
        'Baseline uses the current image rendering policy; compare policy and version before comparing reports.',
        'small-images may make no replacements when the baseline already uses appropriately sized levels.',
        'Frozen phases skip simulation and visual updates; compare only within frozen phases.',
        'Image replacement adds cached images while retaining originals; this does not test memory savings.',
        'noImages leaves createPattern backgrounds. noPaint leaves DOM and Canvas path construction.',
        'Sections are consecutive, not per-API timings. Ablation effects are not additive.'],
      images: [...assets.images].map(([path, image]) => ({ path, width: image.naturalWidth, height: image.naturalHeight, ready: image.complete })),
      phases: [], errors, longTasks };
    try {
      await sample('live-minimal', '通常動作・最小限の計測', false);
      await sample('live-sections', '通常動作・区間ごとの計測', true);
      state.frozen = true;
      state.frozenTime = performance.now();
      clock.pause('performance-diagnostics');
      await sample(PHASES[0][0], PHASES[0][1], false);
      experiment = new RenderExperiment(canvases);
      experiment.capture = true;
      const captureStart = performance.now();
      await wait(250);
      experiment.capture = false;
      report.drawCalls = experiment.counts;
      report.captureMs = performance.now() - captureStart;
      report.captureFrames = experiment.captureFrames ?? 0;
      status.textContent = '比較用の縮小画像を準備中';
      const preparationStart = performance.now();
      report.resizedImages = await experiment.prepareImages();
      report.imagePreparationMs = performance.now() - preparationStart;
      for (const [id, label, mode, detail] of PHASES.slice(1)) {
        experiment.mode = mode;
        await sample(id, label, detail);
      }
      report.completed = true;
      status.textContent = '測定完了。結果を保存またはコピーしてください。通常表示へ戻しました。';
    } catch (error) {
      report.failure = String(error);
      status.textContent = `測定を終了しました：${error.message} 結果は保存できます。`;
    } finally {
      currentPhase = undefined;
      experiment?.dispose(); experiment = undefined;
      clock.resume('performance-diagnostics');
      state.frozen = false; state.frozenTime = undefined; state.running = false;
      report.endedAt = new Date().toISOString();
      observer?.takeRecords();
      buttons.start.disabled = false; buttons.cancel.disabled = true;
      buttons.copy.disabled = buttons.save.disabled = false;
      panel.querySelector('details').open = true;
      textarea.value = JSON.stringify(report, null, 2);
    }
  });
  buttons.cancel.addEventListener('click', () => abortController.abort(new Error('操作により中止しました。')));
  buttons.save.addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([textarea.value], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url;
    link.download = `mobile-performance-${version}-${Date.now()}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  });
  buttons.copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(textarea.value); status.textContent = '結果をコピーしました。'; }
    catch { textarea.hidden = false; textarea.select(); status.textContent = '自動コピーが利用できません。結果欄を選択してコピーしてください。'; }
  });
  return state;
}
