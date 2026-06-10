import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svgPath = join(root, 'public/icons/icon.svg');
const svg = readFileSync(svgPath);

const outDir = join(root, 'public/icons');

async function writePng(size: number, filename: string): Promise<void> {
  await sharp(svg, { density: 288 })
    .resize(size, size)
    .png()
    .toFile(join(outDir, filename));
}

await writePng(192, 'icon-192.png');
await writePng(512, 'icon-512.png');
await writePng(180, 'apple-touch-icon.png');

console.log('Wrote icon-192.png, icon-512.png, apple-touch-icon.png');
