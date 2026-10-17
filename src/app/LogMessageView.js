import { resolvePublicAssetPath } from '../chips/PublicAssetPath.js';
import { createTermIcon } from './InformationWindowVisualFactory.js';
import { createDefinitionInformationTarget } from './InformationTarget.js';

function getReferenceTarget(part) {
  if (['hero', 'enemy', 'item', 'unique-skill'].includes(part.kind)) {
    return { type: 'definition', data: { target: createDefinitionInformationTarget(part.kind, part.id) } };
  }
  return { type: part.kind, data: { [part.kind]: part.id } };
}

function createReferenceIcon(part) {
  if (!part.iconPath) return createTermIcon('FlowLog__TermIcon');
  const icon = document.createElement('img');
  icon.className = 'FlowLog__ReferenceIcon';
  icon.alt = '';
  icon.src = resolvePublicAssetPath(part.iconPath);
  return icon;
}

/** Flowing logs are passive; history opts into static information links. */
export function renderLogMessage(element, parts, { open = null, parentId = null } = {}) {
  element.replaceChildren(...parts.map((part) => {
    if (part.type === 'text') return document.createTextNode(part.value);
    const reference = document.createElement(open ? 'button' : 'span');
    reference.className = 'FlowLog__Reference';
    reference.dataset.referenceKind = part.kind;
    reference.dataset.referenceId = part.id;
    if (open) {
      reference.type = 'button';
      reference.classList.add('LogHistory__Reference');
      reference.addEventListener('click', event => open({ ...getReferenceTarget(part), parentId,
        anchor: { x: event.clientX, y: event.clientY } }));
    }
    const label = document.createElement('span');
    label.className = 'FlowLog__ReferenceLabel';
    label.textContent = part.label;
    reference.append(createReferenceIcon(part), label);
    return reference;
  }));
}
