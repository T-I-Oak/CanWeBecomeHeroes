const PAUSE_REASON = 'information-window';

export default class InformationWindowManager {
  constructor({ clock, onChange = null } = {}) {
    this.clock = clock;
    this.onChange = onChange;
    this.pauseOnOpen = false;
    this.windows = [];
    this.nextId = 1;
  }

  get entries() {
    return this.windows.map((entry) => ({ ...entry }));
  }

  setPauseOnOpen(enabled) {
    this.pauseOnOpen = Boolean(enabled);
    this.#notify();
  }

  open({ type, data, parentId = null, anchor = null }) {
    if (parentId !== null && !this.windows.some((entry) => entry.id === parentId)) parentId = null;
    if (parentId === null) this.windows = [];
    else this.windows = this.windows.filter((entry) => !this.#isDescendantOf(entry.id, parentId));
    const entry = Object.freeze({ id: `information-${this.nextId++}`, type, data, parentId, anchor });
    this.windows.push(entry);
    this.#notify();
    return entry;
  }

  focus(id) {
    if (!id || !this.windows.some((entry) => entry.id === id)) {
      this.clear();
      return;
    }
    const retained = new Set(this.#getAncestorIds(id));
    const next = this.windows.filter((entry) => retained.has(entry.id));
    if (next.length === this.windows.length) return;
    this.windows = next;
    this.#notify();
  }

  clear() {
    if (this.windows.length === 0) return;
    this.windows = [];
    this.#notify();
  }

  #getAncestorIds(id) {
    const ids = [];
    let currentId = id;
    while (currentId) {
      ids.push(currentId);
      currentId = this.windows.find((entry) => entry.id === currentId)?.parentId ?? null;
    }
    return ids;
  }

  #isDescendantOf(id, ancestorId) {
    let currentId = this.windows.find((entry) => entry.id === id)?.parentId ?? null;
    while (currentId) {
      if (currentId === ancestorId) return true;
      currentId = this.windows.find((entry) => entry.id === currentId)?.parentId ?? null;
    }
    return false;
  }

  #notify() {
    if (this.clock) {
      if (this.pauseOnOpen && this.windows.length > 0) this.clock.pause(PAUSE_REASON);
      else this.clock.resume(PAUSE_REASON);
    }
    this.onChange?.(this.entries);
  }
}

export { PAUSE_REASON as INFORMATION_WINDOW_PAUSE_REASON };
