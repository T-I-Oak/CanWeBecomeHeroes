import { execFileSync } from 'node:child_process';

// Local investigation build only. Never loaded by the application's Vite config.
export const INCREMENTAL_BASELINE = 'cb55fad55e49045630aa0456c2858dcf9c5bf274';
export const CHIP_BASELINE = 'a6a4fa2cf0c0f438737e517f61726c533b95995f';

function baselineChipClass(file, name) {
  const source = execFileSync('git', ['show', `${CHIP_BASELINE}:src/chips/${file}.js`], { encoding: 'utf8' });
  return source.slice(source.indexOf('export default class ')).replace(`export default class ${file}`, `class ${name}`);
}

function baselineClass(file, name) {
  const source = execFileSync('git', ['show', `${INCREMENTAL_BASELINE}:src/app/${file}.js`], { encoding: 'utf8' });
  return source.slice(source.indexOf('export default class ')).replace(`export default class ${file}`, `class ${name}`);
}
export function replaceOnce(source, from, to) {
  if (source.split(from).length !== 2) throw new Error(`Performance marker must occur once: ${from}`);
  return source.replace(from, to);
}

const wrappers = {
  'chips/ChipBoard.js': ['ChipBoard', ['update', 'getRenderChips', 'updateOverlapLayers', 'resolveGroundOverlaps', 'pushOverlaps']],
  'game/HeroItemInteractionController.js': ['HeroItemInteractionController', ['update', 'getEntityAt', 'updateSelectionHover']],
  'chips/ChipRenderer.js': ['ChipRenderer', ['drawBody', 'drawEffects']],
  'app/InformationWindowManager.js': ['InformationWindowManager', ['refreshDynamicEntries']],
  'app/InformationWindowLayer.js': ['InformationWindowLayer', ['render']],
  'app/TimeSettingsController.js': ['TimeSettingsController', ['updateStatus']],
  'app/TitleChipRain.js': ['TitleChipRain', ['update', 'draw']],
};

const drawFunctions = {
  'app/FacilityNameplateRenderer.js': ['drawFacilityNameplates'],
  'app/AreaNameplateRenderer.js': ['drawAreaNameplates'],
  'app/WarehouseMetadataRenderer.js': ['drawWarehouseMetadata'],
  'app/FacilitySlotRenderer.js': ['drawFacilitySlots'],
  'app/ShopPanelPresenter.js': ['drawShopPanel'],
  'app/GuildPanel.js': ['drawGuildPanel'],
  'app/HeroStatusPanelRenderer.js': ['drawPreparationHeroPanel', 'drawTrainingStatusPanel'],
};

export function performanceBuildPlugin() {
  return {
    name: 'local-performance-investigation',
    enforce: 'pre',
    transform(code, id) {
      const path = id.replaceAll('\\', '/');
      code = code.replaceAll('\r\n', '\n');
      if (process.env.PERF_COMPARE_CHIPS === '1' && path.endsWith('/src/chips/ChipBoard.js')) {
        code += `\n${baselineChipClass('ChipBoard', 'LegacyChipBoard').replaceAll('distanceBetween(', 'legacyDistanceBetween(')}
          function legacyDistanceBetween(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
          globalThis.__perf.wrap(LegacyChipBoard.prototype, 'ChipBoard', ['updateOverlapLayers', 'resolveGroundOverlaps', 'pushOverlaps']);
          globalThis.__perf.legacyChipBoard = LegacyChipBoard.prototype;`;
      }
      if (process.env.PERF_COMPARE_CHIPS === '1' && path.endsWith('/src/chips/ChipRenderer.js')) {
        code += `\n${baselineChipClass('ChipRenderer', 'LegacyChipRenderer')}
          globalThis.__perf.wrap(LegacyChipRenderer.prototype, 'ChipRenderer', ['drawBody']);
          globalThis.__perf.legacyChipDrawBody = LegacyChipRenderer.prototype.drawBody;`;
      }
      if (path.endsWith('/src/chips/ScaledImage.js')) {
        code += '\nglobalThis.__perf.imageLevels = getImageLevelDiagnostics;\n';
      }
      if (path.endsWith('/src/app/GameApp.js')) {
        code = replaceOnce(code, 'function render(time) {', 'function render(time) { globalThis.__perf.begin(time);');
        code = replaceOnce(code, '    requestAnimationFrame(render);', '    globalThis.__perf.endFrame(); requestAnimationFrame(render);');
      }
      if (path.endsWith('/src/app/InformationWindowLayer.js') && process.env.PERF_COMPARE_INCREMENTAL === '1') {
        const entity = baselineClass('EntityInformationRenderer', 'LegacyEntityInformationRenderer');
        let layer = baselineClass('InformationWindowLayer', 'LegacyInformationWindowLayer')
          .replace('new EntityInformationRenderer(', 'new LegacyEntityInformationRenderer(');
        layer = replaceOnce(layer, '    window.dataset.informationWindowId = entry.id;',
          "    window.classList.add('is-performance-legacy');\n    window.dataset.informationWindowId = entry.id;");
        code = `import { STATUS_KEYS } from '../game/TagCatalog.js';
          import { TAG_DISPLAY_GRID } from '../game/TagDisplayLayout.js';
          import { getVitalGaugeColor, STATUS_VISUALS } from '../game/StatusVisualCatalog.js';
          import { AREA_THEME } from '../game/AreaTheme.js';
          import { createInformationWindowUniqueSkillButton } from './InformationWindowUniqueSkillButton.js';
          import { getWeightFillRatio, WEIGHT_GAUGE_COLORS } from '../game/WeightVisual.js';
          import { createInformationElement } from './InformationWindowElementFactory.js';
          import { applyTagSkillVisual, createEquipmentImage, createStatusIcon, createTagIcon } from './InformationWindowVisualFactory.js';
          import { createInformationWindowChipPreview } from './InformationWindowChipPreview.js';
          ${code}\n${entity}\n${layer}
          const legacyStyle = document.createElement('style');
          legacyStyle.textContent = '.InformationWindow.is-performance-legacy { display: block; max-height: none; }'
            + '.InformationWindow.is-performance-legacy > .InformationWindow__Content { max-height: calc(100dvh - 24px); border-radius: 11px; }';
          document.head.append(legacyStyle);
          const incrementalRender = InformationWindowLayer.prototype.render;
          const legacyViews = new WeakMap();
          InformationWindowLayer.prototype.render = function(entries) {
            if (!globalThis.__perf.compareIncremental || globalThis.__perf.incrementalInformation) return incrementalRender.call(this, entries);
            let legacy = legacyViews.get(this);
            if (!legacy) {
              legacy = new LegacyInformationWindowLayer(this.element, this.manager, this.textRepository, this.entityRenderer.assets);
              legacyViews.set(this, legacy);
            }
            return legacy.render(entries);
          };`;
      }
      if (path.endsWith('/src/app/TrialSession.js')) {
        code = replaceOnce(code, '      informationWindows.closeInvalidEntries();\n      stageController.update();',
          '      informationWindows.closeInvalidEntries(); if (globalThis.__perf.compareBatching && !globalThis.__perf.batchInformation) informationWindows.refreshDynamicEntries();\n      stageController.update();');
        code = replaceOnce(code, '    if (simulationUpdated) informationWindows.refreshDynamicEntries();',
          '    if (simulationUpdated && (!globalThis.__perf.compareBatching || globalThis.__perf.batchInformation)) informationWindows.refreshDynamicEntries();');
        for (const marker of ['  const scenario = createRunScenario({ professionIds: selectedProfessionIds });',
          '    const choices = stageController.createStageChoices({ stageNumber });']) {
          code = replaceOnce(code, marker, `    if (globalThis.__perf.settledInformationScene) globalThis.__perf.reseed();\n${marker}`);
        }
        code = replaceOnce(code, '  openStageSelection(1);', `
          globalThis.__session = { board, controller, clock, camera, assets, informationWindows, stageController, tutorial, enemySpawn, renderer,
            makeItem: () => new ItemFactory().createWeapon({ weapon: 'sword', tags: ['valor', 'fire'],
              x: GAME_AREAS.warehouse.x + 50 + Math.random() * (GAME_AREAS.warehouse.width - 100),
              y: GAME_AREAS.warehouse.y + 50 + Math.random() * (GAME_AREAS.warehouse.height - 100) }) };
          openStageSelection(1);`);
        const sections = [
          ['simulation', '    achievementToast.update(', '    if (!trialRunFlow.recruitmentPlaybackPending) tutorial.check();\n    tutorial.update(time);'],
          ['visualUpdate', '    if (!trialRunFlow.recruitmentPlaybackPending) tutorial.check();\n    tutorial.update(time);', '    context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);'],
          ['surfaces', '    drawWorldSurfaces(context, assets, preparationHeroes.length);', '    const staminaPauseTargets = new Set('],
          ['chipDraw', '    renderChips.forEach((chip) => renderer.drawBody', '    drawOverheadStatuses('],
          ['overhead', '    drawOverheadStatuses(', '    combatEffects.draw(context, assets);'],
          ['effects', '    combatEffects.draw(context, assets);', '    context.restore();'],
          ['directions', '    heroDirectionIndicatorRenderer.draw(trial.getDirectionIndicators(), time / 1000);', '  };\n  return completed;'],
        ];
        for (const [name, start, end] of sections) {
          code = replaceOnce(code, start, `    globalThis.__perf.start('${name}');\n${start}`);
          code = replaceOnce(code, end, `    globalThis.__perf.stop('${name}');\n${end}`);
        }
        code = replaceOnce(code, '    drawWorldSurfaces(context, assets, preparationHeroes.length);',
          "    globalThis.__perf.start('background'); if (!globalThis.__perf.skip.has('background')) drawWorldSurfaces(context, assets, preparationHeroes.length); globalThis.__perf.stop('background');");
      }
      for (const [file, [name, methods]] of Object.entries(wrappers)) {
        if (path.endsWith(`/src/${file}`)) {
          code += `\nglobalThis.__perf.wrap(${name}.prototype, ${JSON.stringify(name)}, ${JSON.stringify(methods)});\n`;
        }
      }
      for (const [file, names] of Object.entries(drawFunctions)) {
        if (!path.endsWith(`/src/${file}`)) continue;
        for (const name of names) {
          code = replaceOnce(code, `export function ${name}(`, `function __original_${name}(`);
          code += `\nexport function ${name}(...args) { return globalThis.__perf.call('${name}', __original_${name}, args); }\n`;
        }
      }
      return { code, map: null };
    },
  };
}

// Serialized into the browser by Playwright before the investigation bundle runs.
export function installPerformanceProbe() {
  let seed = 54;
  Math.random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  const probe = globalThis.__perf = {
    compareBatching: false, batchInformation: true, compareIncremental: false, incrementalInformation: true,
    reseed() { seed = 54; },
    useLegacyChips(session, enabled) {
      const names = ['updateOverlapLayers', 'resolveGroundOverlaps', 'pushOverlaps', 'getPairKey'];
      this.modernChipMethods ??= Object.fromEntries(names.map(name => [name, session.board[name]]));
      this.modernChipDrawBody ??= session.renderer.drawBody;
      for (const name of names) session.board[name] = enabled ? this.legacyChipBoard[name] : this.modernChipMethods[name];
      session.renderer.drawBody = enabled ? this.legacyChipDrawBody : this.modernChipDrawBody;
    },
    enabled: false, recording: false, skip: new Set(), rows: [], intervals: [], current: {}, starts: {}, totals: {},
    begin(time) {
      if (this.recording && this.previous !== undefined && this.intervals.length < 20000) this.intervals.push(time - this.previous);
      this.previous = time;
      this.current = {};
      this.frameStart = performance.now();
    },
    start(name) { if (this.enabled && this.recording) this.starts[name] = performance.now(); },
    stop(name) {
      if (this.enabled && this.recording) this.current[name] = (this.current[name] ?? 0) + performance.now() - this.starts[name];
    },
    endFrame() {
      if (this.inputPending && this.inputPending.event !== null) {
        const end = performance.now();
        const s = globalThis.__session;
        const bounds = document.querySelector('#chip-canvas').getBoundingClientRect();
        const expected = s.camera.toWorld(this.inputPending.x - bounds.left, this.inputPending.y - bounds.top);
        const hover = s.controller.selection.hover;
        this.inputResult = { deliveryToDraw: end - this.inputPending.sent, eventToDraw: end - this.inputPending.event,
          selected: s.controller.selection.source?.chip.id === this.chipFixture?.sourceId,
          hoverMatches: Boolean(hover && Math.abs(hover.x - expected.x) < .001 && Math.abs(hover.y - expected.y) < .001) };
        this.inputPending = null;
      }
      if (!this.recording || this.rows.length >= 20000) return;
      const s = globalThis.__session;
      this.rows.push({ ...this.current, main: performance.now() - this.frameStart, phase: this.phase ?? 'whole',
        chips: s?.board.chips.length ?? 0, tick: s?.clock.tick ?? 0, speed: s?.clock.speed ?? 0,
        paused: s?.clock.isPaused ?? null, stage: s?.stageController.state ?? 'unobserved' });
    },
    wrap(prototype, className, names) {
      for (const name of names) {
        const original = prototype[name];
        if (typeof original !== 'function') throw new Error(`Missing measured method: ${className}.${name}`);
        const key = `${className}.${name}`;
        prototype[name] = function (...args) {
          if (probe.skip.has(key)) return;
          if (!probe.enabled || !probe.recording) return original.apply(this, args);
          const start = performance.now();
          const rendering = className === 'InformationWindowLayer';
          if (rendering) probe.renderingInformation = true;
          let result;
          try { result = original.apply(this, args); }
          finally { if (rendering) probe.renderingInformation = false; }
          const elapsed = performance.now() - start;
          probe.current[key] = (probe.current[key] ?? 0) + elapsed;
          probe.totals[key] = (probe.totals[key] ?? 0) + elapsed;
          probe.current[`${key}:calls`] = (probe.current[`${key}:calls`] ?? 0) + 1;
          return result;
        };
      }
    },
    call(key, original, args) {
      if (this.skip.has(key)) return;
      if (!this.enabled || !this.recording) return original(...args);
      const start = performance.now();
      const result = original(...args);
      this.current[key] = (this.current[key] ?? 0) + performance.now() - start;
      return result;
    },
    reset(enabled) { this.rows = []; this.intervals = []; this.totals = {}; this.previous = undefined; this.enabled = enabled; this.recording = true; },
  };
  probe.inputResult = null;
  globalThis.document?.addEventListener('pointermove', event => {
    if (probe.inputPending) Object.assign(probe.inputPending, { event: performance.now(), x: event.clientX, y: event.clientY });
  }, { capture: true });
  if (globalThis.document && globalThis.Element) {
    for (const [object, names] of [[document, ['createElement', 'createElementNS', 'createDocumentFragment']],
      [Element.prototype, ['getBoundingClientRect', 'replaceChildren', 'replaceWith', 'insertBefore']]]) {
      for (const name of names) {
        const original = object[name];
        object[name] = function(...args) {
          if (probe.renderingInformation && probe.recording && probe.enabled) {
            const key = `informationDOM.${name}`;
            probe.current[key] = (probe.current[key] ?? 0) + 1;
          }
          return original.apply(this, args);
        };
      }
    }
    const textContent = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
    Object.defineProperty(Node.prototype, 'textContent', { ...textContent, set(value) {
      if (probe.renderingInformation && probe.recording && probe.enabled) {
        probe.current['informationDOM.textContent'] = (probe.current['informationDOM.textContent'] ?? 0) + 1;
      }
      return textContent.set.call(this, value);
    } });
    const setProperty = CSSStyleDeclaration.prototype.setProperty;
    CSSStyleDeclaration.prototype.setProperty = function(...args) {
      if (probe.renderingInformation && probe.recording && probe.enabled) {
        probe.current['informationDOM.setProperty'] = (probe.current['informationDOM.setProperty'] ?? 0) + 1;
      }
      return setProperty.apply(this, args);
    };
  }
}
