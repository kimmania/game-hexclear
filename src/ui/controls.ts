export function bindControls(handlers: {
  onRestart: () => void;
  onNext: () => void;
  onPrev: () => void;
  onUndo: () => void;
  onLevels: () => void;
}): void {
  document.getElementById('restart')?.addEventListener('click', handlers.onRestart);
  document.getElementById('next-level')?.addEventListener('click', handlers.onNext);
  document.getElementById('prev-level')?.addEventListener('click', handlers.onPrev);
  document.getElementById('undo')?.addEventListener('click', handlers.onUndo);
  document.getElementById('levels-btn')?.addEventListener('click', handlers.onLevels);
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

export function showWinBanner(show: boolean): void {
  document.getElementById('win-banner')?.classList.toggle('hidden', !show);
}

export function setNextEnabled(enabled: boolean): void {
  const btn = document.getElementById('next-level') as HTMLButtonElement | null;
  if (btn) btn.disabled = !enabled;
}

export function setPrevEnabled(enabled: boolean): void {
  const btn = document.getElementById('prev-level') as HTMLButtonElement | null;
  if (btn) btn.disabled = !enabled;
}

export function setUndoEnabled(enabled: boolean): void {
  const btn = document.getElementById('undo') as HTMLButtonElement | null;
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
