import { isEntityOnBoard } from './CombatParticipant.js';

export default class CombatProjectionSystem {
  constructor({ board, controller, actionGaugeSystem, clearCombatant = () => {} }) {
    Object.assign(this, { board, controller, actionGaugeSystem, clearCombatant });
    this.areaHeads = [];
  }

  launchAreaHead(source, head) {
    this.areaHeads.push(head);
    const maximum = this.actionGaugeSystem.updateMaximum(head);
    head.chip.actionGauge = maximum;
    const placeHead = () => {
      if (!this.areaHeads.includes(head)) return;
      if (this.controller?.add) this.controller.add(head);
      else this.board.addChip(head.chip);
    };
    const animated = this.controller?.animateChipTransfer?.(head, {
      from: { x: source.chip.x, y: source.chip.y },
      to: { x: head.chip.x, y: head.chip.y },
      onComplete: placeHead,
    });
    if (!animated) placeHead();
  }

  returnAreaHead(head, { animate = true } = {}) {
    if (!this.areaHeads.includes(head)) return;
    this.clearCombatant(head);
    if (this.controller?.destroy) this.controller.destroy(head);
    else {
      this.board.removeChip(head.chip);
      this.controller?.remove?.(head);
    }
    this.areaHeads = this.areaHeads.filter((current) => current !== head);
    const source = head.projectionSource;
    if (!animate || !source || !isEntityOnBoard(this.board, source)) return;
    this.controller?.animateChipTransfer?.(head, {
      from: { x: head.chip.x, y: head.chip.y },
      to: { x: source.chip.x, y: source.chip.y },
    });
  }

  returnAreaHeadsFrom(source) {
    this.areaHeads.filter((head) => head.projectionSource === source).forEach((head) => this.returnAreaHead(head, { animate: false }));
  }

  clearAreaHeads() {
    [...this.areaHeads].forEach((head) => this.returnAreaHead(head, { animate: false }));
  }
}
