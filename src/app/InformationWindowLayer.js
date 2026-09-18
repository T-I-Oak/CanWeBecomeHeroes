import { createInformationElement as createElement } from './InformationWindowElementFactory.js';
import InformationWindowReferenceRenderer from './InformationWindowReferenceRenderer.js';
import CatalogInformationRenderer from './CatalogInformationRenderer.js';
import EntityInformationRenderer from './EntityInformationRenderer.js';

const CATALOG_INFORMATION_TYPES = Object.freeze(['tag', 'status', 'term', 'facility', 'area']);
const ENTITY_INFORMATION_TYPES = Object.freeze(['entity', 'enemy-projection', 'item', 'unique-skill']);
const WINDOW_EDGE_MARGIN = 12;
const WINDOW_ANCHOR_GAP = 16;

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
  constructor(element, manager, textRepository = null) {
    this.element = element;
    this.manager = manager;
    this.textRepository = textRepository;
    const open = (entry) => this.manager.open(entry);
    this.references = new InformationWindowReferenceRenderer({ textRepository, open });
    this.catalogRenderer = new CatalogInformationRenderer({ textRepository, references: this.references, open });
    this.entityRenderer = new EntityInformationRenderer({ textRepository, references: this.references, open });
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
  }

  render(entries) {
    const windows = entries.map((entry) => this.#renderWindow(entry));
    this.element.replaceChildren(...windows);
    windows.forEach((window, index) => this.#positionWindow(window, entries[index]));
  }

  #renderWindow(entry) {
    const window = createElement('section', `InformationWindow${entry.compact ? ' is-compact' : ''}`);
    window.dataset.informationWindowId = entry.id;
    window.append(this.#renderContent(entry));
    this.#addWindowControls(window, entry);
    return window;
  }

  #renderContent(entry) {
    if (CATALOG_INFORMATION_TYPES.includes(entry.type)) return this.catalogRenderer.render(entry);
    if (ENTITY_INFORMATION_TYPES.includes(entry.type)) return this.entityRenderer.render(entry);
    throw new RangeError(`Unsupported information window type: ${entry.type}`);
  }

  #addWindowControls(windowElement, entry) {
    const title = windowElement.querySelector('.InformationWindow__Title');
    if (!title) return;
    const compact = createElement('button', `InformationWindow__Compact${entry.compact ? ' is-compact' : ''}`);
    compact.type = 'button';
    compact.setAttribute('aria-label', this.textRepository.getLabel(entry.compact ? 'normalSize' : 'compactSize'));
    compact.append(createCompactIcon(entry.compact));
    compact.addEventListener('pointerdown', (event) => event.stopPropagation());
    compact.addEventListener('click', (event) => { event.stopPropagation(); this.manager.toggleCompact(entry.id); });
    const pin = createElement('button', `InformationWindow__Pin${entry.pinned ? ' is-pinned' : ''}`);
    pin.type = 'button';
    pin.setAttribute('aria-label', this.textRepository.getLabel(entry.pinned ? 'unpin' : 'pin'));
    pin.textContent = '📌';
    pin.addEventListener('pointerdown', (event) => event.stopPropagation());
    pin.addEventListener('click', (event) => { event.stopPropagation(); this.manager.togglePin(entry.id); });
    title.append(compact, pin);
    title.addEventListener('pointerdown', (event) => this.#startDrag(event, windowElement, entry));
  }

  #startDrag(event, windowElement, entry) {
    if (event.button !== 0 || event.target.closest('.InformationWindow__Pin, .InformationWindow__Compact')) return;
    const bounds = windowElement.getBoundingClientRect();
    const offset = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    const move = (moveEvent) => {
      const position = this.#constrainPosition(windowElement, moveEvent.clientX - offset.x, moveEvent.clientY - offset.y);
      windowElement.style.left = `${position.x}px`;
      windowElement.style.top = `${position.y}px`;
      windowElement.style.transform = 'none';
    };
    const finish = (upEvent) => {
      windowElement.removeEventListener('pointermove', move);
      windowElement.removeEventListener('pointerup', finish);
      this.manager.setDragging(false);
      this.manager.setPosition(entry.id, this.#constrainPosition(windowElement, upEvent.clientX - offset.x, upEvent.clientY - offset.y));
    };
    this.manager.setDragging(true);
    windowElement.setPointerCapture(event.pointerId);
    windowElement.addEventListener('pointermove', move);
    windowElement.addEventListener('pointerup', finish, { once: true });
    event.preventDefault();
  }

  #positionWindow(windowElement, entry) {
    const bounds = windowElement.getBoundingClientRect();
    if (entry.position) {
      const position = this.#constrainPosition(windowElement, entry.position.x, entry.position.y);
      windowElement.style.left = `${position.x}px`;
      windowElement.style.top = `${position.y}px`;
    } else if (!entry.anchor) {
      windowElement.style.left = `${Math.max(WINDOW_EDGE_MARGIN, (globalThis.innerWidth - bounds.width) / 2)}px`;
      windowElement.style.top = `${Math.max(WINDOW_EDGE_MARGIN, (globalThis.innerHeight - bounds.height) / 2)}px`;
    } else {
      let x = entry.anchor.x + WINDOW_ANCHOR_GAP;
      if (x + bounds.width > globalThis.innerWidth - WINDOW_EDGE_MARGIN) x = entry.anchor.x - WINDOW_ANCHOR_GAP - bounds.width;
      x = Math.max(WINDOW_EDGE_MARGIN, Math.min(x, globalThis.innerWidth - bounds.width - WINDOW_EDGE_MARGIN));
      const y = Math.max(WINDOW_EDGE_MARGIN, Math.min(entry.anchor.y - 24, globalThis.innerHeight - bounds.height - WINDOW_EDGE_MARGIN));
      windowElement.style.left = `${x}px`;
      windowElement.style.top = `${y}px`;
    }
    windowElement.style.transform = 'none';
  }

  #constrainPosition(windowElement, x, y) {
    const bounds = windowElement.getBoundingClientRect();
    return {
      x: Math.max(WINDOW_EDGE_MARGIN, Math.min(x, globalThis.innerWidth - bounds.width - WINDOW_EDGE_MARGIN)),
      y: Math.max(WINDOW_EDGE_MARGIN, Math.min(y, globalThis.innerHeight - bounds.height - WINDOW_EDGE_MARGIN)),
    };
  }
}
