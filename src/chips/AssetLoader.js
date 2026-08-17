export default class AssetLoader {
  constructor() {
    this.images = new Map();
  }

  load(path) {
    if (!this.images.has(path)) {
      const image = new Image();
      image.src = path;
      this.images.set(path, image);
    }

    return this.images.get(path);
  }
}
