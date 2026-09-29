function isSameTarget(entry, type, data) {
  if (entry.type !== type) return false;
  if (type === 'tag') return entry.data.tag === data.tag;
  if (type === 'status') return entry.data.status === data.status;
  if (type === 'instance') return entry.data.target.instanceId === data.target.instanceId;
  if (type === 'definition') return entry.data.target.kind === data.target.kind && entry.data.target.definitionId === data.target.definitionId;
  if (type === 'facility') return entry.data.facility === data.facility;
  if (type === 'area') return entry.data.area === data.area;
  if (type === 'term') return entry.data.term === data.term;
  return entry.data === data;
}

export default class InformationWindowTree {
  constructor() { this.windows = []; this.nextId = 1; }

  get entries() { return this.windows.map((entry) => ({ ...entry })); }

  open({ type, data, parentId = null, anchor = null }) {
    const existing = this.windows.find((entry) => isSameTarget(entry, type, data));
    if (existing) return Object.freeze({ entry: existing, changed: false });
    const resolvedParentId = parentId !== null && this.windows.some((entry) => entry.id === parentId) ? parentId : null;
    this.windows = resolvedParentId === null
      ? this.windows.filter((entry) => entry.pinned)
      : this.windows.filter((entry) => entry.pinned || !this.isDescendantOf(entry.id, resolvedParentId));
    const entry = Object.freeze({ id: `information-${this.nextId++}`, type, data, parentId: resolvedParentId, anchor, position: null, pinned: false, compact: false });
    this.windows.push(entry);
    return Object.freeze({ entry, changed: true });
  }

  focus(id) {
    if (!id || !this.windows.some((entry) => entry.id === id)) return this.clear();
    const retained = new Set(this.getAncestorIds(id));
    return this.replace(this.windows.filter((entry) => entry.pinned || retained.has(entry.id)));
  }

  close(id) {
    if (!this.windows.some((entry) => entry.id === id)) return false;
    return this.replace(this.windows.filter((entry) => entry.id !== id && !this.isDescendantOf(entry.id, id)));
  }

  clear({ includePinned = false } = {}) { return this.replace(includePinned ? [] : this.windows.filter((entry) => entry.pinned)); }

  togglePin(id) { return this.replaceEntry(id, (entry) => ({ ...entry, pinned: !entry.pinned })); }

  toggleCompact(id) { return this.replaceEntry(id, (entry) => ({ ...entry, compact: !entry.compact })); }

  setPosition(id, position) { return this.replaceEntry(id, (entry) => ({ ...entry, position: { x: position.x, y: position.y } })); }

  removeWhere(predicate) { return this.replace(this.windows.filter((entry) => !predicate(entry))); }

  hasUnpinnedEntries() { return this.windows.some((entry) => !entry.pinned); }

  getAncestorIds(id) {
    const ids = [];
    let currentId = id;
    while (currentId) {
      ids.push(currentId);
      currentId = this.windows.find((entry) => entry.id === currentId)?.parentId ?? null;
    }
    return ids;
  }

  isDescendantOf(id, ancestorId) {
    let currentId = this.windows.find((entry) => entry.id === id)?.parentId ?? null;
    while (currentId) {
      if (currentId === ancestorId) return true;
      currentId = this.windows.find((entry) => entry.id === currentId)?.parentId ?? null;
    }
    return false;
  }

  replaceEntry(id, update) {
    const index = this.windows.findIndex((entry) => entry.id === id);
    if (index < 0) return null;
    const next = Object.freeze(update(this.windows[index]));
    this.windows.splice(index, 1, next);
    return next;
  }

  replace(next) {
    if (next.length === this.windows.length) return false;
    this.windows = next;
    return true;
  }
}
