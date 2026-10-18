import { renderTrialResultPaper } from './TrialResultPaper.js';
import { resolvePublicAssetPath } from '../chips/PublicAssetPath.js';
import { APP_COPYRIGHT } from '../game/AppMetadata.js';

export const RESULT_SHARE_SIZE = Object.freeze({ width: 888, height: 1340 });

async function imageDataUrl(image) {
  await image.decode();
  const response = await fetch(image.currentSrc || image.src);
  if (!response.ok) throw new Error(`Share asset failed: ${response.status}`);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function serializeStyledNode(node) {
  const clone = node.cloneNode(true);
  const originals = [node, ...node.querySelectorAll('*')];
  const copies = [clone, ...clone.querySelectorAll('*')];
  for (let index = 0; index < originals.length; index++) {
    const style = getComputedStyle(originals[index]);
    for (const property of style) copies[index].style.setProperty(property, style.getPropertyValue(property));
    if (originals[index] instanceof HTMLImageElement) copies[index].src = await imageDataUrl(originals[index]);
  }
  return new XMLSerializer().serializeToString(clone);
}

/** Captures fixed-size paper DOM with the same computed styles as the game. */
export async function createTrialResultShareImage(result, textRepository, language) {
  const stage = document.createElement('div');
  stage.className = 'TrialResultShareStage';
  stage.lang = language;
  stage.setAttribute('aria-hidden', 'true');
  const image = document.createElement('div');
  image.className = 'TrialResultShareImage';
  const logo = document.createElement('img');
  logo.className = 'TrialResultShareLogo';
  logo.src = resolvePublicAssetPath('/assets/logo.png');
  logo.alt = 'Can We Become Heroes?';
  const papers = [false, true].map(reverse => {
    const paper = document.createElement('div');
    paper.className = 'TrialResultPaper';
    return { paper, reverse };
  });
  const copyright = document.createElement('footer');
  copyright.className = 'TrialResultShareCopyright';
  copyright.textContent = `© ${APP_COPYRIGHT.holder} ${APP_COPYRIGHT.year} | ${APP_COPYRIGHT.portal}`;
  image.append(logo, ...papers.map(item => item.paper), copyright);
  stage.append(image);
  document.body.append(stage);
  try {
    await document.fonts.ready;
    for (const { paper, reverse } of papers) renderTrialResultPaper(paper, result, textRepository, language, reverse);
    await Promise.all([...image.querySelectorAll('img')].map(item => item.decode()));
    // Font loading and intrinsic image sizes must settle before fitting the content.
    await document.fonts.ready;
    for (const { paper, reverse } of papers) renderTrialResultPaper(paper, result, textRepository, language, reverse);
    const markup = await serializeStyledNode(image);
    const { width, height } = RESULT_SHARE_SIZE;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${markup}</foreignObject></svg>`;
    const raster = new Image();
    raster.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await raster.decode();
    const canvas = document.createElement('canvas');
    canvas.width = width * 2;
    canvas.height = height * 2;
    canvas.getContext('2d').drawImage(raster, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) => canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Result image encoding failed.'));
    }, 'image/png'));
  } finally { stage.remove(); }
}
