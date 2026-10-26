import { readFileSync } from 'node:fs';

export const STARTUP_CANDIDATES = ['baseline', 'bootstrap', 'static', 'trial', 'records', 'both', 'prefetch', 'compact', 'combined'];

export function replaceRequired(source, from, to) {
  if (source.split(from).length !== 2) throw new Error(`Startup marker must occur exactly once: ${from}`);
  return source.replace(from, to);
}

/** Reconstruct the runtime shape; build provenance belongs to the source manifest. */
export function compactManifestSource(manifest) {
  const rows = Object.entries(manifest).map(([path, entry]) => {
    const prefix = entry.levels[0].path.replace(/\.\d+\.png$/, '');
    for (const level of entry.levels) {
      if (level.path !== `${prefix}.${level.width}.png`) throw new Error(`Unexpected level path: ${level.path}`);
    }
    return [path, entry.width, entry.height, prefix, entry.levels.map(level => [level.width, level.height])];
  });
  return `export default Object.fromEntries(${JSON.stringify(rows)}.map(([path,width,height,prefix,sizes])=>[path,{width,height,levels:sizes.map(([width,height])=>({width,height,path:prefix+'.'+width+'.png'}))}]));`;
}

/** Loaded only by measure-startup-loading.js, never by the production config. */
export function startupBuildPlugin(candidate) {
  if (!STARTUP_CANDIDATES.includes(candidate)) throw new Error(`Unknown startup candidate: ${candidate}`);
  const lazyTrial = ['trial', 'both', 'prefetch', 'combined'].includes(candidate);
  const lazyRecords = ['records', 'both', 'prefetch', 'combined'].includes(candidate);
  const prefetch = ['prefetch', 'combined'].includes(candidate);
  const compact = ['compact', 'combined'].includes(candidate);
  const transformed = new Set();
  const required = ['main.js', 'app/GameApp.js', 'app/TitleMenu.js', 'app/TrialSession.js', 'chips/ScaledImage.js'];
  return {
    name: 'startup-loading-investigation', enforce: 'pre',
    transform(source, id) {
      const file = required.find(file => id.replaceAll('\\', '/').endsWith(`/src/${file}`));
      if (!file) return;
      transformed.add(file);
      let code = source.replaceAll('\r\n', '\n');
      if (file === 'main.js' && (lazyTrial || lazyRecords || candidate === 'bootstrap')) {
        // Dynamic chunks import shared exports from the entry. Its lifetime-long TLA
        // otherwise blocks their evaluation until startGame's infinite loop ends.
        code = replaceRequired(code, 'await startGame();', 'startGame().catch(error => { queueMicrotask(() => { throw error; }); });');
      }
      if (file === 'app/GameApp.js') {
        code = replaceRequired(code, '  while (true) {', '  globalThis.__startupApp = { titleMenu, clock, trial, heroProgress };\n  while (true) {');
        if (lazyTrial) {
          code = replaceRequired(code, "import { startTrial } from './TrialSession.js';", '');
          code = replaceRequired(code, "    if (!['trial', 'challenge'].includes(action)) continue;", `    if (!['trial', 'challenge'].includes(action)) continue;
    performance.mark('startup:trial-import-start');
    const { startTrial } = await import('./TrialSession.js');
    performance.mark('startup:trial-import-end');`);
        }
      }
      if (file === 'app/TitleMenu.js') {
        code = replaceRequired(code, '    return new Promise((resolve) => { this.resolve = resolve; });', `    performance.mark('startup:title-ready');
    ${prefetch ? `setTimeout(() => {
      performance.mark('startup:prefetch-start');
      globalThis.__startupPrefetch = Promise.all([import('./TrialSession.js'), import('./RecordScreen.js')])
        .then(() => performance.mark('startup:prefetch-end'));
    }, 0);` : ''}
    return new Promise((resolve) => { this.resolve = resolve; });`);
        if (lazyRecords) {
          code = replaceRequired(code, "import RecordScreen from './RecordScreen.js';", '');
          code = replaceRequired(code, '    this.recordScreen.refreshLanguage();', '    this.recordScreen?.refreshLanguage();');
          code = replaceRequired(code, '  renderPanel() {\n    this.recordScreen = new RecordScreen(this.panel, {', `  renderPanel() { this.recordScreen = null; }

  async ensureRecordScreen() {
    if (this.recordScreen) return;
    performance.mark('startup:records-import-start');
    const { default: RecordScreen } = await import('./RecordScreen.js');
    performance.mark('startup:records-import-end');
    this.recordScreen = new RecordScreen(this.panel, {`);
          code = replaceRequired(code, '  openPanel(name) {', '  async openPanel(name) {\n    await this.ensureRecordScreen();');
        }
      }
      if (file === 'app/TrialSession.js') {
        code = replaceRequired(code, '  return completed;', '  globalThis.__startupFinishTrial = finishTrial;\n  performance.mark("startup:trial-created");\n  return completed;');
      }
      if (file === 'chips/ScaledImage.js' && compact) {
        const manifest = JSON.parse(readFileSync(new URL('../../src/chips/image-levels.json', import.meta.url), 'utf8'));
        code = replaceRequired(code, "import manifest from './image-levels.json' with { type: 'json' };", compactManifestSource(manifest).replace('export default ', 'const manifest = '));
      }
      return code;
    },
    buildEnd(error) {
      if (error) return;
      for (const file of required) if (!transformed.has(file)) throw new Error(`Startup source not transformed: ${file}`);
    },
  };
}
