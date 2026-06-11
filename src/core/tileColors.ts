import type { HexDirection, TileColor } from './types';

/** Each slide direction maps to one tile color (pointy-top axial). */
export const COLOR_BY_DIRECTION: Record<HexDirection, TileColor> = {
  0: 'coral', // E
  1: 'sky', // NE
  2: 'mint', // NW
  3: 'gold', // W
  4: 'lavender', // SW
  5: 'rose', // SE
};

export const DIRECTION_LABELS: Record<HexDirection, string> = {
  0: 'East',
  1: 'Northeast',
  2: 'Northwest',
  3: 'West',
  4: 'Southwest',
  5: 'Southeast',
};

export function colorForDirection(dir: HexDirection): TileColor {
  return COLOR_BY_DIRECTION[dir];
}

export function isColorForDirection(color: TileColor, dir: HexDirection): boolean {
  return colorForDirection(dir) === color;
}
