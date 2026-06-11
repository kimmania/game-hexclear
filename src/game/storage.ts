import type { GameState } from '../core/types';

export const PROGRESS_STORAGE_KEY = 'hexclear-progress';

const STORAGE_KEY = PROGRESS_STORAGE_KEY;

export type SavedProgress = {
  highestUnlocked: number;
  currentLevel: number;
  completedLevels?: number[];
  /** Best move count per level id (string key). */
  bestMoves?: Record<string, number>;
};

export function loadProgress(): SavedProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { highestUnlocked: 1, currentLevel: 1 };
    const parsed = JSON.parse(raw) as SavedProgress;
    if (
      typeof parsed.highestUnlocked === 'number' &&
      typeof parsed.currentLevel === 'number' &&
      parsed.highestUnlocked >= 1 &&
      parsed.currentLevel >= 1
    ) {
      return parsed;
    }
  } catch {
    /* ignore corrupt data */
  }
  return { highestUnlocked: 1, currentLevel: 1 };
}

export function saveProgress(progress: SavedProgress): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export type SessionSnapshot = Pick<
  GameState,
  'status' | 'cells' | 'walls' | 'holes' | 'tiles' | 'moveCount' | 'par'
>;

export function saveSession(levelId: number, state: GameState): void {
  const key = `${STORAGE_KEY}:level:${levelId}`;
  localStorage.setItem(
    key,
    JSON.stringify({
      status: state.status,
      cells: state.cells,
      walls: state.walls,
      holes: state.holes,
      tiles: state.tiles,
      moveCount: state.moveCount,
      ...(state.par !== undefined ? { par: state.par } : {}),
    }),
  );
}

export function loadSession(levelId: number): SessionSnapshot | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:level:${levelId}`);
    if (!raw) return null;
    return JSON.parse(raw) as SessionSnapshot;
  } catch {
    return null;
  }
}

export function clearSession(levelId: number): void {
  localStorage.removeItem(`${STORAGE_KEY}:level:${levelId}`);
}

export function clearAllSessions(): void {
  const prefix = `${STORAGE_KEY}:level:`;
  const keys: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(prefix)) keys.push(key);
  }
  for (const key of keys) {
    localStorage.removeItem(key);
  }
}

export function metPar(bestMoves: number | undefined, par: number | undefined): boolean {
  return par !== undefined && bestMoves !== undefined && bestMoves <= par;
}

export function formatLevelScore(bestMoves: number | undefined, par: number | undefined): string | null {
  if (bestMoves === undefined) return null;
  if (par !== undefined) {
    return `${bestMoves} · par ${par}`;
  }
  return `Best ${bestMoves}`;
}

export type CompletionSummary = {
  totalLevels: number;
  cleared: number;
  parLevels: number;
  atPar: number;
  underPar: number;
};

export function computeCompletionSummary(
  progress: SavedProgress,
  levelIds: number[],
  levelPars: Map<number, number | undefined>,
): CompletionSummary {
  const completed = getCompletedLevelIds(progress);
  let atPar = 0;
  let underPar = 0;
  let parLevels = 0;

  for (const id of levelIds) {
    const par = levelPars.get(id);
    if (par === undefined) continue;
    parLevels += 1;
    if (!completed.has(id)) continue;
    const best = getBestMoves(progress, id);
    if (best === undefined) continue;
    if (best < par) underPar += 1;
    else if (best <= par) atPar += 1;
  }

  return {
    totalLevels: levelIds.length,
    cleared: completed.size,
    parLevels,
    atPar,
    underPar,
  };
}

export function formatCompletionSummary(summary: CompletionSummary): string {
  const parts = [`${summary.cleared}/${summary.totalLevels} cleared`];
  if (summary.parLevels > 0) {
    const parTotal = summary.atPar + summary.underPar;
    if (parTotal > 0) {
      parts.push(`${parTotal} at par`);
    }
    if (summary.underPar > 0) {
      parts.push(`${summary.underPar} under par`);
    }
  }
  return parts.join(' · ');
}

export function getCompletedLevelIds(progress: SavedProgress): Set<number> {
  if (progress.completedLevels?.length) {
    return new Set(progress.completedLevels);
  }
  const legacy: number[] = [];
  for (let id = 1; id < progress.highestUnlocked; id++) {
    legacy.push(id);
  }
  return new Set(legacy);
}

export function findInProgressLevelIds(
  levelIds: number[],
  highestUnlocked: number,
): number[] {
  return levelIds.filter((id) => {
    if (id > highestUnlocked) return false;
    const session = loadSession(id);
    return session?.status === 'playing' && session.tiles.length > 0;
  });
}

export function findResumeLevel(
  levelIds: number[],
  highestUnlocked: number,
): number | null {
  const inProgress = findInProgressLevelIds(levelIds, highestUnlocked);
  if (inProgress.length === 0) return null;
  return Math.max(...inProgress);
}

export function unlockNextLevel(progress: SavedProgress, completedLevelId: number): SavedProgress {
  const completed = getCompletedLevelIds(progress);
  completed.add(completedLevelId);
  const next = completedLevelId + 1;
  return {
    ...progress,
    highestUnlocked: Math.max(progress.highestUnlocked, next),
    currentLevel: next,
    completedLevels: [...completed].sort((a, b) => a - b),
  };
}

export function isNewBestMove(previousBest: number | undefined, moves: number): boolean {
  return previousBest === undefined || moves < previousBest;
}

export function recordBestMoves(
  progress: SavedProgress,
  levelId: number,
  moves: number,
): SavedProgress {
  const key = String(levelId);
  const previous = progress.bestMoves?.[key];
  if (previous !== undefined && previous <= moves) {
    return progress;
  }
  return {
    ...progress,
    bestMoves: { ...(progress.bestMoves ?? {}), [key]: moves },
  };
}

export function getBestMoves(progress: SavedProgress, levelId: number): number | undefined {
  return progress.bestMoves?.[String(levelId)];
}
