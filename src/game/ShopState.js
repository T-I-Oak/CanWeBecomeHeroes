import { TAGS } from './TagCatalog.js';

const TAG_KEYS = Object.freeze(Object.keys(TAGS));

export default class ShopState {
  constructor({ saleTag, nextTag, laterTag = nextTag }) {
    this.saleTag = saleTag;
    this.nextTag = nextTag;
    this.laterTag = laterTag;
  }

  static createRandom(random = Math.random) {
    return new ShopState({
      saleTag: TAG_KEYS[Math.floor(random() * TAG_KEYS.length)],
      nextTag: TAG_KEYS[Math.floor(random() * TAG_KEYS.length)],
      laterTag: TAG_KEYS[Math.floor(random() * TAG_KEYS.length)],
    });
  }

  advance(random = Math.random) {
    this.saleTag = this.nextTag;
    this.nextTag = this.laterTag;
    this.laterTag = TAG_KEYS[Math.floor(random() * TAG_KEYS.length)];
  }

  applyRouteTrends({ saleTag, nextTag }, { preserveCurrent = false, random = Math.random } = {}) {
    if (!TAG_KEYS.includes(saleTag) || !TAG_KEYS.includes(nextTag)) throw new RangeError('Unknown shop trend tag.');
    if (preserveCurrent) {
      this.nextTag = saleTag;
      this.laterTag = nextTag;
      return;
    }
    this.saleTag = saleTag;
    this.nextTag = nextTag;
    this.laterTag = TAG_KEYS[Math.floor(random() * TAG_KEYS.length)];
  }
}
