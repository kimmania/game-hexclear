import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { solveLevel } from '../src/core/solver';
import { validateLevel } from '../src/core/validateLevel';
import type { LevelDef } from '../src/core/types';
import { buildManifest, discoverLevelIds, serializeManifest } from './manifest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const levelsDir = join(root, 'public', 'levels');

function loadLevel(id: number): LevelDef {
  const raw = readFileSync(join(levelsDir, `${id}.json`), 'utf8');
  return JSON.parse(raw) as LevelDef;
}

const ids = discoverLevelIds(levelsDir);

let failed = false;

const expectedManifest = serializeManifest(buildManifest(levelsDir));
const actualManifest = readFileSync(join(levelsDir, 'index.json'), 'utf8');
if (actualManifest !== expectedManifest) {
  failed = true;
  console.error('index.json is out of date — run `npm run generate-manifest`.');
}

for (const id of ids) {
  const level = loadLevel(id);
  try {
    validateLevel(level, id);
  } catch (error) {
    failed = true;
    console.error(`Level ${id} (${level.name}): invalid —`, error);
    continue;
  }

  const result = solveLevel(level);
  if (!result.solvable) {
    failed = true;
    console.error(
      `Level ${id} (${level.name}): UNSOLVABLE (explored ${result.statesExplored} states)`,
    );
    continue;
  }

  console.log(`Level ${id} (${level.name}): solvable (${result.statesExplored} states)`);
}

if (failed) {
  process.exit(1);
}

console.log(`All ${ids.length} levels passed solvability check.`);
