#!/usr/bin/env node
/**
 * Generate the home-screen app icons from the favicon.
 *
 *   npm run icons                          # from src/favicon.ico
 *   npm run icons -- path/to/bigger.png    # from any larger artwork
 *   npm run icons -- --background '#2b2118' --out /tmp/try   # preview a colour
 *
 * The art is scaled up by a whole-number factor with nearest-neighbour
 * sampling, so a small pixel-art favicon stays crisp instead of turning to
 * mush, then centred on a solid background (iOS shows transparency as black).
 * It also writes logo.png: the art alone, cropped and transparent, at its
 * native size, for the site header to scale up with `image-rendering:
 * pixelated`.
 *
 * Uses only Node built-ins: it reads ICO (32-bit BMP or PNG entries) and
 * 8-bit PNG, and writes PNG. Re-run it whenever the source art changes and
 * commit the results.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { crc32, deflateSync, inflateSync } from 'node:zlib';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_SOURCE = 'src/favicon.ico';
const DEFAULT_OUTPUT_DIR = 'src/assets/icons';
// Muted sage: calm, and the tan hat stands out against it.
const DEFAULT_BACKGROUND = '#6b8f71';

// `fill` is the share of the icon the artwork may occupy. Maskable icons get
// cropped to a circle on Android, so their art stays inside the safe zone.
const ICONS = [
  { file: 'apple-touch-icon.png', size: 180, fill: 0.72 },
  { file: 'icon-192.png', size: 192, fill: 0.72 },
  { file: 'icon-512.png', size: 512, fill: 0.72 },
  { file: 'icon-maskable-512.png', size: 512, fill: 0.56 }
];

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const image = trim(await readImage(options.source));
  const background = hexToRgb(options.background);

  await mkdir(options.outputDir, { recursive: true });

  await writeFile(path.join(options.outputDir, 'logo.png'), encodePng(image, { alpha: true }));
  console.log(`✓ logo.png (${image.width}×${image.height}, transparent)`);

  for (const icon of ICONS) {
    const scale = Math.max(
      1,
      Math.floor(Math.min((icon.size * icon.fill) / image.width, (icon.size * icon.fill) / image.height))
    );
    const png = encodePng(compose(image, icon.size, scale, background));
    await writeFile(path.join(options.outputDir, icon.file), png);
    console.log(`✓ ${icon.file} (${icon.size}px, art at ${scale}×)`);
  }

  if (Math.max(image.width, image.height) < 128) {
    console.log(
      `\nThe source art is only ${image.width}×${image.height}. For sharper icons, run this again with a larger original.`
    );
  }
}

function parseArguments(argv) {
  const options = { source: DEFAULT_SOURCE, outputDir: DEFAULT_OUTPUT_DIR, background: DEFAULT_BACKGROUND };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--background') options.background = argv[++index];
    else if (argv[index] === '--out') options.outputDir = argv[++index];
    else options.source = argv[index];
  }
  if (!/^#?[0-9a-f]{6}$/i.test(options.background ?? '')) {
    throw new Error(`--background must be a six-digit hex colour, e.g. #2b2118`);
  }
  return options;
}

/** @returns {Promise<{width: number, height: number, pixels: Uint8Array}>} RGBA */
async function readImage(file) {
  const buffer = await readFile(file);
  if (isPng(buffer)) return decodePng(buffer);
  if (buffer.readUInt16LE(0) === 0 && buffer.readUInt16LE(2) === 1) return decodeIco(buffer);
  throw new Error(`${file}: expected an .ico or .png file.`);
}

// --- ICO ------------------------------------------------------------------

function decodeIco(buffer) {
  const count = buffer.readUInt16LE(4);
  const entries = Array.from({ length: count }, (_, index) => {
    const offset = 6 + index * 16;
    return {
      width: buffer[offset] || 256,
      size: buffer.readUInt32LE(offset + 8),
      offset: buffer.readUInt32LE(offset + 12)
    };
  });

  // The biggest image gives the most detail to scale from.
  const entry = entries.sort((a, b) => b.width - a.width)[0];
  const data = buffer.subarray(entry.offset, entry.offset + entry.size);
  return isPng(data) ? decodePng(data) : decodeIcoBitmap(data);
}

/** ICO bitmaps are BMPs with no file header, doubled height, and an AND mask. */
function decodeIcoBitmap(data) {
  const headerSize = data.readUInt32LE(0);
  const width = data.readInt32LE(4);
  const height = data.readInt32LE(8) / 2;
  const bitsPerPixel = data.readUInt16LE(14);

  if (bitsPerPixel !== 32) {
    throw new Error(`Only 32-bit ICO bitmaps are supported (this one is ${bitsPerPixel}-bit). Export a PNG instead.`);
  }

  const pixels = new Uint8Array(width * height * 4);
  let anyAlpha = false;

  for (let y = 0; y < height; y += 1) {
    // BMP rows run bottom to top.
    const row = headerSize + (height - 1 - y) * width * 4;
    for (let x = 0; x < width; x += 1) {
      const from = row + x * 4;
      const to = (y * width + x) * 4;
      pixels[to] = data[from + 2];
      pixels[to + 1] = data[from + 1];
      pixels[to + 2] = data[from];
      pixels[to + 3] = data[from + 3];
      if (data[from + 3]) anyAlpha = true;
    }
  }

  // Older icons leave alpha empty and rely on the 1-bit AND mask instead.
  if (!anyAlpha) {
    const maskStart = headerSize + width * height * 4;
    const maskRow = Math.ceil(width / 32) * 4;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const byte = data[maskStart + (height - 1 - y) * maskRow + (x >> 3)];
        const transparent = (byte >> (7 - (x & 7))) & 1;
        pixels[(y * width + x) * 4 + 3] = transparent ? 0 : 255;
      }
    }
  }

  return { width, height, pixels };
}

// --- PNG ------------------------------------------------------------------

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function isPng(buffer) {
  return buffer.length > 8 && buffer.subarray(0, 8).equals(PNG_SIGNATURE);
}

/** Enough PNG to read artwork: 8-bit RGB or RGBA, not interlaced. */
function decodePng(buffer) {
  let offset = 8;
  let header;
  const data = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const body = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      header = {
        width: body.readUInt32BE(0),
        height: body.readUInt32BE(4),
        bitDepth: body[8],
        colorType: body[9],
        interlace: body[12]
      };
    } else if (type === 'IDAT') {
      data.push(body);
    } else if (type === 'IEND') {
      break;
    }
    offset += length + 12;
  }

  const channels = { 2: 3, 6: 4 }[header.colorType];
  if (header.bitDepth !== 8 || !channels || header.interlace) {
    throw new Error('Only 8-bit, non-interlaced RGB or RGBA PNGs are supported.');
  }

  const { width, height } = header;
  const raw = inflateSync(Buffer.concat(data));
  const stride = width * channels;
  const rows = new Uint8Array(height * stride);

  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? rows[y * stride + x - channels] : 0;
      const up = y > 0 ? rows[(y - 1) * stride + x] : 0;
      const upLeft = y > 0 && x >= channels ? rows[(y - 1) * stride + x - channels] : 0;
      const predictor = [0, left, up, (left + up) >> 1, paeth(left, up, upLeft)][filter];
      rows[y * stride + x] = (line[x] + predictor) & 0xff;
    }
  }

  const pixels = new Uint8Array(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    pixels.set(rows.subarray(index * channels, index * channels + 3), index * 4);
    pixels[index * 4 + 3] = channels === 4 ? rows[index * channels + 3] : 255;
  }
  return { width, height, pixels };
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/** PNG with unfiltered rows: RGB from `compose`, or RGBA with `alpha`. */
function encodePng({ width, height, pixels }, { alpha = false } = {}) {
  const channels = alpha ? 4 : 3;
  const stride = width * channels;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y += 1) {
    raw.set(pixels.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = alpha ? 6 : 2; // colour type: RGBA or RGB

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function chunk(type, body) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(body.length);
  const typeAndBody = Buffer.concat([Buffer.from(type, 'ascii'), body]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(typeAndBody));
  return Buffer.concat([length, typeAndBody, checksum]);
}

// --- Composition ----------------------------------------------------------

/** Crop away fully transparent borders so centring uses the visible art. */
function trim(image) {
  const { width, height, pixels } = image;
  let top = height;
  let left = width;
  let bottom = -1;
  let right = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3] > 8) {
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
        left = Math.min(left, x);
        right = Math.max(right, x);
      }
    }
  }

  if (bottom < 0) throw new Error('The source image is fully transparent.');

  const trimmedWidth = right - left + 1;
  const trimmedHeight = bottom - top + 1;
  const trimmed = new Uint8Array(trimmedWidth * trimmedHeight * 4);
  for (let y = 0; y < trimmedHeight; y += 1) {
    const from = ((top + y) * width + left) * 4;
    trimmed.set(pixels.subarray(from, from + trimmedWidth * 4), y * trimmedWidth * 4);
  }
  return { width: trimmedWidth, height: trimmedHeight, pixels: trimmed };
}

/** Scale by an integer factor and centre on a solid square; returns RGB. */
function compose(image, size, scale, background) {
  const out = new Uint8Array(size * size * 3);
  for (let index = 0; index < size * size; index += 1) out.set(background, index * 3);

  const offsetX = Math.floor((size - image.width * scale) / 2);
  const offsetY = Math.floor((size - image.height * scale) / 2);

  for (let y = 0; y < image.height * scale; y += 1) {
    for (let x = 0; x < image.width * scale; x += 1) {
      const from = (Math.floor(y / scale) * image.width + Math.floor(x / scale)) * 4;
      const alpha = image.pixels[from + 3] / 255;
      if (alpha === 0) continue;
      const to = ((offsetY + y) * size + offsetX + x) * 3;
      for (let channel = 0; channel < 3; channel += 1) {
        out[to + channel] = Math.round(image.pixels[from + channel] * alpha + background[channel] * (1 - alpha));
      }
    }
  }

  return { width: size, height: size, pixels: out };
}

function hexToRgb(hex) {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
