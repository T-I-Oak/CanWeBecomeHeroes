import { GAME_AREAS } from './GameAreas.js';
import { AREA_THEME } from './AreaTheme.js';

export default class HeroItemInteractionController {
  constructor(board, pickupController, gameLog = null) {
    this.board = board;
    this.pickupController = pickupController;
    this.activeHero = null;
    this.entities = new Map();
    this.gameLog = gameLog;
    this.bagAbsorptions = [];
    this.selection = { source: null, hover: null };
  }

  add(entity) {
    this.board.addChip(entity.chip);
    this.entities.set(entity.chip.id, entity);
    return entity;
  }

  remove(entity) {
    this.board.removeChip(entity.chip);
    this.entities.delete(entity.chip.id);
  }

  addToWarehouse(item) {
    item.chip.bounds = { ...GAME_AREAS.warehouse };
    item.chip.beginDrop();
    return this.add(item);
  }

  getEntityAt(x, y) {
    const chip = this.board.getRenderChips().toReversed().find((current) => Math.hypot(current.x - x, current.y - y) <= current.radius);
    const entity = chip && this.entities.get(chip.id);
    return entity?.isStored ? null : entity;
  }

  storeInShoppingBag(item, bag) {
    if (!bag?.store(item)) return false;
    item.chip.isAbsorbing = true;
    this.bagAbsorptions.push({ item, bag, startX: item.chip.x, startY: item.chip.y, elapsed: 0, duration: 0.28 });
    return true;
  }

  hasSelectionSource() {
    return Boolean(this.selection.source);
  }

  beginSelection(entity) {
    if (!entity) return false;
    if (this.selection.source === entity) return true;
    this.selection.source = entity;
    this.activeHero = entity.chip.type === 'hero' ? entity : null;
    return true;
  }

  updateSelectionHover(x, y) {
    this.selection.hover = { x, y, entity: this.getEntityAt(x, y) };
  }

  clearSelection() {
    this.selection = { source: null, hover: null };
    this.activeHero = null;
  }

  getSelectionGuide() {
    const { source, hover } = this.selection;
    if (!source) return null;
    const target = hover?.entity && hover.entity !== source ? hover.entity : null;
    const action = source && target ? this.getSelectionAction(source, target) : null;
    return {
      source,
      links: [],
      target,
      valid: action?.valid ?? null,
      pointerX: hover?.x ?? source?.chip.x,
      pointerY: hover?.y ?? source?.chip.y,
    };
  }

  completeSelectionAt(x, y) {
    const target = this.getEntityAt(x, y);
    if (!target) return false;
    if (!this.selection.source) return this.beginSelection(target);
    if (target === this.selection.source) {
      this.clearSelection();
      return true;
    }
    const action = this.getSelectionAction(this.selection.source, target);
    if (!action?.valid) return false;
    if (action.kind === 'store') {
      const stored = this.storeInShoppingBag(action.item, action.bag);
      if (stored) this.clearSelection();
      return stored;
    }
    this.pickupController.start(action.hero, action.item);
    this.clearSelection();
    return true;
  }

  tap(x, y) {
    const entity = this.getEntityAt(x, y);
    if (!entity) return false;
    if (!this.selection.source) return this.beginSelection(entity);
    return this.completeSelectionAt(x, y);
  }

  getSelectionAction(source, target) {
    if (source.chip.type === 'item' && target.isShoppingBag) {
      return { kind: 'store', valid: target.canStore(source), item: source, bag: target };
    }
    if (source.chip.type !== 'hero' || target.chip.type !== 'item') return { valid: false };
    const canStart = source.currentArea === 'preparation' && source.stamina >= 3;
    if (!canStart) return { valid: false };
    return { kind: 'hero-start', valid: true, hero: source, item: target };
  }

  update(deltaSeconds) {
    this.updateBagAbsorptions(deltaSeconds);
    const warehouseItems = [...this.entities.values()].filter((entity) => entity.chip.type === 'item' && !entity.isStored && this.board.chips.includes(entity.chip));
    this.pickupController.update(warehouseItems, deltaSeconds);
  }

  updateBagAbsorptions(deltaSeconds) {
    this.bagAbsorptions = this.bagAbsorptions.filter((absorption) => {
      absorption.elapsed += deltaSeconds;
      const progress = Math.min(1, absorption.elapsed / absorption.duration);
      const chip = absorption.item.chip;
      chip.x = absorption.startX + (absorption.bag.chip.x - absorption.startX) * progress;
      chip.y = absorption.startY + (absorption.bag.chip.y - absorption.startY) * progress;
      chip.scale = 1 - progress;
      if (progress < 1) return true;
      this.board.removeChip(chip);
      this.entities.delete(chip.id);
      chip.isAbsorbing = false;
      return false;
    });
  }

  updateVisuals() {
    this.entities.forEach((hero) => {
      if (hero.chip.type !== 'hero') return;
      const area = hero.targetArea ?? hero.currentArea;
      hero.chip.fillColors = null;
      hero.chip.borderColors = null;
      if (area && area !== 'preparation') {
        hero.chip.fillColor = AREA_THEME[area].chipFill;
      } else if (this.activeHero === hero) {
        hero.chip.fillColor = AREA_THEME.warehouse.chipFill;
      } else if (hero.stamina < 3) {
        hero.chip.fillColor = AREA_THEME.preparation.chipFill;
      } else {
        hero.chip.fillColor = AREA_THEME.preparation.chipFill;
      }
    });
  }

  getHeroes() {
    return [...this.entities.values()].filter((entity) => entity.chip.type === 'hero');
  }

  getEnemies() {
    return [...this.entities.values()].filter((entity) => entity.chip.type === 'enemy');
  }

  getShoppingBag() {
    return [...this.entities.values()].find((entity) => entity.isShoppingBag) ?? null;
  }
}
