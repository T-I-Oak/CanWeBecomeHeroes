import { getUniqueSkillDetail } from '../game/UniqueSkillCatalog.js';
import { createInformationElement } from './InformationWindowElementFactory.js';
import { createTagIcon } from './InformationWindowVisualFactory.js';
import { createDefinitionInformationTarget } from './InformationTarget.js';

export function createInformationWindowUniqueSkillButton({ uniqueSkill, parentId, open, textRepository }) {
  const detail = getUniqueSkillDetail(uniqueSkill.id);
  const button = createInformationElement('button', `InformationWindow__UniqueSkill state-clickable level-${uniqueSkill.level}`);
  button.type = 'button';
  button.setAttribute('aria-label', textRepository.getLabel('openInformation', {
    name: `${textRepository.getInformationDetail('unique-skill', uniqueSkill.id).name} Ex${uniqueSkill.level}`,
  }));
  button.append(createTagIcon(detail.affinityTag), createInformationElement('span', 'InformationWindow__UniqueSkillMark', `Ex${uniqueSkill.level}`));
  button.addEventListener('click', event => open({
    type: 'definition', parentId, data: { target: createDefinitionInformationTarget('unique-skill', uniqueSkill.id) },
    anchor: { x: event.clientX, y: event.clientY },
  }));
  return button;
}
