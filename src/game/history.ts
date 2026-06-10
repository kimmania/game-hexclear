import { cloneState } from '../core/board';
import type { GameState } from '../core/types';

export type MoveSnapshot = GameState;

export function captureSnapshot(state: GameState): MoveSnapshot {
  return cloneState(state);
}

export function applySnapshot(snapshot: MoveSnapshot): GameState {
  return cloneState(snapshot);
}
