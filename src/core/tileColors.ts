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

/** UI palette — edit here to restyle direction colors. */
export const TILE_PALETTE: Record<TileColor, { fill: string; edge: string }> = {
  coral: { fill: '#ff7b6b', edge: '#e05a4a' },
  sky: { fill: '#5eb8ff', edge: '#3d9ae8' },
  mint: { fill: '#5fd4a4', edge: '#3fb888' },
  gold: { fill: '#ffc857', edge: '#e6a830' },
  lavender: { fill: '#b39cff', edge: '#9178e8' },
  rose: { fill: '#ff8fc4', edge: '#e86aa8' },
};

export function colorForDirection(dir: HexDirection): TileColor {
  return COLOR_BY_DIRECTION[dir];
}

export function tileStyleForDirection(dir: HexDirection): { fill: string; edge: string } {
  return TILE_PALETTE[colorForDirection(dir)];
}
