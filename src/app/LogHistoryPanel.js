import { createInformationElement as element } from './InformationWindowElementFactory.js';
import { createLogMessageParts } from '../game/LogPresentation.js';
import { renderLogMessage } from './LogMessageView.js';
import { matchesLogFilters } from './LogHistoryModel.js';
import VirtualLogList from './VirtualLogList.js';
import { readLogHistoryFilters, writeLogHistoryFilters } from '../game/LogHistorySettings.js';

export default class LogHistoryPanel {
  constructor({ gameLog, manager, textRepository, dataManager }) {
    Object.assign(this, { gameLog, manager, textRepository });
    this.filters = readLogHistoryFilters(dataManager);
    this.body = element('div', 'LogHistory');
    this.controls = element('div', 'LogHistory__Controls');
    this.labels = [];
    for (const [key, labelKey] of [['ordinary', 'logShowOrdinary'], ['exSkill', 'logShowExSkill']]) {
      const label = element('label', 'LogHistory__Filter');
      const input = document.createElement('input');
      input.type = 'checkbox'; input.checked = this.filters[key];
      input.addEventListener('change', () => {
        this.filters[key] = input.checked;
        writeLogHistoryFilters(dataManager, this.filters);
        this.refresh(); this.list.latest();
      });
      const text = element('span', 'LogHistory__FilterText');
      this.labels.push({ text, labelKey });
      label.append(input, text); this.controls.append(label);
    }
    this.latest = element('button', 'LogHistory__Latest');
    this.latest.type = 'button';
    this.latest.addEventListener('click', () => this.list.latest());
    this.controls.append(this.latest);
    this.viewport = element('div', 'LogHistory__Viewport PaperScroll');
    this.viewport.setAttribute('role', 'list');
    this.body.append(this.controls, this.viewport);
    this.list = new VirtualLogList(this.viewport, record => this.renderRecord(record));
    this.unsubscribe = gameLog.subscribe(() => { if (this.entryId) this.refresh(); });
  }

  render(entry) {
    const newlyOpened = this.entryId !== entry.id;
    this.entryId = entry.id;
    const fragment = document.createDocumentFragment();
    const title = element('header', 'InformationWindow__Title');
    title.append(element('h2', 'InformationWindow__Name', this.textRepository.getLabel('logHistory')));
    fragment.append(title, this.body);
    this.labels.forEach(({ text, labelKey }) => { text.textContent = this.textRepository.getLabel(labelKey); });
    this.latest.textContent = this.textRepository.getLabel('logLatest');
    this.refresh();
    if (newlyOpened) this.list.latest();
    return fragment;
  }

  refresh() {
    const language = this.textRepository.getLabel('documentLanguage');
    this.list.setRecords(this.gameLog.getRecords().filter(record => matchesLogFilters(record, this.filters)), { resetHeights: language !== this.language });
    this.language = language;
    this.viewport.setAttribute('aria-label', this.textRepository.getLabel('logHistory'));
  }

  renderRecord(record) {
    const row = element('div', 'LogHistory__Row');
    row.dataset.recordId = record.id;
    row.setAttribute('role', 'listitem');
    if (record.localized) renderLogMessage(row, createLogMessageParts(this.textRepository, record.localized), {
      parentId: this.entryId, open: entry => this.manager.open(entry),
    });
    else row.textContent = this.gameLog.getMessage(record);
    return row;
  }

  close() { this.entryId = null; }
  captureScroll() { return this.entryId ? { top: this.viewport.scrollTop, follow: this.list.follow } : null; }
  restoreScroll(state) {
    if (state && this.entryId) {
      this.viewport.scrollTop = state.top;
      this.list.follow = state.follow;
    }
    this.list.schedule();
  }
  dispose() { this.unsubscribe(); this.list.dispose(); this.body.remove(); }
}
