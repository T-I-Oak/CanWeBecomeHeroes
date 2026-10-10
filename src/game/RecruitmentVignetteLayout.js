export const RECRUITMENT_PERSPECTIVE = Object.freeze({ vanishingX: 180, horizonY: 140, groundHeight: 200 });

export function projectRecruitmentGround({ lateral, depth }, baseRadius) {
  const scale = 1 / depth;
  const { vanishingX, horizonY, groundHeight } = RECRUITMENT_PERSPECTIVE;
  return { x: vanishingX + lateral * scale, y: horizonY + groundHeight * scale, radius: baseRadius * scale, scale };
}

export const RECRUITMENT_HERO_PLACEMENTS = Object.freeze(Object.fromEntries(
  Object.entries({ C: -106, A: -6, B: 94, X: 290 }).map(([role, lateral]) => [role, projectRecruitmentGround({ lateral, depth: 1 }, 40)]),
));

const ENEMY_BASE_RADIUS = Object.freeze({ small: 32, medium: 48 });
const ENEMY_FRONT_DEPTH = 1.6;
const ENEMY_COLUMN_SPACING = 160;
const ENEMY_CENTER_X = (RECRUITMENT_HERO_PLACEMENTS.A.x + RECRUITMENT_HERO_PLACEMENTS.B.x) / 2;
const ENEMY_CENTER_LATERAL = (ENEMY_CENTER_X - RECRUITMENT_PERSPECTIVE.vanishingX) * ENEMY_FRONT_DEPTH;
const ENEMY_GROUND_SLOTS = Object.freeze([
  { lateral: ENEMY_CENTER_LATERAL - ENEMY_COLUMN_SPACING, depth: ENEMY_FRONT_DEPTH },
  { lateral: ENEMY_CENTER_LATERAL - ENEMY_COLUMN_SPACING / 2, depth: 2 },
  { lateral: ENEMY_CENTER_LATERAL, depth: ENEMY_FRONT_DEPTH },
  { lateral: ENEMY_CENTER_LATERAL + ENEMY_COLUMN_SPACING / 2, depth: 2 },
  { lateral: ENEMY_CENTER_LATERAL + ENEMY_COLUMN_SPACING, depth: ENEMY_FRONT_DEPTH },
  { lateral: ENEMY_CENTER_LATERAL + ENEMY_COLUMN_SPACING * 1.5, depth: 2 },
]);

export function recruitmentEnemyPlacement(enemy) {
  return projectRecruitmentGround(ENEMY_GROUND_SLOTS[enemy.slotPosition - 1], ENEMY_BASE_RADIUS[enemy.definition.size]);
}
