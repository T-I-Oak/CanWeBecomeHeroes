import { chromium } from 'playwright';
import { readdir, readFile, mkdir, writeFile, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

// Generated files are committed, so normal builds do not require a browser.
const GROUPS = ['areas', 'heroes', 'tags', 'status', 'enemies', 'items'];
const SIZES = [8, 16, 32, 64, 128, 256, 512, 1024];
const browser = await chromium.launch({ channel: process.env.IMAGE_LEVELS_CHANNEL ?? 'chrome', headless: true });
const manifest = {};
const generated = new Set();
let count = 0;
let bytes = 0;
try {
  const page = await browser.newPage();
  const sources = [];
  for (const group of GROUPS) {
    const names = (await readdir(`public/assets/${group}`)).filter(name => name.endsWith('.png')).sort();
    for (const name of names) sources.push({ group, name });
  }
  sources.push({ group: 'background', name: 'trampled-ground.png' });
  for (const { group, name } of sources) {
    const buffer = await readFile(`public/assets/${group}/${name}`);
    const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 12);
    const result = await page.evaluate(async ({ data, sizes }) => {
      const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
      const width = image.naturalWidth, height = image.naturalHeight;
      const levels = [];
      for (const size of sizes.filter(size => size < Math.max(width, height))) {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.ceil(width * size / Math.max(width, height)));
        canvas.height = Math.max(1, Math.ceil(height * size / Math.max(width, height)));
        const context = canvas.getContext('2d'); context.imageSmoothingQuality = 'high';
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        levels.push({ size, width: canvas.width, height: canvas.height, data: canvas.toDataURL('image/png').split(',')[1] });
        canvas.width = canvas.height = 0;
      }
      return { width, height, levels };
    }, { data: buffer.toString('base64'), sizes: SIZES });
    const directory = `public/assets/image-levels/${group}`;
    await mkdir(directory, { recursive: true });
    const levels = [];
    for (const level of result.levels) {
      const filename = `${name.slice(0, -4)}.${hash}.${level.size}.png`;
      const output = Buffer.from(level.data, 'base64');
      await writeFile(join(directory, filename), output);
      generated.add(join(directory, filename));
      levels.push({ width: level.width, height: level.height, path: `/assets/image-levels/${group}/${filename}` });
      count++; bytes += output.length;
    }
    manifest[`/assets/${group}/${name}`] = { width: result.width, height: result.height, levels };
  }
  await writeFile('src/chips/image-levels.json', JSON.stringify(manifest, null, 2) + '\n');
  for (const group of [...GROUPS, 'background']) {
    const directory = `public/assets/image-levels/${group}`;
    for (const filename of await readdir(directory)) {
      const path = join(directory, filename);
      if (/\.[a-f0-9]{12}\.\d+\.png$/.test(filename) && !generated.has(path)) await unlink(path);
    }
  }
  console.log(JSON.stringify({ sources: sources.length, levels: count, bytes }));
} finally { await browser.close(); }
