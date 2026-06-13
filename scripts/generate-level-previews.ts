import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import sharp from 'sharp';
import { createGameState } from '../src/core/board';
import type { LevelDef } from '../src/core/types';
import { renderLevelPreviewSvg } from '../src/ui/renderLevelPreview';
import { discoverLevelIds } from './manifest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const levelsDir = join(root, 'public', 'levels');
const outDir = join(root, 'previews');

/** PNG width — height scales with each board's aspect ratio. */
const PNG_WIDTH = 420;

function setupDom(): void {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  const { window } = dom;
  globalThis.document = window.document;
  globalThis.XMLSerializer = window.XMLSerializer;
}

function loadLevel(id: number): LevelDef {
  const raw = readFileSync(join(levelsDir, `${id}.json`), 'utf8');
  return JSON.parse(raw) as LevelDef;
}

function writeGallery(
  entries: Array<{ id: number; name: string; par?: number; png: string }>,
): void {
  const cards = entries
    .map(
      (entry) => `
    <a class="card" href="${entry.png}">
      <img src="${entry.png}" alt="Level ${entry.id}, ${entry.name}" loading="lazy" width="${PNG_WIDTH}" />
      <span class="card-title">${entry.id}. ${escapeHtml(entry.name)}</span>
      ${entry.par !== undefined ? `<span class="card-meta">par ${entry.par}</span>` : ''}
    </a>`,
    )
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Hex Clear — level previews</title>
  <style>
    :root { color-scheme: dark; --bg: #121820; --surface: #1e2838; --text: #eef3fb; --muted: #8fa3bc; --accent: #5eb8ff; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 24px 16px 48px; font-family: system-ui, sans-serif; background: var(--bg); color: var(--text); }
    h1 { margin: 0 0 4px; font-size: 1.35rem; }
    p { margin: 0 0 20px; color: var(--muted); font-size: 0.9rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(${PNG_WIDTH}px, 1fr)); gap: 16px; }
    .card { display: flex; flex-direction: column; gap: 6px; padding: 10px; border-radius: 12px; background: var(--surface); text-decoration: none; color: inherit; transition: transform 0.12s ease, box-shadow 0.12s ease; }
    .card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35); }
    .card img { width: 100%; height: auto; border-radius: 8px; background: #1a2332; display: block; }
    .card-title { font-weight: 700; font-size: 0.95rem; }
    .card-meta { font-size: 0.8rem; color: var(--muted); }
  </style>
</head>
<body>
  <h1>Level previews</h1>
  <p>${entries.length} levels · initial board state · generated ${new Date().toLocaleString()}</p>
  <div class="grid">
${cards}
  </div>
</body>
</html>
`;

  writeFileSync(join(outDir, 'index.html'), html);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

setupDom();
mkdirSync(outDir, { recursive: true });

const ids = discoverLevelIds(levelsDir);
const filterArg = process.argv.slice(2).map(Number).filter((n) => Number.isInteger(n) && n > 0);
const targetIds = filterArg.length > 0 ? ids.filter((id) => filterArg.includes(id)) : ids;

if (targetIds.length === 0) {
  console.error('No matching level ids found.');
  process.exit(1);
}

const galleryEntries: Array<{ id: number; name: string; par?: number; png: string }> = [];

for (const id of targetIds) {
  const level = loadLevel(id);
  const state = createGameState(level);
  const svg = renderLevelPreviewSvg(state);
  const svgPath = join(outDir, `${id}.svg`);
  const pngPath = join(outDir, `${id}.png`);
  const pngName = `${id}.png`;

  writeFileSync(svgPath, svg);
  await sharp(Buffer.from(svg), { density: 144 })
    .resize(PNG_WIDTH)
    .png()
    .toFile(pngPath);

  galleryEntries.push({
    id: level.id,
    name: level.name,
    par: level.par,
    png: pngName,
  });
  console.log(`Level ${id} (${level.name}) → ${pngName}`);
}

writeGallery(galleryEntries);
console.log(`\nWrote ${targetIds.length} previews to previews/ — open previews/index.html to review.`);
