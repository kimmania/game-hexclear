import type { LevelDef } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCoord(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.q === 'number' &&
    Number.isInteger(value.q) &&
    typeof value.r === 'number' &&
    Number.isInteger(value.r)
  );
}

function isOneWayWall(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    typeof value.q === 'number' &&
    Number.isInteger(value.q) &&
    typeof value.r === 'number' &&
    Number.isInteger(value.r) &&
    typeof value.dir === 'number' &&
    Number.isInteger(value.dir) &&
    value.dir >= 0 &&
    value.dir <= 5
  );
}

function isRotator(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (
    typeof value.q !== 'number' ||
    !Number.isInteger(value.q) ||
    typeof value.r !== 'number' ||
    !Number.isInteger(value.r)
  ) {
    return false;
  }
  if (value.turn !== undefined && value.turn !== 1 && value.turn !== -1 && value.turn !== 2) {
    return false;
  }
  return true;
}

function isTile(value: unknown): boolean {
  if (!isRecord(value)) return false;
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
    return false;
  }
  if (value.frozen !== undefined && typeof value.frozen !== 'boolean') {
    return false;
  }
  if (value.linked !== undefined && typeof value.linked !== 'string') {
    return false;
  }
  return true;
}

export function validateLevel(level: LevelDef, expectedId?: number): void {
  if (typeof level.id !== 'number' || !Number.isInteger(level.id) || level.id < 1) {
    throw new Error('Level id must be a positive integer');
  }
  if (expectedId !== undefined && level.id !== expectedId) {
    throw new Error(`Level id ${level.id} does not match file id ${expectedId}`);
  }
  if (typeof level.name !== 'string' || level.name.trim().length === 0) {
    throw new Error('Level name is required');
  }
  if (
    level.par !== undefined &&
    (typeof level.par !== 'number' || !Number.isInteger(level.par) || level.par < 1)
  ) {
    throw new Error('Level par must be a positive integer');
  }
  if (!Array.isArray(level.cells) || level.cells.length === 0) {
    throw new Error('Level must define at least one cell');
  }
  if (!level.cells.every(isCoord)) {
    throw new Error('Invalid cell coordinates');
  }
  if (!Array.isArray(level.tiles) || level.tiles.length === 0) {
    throw new Error('Level must define at least one tile');
  }
  if (!level.tiles.every(isTile)) {
    throw new Error('Invalid tile definition');
  }

  const cellKeys = new Set(level.cells.map((cell) => `${cell.q},${cell.r}`));
  const holeKeys = new Set((level.holes ?? []).map((hole) => `${hole.q},${hole.r}`));
  const tileIds = new Set<string>();

  for (const tile of level.tiles) {
    if (tileIds.has(tile.id)) {
      throw new Error(`Duplicate tile id: ${tile.id}`);
    }
    tileIds.add(tile.id);

    const key = `${tile.q},${tile.r}`;
    if (!cellKeys.has(key)) {
      throw new Error(`Tile ${tile.id} is outside the board cells`);
    }
    if (holeKeys.has(key)) {
      throw new Error(`Tile ${tile.id} cannot start on a hole`);
    }
  }

  for (const tile of level.tiles) {
    if (!tile.linked) continue;
    if (!tileIds.has(tile.linked)) {
      throw new Error(`Tile ${tile.id} links to missing tile ${tile.linked}`);
    }
    const partner = level.tiles.find((entry) => entry.id === tile.linked);
    if (!partner?.linked || partner.linked !== tile.id) {
      throw new Error(`Tile ${tile.id} must have a mutual link with ${tile.linked}`);
    }
  }

  for (const hole of level.holes ?? []) {
    if (!isCoord(hole)) {
      throw new Error('Invalid hole coordinate');
    }
    const key = `${hole.q},${hole.r}`;
    if (!cellKeys.has(key)) {
      throw new Error(`Hole at ${key} is outside the board cells`);
    }
    if (level.walls?.some((wall) => wall.q === hole.q && wall.r === hole.r)) {
      throw new Error(`Hole overlaps wall at ${key}`);
    }
  }

  for (const wall of level.walls ?? []) {
    if (!isCoord(wall)) {
      throw new Error('Invalid wall coordinate');
    }
    const key = `${wall.q},${wall.r}`;
    if (!cellKeys.has(key)) {
      throw new Error(`Wall at ${key} is outside the board cells`);
    }
    if (level.tiles.some((tile) => tile.q === wall.q && tile.r === wall.r)) {
      throw new Error(`Wall overlaps tile at ${key}`);
    }
  }

  for (const oneWay of level.oneWayWalls ?? []) {
    if (!isOneWayWall(oneWay)) {
      throw new Error('Invalid one-way wall definition');
    }
    const key = `${oneWay.q},${oneWay.r}`;
    if (!cellKeys.has(key)) {
      throw new Error(`One-way wall at ${key} is outside the board cells`);
    }
    if (level.walls?.some((wall) => wall.q === oneWay.q && wall.r === oneWay.r)) {
      throw new Error(`One-way wall overlaps full wall at ${key}`);
    }
  }

  const oneWayKeys = new Set<string>();
  for (const oneWay of level.oneWayWalls ?? []) {
    const key = `${oneWay.q},${oneWay.r}:${oneWay.dir}`;
    if (oneWayKeys.has(key)) {
      throw new Error(`Duplicate one-way wall at ${key}`);
    }
    oneWayKeys.add(key);
  }

  for (const rotator of level.rotators ?? []) {
    if (!isRotator(rotator)) {
      throw new Error('Invalid rotator definition');
    }
    const key = `${rotator.q},${rotator.r}`;
    if (!cellKeys.has(key)) {
      throw new Error(`Rotator at ${key} is outside the board cells`);
    }
  }

  const rotatorKeys = new Set<string>();
  for (const rotator of level.rotators ?? []) {
    const key = `${rotator.q},${rotator.r}`;
    if (rotatorKeys.has(key)) {
      throw new Error(`Duplicate rotator at ${key}`);
    }
    rotatorKeys.add(key);
  }
}
