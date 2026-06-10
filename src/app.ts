import {
  applySlide,
  canSlideTile,
  createGameState,
  isWin,
  resetGameState,
  statusLabel,
  tilesRemaining,
} from './core/board';
import { fetchLevel, fetchLevelIndex } from './core/levels';
import type { GameState, LevelDef, TileId } from './core/types';
import { applySnapshot, captureSnapshot, type MoveSnapshot } from './game/history';
import {
  clearSession,
  findInProgressLevelIds,
  findResumeLevel,
  getCompletedLevelIds,
  loadProgress,
  loadSession,
  saveProgress,
  saveSession,
  unlockNextLevel,
} from './game/storage';
import {
  bindControls,
  setContinueBanner,
  setHint,
  setNextEnabled,
  setPrevEnabled,
  setStatusChip,
  setUndoEnabled,
  showWinBanner,
  updateHeader,
} from './ui/controls';
import { createHexBoard } from './ui/hexBoard';
import { closeLevelPicker, openLevelPicker } from './ui/levelPicker';

export class HexClearApp {
  private state: GameState | null = null;
  private levelDef: LevelDef | null = null;
  private levelIds: number[] = [];
  private progress = loadProgress();
  private loading = false;
  private busy = false;
  private undoSnapshot: MoveSnapshot | null = null;
  private board = createHexBoard(
    document.getElementById('board-host')!,
    (tileId) => void this.handleTileTap(tileId),
  );

  async init(): Promise<void> {
    bindControls({
      onRestart: () => this.handleRestart(),
      onNext: () => void this.goToLevel(this.getCurrentLevelId() + 1),
      onPrev: () => void this.goToLevel(this.getCurrentLevelId() - 1),
      onUndo: () => this.handleUndo(),
      onLevels: () => this.openLevels(),
    });

    document.addEventListener('keydown', (event) => this.handleKeydown(event));
    document.getElementById('level-meta')?.addEventListener('click', () => this.openLevels());

    this.levelIds = await fetchLevelIndex();

    const resumeLevel = findResumeLevel(this.levelIds, this.progress.highestUnlocked);
    const startLevel = resumeLevel ?? this.progress.currentLevel;
    if (resumeLevel !== null) {
      this.progress = { ...this.progress, currentLevel: resumeLevel };
      saveProgress(this.progress);
    }

    await this.loadLevel(startLevel);
    this.updateContinueBanner(resumeLevel);
  }

  private getCurrentLevelId(): number {
    return this.state?.levelId ?? this.progress.currentLevel;
  }

  private async loadLevel(levelId: number): Promise<void> {
    if (!this.levelIds.includes(levelId)) return;

    this.loading = true;
    this.undoSnapshot = null;
    setUndoEnabled(false);
    showWinBanner(false);

    try {
      this.levelDef = await fetchLevel(levelId);
      const session = loadSession(levelId);
      if (session && session.status === 'playing' && session.tiles.length > 0) {
        this.state = {
          levelId: this.levelDef.id,
          levelName: this.levelDef.name,
          status: session.status,
          cells: session.cells,
          walls: session.walls,
          tiles: session.tiles,
        };
      } else {
        this.state = createGameState(this.levelDef);
      }

      this.progress = { ...this.progress, currentLevel: levelId };
      saveProgress(this.progress);

      this.board.render(this.state);
      this.syncChrome();
      setHint('Tap a hex to slide it off the board.');
    } finally {
      this.loading = false;
    }
  }

  private syncChrome(): void {
    if (!this.state) return;

    const levelId = this.state.levelId;
    updateHeader(this.state.levelName, levelId, this.levelIds.length);
    setPrevEnabled(levelId > 1);
    setNextEnabled(levelId < this.levelIds.length && levelId < this.progress.highestUnlocked);
    setStatusChip(statusLabel(this.state), isWin(this.state) ? 'won' : 'playing');
    showWinBanner(isWin(this.state));
  }

  private updateContinueBanner(resumeLevel: number | null): void {
    if (resumeLevel === null || resumeLevel === this.getCurrentLevelId()) {
      setContinueBanner(null);
      return;
    }
    setContinueBanner(`Continue level ${resumeLevel}? Open Levels to jump back.`);
  }

  private persistSession(): void {
    if (!this.state) return;
    if (isWin(this.state)) {
      clearSession(this.state.levelId);
      return;
    }
    saveSession(this.state.levelId, this.state);
  }

  private async handleTileTap(tileId: TileId): Promise<void> {
    if (!this.state || this.loading || this.busy || isWin(this.state)) return;

    const result = canSlideTile(this.state, tileId);
    if (!result.ok) {
      this.board.flashBlocked(tileId);
      setHint('That hex is blocked — clear the path first.');
      return;
    }

    this.busy = true;
    this.undoSnapshot = captureSnapshot(this.state);
    setUndoEnabled(true);

    await this.board.animateSlide(this.state, tileId, result.path);
    this.state = applySlide(this.state, tileId);
    this.board.render(this.state);
    this.persistSession();
    this.syncChrome();

    const remaining = tilesRemaining(this.state);
    if (isWin(this.state)) {
      setHint('Board cleared!');
      this.progress = unlockNextLevel(this.progress, this.state.levelId);
      saveProgress(this.progress);
      setNextEnabled(this.state.levelId < this.levelIds.length);
    } else {
      setHint(`${remaining} hex${remaining === 1 ? '' : 'es'} left.`);
    }

    this.busy = false;
  }

  private handleRestart(): void {
    if (!this.levelDef || this.busy) return;
    this.undoSnapshot = null;
    setUndoEnabled(false);
    this.state = resetGameState(this.levelDef);
    clearSession(this.state.levelId);
    this.board.render(this.state);
    this.syncChrome();
    setHint('Tap a hex to slide it off the board.');
    showWinBanner(false);
  }

  private handleUndo(): void {
    if (!this.undoSnapshot || this.busy) return;
    this.state = applySnapshot(this.undoSnapshot);
    this.undoSnapshot = null;
    setUndoEnabled(false);
    this.board.render(this.state);
    this.persistSession();
    this.syncChrome();
    setHint('Tap a hex to slide it off the board.');
    showWinBanner(false);
  }

  private async goToLevel(levelId: number): Promise<void> {
    if (this.busy || !this.levelIds.includes(levelId)) return;
    if (levelId > this.progress.highestUnlocked) return;
    closeLevelPicker();
    await this.loadLevel(levelId);
    setContinueBanner(null);
  }

  private openLevels(): void {
    openLevelPicker({
      levelIds: this.levelIds,
      currentLevel: this.getCurrentLevelId(),
      highestUnlocked: this.progress.highestUnlocked,
      completedLevelIds: getCompletedLevelIds(this.progress),
      inProgressLevelIds: new Set(
        findInProgressLevelIds(this.levelIds, this.progress.highestUnlocked),
      ),
      onSelect: (levelId) => void this.goToLevel(levelId),
      onClose: () => closeLevelPicker(),
    });
  }

  private handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'z' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      this.handleUndo();
    }
  }
}

export async function bootstrap(): Promise<void> {
  const app = new HexClearApp();
  await app.init();
}
