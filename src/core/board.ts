import { buildCellSet, coordKey, slidePath } from './hex';
import type {
  GameState,
  LevelDef,
  SlideResult,
  TileId,
  TileState,
} from './types';

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
    })),
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

export function canSlideTile(state: GameState, tileId: TileId): SlideResult {
  if (state.status !== 'playing') {
    return { ok: false, reason: 'finished' };
  }

  const tile = state.tiles.find((entry) => entry.id === tileId);
  if (!tile) {
    return { ok: false, reason: 'missing' };
  }

  const cells = buildCellSet(state.cells);
  const holes = buildCellSet(state.holes);
  const blocked = occupiedKeys(state, tileId);
  const path = slidePath({ q: tile.q, r: tile.r }, tile.dir, cells, holes, blocked);

  if (path.length <= 1) {
    return { ok: false, reason: 'blocked' };
  }

  return { ok: true, path };
}

export function applySlide(state: GameState, tileId: TileId): GameState {
  const result = canSlideTile(state, tileId);
  if (!result.ok) {
    return state;
  }

  const next: GameState = {
    ...state,
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
    tiles: state.tiles.map((tile) => ({ ...tile })),
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
