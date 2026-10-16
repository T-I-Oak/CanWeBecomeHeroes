import InformationWindowManager from './InformationWindowManager.js';
import InformationWindowLayer from './InformationWindowLayer.js';
import { createDefinitionInformationTarget } from './InformationTarget.js';

/** An independent, unpinned information tree owned by one record-screen visit. */
export default class RecordInformation {
  constructor(texts, assets) {
    this.element = document.createElement('aside');
    this.element.className = 'InformationWindowLayer RecordInformation';
    document.body.append(this.element);
    this.manager = new InformationWindowManager({ onChange: entries => this.layer.render(entries) });
    this.layer = new InformationWindowLayer(this.element, this.manager, texts, assets, { allowPin: false });
    this.onPointerDown = event => {
      const window = event.target.closest?.('.RecordInformation .InformationWindow');
      this.manager.focus(window?.dataset.informationWindowId ?? null);
    };
    this.onResize = () => this.manager.refreshEntries();
    document.addEventListener('pointerdown', this.onPointerDown);
    globalThis.addEventListener('resize', this.onResize);
  }

  open(kind, id, event) {
    this.manager.open({ type: 'definition', data: { target: createDefinitionInformationTarget(kind, id) },
      anchor: { x: event.clientX, y: event.clientY } });
  }

  refresh() { this.manager.refreshEntries(); }

  dispose() {
    document.removeEventListener('pointerdown', this.onPointerDown);
    globalThis.removeEventListener('resize', this.onResize);
    this.manager.clear({ includePinned: true });
    this.element.remove();
  }
}
