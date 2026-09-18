import { TAGS } from '../game/TagCatalog.js';
import { TAG_SKILL_THRESHOLDS } from '../game/TagSkillVisualCatalog.js';
import { createInformationElement } from './InformationWindowElementFactory.js';
import { applyTagSkillVisual, createItemValueIcon, createLocationIcon, createStatusIcon, createTagIcon, createTermIcon } from './InformationWindowVisualFactory.js';

export default class CatalogInformationRenderer {
  constructor({ textRepository, references, open }) {
    this.textRepository = textRepository;
    this.references = references;
    this.open = open;
  }

  setTextRepository(textRepository) { this.textRepository = textRepository; }

  render(entry) {
    if (entry.type === 'tag') return this.#renderTagDetail(entry);
    if (entry.type === 'status') return this.#renderStatusDetail(entry);
    if (entry.type === 'term') return this.#renderTermDetail(entry);
    if (entry.type === 'facility') return this.#renderLocationDetail(entry, 'facility');
    if (entry.type === 'area') return this.#renderLocationDetail(entry, 'area');
    throw new RangeError(`Unsupported catalog information type: ${entry.type}`);
  }

  #renderTagDetail(entry) {
    const { tag } = entry.data;
    const detail = this.textRepository.getInformationDetail('tag', tag);
    const content = document.createDocumentFragment();
    const title = createInformationElement('header', 'InformationWindow__Title');
    title.append(createTagIcon(tag), createInformationElement('h2', 'InformationWindow__Name', detail.name));
    content.append(title);

    const body = createInformationElement('div', 'InformationWindow__Body InformationWindow__TagBody');
    const descriptionSection = createInformationElement('section', 'InformationWindow__EntityProfile InformationWindow__TagProfile');
    descriptionSection.append(this.references.createLinkedDescription(detail.description, entry.id, 'InformationWindow__EntityCombatStyle'));
    const dataSection = createInformationElement('section', 'InformationWindow__DataSection');
    const weight = createInformationElement('button', 'InformationWindow__TagWeightReference state-clickable');
    weight.type = 'button';
    weight.setAttribute('aria-label', this.textRepository.getLabel('openInformation', { name: this.textRepository.getName('status', 'weight') }));
    weight.append(createStatusIcon('weight'), createInformationElement('span', 'InformationWindow__TagWeightAmount', String(TAGS[tag].weight)));
    weight.addEventListener('click', (event) => this.open({
      type: 'status', parentId: entry.id, data: { status: 'weight' }, anchor: { x: event.clientX, y: event.clientY },
    }));
    dataSection.append(weight);
    const overview = createInformationElement('div', 'InformationWindow__TagOverview');
    overview.append(descriptionSection, dataSection);
    body.append(overview);

    if (TAGS[tag].group === 'status') body.append(this.#createTagSkillSection(detail, entry));
    content.append(body);
    return content;
  }

  #createTagSkillSection(detail, entry) {
    const section = createInformationElement('section', 'InformationWindow__SkillSection InformationWindow__EntityProfile');
    const header = createInformationElement('h3', 'InformationWindow__SkillHeader');
    header.append(this.references.createTermReference({ id: 'tag-skill', parentId: entry.id }));
    const effect = Array.isArray(detail.effectDescription)
      ? this.references.createLinkedDescription(detail.effectDescription, entry.id, 'InformationWindow__EntityCombatStyle')
      : createInformationElement('p', 'InformationWindow__EntityCombatStyle', detail.effectDescription);
    const list = createInformationElement('div', 'InformationWindow__SkillList');
    TAG_SKILL_THRESHOLDS.forEach((requiredCount, index) => {
      const badge = createInformationElement('div', 'InformationWindow__Skill');
      applyTagSkillVisual(badge, requiredCount);
      badge.append(
        createInformationElement('span', 'InformationWindow__SkillRequirement', String(requiredCount)),
        createInformationElement('span', 'InformationWindow__SkillName', detail.skillNames[index]),
      );
      list.append(badge);
    });
    section.append(header, effect, list);
    return section;
  }

  #renderStatusDetail(entry) {
    const { status } = entry.data;
    const detail = this.textRepository.getInformationDetail('status', status);
    if (!detail) throw new RangeError(`Unknown localized status: ${status}`);
    return this.#createDescriptionDetail({
      icon: createStatusIcon(status),
      title: detail.name,
      bodyClassName: 'InformationWindow__StatusProfile',
      description: detail.description,
      parentId: entry.id,
    });
  }

  #renderTermDetail(entry) {
    const detail = this.textRepository.getInformationDetail('term', entry.data.term);
    return this.#createDescriptionDetail({
      icon: entry.data.term === 'item-value' ? createItemValueIcon() : createTermIcon(),
      title: detail.name,
      bodyClassName: 'InformationWindow__TermProfile',
      description: detail.description,
      parentId: entry.id,
    });
  }

  #renderLocationDetail(entry, kind) {
    const id = entry.data[kind];
    const detail = this.textRepository.getInformationDetail(kind, id);
    if (!detail) throw new RangeError(`Unknown localized ${kind}: ${id}`);
    const content = document.createDocumentFragment();
    const title = createInformationElement('header', 'InformationWindow__Title');
    title.append(createLocationIcon(id), createInformationElement('h2', 'InformationWindow__Name', detail.name));
    const body = createInformationElement('div', 'InformationWindow__Body');
    if (detail.flavor) {
      const profile = createInformationElement('section', 'InformationWindow__EntityProfile');
      profile.append(
        createInformationElement('p', 'InformationWindow__Description', detail.flavor),
        this.references.createLinkedDescription(detail.description, entry.id, 'InformationWindow__EntityCombatStyle'),
      );
      body.append(profile);
    } else body.append(this.references.createLinkedDescription(detail.description, entry.id));
    content.append(title, body);
    return content;
  }

  #createDescriptionDetail({ icon, title, bodyClassName, description, parentId }) {
    const content = document.createDocumentFragment();
    const header = createInformationElement('header', 'InformationWindow__Title');
    header.append(icon, createInformationElement('h2', 'InformationWindow__Name', title));
    const body = createInformationElement('div', 'InformationWindow__Body');
    const profile = createInformationElement('section', `InformationWindow__EntityProfile ${bodyClassName}`);
    profile.append(this.references.createLinkedDescription(description, parentId, 'InformationWindow__EntityCombatStyle'));
    body.append(profile);
    content.append(header, body);
    return content;
  }
}
