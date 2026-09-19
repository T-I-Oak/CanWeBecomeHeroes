import { getTagBaseColors, getTagGlyphScales, getTagPaths, getTagValue, getTagWeight } from './TagCatalog.js';

export default class Item {
  constructor({ type, category, tags, chip, equipmentAssets, value }) {
    this.type = type;
    this.category = category;
    this.tags = tags;
    this.chip = chip;
    this.equipmentAssets = equipmentAssets;
    this.value = value;
    this.isStored = false;
    this.storedItems = [];
    this.storageCapacity = type === 'shopping-bag' ? 3 : 0;
    if (this.storageCapacity > 0) {
      this.chip.storageCapacity = this.storageCapacity;
      this.chip.storageCount = 0;
    }
  }

  get isShoppingBag() {
    return this.type === 'shopping-bag';
  }

  canStore(item) {
    return this.isShoppingBag && item !== this && item.category !== 'destination' && this.storedItems.length < this.storageCapacity;
  }

  store(item) {
    if (!this.canStore(item)) return false;
    this.storedItems.push(item);
    item.isStored = true;
    this.chip.storageCount = this.storedItems.length;
    return true;
  }

  addTag(tag) {
    if (this.tags.length >= 3) return false;
    this.tags.push(tag);
    this.refreshTagDerivedValues();
    return true;
  }

  removeTagAt(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.tags.length) return null;
    const [tag] = this.tags.splice(index, 1);
    this.refreshTagDerivedValues();
    return tag;
  }

  refreshTagDerivedValues() {
    this.chip.weight = getTagWeight(this.tags);
    this.chip.tagPaths = getTagPaths(this.tags);
    this.chip.tagBaseColors = getTagBaseColors(this.tags);
    this.chip.tagGlyphScales = getTagGlyphScales(this.tags);
    this.value = getTagValue(this.tags);
  }
}
