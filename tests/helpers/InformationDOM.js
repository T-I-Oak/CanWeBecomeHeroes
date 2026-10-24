export default class Element {
  constructor(tag) {
    this.tag = tag;
    this.children = [];
    this.dataset = {};
    this.attributes = {};
    this.listeners = {};
    this.style = { setProperty(key, value) { this[key] = value; }, getPropertyValue(key) { return this[key] ?? ''; } };
    this.classList = { add: name => { this.className = `${this.className ?? ''} ${name}`; } };
  }
  append(...children) {
    for (const child of children.flatMap(child => child.tag === 'fragment' ? [...child.children] : [child])) {
      if (child instanceof Element) { child.remove(); child.parentElement = this; }
      this.children.push(child);
    }
  }
  remove() {
    if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(child => child !== this);
    this.parentElement = null;
  }
  replaceWith(child) {
    const parent = this.parentElement;
    child.remove();
    parent.children.splice(parent.children.indexOf(this), 1, child);
    child.parentElement = parent;
    this.parentElement = null;
  }
  replaceChildren(...children) { this.children = []; this.append(...children); }
  insertBefore(child, before) {
    child.remove();
    const index = before ? this.children.indexOf(before) : this.children.length;
    this.children.splice(index, 0, child);
    child.parentElement = this;
  }
  set textContent(value) { this.children = [value]; }
  get textContent() { return this.children.map(child => child instanceof Element ? child.textContent : child).join(''); }
  setAttribute(key, value) { this.attributes[key] = value; }
  addEventListener(type, handler) { this.listeners[type] = handler; }
  findAll(selector) {
    return this.children.filter(child => child instanceof Element).flatMap(child => [
      ...(child.className?.split(' ').includes(selector.slice(1)) ? [child] : []), ...child.findAll(selector),
    ]);
  }
  querySelector(selector) { return this.findAll(selector)[0] ?? null; }
  getBoundingClientRect() { return { x: 0, y: 0, width: 300, height: 240 }; }
}
