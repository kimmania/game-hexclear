import { AXIAL_DIRS, buildCellSet, coordKey, slidePath } from './hex';
import type {
  GameState,
  LevelDef,
  SlideBlockReason,
  SlideResult,
  TileId,
  TileState,
} from './types';

function copyTile(tile: TileState): TileState {
  return {
    id: tile.id,
    q: tile.q,
    r: tile.r,
    dir: tile.dir,
    color: tile.color,
    ...(tile.frozen ? { frozen: true } : {}),
  };
}

export function createGameState(level: LevelDef): GameState {
  return {
    levelId: level.id,
    levelName: level.name,
    status: 'playing',
    cells: level.cells.map((cell) => ({ ...cell })),
    walls: (level.walls ?? []).map((wall) => ({ ...wall })),
    holes: (level.holes ?? []).map((hole) => ({ ...hole })),
    tiles: level.tiles.map((tile) => ({
      id: tile.id,
      q: tile.q,
      r: tile.r,
      dir: tile.dir,
      color: tile.color,
      ...(tile.frozen ? { frozen: true } : {}),
    })),
    moveCount: 0,
    ...(level.par !== undefined ? { par: level.par } : {}),
  };
}

function occupiedKeys(state: GameState, ignoreTileId?: TileId): Set<string> {
  const keys = new Set<string>();
  for (const tile of state.tiles) {
    if (tile.id === ignoreTileId) continue;
    keys.add(coordKey(tile));
  }
  for (const wall of state.walls) {
    keys.add(coordKey(wall));
  }
  return keys;
}

export function hasAdjacentTile(state: GameState, tile: TileState): boolean {
  for (const delta of AXIAL_DIRS) {
    const nq = tile.q + delta.q;
    const nr = tile.r + delta.r;
    if (state.tiles.some((other) => other.id !== tile.id && other.q === nq && other.r === nr)) {
      return true;
    }
  }
  return false;
}

export function isFrozenLocked(state: GameState, tile: TileState): boolean {
  return tile.frozen === true && hasAdjacentTile(state, tile);
}

export function slideBlockReason(state: GameState, tile: TileState): SlideBlockReason | null {
  if (isFrozenLocked(state, tile)) return 'frozen';

  const cells = buildCellSet(state.cells);
  const holes = buildCellSet(state.holes);
  const blocked = occupiedKeys(state, tile.id);
  const path = slidePath({ q: tile.q, r: tile.r }, tile.dir, cells, holes, blocked);

  if (path.length <= 1) return 'blocked';
  return null;
}

export function canSlideTile(state: GameState, tileId: TileId): SlideResult {
  if (state.status !== 'playing') {
    return { ok: false, reason: 'finished' };
  }

  const tile = state.tiles.find((entry) => entry.id === tileId);
  if (!tile) {
    return { ok: false, reason: 'missing' };
  }

  const block = slideBlockReason(state, tile);
  if (block) {
    return { ok: false, reason: block };
  }

  const cells = buildCellSet(state.cells);
  const holes = buildCellSet(state.holes);
  const blocked = occupiedKeys(state, tileId);
  const path = slidePath({ q: tile.q, r: tile.r }, tile.dir, cells, holes, blocked);

  return { ok: true, path };
}

export function applySlide(state: GameState, tileId: TileId): GameState {
  const result = canSlideTile(state, tileId);
  if (!result.ok) {
    return state;
  }

  const next: GameState = {
    ...state,
    moveCount: state.moveCount + 1,
    tiles: state.tiles.filter((tile) => tile.id !== tileId),
  };

  if (next.tiles.length === 0) {
    next.status = 'won';
  }

  return next;
}

export function isWin(state: GameState): boolean {
  return state.status === 'won';
}

export function cloneState(state: GameState): GameState {
  return {
    levelId: state.levelId,
    levelName: state.levelName,
    status: state.status,
    cells: state.cells.map((cell) => ({ ...cell })),
    walls: state.walls.map((wall) => ({ ...wall })),
    holes: state.holes.map((hole) => ({ ...hole })),
    tiles: state.tiles.map(copyTile),
    moveCount: state.moveCount,
    ...(state.par !== undefined ? { par: state.par } : {}),
  };
}

export function resetGameState(level: LevelDef): GameState {
  return createGameState(level);
}

export function statusLabel(state: GameState): string {
  if (state.status === 'won') return 'Cleared';
  return 'Playing';
}

export function tilesRemaining(state: GameState): number {
  return state.tiles.length;
}

export function findTileAt(state: GameState, q: number, r: number): TileState | undefined {
  return state.tiles.find((tile) => tile.q === q && tile.r === r);
}

export function hintForBlockReason(reason: SlideBlockReason): string {
  switch (reason) {
    case 'frozen':
      return 'That hex is frozen — clear its neighbors first.';
    case 'blocked':
      return 'That hex is blocked — clear the path first.';
    default:
      return 'That move is not available.';
  }
}
