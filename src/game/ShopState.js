import { TAGS } from './TagCatalog.js';

const TAG_KEYS = Object.freeze(Object.keys(TAGS));

export default class ShopState {
  constructor({ saleTag, nextTag }) {
    this.saleTag = saleTag;
    this.nextTag = nextTag;
  }

  static createRandom(random = Math.random) {
    return new ShopState({
      saleTag: TAG_KEYS[Math.floor(random() * TAG_KEYS.length)],
      nextTag: TAG_KEYS[Math.floor(random() * TAG_KEYS.length)],
    });
  }

  advance(random = Math.random) {
    this.saleTag = this.nextTag;
    this.nextTag = TAG_KEYS[Math.floor(random() * TAG_KEYS.length)];
  }
}
