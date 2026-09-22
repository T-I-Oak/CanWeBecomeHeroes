const WINDOW_EDGE_MARGIN = 12;
const WINDOW_ANCHOR_GAP = 16;

export default class InformationWindowPositioner {
  constructor({ getViewport = () => ({ width: globalThis.innerWidth, height: globalThis.innerHeight }) } = {}) {
    this.getViewport = getViewport;
  }

  getPosition({ width, height }, entry) {
    if (entry.position) return this.constrain({ width, height }, entry.position.x, entry.position.y);
    const { width: viewportWidth, height: viewportHeight } = this.getViewport();
    if (!entry.anchor) {
      return this.constrain({ width, height }, (viewportWidth - width) / 2, (viewportHeight - height) / 2);
    }
    let x = entry.anchor.x + WINDOW_ANCHOR_GAP;
    if (x + width > viewportWidth - WINDOW_EDGE_MARGIN) x = entry.anchor.x - WINDOW_ANCHOR_GAP - width;
    return this.constrain({ width, height }, x, entry.anchor.y - 24);
  }

  constrain({ width, height }, x, y) {
    const { width: viewportWidth, height: viewportHeight } = this.getViewport();
    return {
      x: Math.max(WINDOW_EDGE_MARGIN, Math.min(x, viewportWidth - width - WINDOW_EDGE_MARGIN)),
      y: Math.max(WINDOW_EDGE_MARGIN, Math.min(y, viewportHeight - height - WINDOW_EDGE_MARGIN)),
    };
  }
}
