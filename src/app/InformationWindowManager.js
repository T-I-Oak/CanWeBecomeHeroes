import InformationWindowTree from './InformationWindowTree.js';
import { createInstanceInformationTarget } from './InformationTarget.js';

const PAUSE_REASON = 'information-window';

export default class InformationWindowManager {
  constructor({ clock, onChange = null, entityRegistry = null, tree = new InformationWindowTree() } = {}) {
    this.clock = clock;
    this.onChange = onChange;
    this.entityRegistry = entityRegistry;
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

  createInstanceTarget(entity) {
    if (!this.entityRegistry) throw new Error('InformationWindowManager requires an EntityRegistry to create instance targets.');
    return createInstanceInformationTarget(entity, this.entityRegistry);
  }

  getInstance(target) {
    return target?.instanceId ? this.entityRegistry?.getByInstanceId(target.instanceId) ?? null : null;
  }

  focus(id) {
    if (this.tree.focus(id)) this.#notify();
  }

  close(id) {
    if (this.tree.close(id)) this.#notify();
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
    if (this.isDragging || this.isInteracting || !this.tree.entries.some((entry) => entry.type === 'instance')) return;
    this.onChange?.(this.entries);
  }

  refreshEntries() {
    this.onChange?.(this.entries);
  }

  closeInvalidEntries() {
    if (this.tree.removeWhere((entry) => {
      if (entry.type === 'instance') return !this.getInstance(entry.data.target);
      return false;
    })) this.#notify();
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
