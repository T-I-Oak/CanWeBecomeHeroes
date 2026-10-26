const FULL_SCAN_CHANGED_RATIO = 0.02;
const FULL_SCAN_CONTACTS_PER_CHIP = 4;

export default class ChipContactPairs {
  constructor() {
    this.states = [];
    this.indices = [];
    this.contacts = new Set();
    this.dense = false;
  }

  begin(chips) {
    const count = chips.length;
    if (this.indices.length !== count) this.indices = Array.from({ length: count }, (_, i) => i);
    const reset = this.states.length !== count || chips.some((chip, i) => this.states[i].chip !== chip);
    if (reset) { this.states = []; this.contacts.clear(); }
    const changed = [];
    chips.forEach((chip, index) => {
      let state = this.states[index];
      if (!state) state = this.states[index] = { chip };
      if (reset || state.x !== chip.x || state.y !== chip.y || state.radius !== chip.radius
        || state.height !== chip.height || state.rise !== chip.rise
        || state.pickup !== chip.isPickupTarget || state.transfer !== chip.isTransferVisual) changed.push(index);
      // Capture before solving: moved chips must also be reconsidered on the next update.
      state.x = chip.x; state.y = chip.y; state.radius = chip.radius;
      state.height = chip.height; state.rise = chip.rise;
      state.pickup = chip.isPickupTarget; state.transfer = chip.isTransferVisual;
    });
    this.nextContacts = new Set();
    this.nextDense = false;
    this.count = count;
    if (this.dense || changed.length > count * FULL_SCAN_CHANGED_RATIO) return null;
    const candidates = new Set(this.contacts);
    changed.forEach(index => {
      for (let other = 0; other < count; other++) {
        if (other === index) continue;
        const key = Math.min(index, other) * count + Math.max(index, other);
        candidates.add(key);
      }
    });
    const rows = new Map();
    for (const key of [...candidates].sort((a, b) => a - b)) {
      const i = Math.floor(key / count), j = key % count;
      if (!rows.has(i)) rows.set(i, []);
      rows.get(i).push(j);
    }
    return rows;
  }

  record(first, second) {
    if (this.nextDense) return;
    this.nextContacts.add(first * this.count + second);
    if (this.nextContacts.size > this.count * FULL_SCAN_CONTACTS_PER_CHIP) {
      this.nextDense = true;
      this.nextContacts.clear();
    }
  }

  finish() {
    this.contacts = this.nextContacts;
    this.dense = this.nextDense;
  }
}
