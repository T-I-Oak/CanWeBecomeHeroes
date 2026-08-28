import { getTagBaseColors, getTagGlyphScales } from '../game/TagCatalog.js';
import { getTagDetail } from '../game/TagDetailCatalog.js';
import { getTagSkillVisual } from '../game/TagSkillVisualCatalog.js';
import { STATUS_VISUALS } from '../game/StatusVisualCatalog.js';

function createElement(tagName, className, text = null) {
  const element = document.createElement(tagName);
  element.className = className;
  if (text !== null) element.textContent = text;
  return element;
}

function applyTagSkillVisual(element, count) {
  const visual = getTagSkillVisual(count);
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

export default class InformationWindowLayer {
  constructor(element, manager) {
    this.element = element;
    this.manager = manager;
  }

  render(entries) {
    this.element.replaceChildren(...entries.map((entry, index) => this.#renderWindow(entry, index)));
  }

  #renderWindow(entry, depth) {
    const window = createElement('section', 'InformationWindow');
    window.dataset.informationWindowId = entry.id;
    window.style.setProperty('--information-window-offset-x', `${depth * 32}px`);
    window.style.setProperty('--information-window-offset-y', `${depth * 24}px`);
    if (entry.type === 'tag') window.append(this.#renderTagDetail(entry));
    if (entry.type === 'tag-skill') window.append(this.#renderTagSkillDetail(entry));
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
      const statusIcon = document.createElement('img');
      statusIcon.className = 'InformationWindow__StatusIcon';
      statusIcon.src = STATUS_VISUALS[detail.status].iconPath;
      statusIcon.alt = '';
      status.append('このタグを持つItemを装備すると', statusIcon, `${detail.statusName}が増える。`);
      body.append(status, createElement('p', 'InformationWindow__Description', `${detail.effect}が上がる。`));

      const skillList = createElement('div', 'InformationWindow__SkillList');
      detail.skills.forEach((skill) => {
        const skillButton = createElement('button', 'InformationWindow__Skill state-clickable');
        skillButton.type = 'button';
        applyTagSkillVisual(skillButton, skill.requiredCount);
        const requirement = createElement('span', 'InformationWindow__SkillRequirement', String(skill.requiredCount));
        const name = createElement('span', 'InformationWindow__SkillName', skill.name);
        skillButton.append(requirement, name);
        skillButton.addEventListener('click', () => this.manager.open({
          type: 'tag-skill',
          parentId: entry.id,
          data: { tag, tagName: detail.name, effect: detail.effect, ...skill },
        }));
        skillList.append(skillButton);
      });
      body.append(skillList);
    } else body.append(createElement('p', 'InformationWindow__Description', detail.description));
    content.append(body);
    return content;
  }

  #renderTagSkillDetail(entry) {
    const { tag, tagName, effect, requiredCount, name } = entry.data;
    const content = document.createDocumentFragment();
    const title = createElement('header', 'InformationWindow__Title');
    title.append(createTagIcon(tag), createElement('h2', 'InformationWindow__Name', name));
    content.append(title);
    const body = createElement('div', 'InformationWindow__Body');
    const requirement = createElement('div', 'InformationWindow__SkillDetailRequirement');
    applyTagSkillVisual(requirement, requiredCount);
    requirement.append(createTagIcon(tag, 'InformationWindow__TagIcon--small'), createElement('span', 'InformationWindow__SkillRequirement', String(requiredCount)));
    body.append(requirement, createElement('p', 'InformationWindow__Description', `${tagName}タグを${requiredCount}個以上持つと発動する。`), createElement('p', 'InformationWindow__Description', `${effect}を高めるタグスキル。`));
    content.append(body);
    return content;
  }
}
