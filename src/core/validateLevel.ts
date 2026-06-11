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

  const teleporterGroups = new Map<string, number>();
  for (const teleporter of level.teleporters ?? []) {
    if (!isRecord(teleporter) || typeof teleporter.group !== 'string') {
      throw new Error('Invalid teleporter definition');
    }
    if (!isCoord(teleporter)) {
      throw new Error('Invalid teleporter coordinate');
    }
    const key = `${teleporter.q},${teleporter.r}`;
    if (!cellKeys.has(key)) {
      throw new Error(`Teleporter at ${key} is outside the board cells`);
    }
    teleporterGroups.set(teleporter.group, (teleporterGroups.get(teleporter.group) ?? 0) + 1);
  }
  for (const [group, count] of teleporterGroups) {
    if (count !== 2) {
      throw new Error(`Teleporter group "${group}" must have exactly 2 portals (found ${count})`);
    }
  }

  for (const gate of level.toggleGates ?? []) {
    if (
      !isRecord(gate) ||
      !isCoord({ q: gate.switchQ, r: gate.switchR }) ||
      !isCoord({ q: gate.gateQ, r: gate.gateR })
    ) {
      throw new Error('Invalid toggle gate definition');
    }
    const switchKey = `${gate.switchQ},${gate.switchR}`;
    const gateKey = `${gate.gateQ},${gate.gateR}`;
    if (!cellKeys.has(switchKey)) {
      throw new Error(`Toggle switch at ${switchKey} is outside the board cells`);
    }
    if (!cellKeys.has(gateKey)) {
      throw new Error(`Toggle gate at ${gateKey} is outside the board cells`);
    }
  }

  for (const cell of level.crumbling ?? []) {
    if (!isCoord(cell)) throw new Error('Invalid crumbling cell');
    const key = `${cell.q},${cell.r}`;
    if (!cellKeys.has(key)) {
      throw new Error(`Crumbling cell at ${key} is outside the board cells`);
    }
  }

  const crateIds = new Set<string>();
  for (const crate of level.crates ?? []) {
    if (
      !isRecord(crate) ||
      typeof crate.id !== 'string' ||
      !isCoord(crate)
    ) {
      throw new Error('Invalid crate definition');
    }
    if (crateIds.has(crate.id)) {
      throw new Error(`Duplicate crate id: ${crate.id}`);
    }
    crateIds.add(crate.id);
    const key = `${crate.q},${crate.r}`;
    if (!cellKeys.has(key)) {
      throw new Error(`Crate ${crate.id} is outside the board cells`);
    }
    if (level.tiles.some((tile) => tile.q === crate.q && tile.r === crate.r)) {
      throw new Error(`Crate overlaps tile at ${key}`);
    }
  }

  for (const cell of level.splitters ?? []) {
    if (!isCoord(cell)) throw new Error('Invalid splitter cell');
    const key = `${cell.q},${cell.r}`;
    if (!cellKeys.has(key)) {
      throw new Error(`Splitter at ${key} is outside the board cells`);
    }
  }

  for (const cell of level.magnets ?? []) {
    if (!isCoord(cell)) throw new Error('Invalid magnet cell');
    const key = `${cell.q},${cell.r}`;
    if (!cellKeys.has(key)) {
      throw new Error(`Magnet at ${key} is outside the board cells`);
    }
  }
}
