import ChipRenderer from '../chips/ChipRenderer.js';

/** Creates a settled, effect-free chip for non-gameplay UI previews. */
export function createStaticChipPreview(chip, previewSize) {
  const scale = previewSize / (chip.radius * 2);
  return {
    ...chip,
    x: previewSize / 2,
    y: previewSize / 2,
    radius: chip.radius * scale,
    height: 0,
    scale: 1,
    tilt: 0,
    poseTilt: 0,
    effectOffsetX: 0,
    effectOffsetY: 0,
    effectRotation: 0,
    actionGauge: null,
    actionGaugeMaximum: null,
    actionGaugeBaseMaximum: null,
  };
}

/** Creates a drawer for a settled UI preview of a gameplay chip. */
export function createStaticChipPreviewDrawer(canvas, chip, previewSize, assets) {
  const context = canvas.getContext('2d');
  const preview = createStaticChipPreview(chip, previewSize);
  const draw = ({ poseTilt = 0 } = {}) => {
    preview.poseTilt = poseTilt;
    context.clearRect(0, 0, previewSize, previewSize);
    new ChipRenderer(context, assets).draw(preview, 0);
  };
  draw();
  [chip.centerPath, ...chip.tagPaths].forEach((path) => {
    const image = assets.load(path);
    if (!image.complete) image.addEventListener('load', draw, { once: true });
  });
  return draw;
}

/** Creates a decorative Canvas element that uses the gameplay ChipRenderer. */
export function createStaticChipPreviewCanvas(chip, previewSize, assets, className = 'InformationWindow__ChipPreview') {
  const canvas = document.createElement('canvas');
  canvas.className = className;
  canvas.width = previewSize;
  canvas.height = previewSize;
  canvas.setAttribute('aria-hidden', 'true');
  if (assets && canvas.getContext?.('2d')) createStaticChipPreviewDrawer(canvas, chip, previewSize, assets);
  return canvas;
}

/** Draws a non-animated chip preview and redraws it after every asset loads. */
export function drawStaticChipPreview(canvas, chip, previewSize, assets) {
  createStaticChipPreviewDrawer(canvas, chip, previewSize, assets);
}
