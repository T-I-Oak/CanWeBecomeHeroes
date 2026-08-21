const DESTINATION_LABELS = Object.freeze({ battle: '戦闘', shop: 'ショップ', guild: 'ギルド', training: '訓練' });

export default class ItemPickupController {
  constructor(board, slotManager, gameLog = null) {
    this.board = board;
    this.slotManager = slotManager;
    this.states = new Map();
    this.gameLog = gameLog;
  }

  start(hero, item, secondItem = null) {
    const previous = this.states.get(hero);
    if (previous?.item) previous.item.chip.isPickupTarget = false;
    this.slotManager.release(hero);
    hero.chip.bounds = null;
    hero.targetArea = 'warehouse';
    hero.currentArea = null;
    item.chip.isPickupTarget = true;
    this.states.set(hero, { hero, item, selectedItems: secondItem ? [secondItem] : [], absorption: null, destinationSlot: null });
  }

  update(items, deltaSeconds) {
    [...this.states.values()].forEach((state) => this.updateState(state, items, deltaSeconds));
  }

  updateState(state, items, deltaSeconds) {
    const { hero } = state;
    const heroChip = hero.chip;
    if (state.destinationSlot) {
      if (!heroChip.step) {
        const distance = Math.hypot(heroChip.x - state.destinationSlot.x, heroChip.y - state.destinationSlot.y);
        if (distance <= 0.01) {
          this.slotManager.arrive(hero);
          this.states.delete(hero);
        } else {
          this.board.moveTo(heroChip, state.destinationSlot.x, state.destinationSlot.y, { stepDistance: hero.getStepDistance() });
        }
      }
      return;
    }

    if (!state.item || !this.board.chips.includes(state.item.chip)) {
      this.moveToNextItemOrDestination(state, items);
      return;
    }

    const itemChip = state.item.chip;
    if (state.absorption) {
      state.absorption.elapsed += deltaSeconds;
      const progress = Math.min(1, state.absorption.elapsed / state.absorption.duration);
      itemChip.x = state.absorption.startX + (heroChip.x - state.absorption.startX) * progress;
      itemChip.y = state.absorption.startY + (heroChip.y - state.absorption.startY) * progress;
      itemChip.scale = 1 - progress;
      if (progress < 1) return;
      const pickedItem = state.item;
      if (state.collectionBag) state.collectionBag.store(pickedItem);
      else hero.equip(pickedItem);
      this.board.removeChip(itemChip);
      itemChip.isPickupTarget = false;
      itemChip.isAbsorbing = false;
      state.item = null;
      state.absorption = null;
      state.collectionBag = null;
      this.moveToNextItemOrDestination(state, items, pickedItem);
      return;
    }

    const distance = Math.hypot(heroChip.x - itemChip.x, heroChip.y - itemChip.y);
    if (distance < heroChip.radius + itemChip.radius) {
      itemChip.isAbsorbing = true;
      state.absorption = { startX: itemChip.x, startY: itemChip.y, elapsed: 0, duration: 0.28 };
      return;
    }
    if (!heroChip.step) this.board.moveTo(heroChip, itemChip.x, itemChip.y, { stepDistance: hero.getStepDistance() });
  }

  moveToNextItemOrDestination(state, items, excludedItem = null) {
    const selectedItem = state.selectedItems?.shift();
    if (selectedItem && selectedItem !== excludedItem && this.board.chips.includes(selectedItem.chip) && state.hero.canEquip(selectedItem)) {
      state.item = selectedItem;
      selectedItem.chip.isPickupTarget = true;
      return;
    }
    const nextItem = items
      .filter((candidate) => candidate !== excludedItem && this.board.chips.includes(candidate.chip) && state.hero.canEquip(candidate))
      .toSorted((first, second) => Math.hypot(state.hero.chip.x - first.chip.x, state.hero.chip.y - first.chip.y) - Math.hypot(state.hero.chip.x - second.chip.x, state.hero.chip.y - second.chip.y))[0];
    if (nextItem) {
      state.item = nextItem;
      nextItem.chip.isPickupTarget = true;
      return;
    }
    const bag = [state.hero.equipment.rightHand, state.hero.equipment.leftHand].find((item) => item?.isShoppingBag);
    const bagItem = bag && items
      .filter((candidate) => candidate !== excludedItem && this.board.chips.includes(candidate.chip) && bag.canStore(candidate))
      .toSorted((first, second) => Math.hypot(state.hero.chip.x - first.chip.x, state.hero.chip.y - first.chip.y) - Math.hypot(state.hero.chip.x - second.chip.x, state.hero.chip.y - second.chip.y))[0];
    if (bagItem) {
      state.item = bagItem;
      state.collectionBag = bag;
      bagItem.chip.isPickupTarget = true;
      return;
    }
    this.moveToDestinationSlot(state);
  }

  moveToDestinationSlot(state) {
    const destinationItem = [state.hero.equipment.rightHand, state.hero.equipment.leftHand]
      .find((item) => item?.category === 'destination');
    const area = destinationItem?.destination ?? 'battle';
    const slot = this.slotManager.reserve(state.hero, area);
    if (!slot) {
      this.states.delete(state.hero);
      return;
    }
    state.destinationSlot = slot;
    this.board.moveTo(state.hero.chip, slot.x, slot.y, { stepDistance: state.hero.getStepDistance() });
    this.gameLog?.log(`【${state.hero.profession}・${state.hero.name.ja}】は${DESTINATION_LABELS[area]}に向かって出発した。`, { subject: 'hero', level: 'info' });
  }
}
