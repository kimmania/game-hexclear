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

export const DIRECTION_SHORT: Record<HexDirection, string> = {
  0: 'E',
  1: 'NE',
  2: 'NW',
  3: 'W',
  4: 'SW',
  5: 'SE',
};

export type ColorblindMode = 'off' | 'soft' | 'labels';

/** Default vivid palette — easy to read on the board. */
export const TILE_PALETTE: Record<TileColor, { fill: string; edge: string }> = {
  coral: { fill: '#ffb000', edge: '#cc8800' },
  sky: { fill: '#0077ff', edge: '#0055bb' },
  mint: { fill: '#00aa66', edge: '#007744' },
  gold: { fill: '#ffffff', edge: '#cccccc' },
  lavender: { fill: '#cc44ff', edge: '#9900cc' },
  rose: { fill: '#ff3366', edge: '#cc0033' },
};

/** Softer pastel palette (optional in settings). */
export const SOFT_PALETTE: Record<TileColor, { fill: string; edge: string }> = {
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

export function paletteForMode(mode: ColorblindMode): Record<TileColor, { fill: string; edge: string }> {
  return mode === 'soft' ? SOFT_PALETTE : TILE_PALETTE;
}

export function tileStyleForDirection(
  dir: HexDirection,
  mode: ColorblindMode = 'off',
): { fill: string; edge: string } {
  return paletteForMode(mode)[colorForDirection(dir)];
}

export function showDirectionLabels(mode: ColorblindMode): boolean {
  return mode === 'labels';
}

/** @deprecated Use ColorblindMode */
export type LegacyColorblindMode = ColorblindMode | 'contrast';

export function normalizeColorblindMode(value: unknown): ColorblindMode {
  if (value === 'soft' || value === 'labels') return value;
  if (value === 'contrast') return 'soft';
  return 'off';
}
