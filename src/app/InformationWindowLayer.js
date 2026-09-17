import { TAGS, getTagBaseColors, getTagGlyphScales } from '../game/TagCatalog.js';
import { getTagBadgeVisual, getTagSkillVisual, TAG_SKILL_THRESHOLDS } from '../game/TagSkillVisualCatalog.js';
import { getVitalGaugeColor, STATUS_VISUALS } from '../game/StatusVisualCatalog.js';
import { AREA_THEME } from '../game/AreaTheme.js';
import { getLocationVisual } from '../game/LocationVisualCatalog.js';
import { getUniqueSkillDetail } from '../game/UniqueSkillCatalog.js';

import { getEnemyDefinitionById } from '../game/EnemyCatalog.js';
import { ENEMY_CHIP_DIAMETER } from '../game/HeroSlotLayout.js';
import { resolvePublicAssetPath } from '../chips/PublicAssetPath.js';
import { getWeightFillRatio, WEIGHT_GAUGE_COLORS } from '../game/WeightVisual.js';

const ENTITY_STATUS_KEYS = Object.freeze(['power', 'magic', 'speed', 'negotiation', 'luck']);
// The hero detail portrait is 156px for a 192px chip.  Enemy portraits keep
// this same world-size ratio instead of being normalized to the hero size.
const ENTITY_PORTRAIT_SCALE = 156 / 192;
const TAG_GRID = Object.freeze([
  Object.freeze(['valor', 'arcane', 'dexterity', 'reputation', 'blessing']),
  Object.freeze(['iron', 'cloth', 'feather', 'gem', 'fortune']),
  Object.freeze(['fire', 'water', 'lightning', 'area', 'vitality']),
]);

function createElement(tagName, className, text = null) {
  const element = document.createElement(tagName);
  element.className = className;
  if (text !== null) element.textContent = text;
  return element;
}

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

function applyTagSkillVisual(element, count, tag = null) {
  const visual = tag ? getTagBadgeVisual(tag, count) : getTagSkillVisual(count);
  element.style.setProperty('--tag-skill-fill', visual.fill);
  element.style.setProperty('--tag-skill-border', visual.border);
  element.style.setProperty('--tag-skill-text', visual.text);
  element.dataset.tagSkillLevel = String(visual.level);
}

function createTagIcon(tag, sizeClass = '') {
  const icon = createElement('span', `InformationWindow__TagIcon ${sizeClass}`.trim());
  icon.style.setProperty('--tag-base-color', getTagBaseColors([tag])[0]);
  icon.style.setProperty('--tag-glyph-scale', String(getTagGlyphScales([tag])[0]));
  const image = document.createElement('img');
  image.src = resolvePublicAssetPath(`/assets/tags/${tag}.png`);
  image.alt = '';
  icon.append(image);
  return icon;
}

function createStatusIcon(status, sizeClass = '') {
  const icon = createElement('span', `InformationWindow__StatusIcon ${sizeClass}`.trim());
  const image = document.createElement('img');
  image.src = resolvePublicAssetPath(STATUS_VISUALS[status].iconPath);
  image.alt = '';
  icon.append(image);
  return icon;
}

function createLocationIcon(location, sizeClass = '') {
  const icon = createElement('span', `InformationWindow__LocationIcon ${sizeClass}`.trim());
  const image = document.createElement('img');
  image.src = resolvePublicAssetPath(getLocationVisual(location).iconPath);
  image.alt = '';
  icon.append(image);
  return icon;
}

function createTermIcon(sizeClass = '') {
  const icon = createElement('span', `InformationWindow__TermIcon ${sizeClass}`.trim());
  icon.setAttribute('aria-hidden', 'true');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M4 5.5c2.8-.9 5.4-.2 8 1.7 2.6-1.9 5.2-2.6 8-1.7v12c-2.8-.9-5.4-.2-8 1.7-2.6-1.9-5.2-2.6-8-1.7zM12 7.2v12');
  svg.append(path);
  icon.append(svg);
  return icon;
}

function createChipImage(path) {
  const image = createElement('span', 'InformationWindow__ChipImage');
  const asset = document.createElement('img');
  asset.src = resolvePublicAssetPath(path);
  asset.alt = '';
  image.append(asset);
  return image;
}

function createEquipmentImage(path) {
  const image = createElement('span', 'InformationWindow__EquipmentImage');
  const asset = document.createElement('img');
  asset.src = resolvePublicAssetPath(path);
  asset.alt = '';
  image.append(asset);
  return image;
}

export default class InformationWindowLayer {
  constructor(element, manager, textRepository = null) {
    this.element = element;
    this.manager = manager;
    this.textRepository = textRepository;
    this.element.addEventListener('pointerdown', (event) => {
      if (event.target.closest?.('.InformationWindow')) this.manager.setInteracting(true);
    }, true);
    this.element.addEventListener('pointerup', () => this.manager.setInteracting(false), true);
    this.element.addEventListener('pointercancel', () => this.manager.setInteracting(false));
  }

  setTextRepository(textRepository) { this.textRepository = textRepository; }

  render(entries) {
    const windows = entries.map((entry) => this.#renderWindow(entry));
    this.element.replaceChildren(...windows);
    windows.forEach((window, index) => this.#positionWindow(window, entries[index]));
  }

  #renderWindow(entry) {
    const window = createElement('section', `InformationWindow${entry.compact ? ' is-compact' : ''}`);
    window.dataset.informationWindowId = entry.id;
    if (entry.type === 'tag') window.append(this.#renderTagDetail(entry));
    if (entry.type === 'status') window.append(this.#renderStatusDetail(entry));
    if (entry.type === 'entity') window.append(this.#renderEntityDetail(entry));
    if (entry.type === 'enemy-projection') window.append(this.#renderEnemyProjectionDetail(entry));
    if (entry.type === 'item') window.append(this.#renderItemDetail(entry));
    if (entry.type === 'facility') window.append(this.#renderFacilityDetail(entry));
    if (entry.type === 'area') window.append(this.#renderAreaDetail(entry));
    if (entry.type === 'term') window.append(this.#renderTermDetail(entry));
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

  #renderTagDetail(entry) {
    const { tag } = entry.data;
    const detail = this.textRepository.getInformationDetail('tag', tag);
    const content = document.createDocumentFragment();
    const title = createElement('header', 'InformationWindow__Title');
    title.append(createTagIcon(tag), createElement('h2', 'InformationWindow__Name', detail.name));
    content.append(title);

    const body = createElement('div', 'InformationWindow__Body InformationWindow__TagBody');
    const descriptionSection = createElement('section', 'InformationWindow__EntityProfile InformationWindow__TagProfile');
    descriptionSection.append(this.#createLinkedDescription(detail.description, entry.id, 'InformationWindow__EntityCombatStyle'));

    const dataSection = createElement('section', 'InformationWindow__DataSection');
    const weight = createElement('button', 'InformationWindow__ItemWeight state-clickable');
    weight.type = 'button';
    weight.setAttribute('aria-label', this.textRepository.getLabel('openInformation', { name: this.textRepository.getName('status', 'weight') }));
    weight.append(createStatusIcon('weight'), createElement('span', 'InformationWindow__ItemWeightTimes', `× ${TAGS[tag].weight}`));
    weight.addEventListener('click', (event) => this.manager.open({
      type: 'status', parentId: entry.id, data: { status: 'weight' }, anchor: { x: event.clientX, y: event.clientY },
    }));
    dataSection.append(weight);

    const overview = createElement('div', 'InformationWindow__TagOverview');
    overview.append(descriptionSection, dataSection);
    body.append(overview);
    if (TAGS[tag].group === 'status') {
      const skillSection = createElement('section', 'InformationWindow__SkillSection InformationWindow__EntityProfile');
      const skillHeader = createElement('h3', 'InformationWindow__SkillHeader');
      const skillLink = createElement('button', 'InformationWindow__InlineReference state-clickable');
      skillLink.type = 'button';
      skillLink.setAttribute('aria-label', this.textRepository.getLabel('openInformation', { name: this.textRepository.getName('term', 'tag-skill') }));
      skillLink.append(createTermIcon(), this.textRepository.getName('term', 'tag-skill'));
      skillLink.addEventListener('click', (event) => this.manager.open({
        type: 'term', parentId: entry.id, data: { term: 'tag-skill' }, anchor: { x: event.clientX, y: event.clientY },
      }));
      skillHeader.append(skillLink);
      const effectDescription = detail.effectDescription;
      skillSection.append(
        skillHeader,
        Array.isArray(effectDescription)
          ? this.#createLinkedDescription(effectDescription, entry.id, 'InformationWindow__EntityCombatStyle')
          : createElement('p', 'InformationWindow__EntityCombatStyle', effectDescription),
      );
      const skillList = createElement('div', 'InformationWindow__SkillList');
      TAG_SKILL_THRESHOLDS.forEach((requiredCount, index) => {
        const skillBadge = createElement('div', 'InformationWindow__Skill');
        applyTagSkillVisual(skillBadge, requiredCount);
        const requirement = createElement('span', 'InformationWindow__SkillRequirement', String(requiredCount));
        const name = createElement('span', 'InformationWindow__SkillName', detail.skillNames[index]);
        skillBadge.append(requirement, name);
        skillList.append(skillBadge);
      });
      skillSection.append(skillList);
      body.append(skillSection);
    }
    content.append(body);
    return content;
  }

  #renderStatusDetail(entry) {
    const { status } = entry.data;
    const detail = this.textRepository.getInformationDetail('status', status);
    if (!detail) throw new RangeError(`Unknown localized status: ${status}`);
    const content = document.createDocumentFragment();
    const title = createElement('header', 'InformationWindow__Title');
    title.append(createStatusIcon(status), createElement('h2', 'InformationWindow__Name', detail.name));
    content.append(title);
    const body = createElement('div', 'InformationWindow__Body');
    const profile = createElement('section', 'InformationWindow__EntityProfile InformationWindow__StatusProfile');
    profile.append(this.#createLinkedDescription(detail.description, entry.id, 'InformationWindow__EntityCombatStyle'));
    body.append(profile);
    content.append(body);
    return content;
  }

  #renderTermDetail(entry) {
    const detail = this.textRepository.getInformationDetail('term', entry.data.term);
    const content = document.createDocumentFragment();
    const title = createElement('header', 'InformationWindow__Title');
    title.append(createTermIcon(), createElement('h2', 'InformationWindow__Name', detail.name));
    const body = createElement('div', 'InformationWindow__Body');
    const descriptionSection = createElement('section', 'InformationWindow__EntityProfile InformationWindow__TermProfile');
    descriptionSection.append(
      this.#createLinkedDescription(detail.description, entry.id, 'InformationWindow__EntityCombatStyle'),
    );
    body.append(descriptionSection);
    content.append(title, body);
    return content;
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
    const statusKeys = [...ENTITY_STATUS_KEYS, isEnemy ? 'hp' : 'stamina'];
    statusKeys.forEach((status) => {
      const current = status === 'hp' ? entity.hp : status === 'stamina' ? entity.stamina : entity.getStatus(status);
      const maximum = status === 'hp' ? entity.maximumHp : entity.maximums[status];
      statusGrid.append(this.#createEntityStatusGauge({ entry, status, current, maximum }));
    });
    statusGrid.append(this.#createEntityWeightGauge(entity, entry));
    information.append(statusGrid);

    const tagList = createElement('div', 'InformationWindow__EntityTagList');
    TAG_GRID.flat().forEach((tag) => {
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
    const combatStyle = this.#createLinkedDescription(detail.combatStyle, parentId, 'InformationWindow__EntityCombatStyle', entity);
    profile.append(this.#createLinkedDescription(detail.description, parentId), combatStyle);
    return profile;
  }

  #createEnemyDefinitionLink({ id, label }, source, parentId) {
    label = this.textRepository.getName('enemy', id);
    const definition = getEnemyDefinitionById(id);
    const link = createElement('button', 'InformationWindow__InlineReference state-clickable');
    link.type = 'button';
    const icon = createElement('span', 'InformationWindow__InlineIcon InformationWindow__InlineEnemyIcon');
    const image = document.createElement('img');
    image.src = resolvePublicAssetPath(definition.assetPath);
    image.alt = '';
    icon.append(image);
    link.append(icon, label);
    link.setAttribute('aria-label', this.textRepository.getLabel('openInformation', { name: label }));
    const openEnemyDefinition = (event) => this.manager.open({
      type: 'enemy-projection', parentId, data: { source, enemyId: id }, anchor: { x: event.clientX, y: event.clientY },
    });
    link.addEventListener('click', openEnemyDefinition);
    return link;
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
      this.#createLinkedDescription(detail.description, entry.id, 'InformationWindow__EntityCombatStyle', entry.data.source),
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
        profile.append(this.#createLinkedDescription(detail.description, entry.id, 'InformationWindow__EntityCombatStyle'));
      }
      if (item.category === 'weapon') {
        profile.append(createElement('p', 'InformationWindow__ItemTargetingNote', this.textRepository.getLabel('weaponTargetingNote')));
      }
      body.append(profile);
    }
    const tagList = createElement('div', 'InformationWindow__EntityTagList');
    [...new Set(item.tags)].forEach((tag) => {
      const count = item.tags.filter((current) => current === tag).length;
      const tagButton = createElement('button', 'InformationWindow__EntityTag state-clickable');
      tagButton.type = 'button';
      applyTagSkillVisual(tagButton, count, tag);
      tagButton.append(createTagIcon(tag, 'InformationWindow__TagIcon--small'), createElement('span', 'InformationWindow__SkillRequirement', String(count)));
      tagButton.addEventListener('click', (event) => this.manager.open({ type: 'tag', parentId: entry.id, data: { tag }, anchor: { x: event.clientX, y: event.clientY } }));
      tagList.append(tagButton);
    });
    const weight = createElement('button', 'InformationWindow__ItemWeight state-clickable');
    weight.type = 'button';
    weight.append(createStatusIcon('weight'), createElement('span', 'InformationWindow__ItemWeightTimes', `× ${item.chip.weight}`));
    weight.addEventListener('click', (event) => this.manager.open({
      type: 'status', parentId: entry.id, data: { status: 'weight' }, anchor: { x: event.clientX, y: event.clientY },
    }));
    tagList.append(weight);
    body.append(tagList);
    content.append(body);
    return content;
  }

  #createLinkedDescription(content, parentId, className = 'InformationWindow__Description', source = null) {
    const text = createElement('p', className);
    (Array.isArray(content) ? content : [content]).forEach((part) => {
      if (typeof part === 'string') text.append(part);
      else if (part.type === 'text') text.append(part.value);
      else if (part.type === 'reference') text.append(this.#createReference(part, parentId, source));
      else if (part.type === 'status') text.append(this.#createStatusReference(part, parentId));
      else if (part.type === 'tag') text.append(this.#createTagReference(part, parentId));
      else if (part.type === 'facility') text.append(this.#createFacilityReference(part, parentId));
      else if (part.type === 'area') text.append(this.#createAreaReference(part, parentId));
      else if (part.type === 'enemy-definition') text.append(this.#createEnemyDefinitionLink(part, source, parentId));
    });
    return text;
  }

  #createReference({ kind, id }, parentId, source = null) {
    if (kind === 'enemy-definition') return this.#createEnemyDefinitionLink({ id }, source, parentId);
    const label = this.textRepository.getName(kind, id);
    if (!label) throw new RangeError(`Unknown localized reference: ${kind}/${id}`);
    if (kind === 'status') return this.#createStatusReference({ id, label }, parentId);
    if (kind === 'tag') return this.#createTagReference({ id, label }, parentId);
    if (kind === 'area') return this.#createAreaReference({ id, label }, parentId);
    return this.#createFacilityReference({ id, label }, parentId);
  }

  #createStatusReference({ id, label }, parentId) {
    label = this.textRepository.getName('status', id);
    const reference = createElement('button', 'InformationWindow__InlineReference state-clickable');
    reference.type = 'button';
    reference.setAttribute('aria-label', this.textRepository.getLabel('openInformation', { name: label }));
    reference.append(createStatusIcon(id), label);
    reference.addEventListener('click', (event) => this.manager.open({
      type: 'status', parentId, data: { status: id }, anchor: { x: event.clientX, y: event.clientY },
    }));
    return reference;
  }

  #createTagReference({ id, label }, parentId) {
    label = this.textRepository.getName('tag', id);
    const reference = createElement('button', 'InformationWindow__InlineReference state-clickable');
    reference.type = 'button';
    reference.setAttribute('aria-label', this.textRepository.getLabel('openTagInformation', { name: label }));
    reference.append(createTagIcon(id, 'InformationWindow__TagIcon--inline'), label);
    reference.addEventListener('click', (event) => this.manager.open({
      type: 'tag', parentId, data: { tag: id }, anchor: { x: event.clientX, y: event.clientY },
    }));
    return reference;
  }

  #createFacilityReference({ id, label }, parentId) {
    label = this.textRepository.getName('facility', id);
    const reference = createElement('button', 'InformationWindow__InlineReference state-clickable');
    reference.type = 'button';
    reference.setAttribute('aria-label', this.textRepository.getLabel('openInformation', { name: label }));
    reference.append(createLocationIcon(id), label);
    reference.addEventListener('click', (event) => this.manager.open({
      type: 'facility', parentId, data: { facility: id }, anchor: { x: event.clientX, y: event.clientY },
    }));
    return reference;
  }

  #createAreaReference({ id, label }, parentId) {
    label = this.textRepository.getName('area', id);
    const reference = createElement('button', 'InformationWindow__InlineReference state-clickable');
    reference.type = 'button';
    reference.setAttribute('aria-label', this.textRepository.getLabel('openInformation', { name: label }));
    reference.append(createLocationIcon(id), label);
    reference.addEventListener('click', (event) => this.manager.open({
      type: 'area', parentId, data: { area: id }, anchor: { x: event.clientX, y: event.clientY },
    }));
    return reference;
  }

  #renderFacilityDetail(entry) {
    const detail = this.textRepository?.getInformationDetail('facility', entry.data.facility);
    if (!detail) throw new RangeError(`Unknown localized facility: ${entry.data.facility}`);
    const content = document.createDocumentFragment();
    const title = createElement('header', 'InformationWindow__Title');
    title.append(createLocationIcon(entry.data.facility), createElement('h2', 'InformationWindow__Name', detail.name));
    content.append(title);
    const body = createElement('div', 'InformationWindow__Body');
    if (detail.flavor) {
      const profile = createElement('section', 'InformationWindow__EntityProfile');
      profile.append(
        createElement('p', 'InformationWindow__Description', detail.flavor),
        this.#createLinkedDescription(detail.description, entry.id, 'InformationWindow__EntityCombatStyle'),
      );
      body.append(profile);
    } else body.append(this.#createLinkedDescription(detail.description, entry.id));
    content.append(body);
    return content;
  }

  #renderAreaDetail(entry) {
    const detail = this.textRepository?.getInformationDetail('area', entry.data.area);
    if (!detail) throw new RangeError(`Unknown localized area: ${entry.data.area}`);
    const content = document.createDocumentFragment();
    const title = createElement('header', 'InformationWindow__Title');
    title.append(createLocationIcon(entry.data.area), createElement('h2', 'InformationWindow__Name', detail.name));
    content.append(title);
    const body = createElement('div', 'InformationWindow__Body');
    if (detail.flavor) {
      const profile = createElement('section', 'InformationWindow__EntityProfile');
      profile.append(
        createElement('p', 'InformationWindow__Description', detail.flavor),
        this.#createLinkedDescription(detail.description, entry.id, 'InformationWindow__EntityCombatStyle'),
      );
      body.append(profile);
    } else body.append(this.#createLinkedDescription(detail.description, entry.id));
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
