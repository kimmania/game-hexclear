import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildManifest, serializeManifest } from './manifest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const levelsDir = join(root, 'public', 'levels');

const manifest = buildManifest(levelsDir);
writeFileSync(join(levelsDir, 'index.json'), serializeManifest(manifest));

console.log(
  `Wrote manifest: ${manifest.levels.length} levels in ${manifest.chapters.length} chapters.`,
);
