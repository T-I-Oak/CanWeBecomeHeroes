import InformationWindowTree from './InformationWindowTree.js';

const PAUSE_REASON = 'information-window';

export default class InformationWindowManager {
  constructor({ clock, onChange = null, isTargetAlive = null, tree = new InformationWindowTree() } = {}) {
    this.clock = clock;
    this.onChange = onChange;
    this.isTargetAlive = isTargetAlive;
    this.pauseOnOpen = false;
    this.tree = tree;
    this.isDragging = false;
    this.isInteracting = false;
  }

  get entries() {
    return this.tree.entries;
  }

  setPauseOnOpen(enabled) {
    this.pauseOnOpen = Boolean(enabled);
    this.#notify();
  }

  open({ type, data, parentId = null, anchor = null }) {
    const { entry, changed } = this.tree.open({ type, data, parentId, anchor });
    if (changed) this.#notify();
    return entry;
  }

  focus(id) {
    if (this.tree.focus(id)) this.#notify();
  }

  clear({ includePinned = false } = {}) {
    if (this.tree.clear({ includePinned })) this.#notify();
  }

  togglePin(id) {
    const next = this.tree.togglePin(id);
    if (!next) return null;
    this.#notify();
    return next;
  }

  toggleCompact(id) {
    const next = this.tree.toggleCompact(id);
    if (!next) return null;
    this.#notify();
    return next;
  }

  setPosition(id, position) {
    const next = this.tree.setPosition(id, position);
    if (!next) return null;
    this.#notify();
    return next;
  }

  setDragging(active) {
    this.isDragging = Boolean(active);
  }

  setInteracting(active) {
    this.isInteracting = Boolean(active);
  }

  refreshDynamicEntries() {
    if (this.isDragging || this.isInteracting || !this.tree.entries.some((entry) => this.#getTarget(entry))) return;
    this.onChange?.(this.entries);
  }

  refreshEntries() {
    this.onChange?.(this.entries);
  }

  closeInvalidEntries() {
    if (!this.isTargetAlive) return;
    if (this.tree.removeWhere((entry) => {
      const target = this.#getTarget(entry);
      return target && !this.isTargetAlive(target);
    })) this.#notify();
  }

  #getTarget(entry) {
    if (entry.type === 'entity') return entry.data.entity;
    if (entry.type === 'item') return entry.data.item;
    if (entry.type === 'enemy-projection') return entry.data.source;
    return null;
  }

  #notify() {
    if (this.clock) {
      if (this.pauseOnOpen && this.tree.hasUnpinnedEntries()) this.clock.pause(PAUSE_REASON);
      else this.clock.resume(PAUSE_REASON);
    }
    this.onChange?.(this.entries);
  }
}

export { PAUSE_REASON as INFORMATION_WINDOW_PAUSE_REASON };
