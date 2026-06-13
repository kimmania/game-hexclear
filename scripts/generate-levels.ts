import { existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  argFlag,
  argInt,
  argString,
  createSeededRandom,
  parseArgs,
  parseIntRange,
} from './cliArgs';
import { loadChapters, saveChapters, upsertChapter } from './chapters';
import { generateLevel, type BoardParamRanges } from './levelGenerator';
import { buildManifest, discoverLevelIds, serializeManifest } from './manifest';
import type { PopulateParams } from '../src/editor/editorPopulate';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const levelsDir = join(root, 'public', 'levels');

const HELP = `Generate solvable levels from random board parameters (same counts as the editor).

Usage:
  npm run generate-levels -- [options]

Required:
  --count N            Number of levels to generate

Board parameters — fixed N or range min-max (defaults match the editor):
  --cells N|min-max    Connected hex cells (default: 7)
  --tiles N|min-max    Slide tiles (default: 4)
  --walls N|min-max    Blocking walls (default: 0)
  --holes N|min-max    Pit cells (default: 0)
  --frozen N|min-max   Frozen tiles (default: 0)
  --crumbling N|min-max  Crumbling path cells (default: 0)
  --rotators N|min-max   Turnstile cells (default: 0)
  --links N|min-max      Linked tile pairs — 2 tiles each (default: 0)
  --portals N|min-max    Teleporter pairs — 2 cells each (default: 0)
  --gates N|min-max      Toggle switch + gate pairs (default: 0)
  --crates N|min-max     Pushable crates (default: 0)

Level ids & names:
  --start-id N         First level id (default: next available id)
  --name-prefix TEXT   Level name prefix (default: "Generated")

Chapter grouping (stored in scripts/chapters.json):
  --chapter NAME       Chapter/pack name for this batch
  --chapter-from N     Chapter range start (default: --start-id)
  --chapter-to N       Chapter range end (default: last generated id)

Options:
  --seed N             Random seed for reproducible batches
  --max-attempts N     Solvability retries per level (default: 40)
  --no-par             Omit par from generated levels
  --dry-run            Print results without writing files
  --overwrite          Replace existing level json files
  --skip-manifest      Don't regenerate public/levels/index.json

Examples:
  npm run generate-levels -- --count 5 --start-id 40 --chapter "Expert pack" \\
    --cells 8-12 --tiles 4-6 --holes 0-1 --frozen 0-1

  npm run generate-levels -- --count 3 --cells 9-12 --tiles 4-5 --crumbling 1 --links 1 --seed 7 --dry-run
`;

function nextAvailableId(ids: number[]): number {
  return ids.length === 0 ? 1 : Math.max(...ids) + 1;
}

function parseRanges(args: ReturnType<typeof parseArgs>): BoardParamRanges {
  return {
    cells: parseIntRange(argString(args, 'cells') ?? '7', 'cells'),
    tiles: parseIntRange(argString(args, 'tiles') ?? '4', 'tiles'),
    walls: parseIntRange(argString(args, 'walls') ?? '0', 'walls'),
    holes: parseIntRange(argString(args, 'holes') ?? '0', 'holes'),
    frozen: parseIntRange(argString(args, 'frozen') ?? '0', 'frozen'),
    crumbling: parseIntRange(argString(args, 'crumbling') ?? '0', 'crumbling'),
    rotators: parseIntRange(argString(args, 'rotators') ?? '0', 'rotators'),
    links: parseIntRange(argString(args, 'links') ?? '0', 'links'),
    portals: parseIntRange(argString(args, 'portals') ?? '0', 'portals'),
    gates: parseIntRange(argString(args, 'gates') ?? '0', 'gates'),
    crates: parseIntRange(argString(args, 'crates') ?? '0', 'crates'),
  };
}

function formatParams(params: PopulateParams): string {
  const base = `${params.cellCount}c ${params.tileCount}t ${params.wallCount}w ${params.holeCount}h ${params.frozenCount}f`;
  const extras: string[] = [];
  if (params.crumblingCount > 0) extras.push(`${params.crumblingCount}cr`);
  if (params.rotatorCount > 0) extras.push(`${params.rotatorCount}ro`);
  if (params.linkPairCount > 0) extras.push(`${params.linkPairCount}lk`);
  if (params.portalPairCount > 0) extras.push(`${params.portalPairCount}tp`);
  if (params.gateCount > 0) extras.push(`${params.gateCount}gt`);
  if (params.crateCount > 0) extras.push(`${params.crateCount}cx`);
  return extras.length > 0 ? `${base} · ${extras.join(' ')}` : base;
}

const args = parseArgs(process.argv.slice(2));

if (argFlag(args, 'help') || argFlag(args, 'h')) {
  console.log(HELP);
  process.exit(0);
}

const count = argInt(args, 'count');
if (count === undefined || count < 1) {
  console.error('Missing or invalid --count (must be ≥ 1).\n');
  console.log(HELP);
  process.exit(1);
}

const existingIds = discoverLevelIds(levelsDir);
const startId = argInt(args, 'start-id') ?? nextAvailableId(existingIds);
const namePrefix = argString(args, 'name-prefix') ?? 'Generated';
const maxAttempts = argInt(args, 'max-attempts') ?? 40;
const seed = argInt(args, 'seed') ?? Date.now();
const dryRun = argFlag(args, 'dry-run');
const overwrite = argFlag(args, 'overwrite');
const skipManifest = argFlag(args, 'skip-manifest');
const setPar = !argFlag(args, 'no-par');
const chapterName = argString(args, 'chapter');

let ranges: BoardParamRanges;
try {
  ranges = parseRanges(args);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

if (ranges.cells.min < 1) {
  console.error('--cells min must be at least 1.');
  process.exit(1);
}

const random = createSeededRandom(seed);
const generated: Array<{ id: number; name: string; par?: number; params: string; attempts: number }> =
  [];
let failed = 0;

console.log(
  `Generating ${count} level${count === 1 ? '' : 's'} (ids ${startId}–${startId + count - 1}), seed ${seed}`,
);
console.log(
  `Ranges: cells ${ranges.cells.min}-${ranges.cells.max}, tiles ${ranges.tiles.min}-${ranges.tiles.max}, walls ${ranges.walls.min}-${ranges.walls.max}, holes ${ranges.holes.min}-${ranges.holes.max}, frozen ${ranges.frozen.min}-${ranges.frozen.max}, crumble ${ranges.crumbling.min}-${ranges.crumbling.max}, rotators ${ranges.rotators.min}-${ranges.rotators.max}, links ${ranges.links.min}-${ranges.links.max}, portals ${ranges.portals.min}-${ranges.portals.max}, gates ${ranges.gates.min}-${ranges.gates.max}, crates ${ranges.crates.min}-${ranges.crates.max}`,
);

for (let index = 0; index < count; index += 1) {
  const id = startId + index;
  const name = `${namePrefix} ${id}`;
  const targetPath = join(levelsDir, `${id}.json`);

  if (existsSync(targetPath) && !overwrite && !dryRun) {
    console.error(`Level ${id} already exists (${targetPath}). Use --overwrite or pick another --start-id.`);
    process.exit(1);
  }

  const result = generateLevel({
    id,
    name,
    ranges,
    random,
    maxAttempts,
    setPar,
  });

  if (!result.ok) {
    failed += 1;
    console.error(`Level ${id}: ${result.message}`);
    continue;
  }

  const json = `${JSON.stringify(result.level, null, 2)}\n`;
  const summary = formatParams(result.params);
  generated.push({
    id,
    name,
    par: result.level.par,
    params: summary,
    attempts: result.attempts,
  });

  if (dryRun) {
    console.log(
      `[dry-run] Level ${id} "${name}" · ${summary} · par ${result.level.par ?? '—'} · ${result.attempts} attempt(s)`,
    );
    continue;
  }

  writeFileSync(targetPath, json);
  console.log(
    `Level ${id} "${name}" · ${summary} · par ${result.level.par ?? '—'} · ${result.attempts} attempt(s)`,
  );
}

if (generated.length === 0) {
  console.error('\nNo levels were generated.');
  process.exit(1);
}

if (!dryRun && chapterName) {
  const chapterFrom = argInt(args, 'chapter-from') ?? startId;
  const chapterTo = argInt(args, 'chapter-to') ?? generated[generated.length - 1]!.id;
  const upsert = upsertChapter(loadChapters(), chapterName, chapterFrom, chapterTo);
  if (!upsert.ok) {
    console.error(`\nChapter update failed: ${upsert.message}`);
    console.error('Levels were written, but scripts/chapters.json was not updated.');
    process.exit(1);
  }
  saveChapters(upsert.chapters);
  console.log(`\nChapter "${chapterName}" set to levels ${chapterFrom}–${chapterTo} in scripts/chapters.json`);
}

if (!dryRun && !skipManifest) {
  const manifest = buildManifest(levelsDir);
  writeFileSync(join(levelsDir, 'index.json'), serializeManifest(manifest));
  console.log(`Manifest updated (${manifest.levels.length} levels, ${manifest.chapters.length} chapters).`);
}

if (failed > 0) {
  console.error(`\n${failed} level(s) could not be generated.`);
  process.exit(1);
}

console.log(`\nDone — ${generated.length} level${generated.length === 1 ? '' : 's'} ${dryRun ? 'would be written' : 'written'}.`);
