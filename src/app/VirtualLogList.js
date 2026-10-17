import { getLogWindow } from './LogHistoryModel.js';

export default class VirtualLogList {
  constructor(viewport, renderRecord) {
    this.viewport = viewport;
    this.renderRecord = renderRecord;
    this.records = [];
    this.heights = new Map();
    this.follow = true;
    this.frame = null;
    this.width = null;
    viewport.addEventListener('scroll', () => {
      this.follow = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 4;
      this.schedule();
    });
    this.observer = new ResizeObserver(() => {
      if (viewport.clientWidth !== this.width) {
        this.width = viewport.clientWidth;
        this.heights.clear();
      }
      this.schedule();
    });
    this.observer.observe(viewport);
  }

  setRecords(records, { resetHeights = false } = {}) {
    this.records = records;
    if (resetHeights) this.heights.clear();
    this.schedule();
  }

  latest() { this.follow = true; this.schedule(); }

  schedule() {
    if (this.frame !== null) return;
    this.frame = requestAnimationFrame(() => { this.frame = null; this.render(); });
  }

  render() {
    const view = this.viewport;
    if (!view.isConnected || !view.clientHeight) return;
    let window = getLogWindow(this.records, this.heights, view.scrollTop, view.clientHeight);
    const anchorOffset = view.scrollTop - window.offsets[window.anchor];
    if (this.follow) window = getLogWindow(this.records, this.heights, Math.max(0, window.total - view.clientHeight), view.clientHeight);
    const top = document.createElement('div');
    const bottom = document.createElement('div');
    top.style.height = `${window.offsets[window.start]}px`;
    bottom.style.height = `${window.total - window.offsets[window.end]}px`;
    const rows = this.records.slice(window.start, window.end).map(this.renderRecord);
    view.replaceChildren(top, ...rows, bottom);
    let changed = false;
    rows.forEach((row, index) => {
      const id = this.records[window.start + index].id;
      const height = row.offsetHeight;
      if (this.heights.get(id) !== height) { this.heights.set(id, height); changed = true; }
    });
    if (changed) {
      const measured = getLogWindow(this.records, this.heights, view.scrollTop, view.clientHeight);
      top.style.height = `${measured.offsets[window.start]}px`;
      bottom.style.height = `${measured.total - measured.offsets[window.end]}px`;
      if (!this.follow) view.scrollTop = measured.offsets[window.anchor] + anchorOffset;
    }
    if (this.follow) view.scrollTop = view.scrollHeight;
    if (changed) this.schedule();
  }

  dispose() {
    this.observer.disconnect();
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
  }
}
