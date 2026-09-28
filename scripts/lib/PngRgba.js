import { deflateSync, inflateSync } from 'node:zlib';
import { readFileSync, writeFileSync } from 'node:fs';

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

function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit += 1) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const chunk = Buffer.alloc(data.length + 12);
  chunk.writeUInt32BE(data.length, 0);
  typeBuffer.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), data.length + 8);
  return chunk;
}

/** Writes a non-interlaced, 8-bit RGBA PNG. */
export function writeRgbaPng(path, { width, height, pixels }) {
  if (pixels.length !== width * height * 4) throw new RangeError('RGBA buffer dimensions do not match.');
  const stride = width * 4;
  const scanlines = Buffer.alloc((stride + 1) * height);
  for (let row = 0; row < height; row += 1) {
    const targetOffset = row * (stride + 1);
    scanlines[targetOffset] = PNG_FILTER_BYTES.NONE;
    Buffer.from(pixels.buffer, pixels.byteOffset + row * stride, stride).copy(scanlines, targetOffset + 1);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const output = Buffer.concat([
    Buffer.from(PNG_SIGNATURE, 'hex'),
    createChunk('IHDR', header),
    createChunk('IDAT', deflateSync(scanlines)),
    createChunk('IEND', Buffer.alloc(0)),
  ]);
  writeFileSync(path, output);
}
