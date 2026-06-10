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
import { fetchLevel, fetchLevelIndex } from './core/levels';
import type { GameState, LevelDef, TileId } from './core/types';
import { configureAudio, playSound, primeAudio } from './game/audio';
import { pulseHaptic } from './game/haptics';
import { loadSettings, saveSettings, type GameSettings } from './game/settings';
import {
  clearSession,
  findInProgressLevelIds,
  findResumeLevel,
  getCompletedLevelIds,
  getBestMoves,
  loadProgress,
  loadSession,
  recordBestMoves,
  saveProgress,
  saveSession,
  unlockNextLevel,
} from './game/storage';
import {
  bindControls,
  setContinueBanner,
  setHint,
  setMoveCounter,
  setNextEnabled,
  setPrevEnabled,
  setStatusChip,
  showWinBanner,
  updateHeader,
} from './ui/controls';
import { createHexBoard } from './ui/hexBoard';
import { closeLevelPicker, openLevelPicker } from './ui/levelPicker';
import { applyMotionClass, closeSettingsPanel, openSettingsPanel } from './ui/settingsPanel';

export class HexClearApp {
  private state: GameState | null = null;
  private levelDef: LevelDef | null = null;
  private levelIds: number[] = [];
  private progress = loadProgress();
  private settings = loadSettings();
  private loading = false;
  private busy = false;
  private board = createHexBoard(
    document.getElementById('board-host')!,
    (tileId) => void this.handleTileTap(tileId),
  );

  async init(): Promise<void> {
    configureAudio(this.settings);
    applyMotionClass(this.settings.reducedMotion);

    bindControls({
      onRestart: () => this.handleRestart(),
      onNext: () => void this.goToLevel(this.getCurrentLevelId() + 1),
      onPrev: () => void this.goToLevel(this.getCurrentLevelId() - 1),
      onLevels: () => this.openLevels(),
      onSettings: () => this.openSettings(),
    });

    document.getElementById('level-meta')?.addEventListener('click', () => this.openLevels());
    document.body.addEventListener('pointerdown', () => primeAudio(), { once: true });

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
    setMoveCounter(this.state.moveCount, this.state.par);
    showWinBanner(isWin(this.state), this.winMessage(this.state));
  }

  private winMessage(state: GameState): string {
    const moves = state.moveCount;
    const par = state.par;
    const best = getBestMoves(this.progress, state.levelId);

    if (par === undefined) {
      return `Level cleared in ${moves} move${moves === 1 ? '' : 's'}!`;
    }

    const parText =
      moves <= par
        ? `Par ${par} — nice!`
        : `${moves - par} over par ${par}`;

    if (best !== undefined && moves <= best) {
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

  private async handleTileTap(tileId: TileId): Promise<void> {
    if (!this.state || this.loading || this.busy || isWin(this.state)) return;

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

    await this.board.animateSlide(this.state, tileId, result.path);
    this.state = applySlide(this.state, tileId);
    this.board.render(this.state);
    this.persistSession();

    if (isWin(this.state)) {
      this.progress = unlockNextLevel(this.progress, this.state.levelId);
      this.progress = recordBestMoves(this.progress, this.state.levelId, this.state.moveCount);
      saveProgress(this.progress);
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
  }

  private handleRestart(): void {
    if (!this.levelDef || this.busy) return;
    this.state = resetGameState(this.levelDef);
    clearSession(this.state.levelId);
    this.board.render(this.state);
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

  private openSettings(): void {
    openSettingsPanel({
      settings: this.settings,
      onChange: (settings) => this.applySettings(settings),
      onClose: () => closeSettingsPanel(),
    });
  }

  private applySettings(settings: GameSettings): void {
    this.settings = settings;
    saveSettings(settings);
    configureAudio(settings);
    applyMotionClass(settings.reducedMotion);
  }
}

export async function bootstrap(): Promise<void> {
  const app = new HexClearApp();
  await app.init();
}
