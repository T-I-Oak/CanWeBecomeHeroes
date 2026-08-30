const PAUSE_REASON = 'information-window';

export default class InformationWindowManager {
  constructor({ clock, onChange = null } = {}) {
    this.clock = clock;
    this.onChange = onChange;
    this.pauseOnOpen = false;
    this.windows = [];
    this.nextId = 1;
    this.isDragging = false;
    this.isInteracting = false;
  }

  get entries() {
    return this.windows.map((entry) => ({ ...entry }));
  }

  setPauseOnOpen(enabled) {
    this.pauseOnOpen = Boolean(enabled);
    this.#notify();
  }

  open({ type, data, parentId = null, anchor = null }) {
    const existing = this.windows.find((entry) => this.#isSameTarget(entry, type, data));
    if (existing) return existing;
    if (parentId !== null && !this.windows.some((entry) => entry.id === parentId)) parentId = null;
    if (parentId === null) this.windows = this.windows.filter((entry) => entry.pinned);
    else this.windows = this.windows.filter((entry) => entry.pinned || !this.#isDescendantOf(entry.id, parentId));
    const entry = Object.freeze({ id: `information-${this.nextId++}`, type, data, parentId, anchor, position: null, pinned: false });
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
    const next = this.windows.filter((entry) => entry.pinned || retained.has(entry.id));
    if (next.length === this.windows.length) return;
    this.windows = next;
    this.#notify();
  }

  clear({ includePinned = false } = {}) {
    const next = includePinned ? [] : this.windows.filter((entry) => entry.pinned);
    if (next.length === this.windows.length) return;
    this.windows = next;
    this.#notify();
  }

  togglePin(id) {
    const index = this.windows.findIndex((entry) => entry.id === id);
    if (index < 0) return null;
    const entry = this.windows[index];
    const next = Object.freeze({ ...entry, pinned: !entry.pinned });
    this.windows.splice(index, 1, next);
    this.#notify();
    return next;
  }

  setPosition(id, position) {
    const index = this.windows.findIndex((entry) => entry.id === id);
    if (index < 0) return null;
    const entry = this.windows[index];
    const next = Object.freeze({ ...entry, position: { x: position.x, y: position.y } });
    this.windows.splice(index, 1, next);
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
    if (this.isDragging || this.isInteracting || !this.windows.some((entry) => entry.type === 'entity')) return;
    this.onChange?.(this.entries);
  }

  closeDefeatedEnemies() {
    const defeated = this.windows.filter((entry) => (
      entry.type === 'entity'
      && entry.data.entity?.chip?.type === 'enemy'
      && entry.data.entity.hp <= 0
    ));
    if (defeated.length === 0) return;
    const ids = new Set(defeated.map((entry) => entry.id));
    this.windows = this.windows.filter((entry) => !ids.has(entry.id));
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

  #isSameTarget(entry, type, data) {
    if (entry.type !== type) return false;
    if (type === 'tag') return entry.data.tag === data.tag;
    if (type === 'status') return entry.data.status === data.status;
    if (type === 'entity') return entry.data.entity === data.entity;
    if (type === 'item') return entry.data.item === data.item;
    if (type === 'facility') return entry.data.facility === data.facility;
    if (type === 'area') return entry.data.area === data.area;
    if (type === 'unique-skill') return entry.data.uniqueSkill.id === data.uniqueSkill.id && entry.data.uniqueSkill.level === data.uniqueSkill.level;
    return entry.data === data;
  }

  #notify() {
    if (this.clock) {
      if (this.pauseOnOpen && this.windows.some((entry) => !entry.pinned)) this.clock.pause(PAUSE_REASON);
      else this.clock.resume(PAUSE_REASON);
    }
    this.onChange?.(this.entries);
  }
}

export { PAUSE_REASON as INFORMATION_WINDOW_PAUSE_REASON };
