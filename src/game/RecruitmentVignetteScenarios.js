import { RECRUITMENT_HERO_PLACEMENTS, recruitmentEnemyPlacement } from './RecruitmentVignetteLayout.js';

const HERO_RADIUS = RECRUITMENT_HERO_PLACEMENTS.A.radius;
const HERO_FOOT_Y = RECRUITMENT_HERO_PLACEMENTS.A.y;
const HERO_X = Object.freeze(Object.fromEntries(Object.entries(RECRUITMENT_HERO_PLACEMENTS).map(([role, placement]) => [role, placement.x])));
const FRAME_SECONDS = 0.7;
const COMBAT_SECONDS = 1.4;
const DEFEAT_SECONDS = 0.65;
const LINE_SECONDS = 3;
const TALK_HOP = 7;
const TALK_HOP_SECONDS = 0.16;
const ENTRANCE_SECONDS = 1.2;
const X_ENTER_X = 620;

function position(instanceId, x, y, seconds = 0, wait = -1) {
  return { type: 'position', instanceId, x, y, seconds, wait };
}

function facing(instanceId, chipRadius, direction = 'right', stepDistance = 0, phase = 0, fillColor = '#bfdbfe') {
  return { type: 'facing', instanceId, chipRadius, direction, stepDistance, phase, forwardSeconds: 0.14, backSeconds: 0.36, fillColor };
}

function dialogue(role, lineId, heroId, texts) {
  return [
    { type: 'line', instanceId: role, text: texts.getVignetteLine('recruitmentObservedVictory', lineId, heroId), width: 528, direction: 'up', seconds: LINE_SECONDS, wait: -1,
      action: { type: 'hop', height: TALK_HOP, seconds: TALK_HOP_SECONDS * 2 } },
  ];
}

export function createObservedVictoryScenario({ cast, enemies, textRepository }) {
  const roles = cast.C ? ['A', 'B', 'C'] : ['A', 'B'];
  const enemyActors = enemies.map((enemy, index) => {
    return { id: `enemy-${index}`, kind: 'enemy', enemyId: enemy.definition.id, ...recruitmentEnemyPlacement(enemy) };
  });
  const frontToBackEnemies = [...enemyActors].sort((left, right) => right.y - left.y);
  const inviteRole = cast.C ? 'C' : 'B';
  return {
    instances: [
      ...Object.entries(cast).map(([id, heroId]) => ({ id, kind: 'character', heroId })),
      ...frontToBackEnemies.map(({ id, kind, enemyId }) => ({ id, kind, enemyId })),
    ],
    commands: [
      { type: 'background', asset: '/assets/vignette/trial-field.png', scrollX: 0, offsetX: 0 },
      ...roles.flatMap((role) => [position(role, HERO_X[role], HERO_FOOT_Y), facing(role, HERO_RADIUS)]),
      position('X', X_ENTER_X, HERO_FOOT_Y),
      facing('X', HERO_RADIUS, 'left'),
      ...enemyActors.flatMap((enemy) => [position(enemy.id, enemy.x, enemy.y), facing(enemy.id, enemy.radius, 'left', 0, 0, '#fca5a5')]),
      { type: 'pinchOut', seconds: FRAME_SECONDS, wait: -1 },
      ...roles.map((role, index) => facing(role, HERO_RADIUS, 'right', 16, index * 0.2)),
      ...enemyActors.map((enemy, index) => facing(enemy.id, enemy.radius, 'left', 16 * enemy.scale, index * 0.15, '#fca5a5')),
      position('A', HERO_X.A, HERO_FOOT_Y, COMBAT_SECONDS),
      ...roles.map((role) => facing(role, HERO_RADIUS)),
      ...enemyActors.map((enemy) => facing(enemy.id, enemy.radius, 'left', 0, 0, '#fca5a5')),
      ...enemyActors.map((enemy, index) => position(enemy.id, enemy.x + 100, -100 - enemy.radius, DEFEAT_SECONDS, index === enemyActors.length - 1 ? -1 : 0)),
      ...dialogue('A', 'victory', cast.A, textRepository),
      ...dialogue('B', 'agreement', cast.B, textRepository),
      facing('X', HERO_RADIUS, 'left', 10),
      position('X', HERO_X.X, HERO_FOOT_Y, ENTRANCE_SECONDS),
      facing('X', HERO_RADIUS, 'left'),
      ...dialogue('X', 'praise', cast.X, textRepository),
      ...dialogue(inviteRole, 'invitation', cast[inviteRole], textRepository),
      ...dialogue('X', 'acceptance', cast.X, textRepository),
      ...dialogue('A', 'closing', cast.A, textRepository),
      { type: 'pinchIn', seconds: FRAME_SECONDS, wait: -1 },
    ],
  };
}
