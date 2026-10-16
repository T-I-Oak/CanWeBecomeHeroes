import { getEnemyDefinitionById } from '../game/EnemyCatalog.js';
import { getEnemyChipScale } from '../game/HeroSlotLayout.js';
import { resolvePublicAssetPath } from '../chips/PublicAssetPath.js';
import { createEncounterEnemies } from '../game/EncounterDefinitions.js';

export function getCroppedEnemySlots({ kind, pattern, level }) {
  const enemies = createEncounterEnemies({ kind, pattern, level, enemyFactory: {
    createFromDefinition: ({ enemyDefinitionId, slotPosition }) => ({
      id: enemyDefinitionId, position: slotPosition,
      span: getEnemyDefinitionById(enemyDefinitionId).size === 'large' ? 2 : 1,
    }),
  } });
  const slots = [];
  for (let position = 1; position <= 6;) {
    const slot = enemies.find(enemy => enemy.position === position) ?? { id: null, position, span: 1 };
    slots.push(slot);
    position += slot.span;
  }
  return slots;
}

export function createCroppedEnemyLine(formation, assets, texts, onOpenInformation) {
  const line = document.createElement('div');
  line.className = 'CroppedEnemyLine';
  line.style.setProperty('--enemy-line-scale', getEnemyChipScale(getEnemyDefinitionById(formation.pattern.main).size));
  for (const { id, position, span } of getCroppedEnemySlots(formation)) {
    const frame = document.createElement('div');
    frame.className = 'CroppedEnemyLine__Slot';
    frame.style.gridColumn = `${position} / span ${span}`;
    if (!id) {
      frame.classList.add('state-empty');
      line.append(frame);
      continue;
    }
    const definition = getEnemyDefinitionById(id);
    frame.style.setProperty('--enemy-scale', getEnemyChipScale(definition.size));
    const name = texts.getName('enemy', id);
    frame.setAttribute('role', 'img');
    frame.setAttribute('aria-label', name);
    const image = document.createElement('img');
    image.className = 'CroppedEnemyLine__Image';
    image.src = resolvePublicAssetPath(definition.assetPath);
    image.alt = '';
    image.draggable = false;
    frame.append(image);
    frame.addEventListener('click', event => onOpenInformation(id, event));
    line.append(frame);
  }
  return line;
}
