import HeroFactory, { HERO_PROFESSION_IDS, getHeroProfessionDefinition } from '../game/HeroFactory.js';
import { AREA_THEME } from '../game/AreaTheme.js';
import { getHeroSwingPoseTilt } from '../game/FacilitySwingSystem.js';
import ModalLayer from './ModalLayer.js';
import { createStaticChipPreviewDrawer } from './ChipPreview.js';

const HERO_PREVIEW_SIZE = 256;
const PARTY_SELECTION_SWING_ANGULAR_FREQUENCY = 1.2;

function createElement(tagName, className, text = null) {
  const element = document.createElement(tagName);
  element.className = className;
  if (text !== null) element.textContent = text;
  return element;
}

export default class StartPartySelectionModal {
  constructor(container, { assets, textRepository } = {}) {
    this.modalLayer = new ModalLayer(container);
    this.container = this.modalLayer.container;
    if (!assets) throw new Error('Start party selection modal requires assets.');
    this.assets = assets;
    this.textRepository = textRepository;
    this.heroFactory = new HeroFactory();
    this.previewAnimationFrame = null;
  }

  show(selection) {
    this.selection = selection;
    this.render();
    this.modalLayer.open();
    return new Promise((resolve) => { this.resolve = resolve; });
  }

  render() {
    this.stopPreviewAnimation();
    this.selectedPreviewDrawers = [];
    const dialog = createElement('section', 'ModalDialog StartPartySelection__Dialog');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    const title = createElement('h1', 'StartPartySelection__Title', this.textRepository.getLabel('startPartySelection'));
    const roster = createElement('div', 'StartPartySelection__Roster');
    HERO_PROFESSION_IDS.forEach((professionId) => roster.append(this.createRosterSlot(professionId)));
    const start = createElement('button', 'StartPartySelection__StartButton', this.textRepository.getLabel('startTrial'));
    start.type = 'button';
    start.addEventListener('click', () => {
      this.stopPreviewAnimation();
      this.modalLayer.close();
      this.resolve([...this.selection.professionIds]);
    });
    dialog.append(title, roster, start);
    this.container.replaceChildren(dialog);
    this.startPreviewAnimation();
  }

  createRosterSlot(professionId) {
    const isUnlocked = this.selection.unlockedProfessionIds.includes(professionId);
    const isSelected = this.selection.isSelected(professionId);
    if (!isUnlocked) return createElement('div', 'StartPartySelection__Slot state-locked', '?');
    if (isSelected) {
      const slot = this.createHeroSlot(professionId, () => {
        this.selection.selectRosterHero(professionId);
        this.render();
      }, { animate: true, theme: AREA_THEME.battle });
      slot.classList.add('state-selected');
      return slot;
    }
    return this.createHeroSlot(professionId, () => {
      this.selection.selectRosterHero(professionId);
      this.render();
    });
  }

  createHeroSlot(professionId, onClick, { animate = false, theme = AREA_THEME.preparation } = {}) {
    const definition = getHeroProfessionDefinition(professionId);
    const slot = createElement('button', 'StartPartySelection__Slot state-clickable');
    slot.type = 'button';
    slot.style.setProperty('--party-selection-chip-border', theme.border);
    slot.setAttribute('aria-label', this.textRepository.getName('hero', definition.heroId));
    const canvas = document.createElement('canvas');
    canvas.className = 'StartPartySelection__ChipPreview';
    canvas.width = HERO_PREVIEW_SIZE;
    canvas.height = HERO_PREVIEW_SIZE;
    canvas.setAttribute('aria-hidden', 'true');
    const hero = this.heroFactory.create({ profession: professionId, x: HERO_PREVIEW_SIZE / 2, y: HERO_PREVIEW_SIZE / 2 });
    hero.chip.fillColor = theme.chipFill;
    const drawPreview = createStaticChipPreviewDrawer(canvas, hero.chip, HERO_PREVIEW_SIZE, this.assets);
    if (animate) this.selectedPreviewDrawers.push(drawPreview);
    slot.append(canvas);
    slot.addEventListener('click', onClick);
    return slot;
  }

  startPreviewAnimation() {
    if (this.selectedPreviewDrawers.length === 0) return;
    const renderFrame = (timestamp) => {
      const timeSeconds = timestamp / 1000;
      const poseTilt = getHeroSwingPoseTilt(timeSeconds, PARTY_SELECTION_SWING_ANGULAR_FREQUENCY);
      this.selectedPreviewDrawers.forEach((drawPreview) => drawPreview({ poseTilt }));
      this.previewAnimationFrame = requestAnimationFrame(renderFrame);
    };
    this.previewAnimationFrame = requestAnimationFrame(renderFrame);
  }

  stopPreviewAnimation() {
    if (this.previewAnimationFrame === null) return;
    cancelAnimationFrame(this.previewAnimationFrame);
    this.previewAnimationFrame = null;
  }
}
