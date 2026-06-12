import type { LevelDef } from './types';
import { validateLevel } from './validateLevel';

const BASE = import.meta.env.BASE_URL;

export { validateLevel } from './validateLevel';

export async function fetchLevel(levelId: number): Promise<LevelDef> {
  const response = await fetch(`${BASE}levels/${levelId}.json`);
  if (!response.ok) {
    throw new Error(`Level ${levelId} not found (${response.status})`);
  }
  const data = (await response.json()) as LevelDef;
  validateLevel(data, levelId);
  return data;
}

export type LevelSummary = { id: number; name: string; par?: number };
export type LevelChapter = { name: string; levelIds: number[] };
export type LevelManifest = { levels: LevelSummary[]; chapters: LevelChapter[] };

/**
 * Loads the level manifest in a single request. Supports the legacy
 * plain-array index (just level ids) by synthesizing a single chapter.
 */
export async function fetchLevelManifest(): Promise<LevelManifest> {
  const response = await fetch(`${BASE}levels/index.json`);
  if (!response.ok) {
    throw new Error(`Level index not found (${response.status})`);
  }
  const data = (await response.json()) as unknown;

  if (Array.isArray(data)) {
    const ids = data as number[];
    if (ids.length === 0) throw new Error('Level index is empty');
    return {
      levels: ids.map((id) => ({ id, name: `Level ${id}` })),
      chapters: [{ name: 'Levels', levelIds: [...ids] }],
    };
  }

  const manifest = data as LevelManifest;
  if (!Array.isArray(manifest.levels) || manifest.levels.length === 0) {
    throw new Error('Level index is empty');
  }
  if (!Array.isArray(manifest.chapters) || manifest.chapters.length === 0) {
    manifest.chapters = [
      { name: 'Levels', levelIds: manifest.levels.map((level) => level.id) },
    ];
  }
  return manifest;
}

export async function fetchLevelIndex(): Promise<number[]> {
  const manifest = await fetchLevelManifest();
  return manifest.levels.map((level) => level.id);
}
