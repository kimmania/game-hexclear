import type { HexCoord, HexDirection } from './types';

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
