import { createInformationElement as createElement } from './InformationWindowElementFactory.js';
import InformationWindowReferenceRenderer from './InformationWindowReferenceRenderer.js';
import CatalogInformationRenderer from './CatalogInformationRenderer.js';
import EntityInformationRenderer from './EntityInformationRenderer.js';
import InformationWindowPositioner from './InformationWindowPositioner.js';
import InformationWindowDragController from './InformationWindowDragController.js';
import { fitInformationWindowTitle } from './InformationWindowTitleLayout.js';
import InformationWindowResizeController from './InformationWindowResizeController.js';
import { COMPACT_WINDOW_SCALE, isDefaultWindowScale } from './InformationWindowScale.js';
import LogHistoryPanel from './LogHistoryPanel.js';

const CATALOG_INFORMATION_TYPES = Object.freeze(['tag', 'status', 'term', 'facility', 'area', 'definition']);
const ENTITY_INFORMATION_TYPES = Object.freeze(['instance']);
function createCloseIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('InformationWindow__CloseIcon');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M6 6 18 18M18 6 6 18');
  svg.append(path);
  return svg;
}

function createCompactIcon(isCompact) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('InformationWindow__CompactIcon');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const paths = isCompact
    ? ['M11 11 4 4M4 8V4h4', 'M13 13 20 20M20 16v4h-4']
    : ['M4 4 11 11M7 11h4V7', 'M20 20 13 13M17 13h-4v4'];
  paths.forEach((d) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    svg.append(path);
  });
  return svg;
}

export default class InformationWindowLayer {
  constructor(element, manager, textRepository = null, assets = null, { allowPin = true } = {}) {
    this.element = element;
    this.manager = manager;
    this.allowPin = allowPin;
    this.textRepository = textRepository;
    this.windows = new Map();
    const open = (entry) => this.manager.open(entry);
    this.references = new InformationWindowReferenceRenderer({ textRepository, open });
    this.catalogRenderer = new CatalogInformationRenderer({ textRepository, references: this.references, open, assets });
    this.entityRenderer = new EntityInformationRenderer({
      textRepository,
      references: this.references,
      open,
      getInstance: (target) => this.manager?.getInstance(target),
      createInstanceTarget: (entity) => this.manager?.entityRegistry ? this.manager.createInstanceTarget(entity) : null,
      assets,
    });
    this.positioner = new InformationWindowPositioner();
    this.dragController = new InformationWindowDragController({ manager, positioner: this.positioner });
    this.resizeController = new InformationWindowResizeController({ manager, positioner: this.positioner });
    this.element.addEventListener('pointerdown', (event) => {
      if (event.target.closest?.('.InformationWindow')) this.manager.setInteracting(true);
    }, true);
    this.element.addEventListener('pointerup', () => this.manager.setInteracting(false), true);
    this.element.addEventListener('pointercancel', () => this.manager.setInteracting(false));
  }

  setTextRepository(textRepository) {
    this.textRepository = textRepository;
    this.references.setTextRepository(textRepository);
    this.catalogRenderer.setTextRepository(textRepository);
    this.entityRenderer.setTextRepository(textRepository);
    if (this.logHistory) this.logHistory.textRepository = textRepository;
    this.language = null;
  }

  setManager(manager) {
    this.windows.clear();
    this.element.replaceChildren();
    this.logHistory?.dispose();
    this.logHistory = null;
    this.manager = manager;
    this.dragController.setManager(manager);
    this.resizeController.manager = manager;
  }

  setLogHistory(gameLog, dataManager) {
    this.logHistory?.dispose();
    this.logHistory = null;
    for (const [id, view] of this.windows) if (view.entry.type === 'log-history') {
      view.window.remove();
      this.windows.delete(id);
    }
    this.gameLog = gameLog;
    this.logHistoryDataManager = dataManager;
  }

  render(entries) {
    const logScroll = this.logHistory?.captureScroll();
    if (!entries.some(entry => entry.type === 'log-history')) this.logHistory?.close();
    const language = this.textRepository.getLabel('documentLanguage');
    const viewport = `${globalThis.innerWidth}:${globalThis.innerHeight}:${globalThis.devicePixelRatio}`;
    const retained = new Set(entries.map(entry => entry.id));
    for (const [id] of this.windows) if (!retained.has(id)) this.windows.delete(id);
    const layout = [];
    entries.forEach((entry, index) => {
      let view = this.windows.get(entry.id);
      const rebuild = !view || language !== this.language;
      const previous = view?.entry;
      if (rebuild) {
        const scroll = view?.window.querySelector('.InformationWindow__Content');
        const window = this.#renderWindow(entry);
        view = { window, entry, scroll: scroll ? { top: scroll.scrollTop, left: scroll.scrollLeft } : null };
        this.windows.set(entry.id, view);
      }
      const dimensionsChanged = !rebuild && entry.type === 'instance'
        ? this.entityRenderer.update(view.window, entry) : false;
      view.entry = entry;
      if (!rebuild && (previous.pinned !== entry.pinned || previous.scale !== entry.scale)) {
        view.window.className = `InformationWindow${entry.scale === COMPACT_WINDOW_SCALE ? ' state-compact' : ''}`;
        view.window.style.scale = String(entry.scale);
        this.#updateControls(view.window, entry);
      }
      if (this.element.children[index] !== view.window) this.element.insertBefore(view.window, this.element.children[index] ?? null);
      if (rebuild || dimensionsChanged || viewport !== this.viewport || previous.scale !== entry.scale
        || previous.position !== entry.position || previous.anchor !== entry.anchor) layout.push(view);
    });
    // Remove closed/replaced windows after ordering the retained nodes, without detaching them.
    const windows = entries.map(entry => this.windows.get(entry.id).window);
    for (const child of [...this.element.children]) if (!windows.includes(child)) child.remove();
    for (const view of layout) {
      const { window, entry } = view;
      const title = window.querySelector('.InformationWindow__Title');
      if (title) fitInformationWindowTitle(title, window);
      this.#positionWindow(window, entry);
      if (view.scroll) {
        const content = window.querySelector('.InformationWindow__Content');
        content.scrollTop = view.scroll.top;
        content.scrollLeft = view.scroll.left;
        view.scroll = null;
      }
    }
    this.language = language;
    this.viewport = viewport;
    if (layout.length) this.logHistory?.restoreScroll(logScroll);
  }

  #updateControls(windowElement, entry) {
    const compact = windowElement.querySelector('.InformationWindow__Compact');
    const restoresDefault = !isDefaultWindowScale(entry.scale);
    compact.className = `InformationWindow__Compact${restoresDefault ? ' state-compact' : ''}`;
    compact.setAttribute('aria-label', this.textRepository.getLabel(restoresDefault ? 'normalSize' : 'compactSize'));
    compact.setAttribute('aria-pressed', String(restoresDefault));
    compact.replaceChildren(createCompactIcon(restoresDefault));
    const pin = windowElement.querySelector('.InformationWindow__Pin');
    if (pin) {
      pin.className = `InformationWindow__Pin${entry.pinned ? ' state-pinned' : ''}`;
      pin.setAttribute('aria-label', this.textRepository.getLabel(entry.pinned ? 'unpin' : 'pin'));
      pin.setAttribute('aria-pressed', String(entry.pinned));
    }
  }

  #renderWindow(entry) {
    const window = createElement('section', `InformationWindow${entry.scale === COMPACT_WINDOW_SCALE ? ' state-compact' : ''}`);
    window.dataset.informationWindowId = entry.id;
    window.style.scale = String(entry.scale);
    const content = createElement('div', 'InformationWindow__Content PaperScroll');
    const rendered = this.#renderContent(entry);
    window.append(rendered.querySelector('.InformationWindow__Title'));
    content.append(rendered);
    window.append(content);
    this.#addWindowControls(window, entry);
    this.#addResizeHandles(window, entry);
    return window;
  }

  #renderContent(entry) {
    if (entry.type === 'log-history') {
      this.logHistory ??= new LogHistoryPanel({ gameLog: this.gameLog, manager: this.manager, textRepository: this.textRepository, dataManager: this.logHistoryDataManager });
      return this.logHistory.render(entry);
    }
    if (CATALOG_INFORMATION_TYPES.includes(entry.type)) return this.catalogRenderer.render(entry);
    if (ENTITY_INFORMATION_TYPES.includes(entry.type)) return this.entityRenderer.render(entry);
    throw new RangeError(`Unsupported information window type: ${entry.type}`);
  }

  #addWindowControls(windowElement, entry) {
    const title = windowElement.querySelector('.InformationWindow__Title');
    if (!title) return;
    const restoresDefault = !isDefaultWindowScale(entry.scale);
    const actions = createElement('div', 'InformationWindow__TitleActions');
    const compact = createElement('button', `InformationWindow__Compact${restoresDefault ? ' state-compact' : ''}`);
    compact.type = 'button';
    compact.setAttribute('aria-label', this.textRepository.getLabel(restoresDefault ? 'normalSize' : 'compactSize'));
    compact.setAttribute('aria-pressed', String(restoresDefault));
    compact.append(createCompactIcon(restoresDefault));
    compact.addEventListener('pointerdown', (event) => event.stopPropagation());
    compact.addEventListener('click', (event) => { event.stopPropagation(); this.manager.toggleCompact(entry.id); });
    const pin = createElement('button', `InformationWindow__Pin${entry.pinned ? ' state-pinned' : ''}`);
    pin.type = 'button';
    pin.setAttribute('aria-label', this.textRepository.getLabel(entry.pinned ? 'unpin' : 'pin'));
    pin.setAttribute('aria-pressed', String(entry.pinned));
    pin.textContent = '📌';
    pin.addEventListener('pointerdown', (event) => event.stopPropagation());
    pin.addEventListener('click', (event) => { event.stopPropagation(); this.manager.togglePin(entry.id); });
    const close = createElement('button', 'InformationWindow__Close');
    close.type = 'button';
    close.setAttribute('aria-label', this.textRepository.getLabel('close'));
    close.append(createCloseIcon());
    close.addEventListener('pointerdown', (event) => event.stopPropagation());
    close.addEventListener('click', (event) => { event.stopPropagation(); this.manager.close(entry.id); });
    actions.append(compact);
    if (this.allowPin) actions.append(pin);
    actions.append(close);
    title.append(actions);
    title.addEventListener('pointerdown', (event) => this.dragController.begin(event, windowElement, this.windows.get(entry.id).entry));
  }

  #addResizeHandles(windowElement, entry) {
    ['nw', 'ne', 'sw', 'se'].forEach((corner) => {
      const handle = createElement('button', `InformationWindow__Resize InformationWindow__Resize--${corner}`);
      handle.type = 'button';
      handle.setAttribute('aria-label', this.textRepository.getLabel('resize'));
      handle.addEventListener('pointerdown', (event) => this.resizeController.begin(event, windowElement, this.windows.get(entry.id).entry, corner));
      windowElement.append(handle);
    });
  }

  #positionWindow(windowElement, entry) {
    const bounds = windowElement.getBoundingClientRect();
    const position = this.positioner.getPosition(bounds, entry);
    windowElement.style.left = `${position.x}px`;
    windowElement.style.top = `${position.y}px`;
    windowElement.style.transform = 'none';
  }
}
