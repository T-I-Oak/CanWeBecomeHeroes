export const RANKING_LIMIT = 10;
export const RANKING_CRITERIA = Object.freeze({
  trial: Object.freeze(['remainingHours', 'defeats', 'points']),
  challenge: Object.freeze(['clearedStages', 'elapsedTicks', 'defeats', 'points']),
});

function compare(criterion) {
  return (left, right) => {
    const difference = right[criterion] - left[criterion];
    if (difference) return difference;
    if (criterion === 'remainingHours' && left.outcome === 'expired' && right.outcome === 'expired') {
      const stages = right.clearedStages - left.clearedStages;
      if (stages) return stages;
    }
    return Date.parse(right.endedAt) - Date.parse(left.endedAt);
  };
}

export default class RunRankings {
  constructor(data = []) {
    this.data = structuredClone(data);
  }

  get(mode, criterion) {
    if (!RANKING_CRITERIA[mode]?.includes(criterion)) throw new RangeError(`Unknown ranking: ${mode}/${criterion}`);
    return this.data.filter(row => row.mode === mode).sort(compare(criterion)).slice(0, RANKING_LIMIT);
  }

  add(result) {
    if (!RANKING_CRITERIA[result.mode]) throw new RangeError(`Unknown ranking mode: ${result.mode}`);
    if (this.data.some(row => row.id === result.id)) return;
    this.data.push(structuredClone(result));
    const retained = new Set();
    Object.entries(RANKING_CRITERIA).forEach(([mode, criteria]) => {
      criteria.forEach(criterion => this.get(mode, criterion).forEach(row => retained.add(row.id)));
    });
    this.data = this.data.filter(row => retained.has(row.id));
  }
}
