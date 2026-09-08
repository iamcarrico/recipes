/**
 * Reading Paprika 3 exports.
 *
 * A `.paprikarecipes` file is a ZIP archive containing one `.paprikarecipe`
 * entry per recipe, and each of those is gzipped JSON.
 */

import { gunzipSync } from 'node:zlib';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { unzipSync } from 'fflate';

/**
 * Read every recipe out of a Paprika export file.
 * @param {string} filePath a .paprikarecipes bundle or a single .paprikarecipe
 * @returns {Promise<object[]>} raw Paprika recipe objects
 */
export async function readPaprikaFile(filePath) {
  const buffer = await readFile(filePath);
  const extension = path.extname(filePath).toLowerCase();

  if (extension === '.paprikarecipe') {
    return [decodeRecipe(buffer, path.basename(filePath))];
  }

  if (extension === '.paprikarecipes') {
    const entries = unzipSync(new Uint8Array(buffer));
    return Object.entries(entries)
      // Zip archives can carry directory entries and macOS resource forks.
      .filter(([name, bytes]) => bytes.length > 0 && !name.startsWith('__MACOSX/') && !name.endsWith('/'))
      .map(([name, bytes]) => decodeRecipe(Buffer.from(bytes), name));
  }

  throw new Error(
    `Unsupported file type "${extension}". Expected .paprikarecipes or .paprikarecipe.`
  );
}

/**
 * @param {Buffer} buffer gzipped JSON
 * @param {string} label used only for error messages
 */
function decodeRecipe(buffer, label) {
  let json;
  try {
    json = gunzipSync(buffer).toString('utf8');
  } catch (error) {
    throw new Error(`Could not gunzip "${label}": ${error.message}`);
  }

  try {
    return JSON.parse(json);
  } catch (error) {
    throw new Error(`Could not parse JSON in "${label}": ${error.message}`);
  }
}

/**
 * Split Paprika's single text blob into discrete steps. Exports use a blank
 * line between steps when the recipe has them, and single newlines otherwise.
 * @param {string} text
 * @returns {string[]}
 */
export function splitSteps(text) {
  const value = String(text ?? '').replace(/\r\n/g, '\n').trim();
  if (!value) return [];

  const separator = value.includes('\n\n') ? /\n\s*\n/ : /\n/;
  return value
    .split(separator)
    .map((step) => step.replace(/\s*\n\s*/g, ' ').trim())
    // Strip any numbering Paprika carried over; the template numbers them.
    .map((step) => step.replace(/^\d+[.)]\s+/, ''))
    .filter(Boolean);
}

/**
 * @param {string} text
 * @returns {string[]}
 */
export function splitLines(text) {
  return String(text ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Recognise an image from its magic bytes rather than trusting a filename. */
export function imageExtension(buffer) {
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return '.jpg';
  }
  if (buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return '.png';
  }
  if (buffer.length > 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
    return '.webp';
  }
  return null;
}
