import { STATUS_KEYS } from '../game/TagCatalog.js';
import { TAG_DISPLAY_GRID } from '../game/TagDisplayLayout.js';
import { getVitalGaugeColor, STATUS_VISUALS } from '../game/StatusVisualCatalog.js';
import { AREA_THEME } from '../game/AreaTheme.js';
import { getUniqueSkillDetail } from '../game/UniqueSkillCatalog.js';

import { getEnemyDefinitionById } from '../game/EnemyCatalog.js';
import { ENEMY_CHIP_DIAMETER } from '../game/HeroSlotLayout.js';
import { getWeightFillRatio, WEIGHT_GAUGE_COLORS } from '../game/WeightVisual.js';
import { createInformationElement as createElement } from './InformationWindowElementFactory.js';
import { applyTagSkillVisual, createChipImage, createEquipmentImage, createStatusIcon, createTagIcon } from './InformationWindowVisualFactory.js';
import InformationWindowReferenceRenderer from './InformationWindowReferenceRenderer.js';
import CatalogInformationRenderer from './CatalogInformationRenderer.js';

// The hero detail portrait is 156px for a 192px chip.  Enemy portraits keep
// this same world-size ratio instead of being normalized to the hero size.
const ENTITY_PORTRAIT_SCALE = 156 / 192;

function createCompactIcon(isCompact) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('InformationWindow__CompactIcon');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const paths = isCompact
    ? ['M11 11 4 4M4 8V4h4', 'M13 13 20 20M20 16v4h-4']
    : ['M4 4 11 11M7 11h4V7', 'M20 20 13 13M17 13h-4v4'];
  paths.forEach((d) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    svg.append(path);
  });
  return svg;
}

export default class InformationWindowLayer {
  constructor(element, manager, textRepository = null) {
    this.element = element;
    this.manager = manager;
    this.textRepository = textRepository;
    this.references = new InformationWindowReferenceRenderer({ textRepository, open: (entry) => this.manager.open(entry) });
    this.catalogRenderer = new CatalogInformationRenderer({ textRepository, references: this.references, open: (entry) => this.manager.open(entry) });
    this.element.addEventListener('pointerdown', (event) => {
      if (event.target.closest?.('.InformationWindow')) this.manager.setInteracting(true);
    }, true);
    this.element.addEventListener('pointerup', () => this.manager.setInteracting(false), true);
    this.element.addEventListener('pointercancel', () => this.manager.setInteracting(false));
  }

  setTextRepository(textRepository) {
    this.textRepository = textRepository;
    this.references.setTextRepository(textRepository);
    this.catalogRenderer.setTextRepository(textRepository);
  }

  render(entries) {
    const windows = entries.map((entry) => this.#renderWindow(entry));
    this.element.replaceChildren(...windows);
    windows.forEach((window, index) => this.#positionWindow(window, entries[index]));
  }

  #renderWindow(entry) {
    const window = createElement('section', `InformationWindow${entry.compact ? ' is-compact' : ''}`);
    window.dataset.informationWindowId = entry.id;
    if (['tag', 'status', 'term', 'facility', 'area'].includes(entry.type)) window.append(this.catalogRenderer.render(entry));
    if (entry.type === 'entity') window.append(this.#renderEntityDetail(entry));
    if (entry.type === 'enemy-projection') window.append(this.#renderEnemyProjectionDetail(entry));
    if (entry.type === 'item') window.append(this.#renderItemDetail(entry));
    if (entry.type === 'unique-skill') window.append(this.#renderUniqueSkillDetail(entry));
    this.#addWindowControls(window, entry);
    return window;
  }

  #addWindowControls(windowElement, entry) {
    const title = windowElement.querySelector('.InformationWindow__Title');
    if (!title) return;
    const compact = createElement('button', `InformationWindow__Compact${entry.compact ? ' is-compact' : ''}`);
    compact.type = 'button';
    compact.setAttribute('aria-label', this.textRepository.getLabel(entry.compact ? 'normalSize' : 'compactSize'));
    compact.append(createCompactIcon(entry.compact));
    compact.addEventListener('pointerdown', (event) => event.stopPropagation());
    compact.addEventListener('click', (event) => {
      event.stopPropagation();
      this.manager.toggleCompact(entry.id);
    });
    const pin = createElement('button', `InformationWindow__Pin${entry.pinned ? ' is-pinned' : ''}`);
    pin.type = 'button';
    pin.setAttribute('aria-label', this.textRepository.getLabel(entry.pinned ? 'unpin' : 'pin'));
    pin.textContent = '📌';
    pin.addEventListener('pointerdown', (event) => event.stopPropagation());
    pin.addEventListener('click', (event) => {
      event.stopPropagation();
      this.manager.togglePin(entry.id);
    });
    title.append(compact, pin);

    title.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || event.target.closest('.InformationWindow__Pin, .InformationWindow__Compact')) return;
      const bounds = windowElement.getBoundingClientRect();
      const offset = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
      const move = (moveEvent) => {
        const position = this.#constrainPosition(windowElement, moveEvent.clientX - offset.x, moveEvent.clientY - offset.y);
        windowElement.style.left = `${position.x}px`;
        windowElement.style.top = `${position.y}px`;
        windowElement.style.transform = 'none';
      };
      const finish = (upEvent) => {
        windowElement.removeEventListener('pointermove', move);
        windowElement.removeEventListener('pointerup', finish);
        this.manager.setDragging(false);
        const position = this.#constrainPosition(windowElement, upEvent.clientX - offset.x, upEvent.clientY - offset.y);
        this.manager.setPosition(entry.id, position);
      };
      this.manager.setDragging(true);
      windowElement.setPointerCapture(event.pointerId);
      windowElement.addEventListener('pointermove', move);
      windowElement.addEventListener('pointerup', finish, { once: true });
      event.preventDefault();
    });
  }

  #renderEntityDetail(entry) {
    const { entity } = entry.data;
    const isEnemy = entity.chip.type === 'enemy';
    const displayName = isEnemy ? this.textRepository.getName('enemy', entity.definition.id) : `【${this.textRepository.getHeroLabel(entity)}】`;
    const content = document.createDocumentFragment();
    const title = createElement('header', 'InformationWindow__Title InformationWindow__EntityTitle');
    title.style.setProperty('--entity-portrait-size', `${entity.chip.radius * 2 * ENTITY_PORTRAIT_SCALE}px`);
    title.append(createChipImage(entity.chip.centerPath), createElement('h2', 'InformationWindow__Name', displayName));
    content.append(title);
    const body = createElement('div', 'InformationWindow__EntityPanel');
    const detail = isEnemy ? this.textRepository.getInformationDetail('enemy', entity.definition.id) : this.textRepository.getInformationDetail('hero', entity.heroId);
    if (detail) body.append(this.#createEntityProfile(detail, entity, entry.id));
    const information = createElement('section', 'InformationWindow__EntityInformation');
    const statusGrid = createElement('div', 'InformationWindow__EntityStatusGrid');
    const statusKeys = [...STATUS_KEYS, isEnemy ? 'hp' : 'stamina'];
    statusKeys.forEach((status) => {
      const current = status === 'hp' ? entity.hp : status === 'stamina' ? entity.stamina : entity.getStatus(status);
      const maximum = status === 'hp' ? entity.maximumHp : entity.maximums[status];
      statusGrid.append(this.#createEntityStatusGauge({ entry, status, current, maximum }));
    });
    statusGrid.append(this.#createEntityWeightGauge(entity, entry));
    information.append(statusGrid);

    const tagList = createElement('div', 'InformationWindow__EntityTagList');
    TAG_DISPLAY_GRID.flat().forEach((tag) => {
      const count = entity.getTagCount(tag);
      const tagButton = createElement('button', 'InformationWindow__EntityTag state-clickable');
      tagButton.type = 'button';
      applyTagSkillVisual(tagButton, count, tag);
      tagButton.append(createTagIcon(tag, 'InformationWindow__TagIcon--small'), createElement('span', 'InformationWindow__SkillRequirement', String(count)));
      tagButton.addEventListener('click', (event) => this.manager.open({ type: 'tag', parentId: entry.id, data: { tag }, anchor: { x: event.clientX, y: event.clientY } }));
      tagList.append(tagButton);
    });
    if (isEnemy && entity.uniqueSkill) tagList.append(this.#createUniqueSkillButton(entity.uniqueSkill, entry.id, entity));
    information.append(tagList);
    body.append(information);

    const equipmentList = createElement('div', 'InformationWindow__EquipmentList');
    const equipment = isEnemy ? entity.equipment.map((item, index) => [String(index), item]) : Object.entries(entity.equipment);
    equipment.filter(([, item]) => !isEnemy || Boolean(item)).forEach(([slot, item]) => equipmentList.append(this.#createEquipmentButton(item, entry.id, isEnemy ? null : slot)));
    body.append(equipmentList);
    content.append(body);
    return content;
  }

  #createEntityProfile(detail, entity = null, parentId = null) {
    const profile = createElement('section', 'InformationWindow__EntityProfile');
    const combatStyle = this.references.createLinkedDescription(detail.combatStyle, parentId, 'InformationWindow__EntityCombatStyle', entity);
    profile.append(this.references.createLinkedDescription(detail.description, parentId), combatStyle);
    return profile;
  }

  #renderEnemyProjectionDetail(entry) {
    const definition = getEnemyDefinitionById(entry.data.enemyId);
    const projection = Object.create(entry.data.source);
    projection.definition = definition;
    projection.uniqueSkill = null;
    projection.chip = { ...entry.data.source.chip, type: 'enemy', radius: ENEMY_CHIP_DIAMETER.small / 2, centerPath: definition.assetPath };
    return this.#renderEntityDetail({ ...entry, data: { entity: projection } });
  }

  #createUniqueSkillButton(uniqueSkill, parentId, source) {
    const detail = getUniqueSkillDetail(uniqueSkill.id);
    const button = createElement('button', `InformationWindow__UniqueSkill state-clickable level-${uniqueSkill.level}`);
    button.type = 'button';
    button.append(createTagIcon(detail.affinityTag), createElement('span', 'InformationWindow__UniqueSkillMark', `Ex${uniqueSkill.level}`));
    button.addEventListener('click', (event) => this.manager.open({
      type: 'unique-skill', parentId, data: { uniqueSkill, source }, anchor: { x: event.clientX, y: event.clientY },
    }));
    return button;
  }

  #renderUniqueSkillDetail(entry) {
    const { uniqueSkill } = entry.data;
    const detail = this.textRepository.getInformationDetail('unique-skill', uniqueSkill.id);
    const content = document.createDocumentFragment();
    const title = createElement('header', `InformationWindow__Title InformationWindow__UniqueSkillTitle level-${uniqueSkill.level}`);
    title.append(createTagIcon(getUniqueSkillDetail(uniqueSkill.id).affinityTag), createElement('h2', 'InformationWindow__Name', detail.name));
    content.append(title);
    const body = createElement('div', 'InformationWindow__Body');
    const profile = createElement('section', 'InformationWindow__EntityProfile');
    profile.append(
      createElement('p', 'InformationWindow__Description', detail.flavor),
        this.references.createLinkedDescription(detail.description, entry.id, 'InformationWindow__EntityCombatStyle', entry.data.source),
    );
    body.append(profile);
    const levels = createElement('div', 'InformationWindow__UniqueSkillLevelList');
    Object.entries(detail.levels).forEach(([level, levelDetail]) => {
      const item = createElement('div', `InformationWindow__UniqueSkillLevel level-${level}`);
      item.append(createElement('span', 'InformationWindow__UniqueSkillLevelName', `Ex${level}`), createElement('span', 'InformationWindow__UniqueSkillLevelEffect', levelDetail.description));
      levels.append(item);
    });
    body.append(levels);
    content.append(body);
    return content;
  }

  #createEntityStatusGauge({ entry, status, current, maximum }) {
    const gauge = createElement('button', 'InformationWindow__EntityStatus state-clickable');
    gauge.type = 'button';
    gauge.style.setProperty('--status-frame-color', STATUS_VISUALS[status].gaugeFrameColor);
    const displayedCurrent = current;
    gauge.style.setProperty('--status-active-color', ['stamina', 'hp'].includes(status) ? getVitalGaugeColor(displayedCurrent) : '#54c96b');
    gauge.append(createStatusIcon(status));
    const segments = createElement('span', 'InformationWindow__EntityStatusSegments');
    for (let index = 1; index <= 7; index += 1) {
      const segment = createElement('span', 'InformationWindow__EntityStatusSegment');
      const fillRatio = Math.max(0, Math.min(1, displayedCurrent - index + 1));
      if (fillRatio > 0) {
        segment.classList.add('is-active');
        segment.style.setProperty('--status-segment-fill', `${fillRatio * 100}%`);
      }
      else if (index <= maximum) segment.classList.add('is-available');
      segments.append(segment);
    }
    gauge.append(segments);
    gauge.addEventListener('click', (event) => this.manager.open({
      type: 'status', parentId: entry.id, data: { status }, anchor: { x: event.clientX, y: event.clientY },
    }));
    return gauge;
  }

  #createEntityWeightGauge(entity, entry) {
    const gauge = createElement('button', 'InformationWindow__EntityStatus InformationWindow__EntityWeight state-clickable');
    gauge.type = 'button';
    gauge.style.setProperty('--status-frame-color', STATUS_VISUALS.weight.gaugeFrameColor);
    const weight = entity.getCarriedWeight();
    gauge.style.setProperty('--weight-fill', `${getWeightFillRatio(weight) * 100}%`);
    gauge.style.setProperty('--weight-color-low', WEIGHT_GAUGE_COLORS.low);
    gauge.style.setProperty('--weight-color-middle', WEIGHT_GAUGE_COLORS.middle);
    gauge.style.setProperty('--weight-color-high', WEIGHT_GAUGE_COLORS.high);
    gauge.append(
      createStatusIcon('weight'),
      createElement('span', 'InformationWindow__WeightIndicator'),
      createElement('span', 'InformationWindow__WeightValue', String(weight)),
    );
    gauge.addEventListener('click', (event) => this.manager.open({
      type: 'status', parentId: entry.id, data: { status: 'weight' }, anchor: { x: event.clientX, y: event.clientY },
    }));
    return gauge;
  }

  #renderItemDetail(entry) {
    const { item } = entry.data;
    const detail = this.textRepository.getInformationDetail('item', item.type) ?? { name: item.type };
    const content = document.createDocumentFragment();
    const title = createElement('header', 'InformationWindow__Title');
    title.append(createChipImage(item.chip.centerPath), createElement('h2', 'InformationWindow__Name', detail.name));
    content.append(title);
    const body = createElement('div', 'InformationWindow__Body');
    if (detail.flavor || detail.description) {
      const profile = createElement('section', 'InformationWindow__EntityProfile InformationWindow__ItemProfile');
      if (detail.flavor) profile.append(createElement('p', 'InformationWindow__Description', detail.flavor));
      if (detail.description) {
        profile.append(this.references.createLinkedDescription(detail.description, entry.id, 'InformationWindow__EntityCombatStyle'));
      }
      if (item.category === 'weapon') {
        profile.append(createElement('p', 'InformationWindow__ItemTargetingNote', this.textRepository.getLabel('weaponTargetingNote')));
      }
      body.append(profile);
    }
    const badgeList = createElement('div', 'InformationWindow__ItemBadgeList');
    const tagList = createElement('div', 'InformationWindow__ItemTagList');
    [...new Set(item.tags)].forEach((tag) => {
      const count = item.tags.filter((current) => current === tag).length;
      const tagButton = createElement('button', 'InformationWindow__ItemTag InformationWindow__ItemBadge state-clickable');
      tagButton.type = 'button';
      applyTagSkillVisual(tagButton, count, tag);
      tagButton.append(createTagIcon(tag, 'InformationWindow__TagIcon--small'), createElement('span', 'InformationWindow__SkillRequirement', String(count)));
      tagButton.addEventListener('click', (event) => this.manager.open({ type: 'tag', parentId: entry.id, data: { tag }, anchor: { x: event.clientX, y: event.clientY } }));
      tagList.append(tagButton);
    });
    const itemProperties = createElement('div', 'InformationWindow__ItemPropertyList');
    const weight = createElement('button', 'InformationWindow__ItemWeight InformationWindow__ItemBadge state-clickable');
    weight.type = 'button';
    applyTagSkillVisual(weight, 0);
    weight.append(createStatusIcon('weight'), createElement('span', 'InformationWindow__ItemWeightAmount', String(item.chip.weight)));
    weight.addEventListener('click', (event) => this.manager.open({
      type: 'status', parentId: entry.id, data: { status: 'weight' }, anchor: { x: event.clientX, y: event.clientY },
    }));
    const value = this.references.createTermReference({
      id: 'item-value',
      parentId: entry.id,
      className: 'InformationWindow__ItemValue InformationWindow__ItemBadge',
      label: '',
    });
    applyTagSkillVisual(value, 0);
    value.append(
      createElement('span', 'InformationWindow__ItemValueAmount', String(item.value)),
    );
    itemProperties.append(weight, value);
    badgeList.append(tagList, itemProperties);
    body.append(badgeList);
    content.append(body);
    return content;
  }

  #createEquipmentButton(item, parentId, slot = null) {
    const button = createElement('button', `InformationWindow__Equipment${item ? ' state-clickable' : ''}`);
    button.type = 'button';
    if (slot) button.dataset.slot = slot;
    if (item?.category === 'destination') button.style.setProperty('--equipment-fill', AREA_THEME[item.destination].chipFill);
    if (!item) {
      button.disabled = true;
      return button;
    }
    button.append(createEquipmentImage(item.chip.centerPath));
    const tags = createElement('span', 'InformationWindow__EquipmentTags');
    item.tags.forEach((tag) => tags.append(createTagIcon(tag, 'InformationWindow__TagIcon--small')));
    button.append(tags);
    button.addEventListener('click', (event) => this.manager.open({ type: 'item', parentId, data: { item }, anchor: { x: event.clientX, y: event.clientY } }));
    return button;
  }

  #positionWindow(windowElement, entry) {
    if (entry.position) {
      const position = this.#constrainPosition(windowElement, entry.position.x, entry.position.y);
      windowElement.style.left = `${position.x}px`;
      windowElement.style.top = `${position.y}px`;
      windowElement.style.transform = 'none';
      return;
    }
    const { anchor } = entry;
    if (!anchor) {
      const bounds = windowElement.getBoundingClientRect();
      windowElement.style.left = `${Math.max(12, (globalThis.innerWidth - bounds.width) / 2)}px`;
      windowElement.style.top = `${Math.max(12, (globalThis.innerHeight - bounds.height) / 2)}px`;
      windowElement.style.transform = 'none';
      return;
    }
    const margin = 12;
    const gap = 16;
    const bounds = windowElement.getBoundingClientRect();
    const viewportWidth = globalThis.innerWidth;
    const viewportHeight = globalThis.innerHeight;
    let x = anchor.x + gap;
    if (x + bounds.width > viewportWidth - margin) x = anchor.x - gap - bounds.width;
    x = Math.max(margin, Math.min(x, viewportWidth - bounds.width - margin));
    let y = anchor.y - 24;
    y = Math.max(margin, Math.min(y, viewportHeight - bounds.height - margin));
    windowElement.style.left = `${x}px`;
    windowElement.style.top = `${y}px`;
    windowElement.style.transform = 'none';
  }

  #constrainPosition(windowElement, x, y) {
    const margin = 12;
    const bounds = windowElement.getBoundingClientRect();
    return {
      x: Math.max(margin, Math.min(x, globalThis.innerWidth - bounds.width - margin)),
      y: Math.max(margin, Math.min(y, globalThis.innerHeight - bounds.height - margin)),
    };
  }
}
