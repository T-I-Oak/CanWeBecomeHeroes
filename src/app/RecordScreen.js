import RunRankings, { RANKING_CRITERIA } from '../game/RunRankings.js';
import { getHeroDefinitionAssetPath } from '../game/HeroFactory.js';
import { resolvePublicAssetPath } from '../chips/PublicAssetPath.js';
import { createAchievementTable } from './AchievementTable.js';
import { createCroppedEnemyLine } from './CroppedEnemyLine.js';
import { getRecordAchievements, getTaskRecords } from './RecordScreenData.js';
import RecordInformation from './RecordInformation.js';
import { getRecordScreenLayout } from './RecordScreenScale.js';
import { GAME_TICKS_PER_HOUR } from '../game/GuildTime.js';

const TABS = ['recordRankings', 'recordAchievements', 'recordTasks'];
const CRITERION_LABELS = { remainingHours: 'recordRemainingHours', elapsedTicks: 'recordElapsedHours', clearedStages: 'recordClearedStages', defeats: 'recordDefeats', points: 'recordPoints' };
const COLUMNS = ['recordRank', 'recordClearedStages', 'recordRemainingHours', 'recordDefeats', 'recordPoints', 'recordMembers', 'recordAchievedAt'];
const CRITERION_COLUMNS = { clearedStages: 1, remainingHours: 2, elapsedTicks: 2, defeats: 3, points: 4 };
const KIND_LABELS = { regular: 'recordRegular', elite: 'recordElite', boss: 'recordBoss' };

function node(tag, className = '', text = null) {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== null) element.textContent = text;
  return element;
}

export default class RecordScreen {
  constructor(container, { repository, textRepository, assets, heroProgress, onClose }) {
    this.container = container;
    this.repository = repository;
    this.texts = textRepository;
    this.assets = assets;
    this.heroProgress = heroProgress;
    this.onClose = onClose;
    this.tab = TABS[0];
    this.criterion = 'remainingHours';
    this.challengeCriterion = 'clearedStages';
    this.isOpen = false;
    this.resizeObserver = new ResizeObserver(() => this.resize());
  }

  open() {
    this.isOpen = true;
    this.information = new RecordInformation(this.texts, this.assets);
    this.render();
    this.resizeObserver.observe(this.container);
    this.container.querySelector('[role="tab"][aria-selected="true"]').focus();
  }

  close() {
    this.isOpen = false;
    this.information.dispose();
    this.resizeObserver.disconnect();
    this.container.replaceChildren();
    this.onClose();
  }

  refreshLanguage() {
    if (this.isOpen) { this.render(); this.information.refresh(); }
  }

  button(label, action, selected = false) {
    const button = node('button', `RecordScreen__Button${selected ? ' state-selected' : ''}`, this.texts.getLabel(label));
    button.type = 'button';
    button.addEventListener('click', action);
    return button;
  }

  render() {
    const tabsAvailable = this.heroProgress.hasClearedTrial() ? ['recordRankings', 'recordChallengeRankings', ...TABS.slice(1)] : TABS;
    const screen = node('section', 'RecordScreen');
    const header = node('header', 'RecordScreen__Header');
    const title = node('h1', '', this.texts.getLabel('recordTitle'));
    title.id = 'record-screen-title';
    screen.setAttribute('aria-labelledby', title.id);
    header.append(title, this.button('returnToTitle', () => this.close()));
    const tabs = node('div', 'RecordScreen__Tabs');
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', this.texts.getLabel('recordTitle'));
    tabsAvailable.forEach((key, index) => {
      const button = this.button(key, () => this.selectTab(key), key === this.tab);
      button.id = `record-tab-${key}`;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', String(key === this.tab));
      button.setAttribute('aria-controls', 'record-content');
      button.tabIndex = key === this.tab ? 0 : -1;
      button.addEventListener('keydown', event => {
        const offset = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
        if (offset || event.key === 'Home' || event.key === 'End') {
          event.preventDefault();
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabsAvailable.length - 1 : (index + offset + tabsAvailable.length) % tabsAvailable.length;
          this.selectTab(tabsAvailable[next]);
        }
      });
      tabs.append(button);
    });
    this.controls = node('div', 'RecordScreen__Controls');
    const scroll = node('div', 'RecordScreen__ScrollViewport PaperScroll');
    const contentFrame = node('div', 'RecordScreen__ContentFrame');
    const content = node('div', 'RecordScreen__Content');
    content.id = 'record-content';
    content.setAttribute('role', 'tabpanel');
    content.setAttribute('aria-labelledby', `record-tab-${this.tab}`);
    content.tabIndex = 0;
    // Read live repository state on every visit; no collection or persistence here.
    if (['recordRankings', 'recordChallengeRankings'].includes(this.tab)) this.renderRankings(content);
    else if (this.tab === 'recordAchievements') this.renderAchievements(content);
    else this.renderTasks(content);
    contentFrame.append(content);
    scroll.append(contentFrame);
    screen.append(header, tabs, this.controls, scroll);
    screen.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.stopPropagation(); this.close(); }
    });
    const viewport = node('div', 'RecordScreenViewport');
    viewport.append(screen);
    this.screen = screen;
    this.scroll = scroll;
    this.content = content;
    this.contentFrame = contentFrame;
    this.container.replaceChildren(viewport);
    this.resize();
  }

  resize() {
    if (!this.isOpen) return;
    const layout = getRecordScreenLayout(this.scroll.clientWidth);
    this.content.style.width = `${layout.width}px`;
    this.content.style.transform = `scale(${layout.scale})`;
    this.contentFrame.style.width = `${Math.max(layout.width, this.content.scrollWidth) * layout.scale}px`;
    this.contentFrame.style.height = `${this.content.scrollHeight * layout.scale}px`;
  }

  selectTab(key) {
    this.tab = key;
    this.render();
    this.container.querySelector(`#record-tab-${key}`).focus();
  }

  createTable(labels) {
    const table = node('table', 'RecordScreen__Table');
    const head = node('thead');
    const row = node('tr');
    labels.forEach(key => {
      const cell = node('th', '', this.texts.getLabel(key));
      cell.scope = 'col';
      row.append(cell);
    });
    head.append(row);
    const body = node('tbody');
    table.append(head, body);
    return { table, row, body };
  }

  renderRankings(content) {
    const challenge = this.tab === 'recordChallengeRankings';
    const mode = challenge ? 'challenge' : 'trial';
    const criterionKey = challenge ? 'challengeCriterion' : 'criterion';
    const selectedCriterion = this[criterionKey];
    const selectors = node('div', 'RecordScreen__Selectors');
    RANKING_CRITERIA[mode].forEach(criterion => {
      const button = this.button(CRITERION_LABELS[criterion], () => {
        this[criterionKey] = criterion;
        this.render();
        this.container.querySelector('.RecordScreen__Selectors .state-selected').focus();
      }, selectedCriterion === criterion);
      button.setAttribute('aria-pressed', String(selectedCriterion === criterion));
      selectors.append(button);
    });
    this.controls.append(selectors);
    const rankings = new RunRankings(this.repository.data.rankings).get(mode, selectedCriterion);
    if (!rankings.length) {
      content.append(node('p', 'RecordScreen__Empty', this.texts.getLabel('recordEmpty')));
      return;
    }
    const columns = COLUMNS.map(key => challenge && key === 'recordRemainingHours' ? 'recordElapsedHours' : key);
    const { table, row, body } = this.createTable(columns);
    table.classList.add('RecordScreen__Rankings');
    row.children[CRITERION_COLUMNS[selectedCriterion]].setAttribute('aria-sort', 'descending');
    const number = value => new Intl.NumberFormat(document.documentElement.lang).format(value);
    rankings.forEach((record, index) => {
      const hours = Math.max(0, challenge ? Math.floor(record.elapsedTicks / GAME_TICKS_PER_HOUR) : Math.ceil(record.remainingHours));
      const remaining = !challenge && record.outcome === 'expired' ? this.texts.getLabel('recordFailed')
        : this.texts.getLabel('daysHours', { days: Math.floor(hours / 24), hours: hours % 24 });
      const tr = node('tr');
      [index + 1, number(record.clearedStages), remaining, number(record.defeats), number(record.points)].forEach((value, column) => {
        tr.append(node('td', column === CRITERION_COLUMNS[selectedCriterion] ? 'state-sort-value' : '', value));
      });
      const members = node('td');
      const portraits = node('div', 'RecordScreen__Members');
      record.members.forEach(member => {
        const frame = node('span', 'RecordScreen__Portrait');
        const image = node('img');
        image.src = resolvePublicAssetPath(getHeroDefinitionAssetPath(member.heroId));
        image.alt = this.texts.getName('hero', member.heroId);
        frame.append(image);
        frame.addEventListener('click', event => this.information.open('hero', member.heroId, event));
        portraits.append(frame);
      });
      members.append(portraits);
      tr.append(members, this.createDateCell(record.endedAt));
      body.append(tr);
    });
    content.append(table);
  }

  renderAchievements(content) {
    const language = document.documentElement.lang.startsWith('en') ? 'en' : 'ja';
    const entries = getRecordAchievements(this.repository.data.statistics, language).map(entry => ({
      ...entry, progressLabel: entry.progress.target === null ? this.texts.getLabel('recordAchieved')
        : `${entry.progress.current.toLocaleString(language)} / ${entry.progress.target.toLocaleString(language)}`,
    }));
    content.append(createAchievementTable({ mode: 'record', entries, headings: {
      category: this.texts.getLabel('trialResultCategory'), item: this.texts.getLabel('trialResultItem'),
      grade: this.texts.getLabel('trialResultGrade'), condition: this.texts.getLabel('recordCondition'),
      progress: this.texts.getLabel('recordProgress'),
    } }));
  }

  renderTasks(content) {
    content.append(node('p', 'RecordScreen__Help', this.texts.getLabel('recordLevelHelp')));
    getTaskRecords(this.repository.data.statistics).forEach(group => {
      content.append(node('h2', 'RecordScreen__GroupTitle', this.texts.getLabel(KIND_LABELS[group.kind])));
      if (!group.entries.length) {
        content.append(node('p', 'RecordScreen__Empty', this.texts.getLabel('recordTasksEmpty')));
        return;
      }
      const { table, body } = this.createTable(['recordEnemyFormation', 'recordHighestLevel', 'recordAchievedAt']);
      table.classList.add('RecordScreen__Tasks');
      group.entries.forEach(entry => {
        const row = node('tr');
        const formation = node('td');
        formation.append(createCroppedEnemyLine({ kind: group.kind, pattern: entry.pattern, level: entry.highestLevel }, this.assets, this.texts,
          (id, event) => this.information.open('enemy', id, event)));
        row.append(formation, node('td', 'RecordScreen__Level', `Lv ${entry.highestLevel}`), this.createDateCell(entry.highestLevelClearedAt));
        body.append(row);
      });
      content.append(table);
    });
  }

  createDateCell(value) {
    const cell = node('td', 'RecordScreen__Date');
    const date = node('time', '', new Intl.DateTimeFormat(document.documentElement.lang, {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(new Date(value)));
    date.dateTime = value;
    cell.append(date);
    return cell;
  }
}
