import { STATUS_KEYS } from '../game/TagCatalog.js';
import { TAG_DISPLAY_GRID } from '../game/TagDisplayLayout.js';
import { getVitalGaugeColor, STATUS_VISUALS } from '../game/StatusVisualCatalog.js';
import { AREA_THEME } from '../game/AreaTheme.js';
import { getUniqueSkillDetail } from '../game/UniqueSkillCatalog.js';
import { getWeightFillRatio, WEIGHT_GAUGE_COLORS } from '../game/WeightVisual.js';
import { createInformationElement } from './InformationWindowElementFactory.js';
import { applyTagSkillVisual, createEquipmentImage, createStatusIcon, createTagIcon } from './InformationWindowVisualFactory.js';
import { createDefinitionInformationTarget } from './InformationTarget.js';
import { createInformationWindowChipPreview } from './InformationWindowChipPreview.js';

export default class EntityInformationRenderer {
  constructor({ textRepository, references, open, getInstance, createInstanceTarget, assets = null }) {
    this.textRepository = textRepository;
    this.references = references;
    this.open = open;
    this.getInstance = getInstance;
    this.createInstanceTarget = createInstanceTarget;
    this.assets = assets;
  }

  setTextRepository(textRepository) { this.textRepository = textRepository; }

  render(entry) {
    const entity = entry.type === 'instance' ? this.getInstance(entry.data.target) : null;
    if (!entity) throw new RangeError(`Unknown information instance: ${entry.data.target?.instanceId ?? 'legacy target'}`);
    if (entity.chip.type === 'item') return this.#renderItemDetail(entry, entity);
    return this.#renderEntityDetail(entry, entity);
  }

  #renderEntityDetail(entry, entity) {
    const isEnemy = entity.chip.type === 'enemy';
    const displayName = isEnemy ? this.textRepository.getName('enemy', entity.definition.id) : `【${this.textRepository.getHeroLabel(entity)}】`;
    const content = document.createDocumentFragment();
    const title = createInformationElement('header', 'InformationWindow__Title');
    title.append(createInformationWindowChipPreview(entity.chip, this.assets), createInformationElement('h2', 'InformationWindow__Name', displayName));
    const body = createInformationElement('div', 'InformationWindow__EntityPanel');
    const detail = isEnemy ? this.textRepository.getInformationDetail('enemy', entity.definition.id) : this.textRepository.getInformationDetail('hero', entity.heroId);
    if (detail) body.append(this.#createEntityProfile(detail, entry.id));
    body.append(this.#createEntityInformation(entity, entry, isEnemy));
    body.append(this.#createEquipmentList(entity, entry.id, isEnemy));
    content.append(title, body);
    return content;
  }

  #createEntityInformation(entity, entry, isEnemy) {
    const information = createInformationElement('section', 'InformationWindow__EntityInformation');
    const statusGrid = createInformationElement('div', 'InformationWindow__EntityStatusGrid');
    [...STATUS_KEYS, isEnemy ? 'hp' : 'stamina'].forEach((status) => {
      const current = status === 'hp' ? entity.hp : status === 'stamina' ? entity.stamina : entity.getStatus(status);
      const maximum = status === 'hp' ? entity.maximumHp : entity.maximums[status];
      statusGrid.append(this.#createEntityStatusGauge({ entry, status, current, maximum }));
    });
    statusGrid.append(this.#createEntityWeightGauge(entity, entry));
    const tagList = createInformationElement('div', 'InformationWindow__EntityTagList');
    TAG_DISPLAY_GRID.flat().forEach((tag) => tagList.append(this.#createEntityTagButton(entity, entry.id, tag)));
    if (isEnemy && entity.uniqueSkill) tagList.append(this.#createUniqueSkillButton(entity.uniqueSkill, entry.id, entity));
    information.append(statusGrid, tagList);
    return information;
  }

  #createEntityTagButton(entity, parentId, tag) {
    const button = createInformationElement('button', 'InformationWindow__EntityTag state-clickable');
    button.type = 'button';
    applyTagSkillVisual(button, entity.getTagCount(tag), tag);
    button.append(createTagIcon(tag, 'InformationWindow__TagIcon--small'), createInformationElement('span', 'InformationWindow__SkillRequirement', String(entity.getTagCount(tag))));
    button.addEventListener('click', (event) => this.open({
      type: 'tag', parentId, data: { tag }, anchor: { x: event.clientX, y: event.clientY },
    }));
    return button;
  }

  #createEntityProfile(detail, parentId) {
    const profile = createInformationElement('section', 'InformationWindow__EntityProfile');
    profile.append(
      this.references.createLinkedDescription(detail.description, parentId),
      this.references.createLinkedDescription(detail.combatStyle, parentId, 'InformationWindow__EntityCombatStyle'),
    );
    return profile;
  }

  #createUniqueSkillButton(uniqueSkill, parentId) {
    const detail = getUniqueSkillDetail(uniqueSkill.id);
    const button = createInformationElement('button', `InformationWindow__UniqueSkill state-clickable level-${uniqueSkill.level}`);
    button.type = 'button';
    button.append(createTagIcon(detail.affinityTag), createInformationElement('span', 'InformationWindow__UniqueSkillMark', `Ex${uniqueSkill.level}`));
    button.addEventListener('click', (event) => this.open({
      type: 'definition', parentId, data: { target: createDefinitionInformationTarget('unique-skill', uniqueSkill.id) }, anchor: { x: event.clientX, y: event.clientY },
    }));
    return button;
  }

  #createEntityStatusGauge({ entry, status, current, maximum }) {
    const gauge = createInformationElement('button', 'InformationWindow__EntityStatus state-clickable');
    gauge.type = 'button';
    gauge.style.setProperty('--status-frame-color', STATUS_VISUALS[status].gaugeFrameColor);
    gauge.style.setProperty('--status-active-color', ['stamina', 'hp'].includes(status) ? getVitalGaugeColor(current) : '#54c96b');
    const segments = createInformationElement('span', 'InformationWindow__EntityStatusSegments');
    for (let index = 1; index <= 7; index += 1) {
      const segment = createInformationElement('span', 'InformationWindow__EntityStatusSegment');
      const fillRatio = Math.max(0, Math.min(1, current - index + 1));
      if (fillRatio > 0) {
        segment.classList.add('is-active');
        segment.style.setProperty('--status-segment-fill', `${fillRatio * 100}%`);
      } else if (index <= maximum) segment.classList.add('is-available');
      segments.append(segment);
    }
    gauge.append(createStatusIcon(status), segments);
    gauge.addEventListener('click', (event) => this.open({
      type: 'status', parentId: entry.id, data: { status }, anchor: { x: event.clientX, y: event.clientY },
    }));
    return gauge;
  }

  #createEntityWeightGauge(entity, entry) {
    const gauge = createInformationElement('button', 'InformationWindow__EntityStatus InformationWindow__EntityWeight state-clickable');
    gauge.type = 'button';
    gauge.style.setProperty('--status-frame-color', STATUS_VISUALS.weight.gaugeFrameColor);
    gauge.style.setProperty('--weight-fill', `${getWeightFillRatio(entity.getCarriedWeight()) * 100}%`);
    gauge.style.setProperty('--weight-color-low', WEIGHT_GAUGE_COLORS.low);
    gauge.style.setProperty('--weight-color-middle', WEIGHT_GAUGE_COLORS.middle);
    gauge.style.setProperty('--weight-color-high', WEIGHT_GAUGE_COLORS.high);
    gauge.append(createStatusIcon('weight'), createInformationElement('span', 'InformationWindow__WeightIndicator'), createInformationElement('span', 'InformationWindow__WeightValue', String(entity.getCarriedWeight())));
    gauge.addEventListener('click', (event) => this.open({
      type: 'status', parentId: entry.id, data: { status: 'weight' }, anchor: { x: event.clientX, y: event.clientY },
    }));
    return gauge;
  }

  #renderItemDetail(entry, item) {
    const detail = this.textRepository.getInformationDetail('item', item.type) ?? { name: item.type };
    const content = document.createDocumentFragment();
    const title = createInformationElement('header', 'InformationWindow__Title');
    title.append(createInformationWindowChipPreview(item.chip, this.assets), createInformationElement('h2', 'InformationWindow__Name', detail.name));
    const body = createInformationElement('div', 'InformationWindow__Body');
    if (detail.flavor || detail.description) body.append(this.#createItemProfile(detail, item, entry.id));
    body.append(this.#createItemBadgeList(item, entry.id));
    content.append(title, body);
    return content;
  }

  #createItemProfile(detail, item, parentId) {
    const profile = createInformationElement('section', 'InformationWindow__EntityProfile InformationWindow__ItemProfile');
    if (detail.flavor) profile.append(createInformationElement('p', 'InformationWindow__Description', detail.flavor));
    if (detail.description) profile.append(this.references.createLinkedDescription(detail.description, parentId, 'InformationWindow__EntityCombatStyle'));
    if (item.category === 'weapon') profile.append(createInformationElement('p', 'InformationWindow__ItemTargetingNote', this.textRepository.getLabel('weaponTargetingNote')));
    return profile;
  }

  #createItemBadgeList(item, parentId) {
    const badgeList = createInformationElement('div', 'InformationWindow__ItemBadgeList');
    const tags = createInformationElement('div', 'InformationWindow__ItemTagList');
    [...new Set(item.tags)].forEach((tag) => tags.append(this.#createItemTagButton(item, parentId, tag)));
    const properties = createInformationElement('div', 'InformationWindow__ItemPropertyList');
    properties.append(this.#createItemWeightButton(item, parentId), this.#createItemValueButton(item, parentId));
    badgeList.append(tags, properties);
    return badgeList;
  }

  #createItemTagButton(item, parentId, tag) {
    const count = item.tags.filter((current) => current === tag).length;
    const button = createInformationElement('button', 'InformationWindow__ItemTag InformationWindow__ItemBadge state-clickable');
    button.type = 'button';
    applyTagSkillVisual(button, count, tag);
    button.append(createTagIcon(tag, 'InformationWindow__TagIcon--small'), createInformationElement('span', 'InformationWindow__SkillRequirement', String(count)));
    button.addEventListener('click', (event) => this.open({ type: 'tag', parentId, data: { tag }, anchor: { x: event.clientX, y: event.clientY } }));
    return button;
  }

  #createItemWeightButton(item, parentId) {
    const button = createInformationElement('button', 'InformationWindow__ItemWeight InformationWindow__ItemBadge state-clickable');
    button.type = 'button';
    applyTagSkillVisual(button, 0);
    button.append(createStatusIcon('weight'), createInformationElement('span', 'InformationWindow__ItemWeightAmount', String(item.chip.weight)));
    button.addEventListener('click', (event) => this.open({ type: 'status', parentId, data: { status: 'weight' }, anchor: { x: event.clientX, y: event.clientY } }));
    return button;
  }

  #createItemValueButton(item, parentId) {
    const button = this.references.createTermReference({ id: 'item-value', parentId, className: 'InformationWindow__ItemValue InformationWindow__ItemBadge', label: '' });
    applyTagSkillVisual(button, 0);
    button.append(createInformationElement('span', 'InformationWindow__ItemValueAmount', String(item.value)));
    return button;
  }

  #createEquipmentList(entity, parentId, isEnemy) {
    const list = createInformationElement('div', 'InformationWindow__EquipmentList');
    const equipment = isEnemy ? entity.equipment.map((item, index) => [String(index), item]) : Object.entries(entity.equipment);
    equipment.filter(([, item]) => !isEnemy || Boolean(item)).forEach(([slot, item]) => list.append(this.#createEquipmentButton(item, parentId, isEnemy ? null : slot)));
    return list;
  }

  #createEquipmentButton(item, parentId, slot = null) {
    const button = createInformationElement('button', `InformationWindow__Equipment${item ? ' state-clickable' : ''}`);
    button.type = 'button';
    if (slot) button.dataset.slot = slot;
    if (item?.category === 'destination') button.style.setProperty('--equipment-fill', AREA_THEME[item.destination].chipFill);
    if (!item) {
      button.disabled = true;
      return button;
    }
    button.append(createEquipmentImage(item.chip.centerPath));
    const tags = createInformationElement('span', 'InformationWindow__EquipmentTags');
    item.tags.forEach((tag) => tags.append(createTagIcon(tag, 'InformationWindow__TagIcon--small')));
    button.append(tags);
    button.addEventListener('click', (event) => {
      const target = this.createInstanceTarget(item);
      if (!target) throw new Error('Equipment information requires an EntityRegistry.');
      this.open({ type: 'instance', parentId, data: { target }, anchor: { x: event.clientX, y: event.clientY } });
    });
    return button;
  }
}
