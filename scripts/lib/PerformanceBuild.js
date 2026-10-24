// Local investigation build only. Never loaded by the application's Vite config.
export function replaceOnce(source, from, to) {
  if (source.split(from).length !== 2) throw new Error(`Performance marker must occur once: ${from}`);
  return source.replace(from, to);
}

const wrappers = {
  'chips/ChipBoard.js': ['ChipBoard', ['update', 'getRenderChips', 'resolveGroundOverlaps']],
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
      if (path.endsWith('/src/app/GameApp.js')) {
        code = replaceOnce(code, 'function render(time) {', 'function render(time) { globalThis.__perf.begin(time);');
        code = replaceOnce(code, '    requestAnimationFrame(render);', '    globalThis.__perf.endFrame(); requestAnimationFrame(render);');
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
          globalThis.__session = { board, controller, clock, camera, assets, informationWindows, stageController, tutorial,
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
    compareBatching: false, batchInformation: true,
    reseed() { seed = 54; },
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
          const result = original.apply(this, args);
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
}
