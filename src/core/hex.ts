import type { HexCoord, HexDirection, OneWayWallDef, RotatorDef } from './types';

const SQRT3 = Math.sqrt(3);

/** Axial step for each direction on a pointy-top hex grid. */
export const AXIAL_DIRS: readonly HexCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
] as const;

export function coordKey(coord: HexCoord): string {
  return `${coord.q},${coord.r}`;
}

export function parseCoordKey(key: string): HexCoord {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
}

export function addCoord(a: HexCoord, b: HexCoord): HexCoord {
  return { q: a.q + b.q, r: a.r + b.r };
}

export function stepCoord(coord: HexCoord, dir: HexDirection): HexCoord {
  const delta = AXIAL_DIRS[dir];
  return addCoord(coord, delta);
}

export function buildCellSet(cells: HexCoord[]): Set<string> {
  return new Set(cells.map(coordKey));
}

export function isOnBoard(cells: Set<string>, coord: HexCoord): boolean {
  return cells.has(coordKey(coord));
}

/** Slide ray from start in dir until the tile exits or falls into a hole. */
export function slidePath(
  start: HexCoord,
  dir: HexDirection,
  cells: Set<string>,
  holes: Set<string>,
  blocked: Set<string>,
): HexCoord[] {
  const path: HexCoord[] = [start];
  let current = start;

  while (true) {
    const next = stepCoord(current, dir);
    const nextKey = coordKey(next);

    if (holes.has(nextKey)) {
      path.push(next);
      return path;
    }

    if (!cells.has(nextKey)) {
      path.push(next);
      return path;
    }

    if (blocked.has(nextKey)) {
      return path.length === 1 ? [] : path;
    }

    path.push(next);
    current = next;
  }
}

/** Unit vector in pixel space for a slide direction (pointy-top layout). */
export function directionVector(dir: HexDirection): { x: number; y: number } {
  const delta = AXIAL_DIRS[dir];
  const x = SQRT3 * (delta.q + delta.r / 2);
  const y = 1.5 * delta.r;
  const len = Math.hypot(x, y);
  if (len === 0) return { x: 1, y: 0 };
  return { x: x / len, y: y / len };
}

export function directionAngleDeg(dir: HexDirection): number {
  const { x, y } = directionVector(dir);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

export function boundsOfCells(cells: HexCoord[]): {
  minQ: number;
  maxQ: number;
  minR: number;
  maxR: number;
} {
  let minQ = Infinity;
  let maxQ = -Infinity;
  let minR = Infinity;
  let maxR = -Infinity;

  for (const { q, r } of cells) {
    minQ = Math.min(minQ, q);
    maxQ = Math.max(maxQ, q);
    minR = Math.min(minR, r);
    maxR = Math.max(maxR, r);
  }

  return { minQ, maxQ, minR, maxR };
}

/** Round fractional axial coords to the nearest hex. */
export function axialRound(q: number, r: number): HexCoord {
  const x = q;
  const z = r;
  const y = -x - z;
  let rq = Math.round(x);
  let rr = Math.round(z);
  let ry = Math.round(y);
  const dq = Math.abs(rq - x);
  const dr = Math.abs(rr - z);
  const dy = Math.abs(ry - y);
  if (dq > dr && dq > dy) rq = -rr - ry;
  else if (dr > dy) rr = -rq - ry;
  else ry = -rq - rr;
  return { q: rq, r: rr };
}

export type SlideMechanics = {
  cells: Set<string>;
  holes: Set<string>;
  blocked: Set<string>;
  oneWayWalls: OneWayWallDef[];
  rotators: RotatorDef[];
};

function oneWayKey(q: number, r: number, dir: HexDirection): string {
  return `${q},${r}:${dir}`;
}

function buildOneWaySet(oneWayWalls: OneWayWallDef[]): Set<string> {
  return new Set(oneWayWalls.map((wall) => oneWayKey(wall.q, wall.r, wall.dir)));
}

function rotatorAt(rotators: RotatorDef[], coord: HexCoord): RotatorDef | undefined {
  return rotators.find((entry) => entry.q === coord.q && entry.r === coord.r);
}

function applyTurn(dir: HexDirection, turn: 1 | -1 | 2): HexDirection {
  const steps = turn === -1 ? 5 : turn;
  return ((dir + steps) % 6) as HexDirection;
}

/** Slide with one-way walls and rotators; returns path and whether the tile is removed. */
export function simulateSlide(
  start: HexCoord,
  startDir: HexDirection,
  mechanics: SlideMechanics,
): { path: HexCoord[]; removed: boolean } {
  const oneWays = buildOneWaySet(mechanics.oneWayWalls);
  const path: HexCoord[] = [start];
  let current = start;
  let dir = startDir;

  while (true) {
    const next = stepCoord(current, dir);
    const nextKey = coordKey(next);

    if (oneWays.has(oneWayKey(next.q, next.r, dir))) {
      return { path: path.length === 1 ? [] : path, removed: false };
    }

    if (mechanics.holes.has(nextKey)) {
      path.push(next);
      return { path, removed: true };
    }

    if (!mechanics.cells.has(nextKey)) {
      path.push(next);
      return { path, removed: true };
    }

    if (mechanics.blocked.has(nextKey)) {
      return { path: path.length === 1 ? [] : path, removed: false };
    }

    path.push(next);
    current = next;

    const rotator = rotatorAt(mechanics.rotators, current);
    if (rotator) {
      dir = applyTurn(dir, rotator.turn ?? 1);
    }
  }
}

/** Inverse of pointy-top axialToPixel (see hexLayout). */
export function pixelToAxial(x: number, y: number, size = 34): HexCoord {
  const q = ((SQRT3 / 3) * x - (1 / 3) * y) / size;
  const r = ((2 / 3) * y) / size;
  return axialRound(q, r);
}
