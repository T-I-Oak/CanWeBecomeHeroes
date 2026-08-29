const ROUTES = Object.freeze(['route1', 'route2', 'route3']);

function normalizedCosine(stageNumber, { minimumStage, period }) {
  return 0.5 - 0.5 * Math.cos((2 * Math.PI * (stageNumber - minimumStage)) / period);
}

export function getBossProbability(route, stageNumber) {
  if (route === 'route1') return stageNumber % 7 === 0 ? 1 : 0;
  if (stageNumber < 7) return 0;
  return 0.5 + 0.5 * Math.cos((2 * Math.PI * (stageNumber - 7)) / 7);
}

export function getEliteProbability(route, stageNumber, joinedCount) {
  if (route === 'route1') return normalizedCosine(stageNumber, { minimumStage: 1, period: 5 });
  if (route === 'route2') return normalizedCosine(stageNumber, { minimumStage: 1, period: 3 });
  if (joinedCount === 0 && [5, 6].includes(stageNumber)) return 1;
  if (joinedCount === 1 && stageNumber === 6) return 1;
  return 0.25;
}

export function getStageKindForRoute({ route, stageNumber, joinedCount = 0, random = Math.random }) {
  if (!ROUTES.includes(route)) throw new RangeError(`Unknown stage route: ${route}`);
  if (random() < getBossProbability(route, stageNumber)) return 'boss';
  if (random() < getEliteProbability(route, stageNumber, joinedCount)) return 'elite';
  return 'regular';
}

export function createStageRouteKinds({ stageNumber, joinedCount = 0, random = Math.random }) {
  const routeKinds = ROUTES.map((route) => Object.freeze({ route, kind: getStageKindForRoute({ route, stageNumber, joinedCount, random }) }));
  for (let index = routeKinds.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [routeKinds[index], routeKinds[swapIndex]] = [routeKinds[swapIndex], routeKinds[index]];
  }
  return Object.freeze(routeKinds);
}

export { ROUTES as STAGE_ROUTES };
