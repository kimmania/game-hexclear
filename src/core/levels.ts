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

export async function fetchLevelIndex(): Promise<number[]> {
  const response = await fetch(`${BASE}levels/index.json`);
  if (!response.ok) {
    throw new Error(`Level index not found (${response.status})`);
  }
  const ids = (await response.json()) as number[];
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('Level index is empty');
  }
  return ids;
}
