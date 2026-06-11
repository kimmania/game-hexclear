import {
  applySlide,
  canSlideTile,
  createGameState,
  hintForBlockReason,
  isWin,
  recordMove,
  resetGameState,
  statusLabel,
  tilesRemaining,
} from './core/board';
import { fetchLevel, fetchLevelIndex, fetchAllLevelPars } from './core/levels';
import { cloneForUndo, findHintMove } from './core/solver';
import type { GameState, LevelDef, TileId } from './core/types';
import { configureAudio, playSound, primeAudio } from './game/audio';
import { pulseHaptic } from './game/haptics';
import { createKeyboardControls } from './game/keyboard';
import { loadSettings, saveSettings, type GameSettings } from './game/settings';
import { clearAllUserData } from './game/userData';
import {
  clearSession,
  computeCompletionSummary,
  findInProgressLevelIds,
  findResumeLevel,
  formatCompletionSummary,
  getCompletedLevelIds,
  getBestMoves,
  isNewBestMove,
  loadProgress,
  loadSession,
  recordBestMoves,
  saveProgress,
  saveSession,
  unlockNextLevel,
} from './game/storage';
import { applyBoardZoom, applySettingsClasses } from './ui/accessibility';
import {
  bindControls,
  setContinueBanner,
  setHint,
  setHintEnabled,
  setMoveCounter,
  setNextEnabled,
  setPrevEnabled,
  setStatusChip,
  setUndoEnabled,
  setUndoVisible,
  showWinPanel,
  updateHeader,
} from './ui/controls';
import { createHexBoard } from './ui/hexBoard';
import { closeLevelPicker, openLevelPicker } from './ui/levelPicker';
import { closeSettingsPanel, openSettingsPanel } from './ui/settingsPanel';

export class HexClearApp {
  private state: GameState | null = null;
  private levelDef: LevelDef | null = null;
  private levelIds: number[] = [];
  private levelPars = new Map<number, number | undefined>();
  private progress = loadProgress();
  private settings = loadSettings();
  private loading = false;
  private busy = false;
  /** Best move count for the current level before the latest win, if any. */
  private previousBestOnWin: number | undefined;
  /** Snapshot for single-step undo when enabled. */
  private undoSnapshot: GameState | null = null;
  private board = createHexBoard(
    document.getElementById('board-host')!,
    (tileId) => void this.handleTileTap(tileId),
  );
  private keyboardControls = createKeyboardControls(this.board, {
    onSlideFocused: () => this.board.slideFocusedTile(),
    onHint: () => this.handleHint(),
    onUndo: () => this.handleUndo(),
    onRestart: () => this.handleRestart(),
    isModalOpen: () =>
      document.getElementById('settings-panel') !== null ||
      document.getElementById('level-picker') !== null,
    isBusy: () => this.busy || this.loading,
    canUndo: () =>
      this.settings.undo &&
      this.undoSnapshot !== null &&
      !this.busy &&
      !this.loading &&
      this.state !== null &&
      !isWin(this.state),
  });

  async init(): Promise<void> {
    configureAudio(this.settings);
    applySettingsClasses(this.settings);
    setUndoVisible(this.settings.undo);
    this.keyboardControls.bind();

    bindControls({
      onRestart: () => this.handleRestart(),
      onNext: () => void this.goToLevel(this.getCurrentLevelId() + 1),
      onPrev: () => void this.goToLevel(this.getCurrentLevelId() - 1),
      onLevels: () => this.openLevels(),
      onSettings: () => this.openSettings(),
      onHint: () => this.handleHint(),
      onUndo: () => this.handleUndo(),
      onReplayPar: () => this.handleReplayForPar(),
    });

    document.getElementById('level-meta')?.addEventListener('click', () => this.openLevels());
    document.body.addEventListener('pointerdown', () => primeAudio(), { once: true });

    this.levelIds = await fetchLevelIndex();
    this.levelPars = await fetchAllLevelPars(this.levelIds);

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

  private renderBoard(): void {
    if (!this.state) return;
    this.board.render(this.state, { colorblindMode: this.settings.colorblindMode });
    applyBoardZoom(this.state.cells.length, this.settings.boardZoom);
  }

  private async loadLevel(levelId: number): Promise<void> {
    if (!this.levelIds.includes(levelId)) return;

    this.loading = true;
    showWinPanel(false);
    this.undoSnapshot = null;
    this.board.highlightTile(null);

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
          holes: session.holes ?? this.levelDef.holes ?? [],
          tiles: session.tiles,
          moveCount: session.moveCount ?? 0,
          ...(session.par !== undefined
            ? { par: session.par }
            : this.levelDef.par !== undefined
              ? { par: this.levelDef.par }
              : {}),
        };
      } else {
        this.state = createGameState(this.levelDef);
      }

      this.progress = { ...this.progress, currentLevel: levelId };
      saveProgress(this.progress);

      this.renderBoard();
      this.syncChrome();
      setHint('Tap a hex to slide. Arrows move focus, Enter slides, H for hint.');
    } finally {
      this.loading = false;
    }
  }

  private syncChrome(): void {
    if (!this.state) return;

    const levelId = this.state.levelId;
    const won = isWin(this.state);
    const showReplayPar =
      won && this.state.par !== undefined && this.state.moveCount > this.state.par;

    updateHeader(this.state.levelName, levelId, this.levelIds.length);
    setPrevEnabled(levelId > 1);
    setNextEnabled(levelId < this.levelIds.length && levelId < this.progress.highestUnlocked);
    setStatusChip(statusLabel(this.state), won ? 'won' : 'playing');
    setMoveCounter(this.state.moveCount, this.state.par);
    showWinPanel(won, this.winMessage(this.state, this.previousBestOnWin), showReplayPar);
    setHintEnabled(!won && !this.busy && !this.loading);
    setUndoVisible(this.settings.undo);
    setUndoEnabled(
      this.settings.undo && !won && !this.busy && !this.loading && this.undoSnapshot !== null,
    );
  }

  private winMessage(state: GameState, previousBest?: number): string {
    const moves = state.moveCount;
    const par = state.par;
    const newBest = isNewBestMove(previousBest, moves);

    if (par === undefined) {
      return `Level cleared in ${moves} move${moves === 1 ? '' : 's'}!`;
    }

    const parText =
      moves <= par
        ? `Par ${par} — nice!`
        : `${moves - par} over par ${par}`;

    if (newBest) {
      return `Cleared in ${moves} moves. ${parText} New best!`;
    }

    return `Cleared in ${moves} moves. ${parText}`;
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

  private pushUndoSnapshot(): void {
    if (!this.settings.undo || !this.state || isWin(this.state)) return;
    this.undoSnapshot = cloneForUndo(this.state);
  }

  private async handleTileTap(tileId: TileId): Promise<void> {
    if (!this.state || this.loading || this.busy || isWin(this.state)) return;

    this.pushUndoSnapshot();
    this.board.highlightTile(null);

    playSound('tap');
    pulseHaptic(4);

    const result = canSlideTile(this.state, tileId);
    if (!result.ok) {
      this.state = recordMove(this.state);
      this.persistSession();
      this.syncChrome();
      this.board.flashBlocked(tileId);
      playSound('blocked');
      pulseHaptic([12, 40, 12]);
      setHint(hintForBlockReason(result.reason));
      return;
    }

    this.busy = true;
    setHintEnabled(false);
    setUndoEnabled(false);

    await this.board.animateSlide(this.state, tileId, result.path);
    this.state = applySlide(this.state, tileId);
    this.renderBoard();
    this.persistSession();

    if (isWin(this.state)) {
      this.previousBestOnWin = getBestMoves(this.progress, this.state.levelId);
      this.progress = unlockNextLevel(this.progress, this.state.levelId);
      this.progress = recordBestMoves(this.progress, this.state.levelId, this.state.moveCount);
      saveProgress(this.progress);
      this.undoSnapshot = null;
    } else {
      this.previousBestOnWin = undefined;
    }

    this.syncChrome();

    playSound('slide');
    pulseHaptic(6);

    const remaining = tilesRemaining(this.state);
    if (isWin(this.state)) {
      setHint('Board cleared!');
      playSound('win');
      pulseHaptic([10, 30, 10, 30, 20]);
      setNextEnabled(this.state.levelId < this.levelIds.length);
    } else {
      setHint(`${remaining} hex${remaining === 1 ? '' : 'es'} left.`);
    }

    this.busy = false;
    this.syncChrome();
  }

  private handleHint(): void {
    if (!this.state || this.loading || this.busy || isWin(this.state)) return;

    const tileId = findHintMove(this.state);
    if (!tileId) {
      this.board.highlightTile(null);
      setHint('No legal moves right now.');
      return;
    }

    this.board.highlightTile(tileId);
    this.board.focusTile(tileId);
    setHint('Highlighted hex can slide.');
    playSound('tap');
    pulseHaptic(3);
  }

  private handleUndo(): void {
    if (
      !this.settings.undo ||
      !this.undoSnapshot ||
      !this.state ||
      this.busy ||
      this.loading ||
      isWin(this.state)
    ) {
      return;
    }

    this.state = cloneForUndo(this.undoSnapshot);
    this.undoSnapshot = null;
    this.board.highlightTile(null);
    this.renderBoard();
    this.persistSession();
    this.syncChrome();
    setHint('Undid last move.');
    playSound('tap');
    pulseHaptic(3);
  }

  private handleReplayForPar(): void {
    if (!this.levelDef || this.busy) return;

    this.state = resetGameState(this.levelDef);
    clearSession(this.state.levelId);
    this.undoSnapshot = null;
    this.previousBestOnWin = undefined;
    this.board.highlightTile(null);
    showWinPanel(false);
    this.renderBoard();
    this.syncChrome();
    setHint('Tap a hex to slide. Arrows move focus, Enter slides, H for hint.');
  }

  private handleRestart(): void {
    if (!this.levelDef || this.busy) return;
    this.state = resetGameState(this.levelDef);
    clearSession(this.state.levelId);
    this.undoSnapshot = null;
    this.previousBestOnWin = undefined;
    this.board.highlightTile(null);
    this.renderBoard();
    this.syncChrome();
    setHint('Tap a hex to slide. Arrows move focus, Enter slides, H for hint.');
    showWinPanel(false);
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
      progress: this.progress,
      levelPars: this.levelPars,
      completionSummary: formatCompletionSummary(
        computeCompletionSummary(this.progress, this.levelIds, this.levelPars),
      ),
      onSelect: (levelId) => void this.goToLevel(levelId),
      onClose: () => closeLevelPicker(),
    });
  }

  private openSettings(): void {
    openSettingsPanel({
      settings: this.settings,
      onChange: (settings) => this.applySettings(settings),
      onResetData: () => this.handleResetData(),
      onClose: () => closeSettingsPanel(),
    });
  }

  private handleResetData(): void {
    if (
      !window.confirm(
        'Reset all progress, scores, and settings? This cannot be undone.',
      )
    ) {
      return;
    }

    clearAllUserData();
    closeSettingsPanel();
    closeLevelPicker();

    this.progress = loadProgress();
    this.settings = loadSettings();
    this.previousBestOnWin = undefined;
    this.undoSnapshot = null;
    configureAudio(this.settings);
    applySettingsClasses(this.settings);
    setUndoVisible(this.settings.undo);
    setContinueBanner(null);
    showWinPanel(false);

    void this.loadLevel(1);
  }

  private applySettings(settings: GameSettings): void {
    if (!settings.undo) {
      this.undoSnapshot = null;
    }
    this.settings = settings;
    saveSettings(settings);
    configureAudio(settings);
    applySettingsClasses(settings);
    setUndoVisible(settings.undo);
    this.renderBoard();
    this.syncChrome();
  }
}

export async function bootstrap(): Promise<void> {
  const app = new HexClearApp();
  await app.init();
}
