import { validateLevel } from './validateLevel';
import type { HexDirection, LevelDef, TileDef } from './types';

export type ParseLevelSuccess = {
  ok: true;
  level: LevelDef;
};

export type ParseLevelFailure = {
  ok: false;
  message: string;
};

export type ParseLevelResult = ParseLevelSuccess | ParseLevelFailure;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeTile(value: unknown): TileDef | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== 'string' ||
    typeof value.q !== 'number' ||
    !Number.isInteger(value.q) ||
    typeof value.r !== 'number' ||
    !Number.isInteger(value.r) ||
    typeof value.dir !== 'number' ||
    !Number.isInteger(value.dir) ||
    value.dir < 0 ||
    value.dir > 5
  ) {
    return null;
  }
  const tile: TileDef = {
    id: value.id,
    q: value.q,
    r: value.r,
    dir: value.dir as HexDirection,
  };
  if (value.frozen === true) tile.frozen = true;
  return tile;
}

function normalizeCoord(value: unknown): { q: number; r: number } | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.q !== 'number' ||
    !Number.isInteger(value.q) ||
    typeof value.r !== 'number' ||
    !Number.isInteger(value.r)
  ) {
    return null;
  }
  return { q: value.q, r: value.r };
}

/** Parse and normalize level JSON (strips legacy fields such as tile color). */
export function parseLevelJson(text: string): ParseLevelResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text.trim());
  } catch {
    return { ok: false, message: 'Clipboard text is not valid JSON.' };
  }

  if (!isRecord(raw)) {
    return { ok: false, message: 'Level JSON must be an object.' };
  }

  if (typeof raw.id !== 'number' || !Number.isInteger(raw.id) || raw.id < 1) {
    return { ok: false, message: 'Level id must be a positive integer.' };
  }
  if (typeof raw.name !== 'string' || raw.name.trim().length === 0) {
    return { ok: false, message: 'Level name is required.' };
  }
  if (!Array.isArray(raw.cells) || raw.cells.length === 0) {
    return { ok: false, message: 'Level must include at least one cell.' };
  }
  if (!Array.isArray(raw.tiles) || raw.tiles.length === 0) {
    return { ok: false, message: 'Level must include at least one tile.' };
  }

  const cells = raw.cells.map(normalizeCoord);
  if (cells.some((cell) => cell === null)) {
    return { ok: false, message: 'Invalid cell coordinates.' };
  }

  const tiles = raw.tiles.map(normalizeTile);
  if (tiles.some((tile) => tile === null)) {
    return { ok: false, message: 'Invalid tile definition.' };
  }

  const walls = Array.isArray(raw.walls) ? raw.walls.map(normalizeCoord) : [];
  if (walls.some((wall) => wall === null)) {
    return { ok: false, message: 'Invalid wall coordinates.' };
  }

  const holes = Array.isArray(raw.holes) ? raw.holes.map(normalizeCoord) : [];
  if (holes.some((hole) => hole === null)) {
    return { ok: false, message: 'Invalid hole coordinates.' };
  }

  const level: LevelDef = {
    id: raw.id,
    name: raw.name.trim(),
    cells: cells as { q: number; r: number }[],
    tiles: tiles as TileDef[],
  };

  if (walls.length > 0) {
    level.walls = walls as { q: number; r: number }[];
  }
  if (holes.length > 0) {
    level.holes = holes as { q: number; r: number }[];
  }

  if (raw.par !== undefined) {
    if (typeof raw.par !== 'number' || !Number.isInteger(raw.par) || raw.par < 1) {
      return { ok: false, message: 'Level par must be a positive integer.' };
    }
    level.par = raw.par;
  }

  try {
    validateLevel(level, level.id);
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Invalid level',
    };
  }

  return { ok: true, level };
}

export async function readClipboardText(): Promise<string | null> {
  if (!navigator.clipboard?.readText) return null;
  try {
    const text = await navigator.clipboard.readText();
    return text.trim().length > 0 ? text : null;
  } catch {
    return null;
  }
}
