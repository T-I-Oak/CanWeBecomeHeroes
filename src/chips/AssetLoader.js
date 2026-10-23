import { resolvePublicAssetPath } from './PublicAssetPath.js';
import { registerScaledImage } from './ScaledImage.js';

export default class AssetLoader {
  constructor() {
    this.images = new Map();
  }

  load(path) {
    if (!this.images.has(path)) {
      const image = new Image();
      registerScaledImage(image, path);
      image.src = resolvePublicAssetPath(path);
      this.images.set(path, image);
    }

    return this.images.get(path);
  }
}
