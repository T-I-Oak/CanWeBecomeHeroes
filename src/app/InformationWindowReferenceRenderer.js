import { getEnemyDefinitionById } from '../game/EnemyCatalog.js';
import { getItemDefinitionAssetPath } from '../game/ItemFactory.js';
import { resolvePublicAssetPath } from '../chips/PublicAssetPath.js';
import { createInformationElement } from './InformationWindowElementFactory.js';
import { createItemValueIcon, createLocationIcon, createStatusIcon, createTagIcon, createTermIcon } from './InformationWindowVisualFactory.js';
import { createDefinitionInformationTarget } from './InformationTarget.js';

export default class InformationWindowReferenceRenderer {
  constructor({ textRepository, open }) {
    this.textRepository = textRepository;
    this.open = open;
  }

  setTextRepository(textRepository) { this.textRepository = textRepository; }

  createLinkedDescription(content, parentId, className = 'InformationWindow__Description', tagName = 'p') {
    const text = createInformationElement(tagName, className);
    (Array.isArray(content) ? content : [content]).forEach((part) => {
      if (typeof part === 'string') text.append(part);
      else if (part.type === 'text') text.append(part.value);
      else if (part.type === 'reference') text.append(this.createReference(part, parentId));
      else if (part.type === 'status') text.append(this.createStatusReference(part, parentId));
      else if (part.type === 'tag') text.append(this.createTagReference(part, parentId));
      else if (part.type === 'term') text.append(this.createTermReference({ id: part.id, parentId }));
      else if (part.type === 'facility') text.append(this.createFacilityReference(part, parentId));
      else if (part.type === 'area') text.append(this.createAreaReference(part, parentId));
      else if (part.type === 'enemy-definition') text.append(this.createEnemyDefinitionReference(part, parentId));
    });
    return text;
  }

  createReference({ kind, id, label = null }, parentId) {
    if (kind === 'enemy-definition') return this.createEnemyDefinitionReference({ id }, parentId);
    if (kind === 'item') return this.createItemDefinitionReference({ id }, parentId);
    const name = this.textRepository.getName(kind, id);
    if (!name) throw new RangeError(`Unknown localized reference: ${kind}/${id}`);
    if (kind === 'status') return this.createStatusReference({ id, label: name }, parentId);
    if (kind === 'tag') return this.createTagReference({ id, label: name }, parentId);
    if (kind === 'area') return this.createAreaReference({ id, label: name }, parentId);
    if (kind === 'term') return this.createTermReference({ id, parentId, label });
    return this.createFacilityReference({ id, label }, parentId);
  }

  createStatusReference({ id }, parentId) {
    const label = this.textRepository.getName('status', id);
    return this.#createReferenceButton({
      label,
      icon: createStatusIcon(id),
      type: 'status',
      parentId,
      data: { status: id },
    });
  }

  createTagReference({ id }, parentId) {
    const label = this.textRepository.getName('tag', id);
    return this.#createReferenceButton({
      label,
      icon: createTagIcon(id, 'InformationWindow__TagIcon--inline'),
      type: 'tag',
      parentId,
      data: { tag: id },
      ariaLabel: this.textRepository.getLabel('openTagInformation', { name: label }),
    });
  }

  createTermReference({ id, parentId, className = 'InformationWindow__InlineReference', label = null, includeIcon = true }) {
    const name = this.textRepository.getName('term', id);
    return this.#createReferenceButton({
      label: label ?? name,
      icon: includeIcon ? (id === 'item-value' ? createItemValueIcon() : createTermIcon()) : null,
      type: 'term',
      parentId,
      data: { term: id },
      className,
      ariaLabel: this.textRepository.getLabel('openInformation', { name }),
    });
  }

  createFacilityReference({ id }, parentId) {
    const label = this.textRepository.getName('facility', id);
    return this.#createReferenceButton({ label, icon: createLocationIcon(id), type: 'facility', parentId, data: { facility: id } });
  }

  createAreaReference({ id }, parentId) {
    const label = this.textRepository.getName('area', id);
    return this.#createReferenceButton({ label, icon: createLocationIcon(id), type: 'area', parentId, data: { area: id } });
  }

  createEnemyDefinitionReference({ id }, parentId) {
    const label = this.textRepository.getName('enemy', id);
    const definition = getEnemyDefinitionById(id);
    const icon = createInformationElement('span', 'InformationWindow__InlineIcon InformationWindow__InlineEnemyIcon');
    const image = document.createElement('img');
    image.src = resolvePublicAssetPath(definition.assetPath);
    image.alt = '';
    icon.append(image);
    return this.#createReferenceButton({
      label,
      icon,
      type: 'definition',
      parentId,
      data: { target: createDefinitionInformationTarget('enemy', id) },
    });
  }

  createItemDefinitionReference({ id }, parentId) {
    const label = this.textRepository.getName('item', id);
    const icon = createInformationElement('span', 'InformationWindow__InlineIcon InformationWindow__InlineItemIcon');
    const image = document.createElement('img');
    image.src = resolvePublicAssetPath(getItemDefinitionAssetPath(id));
    image.alt = '';
    icon.append(image);
    return this.#createReferenceButton({
      label,
      icon,
      type: 'definition',
      parentId,
      data: { target: createDefinitionInformationTarget('item', id) },
    });
  }

  #createReferenceButton({ label, icon, type, parentId, data, className = 'InformationWindow__InlineReference', ariaLabel = null }) {
    const reference = createInformationElement('button', `${className} state-clickable`);
    reference.type = 'button';
    reference.setAttribute('aria-label', ariaLabel ?? this.textRepository.getLabel('openInformation', { name: label }));
    if (icon) reference.append(icon);
    reference.append(label);
    reference.addEventListener('click', (event) => this.open({
      type, parentId, data, anchor: { x: event.clientX, y: event.clientY },
    }));
    return reference;
  }
}
