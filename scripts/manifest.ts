import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadChapters, type ChapterRange } from './chapters';

export type ManifestLevel = { id: number; name: string; par?: number };
export type ManifestChapter = { name: string; levelIds: number[] };
export type Manifest = { levels: ManifestLevel[]; chapters: ManifestChapter[] };

const AUTO_CHUNK_SIZE = 15;

export function discoverLevelIds(levelsDir: string): number[] {
  return readdirSync(levelsDir)
    .map((file) => /^(\d+)\.json$/.exec(file)?.[1])
    .filter((match): match is string => match !== undefined)
    .map(Number)
    .sort((a, b) => a - b);
}

export function buildManifest(
  levelsDir: string,
  chapterRanges: ChapterRange[] = loadChapters(),
): Manifest {
  const ids = discoverLevelIds(levelsDir);

  const levels: ManifestLevel[] = ids.map((id) => {
    const data = JSON.parse(readFileSync(join(levelsDir, `${id}.json`), 'utf8')) as {
      name?: unknown;
      par?: unknown;
    };
    const entry: ManifestLevel = {
      id,
      name: typeof data.name === 'string' ? data.name : `Level ${id}`,
    };
    if (typeof data.par === 'number' && Number.isInteger(data.par) && data.par >= 1) {
      entry.par = data.par;
    }
    return entry;
  });

  const chapters: ManifestChapter[] = [];
  const assigned = new Set<number>();

  for (const range of chapterRanges) {
    const levelIds = ids.filter((id) => id >= range.from && id <= range.to);
    if (levelIds.length === 0) continue;
    chapters.push({ name: range.name, levelIds });
    for (const id of levelIds) assigned.add(id);
  }

  const rest = ids.filter((id) => !assigned.has(id));
  for (let i = 0; i < rest.length; i += AUTO_CHUNK_SIZE) {
    const chunk = rest.slice(i, i + AUTO_CHUNK_SIZE);
    chapters.push({
      name: `Levels ${chunk[0]}–${chunk[chunk.length - 1]}`,
      levelIds: chunk,
    });
  }

  chapters.sort((a, b) => a.levelIds[0]! - b.levelIds[0]!);

  return { levels, chapters };
}

export function serializeManifest(manifest: Manifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}
