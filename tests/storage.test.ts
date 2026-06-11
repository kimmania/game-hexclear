import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  formatLevelScore,
  computeCompletionSummary,
  formatCompletionSummary,
  isNewBestMove,
  metPar,
  PROGRESS_STORAGE_KEY,
  recordBestMoves,
  unlockNextLevel,
  type SavedProgress,
} from '../src/game/storage';
import { clearAllUserData } from '../src/game/userData';

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

  it('detects par medals from best score and par', () => {
    expect(metPar(4, 5)).toBe(true);
    expect(metPar(5, 5)).toBe(true);
    expect(metPar(6, 5)).toBe(false);
    expect(metPar(4, undefined)).toBe(false);
    expect(metPar(undefined, 5)).toBe(false);
  });

  it('formats level picker score text', () => {
    expect(formatLevelScore(4, 5)).toBe('4 · par 5');
    expect(formatLevelScore(6, 5)).toBe('6 · par 5');
    expect(formatLevelScore(6, undefined)).toBe('Best 6');
    expect(formatLevelScore(undefined, 5)).toBeNull();
  });

  it('summarizes completion progress', () => {
    const progress: SavedProgress = {
      highestUnlocked: 4,
      currentLevel: 3,
      completedLevels: [1, 2, 3],
      bestMoves: { '1': 3, '2': 4, '3': 2 },
    };
    const levelIds = [1, 2, 3, 4];
    const levelPars = new Map<number, number | undefined>([
      [1, 3],
      [2, 4],
      [3, 4],
      [4, 5],
    ]);

    const summary = computeCompletionSummary(progress, levelIds, levelPars);
    expect(summary.cleared).toBe(3);
    expect(summary.atPar).toBe(2);
    expect(summary.underPar).toBe(1);
    expect(formatCompletionSummary(summary)).toBe('3/4 cleared · 3 at par · 1 under par');
  });
});

describe('user data reset', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      key: (index: number) => [...store.keys()][index] ?? null,
      get length() {
        return store.size;
      },
      clear: () => store.clear(),
    });
  });

  it('clears progress, sessions, settings, and editor draft keys', () => {
    store.set(PROGRESS_STORAGE_KEY, '{"highestUnlocked":5,"currentLevel":3}');
    store.set(`${PROGRESS_STORAGE_KEY}:level:2`, '{"status":"playing","tiles":[]}');
    store.set('hexclear-settings', '{"sound":false,"reducedMotion":true}');
    store.set(
      'hexclear-editor-draft',
      '{"id":1,"name":"Draft","cells":[],"tiles":[],"walls":[],"holes":[]}',
    );
    store.set('hexclear-install-hint', 'dismissed');
    store.set('hexclear-tutorial-dismissed', 'dismissed');

    clearAllUserData();

    expect(store.get(PROGRESS_STORAGE_KEY)).toBeUndefined();
    expect(store.get(`${PROGRESS_STORAGE_KEY}:level:2`)).toBeUndefined();
    expect(store.get('hexclear-settings')).toBeUndefined();
    expect(store.get('hexclear-editor-draft')).toBeUndefined();
    expect(store.get('hexclear-install-hint')).toBeUndefined();
    expect(store.get('hexclear-tutorial-dismissed')).toBeUndefined();
  });
});
