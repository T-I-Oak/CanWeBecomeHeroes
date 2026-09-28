import { resolvePublicAssetPath } from '../chips/PublicAssetPath.js';
import { createTermIcon } from './InformationWindowVisualFactory.js';

function createReferenceIcon(part) {
  if (!part.iconPath) return createTermIcon('FlowLog__TermIcon');
  const icon = document.createElement('img');
  icon.className = 'FlowLog__ReferenceIcon';
  icon.alt = '';
  icon.src = resolvePublicAssetPath(part.iconPath);
  return icon;
}

/** Renders log references as icon and name. The elements are not controls. */
export function renderLogMessage(element, parts) {
  element.replaceChildren(...parts.map((part) => {
    if (part.type === 'text') return document.createTextNode(part.value);
    const reference = document.createElement('span');
    reference.className = 'FlowLog__Reference';
    reference.dataset.referenceKind = part.kind;
    reference.dataset.referenceId = part.id;
    const label = document.createElement('span');
    label.className = 'FlowLog__ReferenceLabel';
    label.textContent = part.label;
    reference.append(createReferenceIcon(part), label);
    return reference;
  }));
}
