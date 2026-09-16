import { GAME_AREAS, getPreparationSubareaBounds } from '../game/GameAreas.js';
import { BATTLE_ENEMY_AREA_HEIGHT, HERO_SLOT_SIZE } from '../game/HeroSlotLayout.js';

function drawTiledSurface(context, assets, imagePath, bounds) {
  const { x, y, width, height } = bounds;
  const image = assets.load(imagePath);
  if (!image.complete || image.naturalWidth === 0) return;
  const pattern = context.createPattern(image, 'repeat');
  if (!pattern) return;
  context.save();
  context.beginPath();
  context.rect(x, y, width, height);
  context.clip();
  context.translate(x, y);
  context.fillStyle = pattern;
  context.fillRect(0, 0, width, height);
  context.restore();
}

function drawBattleSlotGround(context, assets) {
  const image = assets.load('/assets/background/trampled-ground.png');
  if (!image.complete || image.naturalWidth === 0) return;
  const battle = GAME_AREAS.battle;
  const startX = battle.x + (battle.width - HERO_SLOT_SIZE * 6) / 2;
  const rows = [
    { columns: [0, 1, 2, 3, 4, 5], y: battle.y + (BATTLE_ENEMY_AREA_HEIGHT - HERO_SLOT_SIZE) / 2 },
    { columns: [1, 2, 3, 4], y: battle.y + BATTLE_ENEMY_AREA_HEIGHT },
  ];
  rows.forEach(({ columns, y }) => columns.forEach((column) => context.drawImage(image, startX + column * HERO_SLOT_SIZE, y, HERO_SLOT_SIZE, HERO_SLOT_SIZE)));
}

export function drawWorldSurfaces(context, assets, preparationHeroCount) {
  ['warehouse', 'battle', 'shop', 'guild', 'training'].forEach((areaName) => drawTiledSurface(context, assets, `/assets/background/${areaName}.png`, GAME_AREAS[areaName]));
  Array.from({ length: preparationHeroCount }, (_, index) => drawTiledSurface(context, assets, '/assets/background/preparation.png', getPreparationSubareaBounds(index)));
  drawBattleSlotGround(context, assets);
}
