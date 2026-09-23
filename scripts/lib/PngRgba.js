import { inflateSync } from 'node:zlib';
import { readFileSync } from 'node:fs';

const PNG_SIGNATURE = '89504e470d0a1a0a';
const PNG_FILTER_BYTES = Object.freeze({ NONE: 0, SUB: 1, UP: 2, AVERAGE: 3, PAETH: 4 });

function readChunks(buffer) {
  if (buffer.subarray(0, 8).toString('hex') !== PNG_SIGNATURE) throw new Error('Expected a PNG file.');
  const chunks = [];
  let offset = 8;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    chunks.push({ type, data: buffer.subarray(offset + 8, offset + 8 + length) });
    offset += length + 12;
  }
  return chunks;
}

function paeth(left, up, upLeft) {
  const prediction = left + up - upLeft;
  const leftDistance = Math.abs(prediction - left);
  const upDistance = Math.abs(prediction - up);
  const upLeftDistance = Math.abs(prediction - upLeft);
  return leftDistance <= upDistance && leftDistance <= upLeftDistance ? left : upDistance <= upLeftDistance ? up : upLeft;
}

function unfilter(scanlines, width, height) {
  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const result = Buffer.alloc(stride * height);
  let sourceOffset = 0;
  for (let row = 0; row < height; row += 1) {
    const filter = scanlines[sourceOffset++];
    const rowOffset = row * stride;
    for (let column = 0; column < stride; column += 1) {
      const raw = scanlines[sourceOffset++];
      const left = column >= bytesPerPixel ? result[rowOffset + column - bytesPerPixel] : 0;
      const up = row > 0 ? result[rowOffset + column - stride] : 0;
      const upLeft = row > 0 && column >= bytesPerPixel ? result[rowOffset + column - stride - bytesPerPixel] : 0;
      const value = filter === PNG_FILTER_BYTES.NONE ? raw
        : filter === PNG_FILTER_BYTES.SUB ? raw + left
          : filter === PNG_FILTER_BYTES.UP ? raw + up
            : filter === PNG_FILTER_BYTES.AVERAGE ? raw + Math.floor((left + up) / 2)
              : filter === PNG_FILTER_BYTES.PAETH ? raw + paeth(left, up, upLeft)
                : (() => { throw new Error(`Unsupported PNG filter: ${filter}`); })();
      result[rowOffset + column] = value & 0xff;
    }
  }
  return result;
}

/** Reads the RGBA raster of a non-interlaced, 8-bit PNG asset. */
export function readRgbaPng(path) {
  const chunks = readChunks(readFileSync(path));
  const header = chunks.find(({ type }) => type === 'IHDR')?.data;
  if (!header) throw new Error('PNG has no IHDR chunk.');
  const width = header.readUInt32BE(0);
  const height = header.readUInt32BE(4);
  const bitDepth = header[8];
  const colorType = header[9];
  if (bitDepth !== 8 || colorType !== 6 || header[10] !== 0 || header[11] !== 0 || header[12] !== 0) {
    throw new Error(`Only non-interlaced 8-bit RGBA PNGs are supported: ${path}`);
  }
  const compressed = Buffer.concat(chunks.filter(({ type }) => type === 'IDAT').map(({ data }) => data));
  return { width, height, pixels: unfilter(inflateSync(compressed), width, height) };
}

export function forEachVisiblePixel(image, visit, alphaThreshold = 16) {
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const alpha = image.pixels[(y * image.width + x) * 4 + 3];
      if (alpha > alphaThreshold) visit(x, y, alpha);
    }
  }
}
