import { chromium } from 'playwright';
import { readdir, readFile, mkdir, writeFile, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { getImageConversionPlan, validateImageDefinition } from './lib/ImageConversion.js';

async function writeGeneratedFile(path, data) {
  const output = Buffer.isBuffer(data) ? data : Buffer.from(data);
  try {
    if ((await readFile(path)).equals(output)) return;
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await writeFile(path, output);
}

// Development converter only: production loads committed outputs, never masters.
const config = JSON.parse(await readFile('assets/image-sizes.json', 'utf8'));
if (config.schema !== 1 || config.sourceRoot !== 'assets/images/source') throw new Error('Unsupported image configuration');
const sources = [];
for (const [path, definition] of Object.entries(config.images)) {
  validateImageDefinition(path, definition);
  const relative = path.slice('/assets/'.length);
  const buffer = await readFile(join(config.sourceRoot, relative));
  const hash = createHash('sha256').update(buffer).digest('hex');
  if (hash !== definition.sourceSha256) throw new Error(`Master changed; review its size definition and hash: ${path}`);
  const plan = getImageConversionPlan(buffer.readUInt32BE(16), buffer.readUInt32BE(20), definition.size);
  sources.push({ path, relative, buffer, plan });
}
const browser = await chromium.launch({ channel: process.env.IMAGE_LEVELS_CHANNEL ?? 'chrome', headless: true });
const manifest = {};
const generated = new Set();
let count = 0;
let bytes = 0;
let assetBytes = 0;
try {
  const page = await browser.newPage();
  for (const { path, relative, buffer, plan } of sources) {
    const outputs = await page.evaluate(async ({ data, dimensions }) => {
      const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
      return dimensions.map(({ width, height }) => {
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
        const context = canvas.getContext('2d'); context.imageSmoothingQuality = 'high';
        context.drawImage(image, 0, 0, width, height);
        const result = canvas.toDataURL('image/png').split(',')[1];
        canvas.width = canvas.height = 0;
        return result;
      });
    }, { data: buffer.toString('base64'), dimensions: [plan, ...plan.levels] });
    // Preserve exact bytes when the delivery size already equals the master.
    const unchanged = plan.width === buffer.readUInt32BE(16) && plan.height === buffer.readUInt32BE(20);
    const asset = unchanged ? buffer : Buffer.from(outputs[0], 'base64');
    const assetPath = `public${path}`;
    await mkdir(dirname(assetPath), { recursive: true });
    await writeGeneratedFile(assetPath, asset); assetBytes += asset.length;
    const hash = createHash('sha256').update(asset).digest('hex').slice(0, 12);
    const levels = [];
    for (let index = 0; index < plan.levels.length; index++) {
      const level = plan.levels[index];
      const levelPath = `public/assets/image-levels/${relative.slice(0, -4)}.${hash}.${Math.max(level.width, level.height)}.png`;
      const output = Buffer.from(outputs[index + 1], 'base64');
      await mkdir(dirname(levelPath), { recursive: true });
      await writeGeneratedFile(levelPath, output); generated.add(levelPath);
      levels.push({ ...level, path: `/${levelPath.slice('public/'.length)}` });
      count++; bytes += output.length;
    }
    manifest[path] = { width: plan.width, height: plan.height, levels };
  }
  await writeGeneratedFile('src/chips/image-levels.json', JSON.stringify(manifest, null, 2) + '\n');
  const groups = new Set(sources.map(source => source.relative.split('/')[0]));
  for (const group of groups) {
    const directory = `public/assets/image-levels/${group}`;
    for (const filename of await readdir(directory, { recursive: true })) {
      const path = `${directory}/${filename.replaceAll('\\', '/')}`;
      if (/\.[a-f0-9]{12}\.\d+\.png$/.test(filename) && !generated.has(path)) await unlink(path);
    }
  }
  console.log(JSON.stringify({ sources: sources.length, assetBytes, levels: count, levelBytes: bytes }));
} finally { await browser.close(); }
