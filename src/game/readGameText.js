import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEXT_RESOURCE_PARTS, assignTextPart, createTextResource } from './textResourceParts.js';

const publicDirectory = fileURLToPath(new URL('../../public/', import.meta.url));

export function readGameText() {
  const resource = createTextResource();
  for (const part of TEXT_RESOURCE_PARTS) {
    const value = JSON.parse(readFileSync(join(publicDirectory, part.path.slice(1)), 'utf8'));
    assignTextPart(resource, part, value);
  }
  return resource;
}

export default readGameText();
