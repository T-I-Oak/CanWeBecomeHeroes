import ChipBoard from '../../src/chips/ChipBoard.js';
import ChipRenderer from '../../src/chips/ChipRenderer.js';
import AssetLoader from '../../src/chips/AssetLoader.js';
import HeroFactory from '../../src/game/HeroFactory.js';
import EnemyFactory from '../../src/game/EnemyFactory.js';
import ItemFactory from '../../src/game/ItemFactory.js';
import HeroSlotManager from '../../src/game/HeroSlotManager.js';
import ItemPickupController from '../../src/game/ItemPickupController.js';
import HeroItemInteractionController from '../../src/game/HeroItemInteractionController.js';
import FacilityReturnSystem from '../../src/game/FacilityReturnSystem.js';
import BattleSystem from '../../src/game/BattleSystem.js';
import { APP_VERSION } from '../../src/game/AppMetadata.js';
import { GAME_AREAS, WORLD_SIZE } from '../../src/game/GameAreas.js';

const canvas = document.querySelector('#board');
const context = canvas.getContext('2d');
const renderer = new ChipRenderer(context, new AssetLoader());
document.querySelector('#version').textContent = `v${APP_VERSION}`;
let scene;
function reset() {
  const board = new ChipBoard(WORLD_SIZE);
  const slots = new HeroSlotManager();
  const pickup = new ItemPickupController(board, slots);
  const controller = new HeroItemInteractionController(board, pickup);
  const returns = new FacilityReturnSystem(board, slots);
  const items = new ItemFactory();
  const bounds = GAME_AREAS.preparation;
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: bounds.x + 120, y: bounds.y + 120, bounds, stamina: Number(document.querySelector('#stamina').value), maximums: { stamina: 100 } });
  hero.currentArea = 'battle';
  hero.chip.x = GAME_AREAS.battle.x + 500;
  hero.chip.y = 650;
  hero.chip.bounds = null;
  for (const weapon of ['sword', 'shield']) hero.equip(items.createWeapon({ weapon, tags: [], x: 0, y: 0 }));
  for (const part of ['head', 'torso', 'feet']) {
    hero.equip(items.createBodyItem({ part, tags: ['valor'], x: 0, y: 0, random: () => 0 }));
  }
  const enemy = new EnemyFactory({ itemFactory: items }).createFromDefinition({ enemyDefinitionId: 'medium-feather', slotPosition: 3, maximumHp: 100, totalTagCount: 0, weaponCount: 0, random: () => 0 });
  [hero, enemy].forEach((entity) => { controller.add(entity); entity.chip.height = 0; entity.chip.impactOnLanding = false; });
  let firstRoll = true;
  const random = () => {
    if (!firstRoll) return Math.random();
    firstRoll = false;
    return 0;
  };
  const battle = new BattleSystem(board, { controller, itemFactory: items, returnSystem: returns, random });
  scene = { board, controller, pickup, returns, hero, enemy, battle, started: false, elapsed: 0 };
}
document.querySelector('#play').addEventListener('click', () => {
  reset();
  scene.battle.resolveAction(scene.enemy, scene.hero, [scene.enemy, scene.hero]);
  scene.started = true;
});
reset();
let previous;
function frame(time) {
  const delta = Math.min(0.05, previous === undefined ? 0 : (time - previous) / 1000) * Number(document.querySelector('#speed').value);
  previous = time;
  const s = scene;
  s.elapsed += delta;
  s.board.update(delta);
  s.controller.updateItemTransfers(delta);
  s.battle.gustSystem.update();
  if (!s.battle.gustSystem.isGusting(s.hero)) {
    s.pickup.update([...s.controller.entities.values()].filter((entity) => entity.chip.type === 'item'), delta);
    s.returns.update(s.hero);
  }
  const phase = s.battle.gustSystem.gusting.get(s.hero)?.phase;
  document.querySelector('#state').textContent = !s.started ? '再生待ち' : phase === 'rising' ? '上へ吹き飛ばし中' : phase === 'falling' ? 'Heroと装備が倉庫へ落下中' : '着地後の移動';
  context.clearRect(0, 0, canvas.width, canvas.height);
  const scale = Math.min(canvas.width / WORLD_SIZE.width, canvas.height / WORLD_SIZE.height);
  context.save();
  context.scale(scale, scale);
  for (const [id, label] of [['battle', '戦闘エリア'], ['warehouse', '倉庫'], ['preparation', '準備エリア']]) {
    const area = GAME_AREAS[id];
    context.fillStyle = id === 'battle' ? '#dcd6cd' : '#e6e0d2';
    context.fillRect(area.x, area.y, area.width, area.height);
    context.strokeStyle = '#8a8376';
    context.strokeRect(area.x, area.y, area.width, area.height);
    context.font = '40px sans-serif';
    context.fillStyle = '#29313d';
    context.fillText(label, area.x + 20, area.y + 50);
  }
  s.board.getRenderChips().forEach((chip) => renderer.draw(chip, s.elapsed));
  context.restore();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
