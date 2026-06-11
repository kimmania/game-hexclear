import { validateLevel } from './validateLevel';
import type {
  CrateDef,
  HexDirection,
  LevelDef,
  OneWayWallDef,
  RotatorDef,
  TeleporterDef,
  TileDef,
  ToggleGateDef,
} from './types';

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
  if (typeof value.linked === 'string') tile.linked = value.linked;
  return tile;
}

function normalizeOneWayWall(value: unknown): OneWayWallDef | null {
  if (!isRecord(value)) return null;
  if (
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
  return { q: value.q, r: value.r, dir: value.dir as HexDirection };
}

function normalizeRotator(value: unknown): RotatorDef | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.q !== 'number' ||
    !Number.isInteger(value.q) ||
    typeof value.r !== 'number' ||
    !Number.isInteger(value.r)
  ) {
    return null;
  }
  const rotator: RotatorDef = { q: value.q, r: value.r };
  if (value.turn === 1 || value.turn === -1 || value.turn === 2) {
    rotator.turn = value.turn;
  }
  return rotator;
}

function normalizeTeleporter(value: unknown): TeleporterDef | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.q !== 'number' ||
    !Number.isInteger(value.q) ||
    typeof value.r !== 'number' ||
    !Number.isInteger(value.r) ||
    typeof value.group !== 'string' ||
    value.group.trim().length === 0
  ) {
    return null;
  }
  return { q: value.q, r: value.r, group: value.group.trim() };
}

function normalizeToggleGate(value: unknown): ToggleGateDef | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.switchQ !== 'number' ||
    !Number.isInteger(value.switchQ) ||
    typeof value.switchR !== 'number' ||
    !Number.isInteger(value.switchR) ||
    typeof value.gateQ !== 'number' ||
    !Number.isInteger(value.gateQ) ||
    typeof value.gateR !== 'number' ||
    !Number.isInteger(value.gateR)
  ) {
    return null;
  }
  const gate: ToggleGateDef = {
    switchQ: value.switchQ,
    switchR: value.switchR,
    gateQ: value.gateQ,
    gateR: value.gateR,
  };
  if (value.open === true) gate.open = true;
  return gate;
}

function normalizeCrate(value: unknown): CrateDef | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== 'string' ||
    typeof value.q !== 'number' ||
    !Number.isInteger(value.q) ||
    typeof value.r !== 'number' ||
    !Number.isInteger(value.r)
  ) {
    return null;
  }
  return { id: value.id, q: value.q, r: value.r };
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

  const oneWayWalls = Array.isArray(raw.oneWayWalls)
    ? raw.oneWayWalls.map(normalizeOneWayWall)
    : [];
  if (oneWayWalls.some((wall) => wall === null)) {
    return { ok: false, message: 'Invalid one-way wall definition.' };
  }

  const rotators = Array.isArray(raw.rotators) ? raw.rotators.map(normalizeRotator) : [];
  if (rotators.some((rotator) => rotator === null)) {
    return { ok: false, message: 'Invalid rotator definition.' };
  }

  const teleporters = Array.isArray(raw.teleporters)
    ? raw.teleporters.map(normalizeTeleporter)
    : [];
  if (teleporters.some((entry) => entry === null)) {
    return { ok: false, message: 'Invalid teleporter definition.' };
  }

  const toggleGates = Array.isArray(raw.toggleGates)
    ? raw.toggleGates.map(normalizeToggleGate)
    : [];
  if (toggleGates.some((entry) => entry === null)) {
    return { ok: false, message: 'Invalid toggle gate definition.' };
  }

  const crumbling = Array.isArray(raw.crumbling) ? raw.crumbling.map(normalizeCoord) : [];
  if (crumbling.some((cell) => cell === null)) {
    return { ok: false, message: 'Invalid crumbling cell.' };
  }

  const crates = Array.isArray(raw.crates) ? raw.crates.map(normalizeCrate) : [];
  if (crates.some((crate) => crate === null)) {
    return { ok: false, message: 'Invalid crate definition.' };
  }

  const splitters = Array.isArray(raw.splitters) ? raw.splitters.map(normalizeCoord) : [];
  if (splitters.some((cell) => cell === null)) {
    return { ok: false, message: 'Invalid splitter cell.' };
  }

  const magnets = Array.isArray(raw.magnets) ? raw.magnets.map(normalizeCoord) : [];
  if (magnets.some((cell) => cell === null)) {
    return { ok: false, message: 'Invalid magnet cell.' };
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
  if (oneWayWalls.length > 0) {
    level.oneWayWalls = oneWayWalls as OneWayWallDef[];
  }
  if (rotators.length > 0) {
    level.rotators = rotators as RotatorDef[];
  }
  if (teleporters.length > 0) {
    level.teleporters = teleporters as TeleporterDef[];
  }
  if (toggleGates.length > 0) {
    level.toggleGates = toggleGates as ToggleGateDef[];
  }
  if (crumbling.length > 0) {
    level.crumbling = crumbling as { q: number; r: number }[];
  }
  if (crates.length > 0) {
    level.crates = crates as CrateDef[];
  }
  if (splitters.length > 0) {
    level.splitters = splitters as { q: number; r: number }[];
  }
  if (magnets.length > 0) {
    level.magnets = magnets as { q: number; r: number }[];
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
