export function bindControls(handlers: {
  onRestart: () => void;
  onNext: () => void;
  onPrev: () => void;
  onLevels: () => void;
  onSettings: () => void;
  onHint: () => void;
  onUndo: () => void;
  onReplayPar: () => void;
}): void {
  document.getElementById('restart')?.addEventListener('click', handlers.onRestart);
  document.getElementById('next-level')?.addEventListener('click', handlers.onNext);
  document.getElementById('prev-level')?.addEventListener('click', handlers.onPrev);
  document.getElementById('levels-btn')?.addEventListener('click', handlers.onLevels);
  document.getElementById('settings-btn')?.addEventListener('click', handlers.onSettings);
  document.getElementById('hint-btn')?.addEventListener('click', handlers.onHint);
  document.getElementById('undo-btn')?.addEventListener('click', handlers.onUndo);
  document.getElementById('replay-par')?.addEventListener('click', handlers.onReplayPar);
}

export function updateHeader(levelName: string, levelId: number, total: number): void {
  const title = document.getElementById('level-title');
  const meta = document.getElementById('level-meta');
  if (title) title.textContent = levelName;
  if (meta) {
    meta.textContent = `Level ${levelId} of ${total}`;
    meta.setAttribute('title', 'Open level list');
  }
}

export function showWinPanel(
  show: boolean,
  message = 'Level cleared!',
  showReplayPar = false,
): void {
  const panel = document.getElementById('win-panel');
  const banner = document.getElementById('win-banner');
  const replayBtn = document.getElementById('replay-par');
  if (panel) panel.classList.toggle('hidden', !show);
  if (banner) banner.textContent = message;
  if (replayBtn) replayBtn.classList.toggle('hidden', !show || !showReplayPar);
}

export function setMoveCounter(moves: number, par?: number): void {
  const el = document.getElementById('move-counter');
  if (!el) return;
  if (par !== undefined) {
    el.textContent = `Moves: ${moves} · Par ${par}`;
  } else {
    el.textContent = `Moves: ${moves}`;
  }
}

export function setNextEnabled(enabled: boolean): void {
  const btn = document.getElementById('next-level') as HTMLButtonElement | null;
  if (btn) btn.disabled = !enabled;
}

export function setPrevEnabled(enabled: boolean): void {
  const btn = document.getElementById('prev-level') as HTMLButtonElement | null;
  if (btn) btn.disabled = !enabled;
}

export function setHintEnabled(enabled: boolean): void {
  const btn = document.getElementById('hint-btn') as HTMLButtonElement | null;
  if (btn) btn.disabled = !enabled;
}

export function setUndoVisible(visible: boolean): void {
  const btn = document.getElementById('undo-btn');
  if (btn) btn.classList.toggle('hidden', !visible);
}

export function setUndoEnabled(enabled: boolean): void {
  const btn = document.getElementById('undo-btn') as HTMLButtonElement | null;
  if (btn) btn.disabled = !enabled;
}

export function setStatusChip(text: string, variant: 'playing' | 'won'): void {
  const chip = document.getElementById('status-chip');
  if (!chip) return;
  chip.textContent = text;
  chip.dataset.variant = variant;
}

export function setHint(text: string): void {
  const hint = document.getElementById('hint');
  if (hint) hint.textContent = text;
}

export function setContinueBanner(text: string | null): void {
  const banner = document.getElementById('continue-banner');
  if (!banner) return;
  if (!text) {
    banner.classList.add('hidden');
    banner.textContent = '';
    return;
  }
  banner.textContent = text;
  banner.classList.remove('hidden');
}

/** @deprecated Use showWinPanel */
export function showWinBanner(show: boolean, message = 'Level cleared!'): void {
  showWinPanel(show, message, false);
}
