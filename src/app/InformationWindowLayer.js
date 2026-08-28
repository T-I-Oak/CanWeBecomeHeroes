import { getTagBaseColors, getTagGlyphScales } from '../game/TagCatalog.js';
import { getTagDetail } from '../game/TagDetailCatalog.js';
import { getTagBadgeVisual, getTagSkillVisual } from '../game/TagSkillVisualCatalog.js';
import { STATUS_VISUALS } from '../game/StatusVisualCatalog.js';
import { getStatusDetail } from '../game/StatusDetailCatalog.js';
import { getItemDetail } from '../game/ItemDetailCatalog.js';
import { AREA_THEME } from '../game/AreaTheme.js';

const ENTITY_STATUS_KEYS = Object.freeze(['power', 'magic', 'speed', 'negotiation', 'luck']);
// The hero detail portrait is 156px for a 192px chip.  Enemy portraits keep
// this same world-size ratio instead of being normalized to the hero size.
const ENTITY_PORTRAIT_SCALE = 156 / 192;
const TAG_GRID = Object.freeze([
  Object.freeze(['valor', 'arcane', 'dexterity', 'reputation', 'fortune']),
  Object.freeze(['iron', 'cloth', 'feather', 'gem', 'blessing']),
  Object.freeze(['fire', 'water', 'lightning', 'vitality', 'area']),
]);

function createElement(tagName, className, text = null) {
  const element = document.createElement(tagName);
  element.className = className;
  if (text !== null) element.textContent = text;
  return element;
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
  image.src = `/assets/tags/${tag}.png`;
  image.alt = '';
  icon.append(image);
  return icon;
}

function createStatusIcon(status, sizeClass = '') {
  const icon = createElement('span', `InformationWindow__StatusIcon ${sizeClass}`.trim());
  const image = document.createElement('img');
  image.src = STATUS_VISUALS[status].iconPath;
  image.alt = '';
  icon.append(image);
  return icon;
}

function createChipImage(path) {
  const image = createElement('span', 'InformationWindow__ChipImage');
  const asset = document.createElement('img');
  asset.src = path;
  asset.alt = '';
  image.append(asset);
  return image;
}

function createEquipmentImage(path) {
  const image = createElement('span', 'InformationWindow__EquipmentImage');
  const asset = document.createElement('img');
  asset.src = path;
  asset.alt = '';
  image.append(asset);
  return image;
}

export default class InformationWindowLayer {
  constructor(element, manager) {
    this.element = element;
    this.manager = manager;
  }

  render(entries) {
    const windows = entries.map((entry) => this.#renderWindow(entry));
    this.element.replaceChildren(...windows);
    windows.forEach((window, index) => this.#positionWindow(window, entries[index].anchor));
  }

  #renderWindow(entry) {
    const window = createElement('section', 'InformationWindow');
    window.dataset.informationWindowId = entry.id;
    if (entry.type === 'tag') window.append(this.#renderTagDetail(entry));
    if (entry.type === 'status') window.append(this.#renderStatusDetail(entry));
    if (entry.type === 'entity') window.append(this.#renderEntityDetail(entry));
    if (entry.type === 'item') window.append(this.#renderItemDetail(entry));
    return window;
  }

  #renderTagDetail(entry) {
    const { tag } = entry.data;
    const detail = getTagDetail(tag);
    const content = document.createDocumentFragment();
    const title = createElement('header', 'InformationWindow__Title');
    title.append(createTagIcon(tag), createElement('h2', 'InformationWindow__Name', detail.name));
    content.append(title);

    const body = createElement('div', 'InformationWindow__Body');
    if (detail.status) {
      const status = createElement('p', 'InformationWindow__Effect');
      const statusIcon = createElement('span', 'InformationWindow__InlineIcon');
      const image = document.createElement('img');
      image.src = STATUS_VISUALS[detail.status].iconPath;
      image.alt = '';
      statusIcon.append(image);
      statusIcon.tabIndex = 0;
      statusIcon.classList.add('state-clickable');
      const openStatusDetail = (event) => this.manager.open({
        type: 'status', parentId: entry.id, data: { status: detail.status }, anchor: { x: event.clientX, y: event.clientY },
      });
      statusIcon.addEventListener('click', openStatusDetail);
      statusIcon.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openStatusDetail(event); }
      });
      status.append('このタグを持つItemを装備すると', statusIcon, `${detail.statusName}が増える。`);
      body.append(status, createElement('p', 'InformationWindow__Description', `${detail.effect}が上がる。`));

      const skillList = createElement('div', 'InformationWindow__SkillList');
      detail.skills.forEach((skill) => {
        const skillBadge = createElement('div', 'InformationWindow__Skill');
        applyTagSkillVisual(skillBadge, skill.requiredCount);
        const requirement = createElement('span', 'InformationWindow__SkillRequirement', String(skill.requiredCount));
        const name = createElement('span', 'InformationWindow__SkillName', skill.name);
        skillBadge.append(requirement, name);
        skillList.append(skillBadge);
      });
      body.append(skillList);
    } else body.append(createElement('p', 'InformationWindow__Description', detail.description));
    content.append(body);
    return content;
  }

  #renderStatusDetail(entry) {
    const { status, current, maximum } = entry.data;
    const detail = getStatusDetail(status);
    const content = document.createDocumentFragment();
    const title = createElement('header', 'InformationWindow__Title');
    title.append(createStatusIcon(status), createElement('h2', 'InformationWindow__Name', detail.name));
    content.append(title);
    const body = createElement('div', 'InformationWindow__Body');
    if (Number.isFinite(current) && Number.isFinite(maximum)) body.append(createElement('p', 'InformationWindow__Effect', `現在値 ${Math.floor(current)} / ${Math.floor(maximum)}`));
    body.append(createElement('p', 'InformationWindow__Description', detail.description));
    content.append(body);
    return content;
  }

  #renderEntityDetail(entry) {
    const { entity } = entry.data;
    const isEnemy = entity.chip.type === 'enemy';
    const displayName = isEnemy ? entity.definition.nameJa : `【${entity.profession}・${entity.name.ja}】`;
    const content = document.createDocumentFragment();
    const title = createElement('header', 'InformationWindow__Title InformationWindow__EntityTitle');
    title.style.setProperty('--entity-portrait-size', `${entity.chip.radius * 2 * ENTITY_PORTRAIT_SCALE}px`);
    title.append(createChipImage(entity.chip.centerPath), createElement('h2', 'InformationWindow__Name', displayName));
    content.append(title);
    const body = createElement('div', 'InformationWindow__EntityPanel');
    const information = createElement('section', 'InformationWindow__EntityInformation');
    const statusGrid = createElement('div', 'InformationWindow__EntityStatusGrid');
    const statusKeys = isEnemy ? ['hp', ...ENTITY_STATUS_KEYS] : [...ENTITY_STATUS_KEYS, 'stamina'];
    statusKeys.forEach((status) => {
      const current = status === 'hp' ? entity.hp : status === 'stamina' ? entity.stamina : entity.getStatus(status);
      const maximum = status === 'hp' ? entity.maximumHp : entity.maximums[status];
      statusGrid.append(this.#createEntityStatusGauge({ entry, status, current, maximum }));
    });
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
    information.append(tagList);
    body.append(information);

    const equipmentList = createElement('div', 'InformationWindow__EquipmentList');
    const equipment = isEnemy ? entity.equipment.map((item, index) => [String(index), item]) : Object.entries(entity.equipment);
    equipment.filter(([, item]) => !isEnemy || Boolean(item)).forEach(([slot, item]) => equipmentList.append(this.#createEquipmentButton(item, entry.id, isEnemy ? null : slot)));
    body.append(equipmentList);
    content.append(body);
    return content;
  }

  #createEntityStatusGauge({ entry, status, current, maximum }) {
    const gauge = createElement('button', 'InformationWindow__EntityStatus state-clickable');
    gauge.type = 'button';
    gauge.style.setProperty('--status-frame-color', STATUS_VISUALS[status].gaugeFrameColor);
    gauge.append(createStatusIcon(status));
    const segments = createElement('span', 'InformationWindow__EntityStatusSegments');
    for (let index = 1; index <= 7; index += 1) {
      const segment = createElement('span', 'InformationWindow__EntityStatusSegment');
      if (index <= current) segment.classList.add('is-active');
      else if (index <= maximum) segment.classList.add('is-available');
      segments.append(segment);
    }
    gauge.append(segments);
    gauge.addEventListener('click', (event) => this.manager.open({
      type: 'status', parentId: entry.id, data: { status, current, maximum }, anchor: { x: event.clientX, y: event.clientY },
    }));
    return gauge;
  }

  #renderItemDetail(entry) {
    const { item } = entry.data;
    const detail = getItemDetail(item.type);
    const content = document.createDocumentFragment();
    const title = createElement('header', 'InformationWindow__Title');
    title.append(createChipImage(item.chip.centerPath), createElement('h2', 'InformationWindow__Name', detail.name));
    content.append(title);
    const body = createElement('div', 'InformationWindow__Body');
    if (detail.description) body.append(createElement('p', 'InformationWindow__Description', detail.description));
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
    if (tagList.childElementCount > 0) body.append(tagList);
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

  #positionWindow(windowElement, anchor) {
    if (!anchor) {
      windowElement.style.left = '50%';
      windowElement.style.top = '50%';
      windowElement.style.transform = 'translate(-50%, -50%)';
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
}
