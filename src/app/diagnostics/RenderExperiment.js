import { getRequiredImageSize } from './PerformanceStats.js';

const PAINT_METHODS = ['drawImage', 'fill', 'stroke', 'fillRect', 'strokeRect', 'fillText', 'strokeText'];
const METHODS = [...PAINT_METHODS, 'clip'];

export default class RenderExperiment {
  constructor(canvases) {
    this.mode = 'baseline';
    this.capture = false;
    this.images = new Map();
    this.replacements = new Map();
    this.counts = {};
    this.restorers = [];
    this.urls = [];
    for (const canvas of canvases) {
      const context = canvas.getContext('2d');
      for (const name of METHODS) {
        const descriptor = Object.getOwnPropertyDescriptor(context, name);
        const original = context[name];
        const experiment = this;
        context[name] = function (...args) {
          if (experiment.capture) {
            experiment.counts[name] = (experiment.counts[name] ?? 0) + 1;
            if (name === 'drawImage') experiment.recordImage(args, context.getTransform());
          }
          if (experiment.mode === 'noPaint' && PAINT_METHODS.includes(name)) return;
          if (experiment.mode === 'noImages' && name === 'drawImage') return;
          if (experiment.mode === 'noStroke' && (name === 'stroke' || name === 'strokeRect')) return;
          if (experiment.mode === 'noClip' && name === 'clip') return;
          if (experiment.mode === 'smallImages' && name === 'drawImage') {
            const replacement = experiment.replacements.get(args[0]);
            if (replacement && args.length === 5) args[0] = replacement;
            // The 3-argument overload draws at intrinsic size: retain destination geometry.
            else if (replacement && args.length === 3) args = [replacement, args[1], args[2], args[0].naturalWidth, args[0].naturalHeight];
          }
          return original.apply(this, args);
        };
        this.restorers.push(() => descriptor ? Object.defineProperty(context, name, descriptor) : delete context[name]);
      }
    }
  }

  recordImage([image, ...args], transform) {
    if (!image.naturalWidth || !image.complete) return;
    const scale = getRequiredImageSize(image, args, transform);
    if (scale === null) return;
    const prior = this.images.get(image);
    this.images.set(image, { scale: Math.max(prior?.scale ?? 0, scale), calls: (prior?.calls ?? 0) + 1 });
  }

  async prepareImages() {
    const resources = [];
    for (const [image, { scale, calls }] of this.images) {
      const width = Math.max(1, Math.ceil(image.naturalWidth * scale));
      const height = Math.max(1, Math.ceil(image.naturalHeight * scale));
      resources.push({ source: image.currentSrc || image.src, sourceWidth: image.naturalWidth, sourceHeight: image.naturalHeight,
        width, height, calls, replaced: scale < 1 });
      if (scale >= 1) continue;
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d');
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, 0, 0, width, height);
      const blob = await new Promise(resolve => canvas.toBlob(resolve));
      if (!blob) throw new Error('縮小画像を生成できませんでした');
      const url = URL.createObjectURL(blob);
      this.urls.push(url);
      const replacement = new Image();
      replacement.src = url;
      await replacement.decode();
      this.replacements.set(image, replacement);
      canvas.width = canvas.height = 0;
    }
    return resources;
  }

  dispose() {
    this.restorers.reverse().forEach(restore => restore());
    this.urls.forEach(url => URL.revokeObjectURL(url));
    this.replacements.clear();
  }
}
