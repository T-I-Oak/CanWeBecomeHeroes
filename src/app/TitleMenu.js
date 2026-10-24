import { resolvePublicAssetPath } from '../chips/PublicAssetPath.js';
import { APP_COPYRIGHT, APP_VERSION } from '../game/AppMetadata.js';
import ModalLayer from './ModalLayer.js';
import TitleChipRain from './TitleChipRain.js';
import RecordScreen from './RecordScreen.js';

function createElement(tagName, className, text = null) {
  const element = document.createElement(tagName);
  element.className = className;
  if (text !== null) element.textContent = text;
  return element;
}

/** Top menu shown before a trial and after the player leaves a result. */
export default class TitleMenu {
  constructor(container, { textRepository, assets, heroProgress, runRecords } = {}) {
    if (!container || !textRepository || !assets || !heroProgress) {
      throw new Error('Title menu requires a container, text repository, assets, and hero progress.');
    }
    this.modalLayer = new ModalLayer(container);
    this.container = this.modalLayer.container;
    this.textRepository = textRepository;
    this.assets = assets;
    this.heroProgress = heroProgress;
    this.runRecords = runRecords;
    this.rain = null;
    this.commands = [];
  }

  show() {
    this.render();
    this.modalLayer.open();
    this.rain.start();
    return new Promise((resolve) => { this.resolve = resolve; });
  }

  refreshLanguage() {
    this.commands.forEach((command) => {
      command.element.textContent = this.textRepository.getLabel(command.label);
    });
    this.diagnosticLink.textContent = this.textRepository.getLabel('recordRotationDiagnostics');
    this.recordScreen.refreshLanguage();
  }

  render() {
    const stage = createElement('div', 'TitleMenu__Stage');
    const canvas = createElement('canvas', 'TitleMenu__Chips');
    const shade = createElement('div', 'TitleMenu__Shade');
    const content = createElement('div', 'TitleMenu__Content');
    this.container.style.backgroundImage = `url("${resolvePublicAssetPath('/assets/background/warehouse.png')}")`;
    const logo = createElement('img', 'TitleMenu__Logo');
    logo.src = resolvePublicAssetPath('/assets/logo.png');
    logo.alt = 'Can We Become Heroes?';
    this.menu = createElement('nav', 'TitleMenu__Menu');
    this.panel = createElement('div', 'TitleMenu__Panel');
    content.append(logo, this.menu, this.panel);
    stage.append(canvas, shade, content, this.createCredit());
    this.container.replaceChildren(stage);
    this.rain = new TitleChipRain(canvas, this.assets);
    this.renderMenu();
    this.renderPanel();
  }

  createCredit() {
    const credit = createElement('p', 'TitleMenu__Credit');
    const version = createElement('span', 'TitleMenu__Version', `v${APP_VERSION}`);
    const notice = createElement('span', 'TitleMenu__Copyright', `© ${APP_COPYRIGHT.holder} ${APP_COPYRIGHT.year} | `);
    const portal = createElement('a', 'TitleMenu__Portal', APP_COPYRIGHT.portal);
    portal.href = APP_COPYRIGHT.portalUrl;
    portal.target = '_blank';
    portal.rel = 'noopener noreferrer';
    notice.append(portal);
    credit.append(version, notice);
    return credit;
  }

  renderMenu() {
    const commands = [
      ['startGame', () => this.choose('trial')],
      ['records', () => this.openPanel('records')],
    ];
    if (this.heroProgress.hasClearedTrial()) commands.splice(1, 0, ['challengeMode', () => this.choose('challenge')]);
    this.commands = commands.map(([label, action]) => {
      const element = createElement('button', label === 'startGame' ? 'TitleMenu__Command state-primary' : 'TitleMenu__Command', this.textRepository.getLabel(label));
      element.type = 'button';
      element.addEventListener('click', () => action(element));
      return { label, element };
    });
    this.menu.replaceChildren(...this.commands.map((command) => command.element));
    this.diagnosticLink = createElement('a', 'TitleMenu__DiagnosticLink', this.textRepository.getLabel('recordRotationDiagnostics'));
    this.diagnosticLink.href = resolvePublicAssetPath('/tests/manual/record-rotation.html');
    this.menu.append(this.diagnosticLink);
  }

  renderPanel() {
    this.recordScreen = new RecordScreen(this.panel, {
      repository: this.runRecords, textRepository: this.textRepository, assets: this.assets,
      heroProgress: this.heroProgress,
      onClose: () => this.closePanel(),
    });
  }

  openPanel(name) {
    this.menu.classList.add('state-hidden');
    this.panel.classList.add('state-open');
    this.container.classList.add('state-records');
    if (name === 'records') this.recordScreen.open();
  }

  closePanel() {
    this.panel.classList.remove('state-open');
    this.container.classList.remove('state-records');
    this.menu.classList.remove('state-hidden');
    this.commands.find(command => command.label === 'records').element.focus();
  }

  choose(action) {
    this.rain.stop();
    this.modalLayer.close();
    this.resolve(action);
  }
}
