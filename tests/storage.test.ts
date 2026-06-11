import { describe, expect, it } from 'vitest';
import {
  isNewBestMove,
  recordBestMoves,
  unlockNextLevel,
  type SavedProgress,
} from '../src/game/storage';

describe('progress storage', () => {
  it('preserves bestMoves when unlocking the next level', () => {
    const progress: SavedProgress = {
      highestUnlocked: 3,
      currentLevel: 2,
      completedLevels: [1],
      bestMoves: { '2': 5 },
    };

    const next = unlockNextLevel(progress, 2);

    expect(next.bestMoves).toEqual({ '2': 5 });
    expect(next.completedLevels).toEqual([1, 2]);
    expect(next.highestUnlocked).toBe(3);
    expect(next.currentLevel).toBe(3);
  });

  it('does not overwrite a better score with a worse replay', () => {
    const progress: SavedProgress = {
      highestUnlocked: 2,
      currentLevel: 1,
      completedLevels: [1],
      bestMoves: { '1': 5 },
    };

    const updated = recordBestMoves(progress, 1, 8);

    expect(updated).toBe(progress);
    expect(updated.bestMoves).toEqual({ '1': 5 });
  });

  it('detects a new best only on first clear or fewer moves', () => {
    expect(isNewBestMove(undefined, 7)).toBe(true);
    expect(isNewBestMove(5, 4)).toBe(true);
    expect(isNewBestMove(5, 5)).toBe(false);
    expect(isNewBestMove(5, 7)).toBe(false);
  });
});
