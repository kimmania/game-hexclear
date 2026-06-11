import { applySlide, canSlideTile, cloneState, createGameState } from './board';
import { coordKey } from './hex';
import type { GameState, LevelDef, TileId } from './types';

export type SolverOptions = {
  maxStates?: number;
};

export type SolverResult = {
  solvable: boolean;
  statesExplored: number;
};

export function stateKey(state: GameState): string {
  const tiles = state.tiles
    .map((tile) => {
      const frozen = tile.frozen ? 'f' : '';
      return `${tile.id}@${tile.q},${tile.r}:${tile.dir}${frozen}`;
    })
    .sort()
    .join('|');
  return `${state.status}|${tiles}`;
}

function legalMoves(state: GameState): TileId[] {
  if (state.status !== 'playing') return [];
  return state.tiles
    .filter((tile) => canSlideTile(state, tile.id).ok)
    .map((tile) => tile.id);
}

/** Returns one slideable tile id, or null if none. */
export function findHintMove(state: GameState): TileId | null {
  const moves = legalMoves(state);
  if (moves.length === 0) return null;
  return [...moves].sort()[0]!;
}

export function solveLevel(level: LevelDef, options: SolverOptions = {}): SolverResult {
  const maxStates = options.maxStates ?? 500_000;
  const start = createGameState(level);

  if (start.status === 'won') {
    return { solvable: true, statesExplored: 1 };
  }

  const queue: GameState[] = [start];
  const seen = new Set<string>([stateKey(start)]);
  let explored = 0;

  while (queue.length > 0) {
    const state = queue.shift()!;
    explored += 1;

    if (explored > maxStates) {
      return { solvable: false, statesExplored: explored };
    }

    for (const tileId of legalMoves(state)) {
      const next = applySlide(state, tileId);
      if (next.status === 'won') {
        return { solvable: true, statesExplored: explored + 1 };
      }

      const key = stateKey(next);
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push(next);
    }
  }

  return { solvable: false, statesExplored: explored };
}

export function cloneForUndo(state: GameState): GameState {
  return cloneState(state);
}

export function occupiedTileKeys(state: GameState): Set<string> {
  return new Set(state.tiles.map((tile) => coordKey(tile)));
}
