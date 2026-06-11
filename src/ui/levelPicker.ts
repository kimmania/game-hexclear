import { formatLevelScore, getBestMoves, metPar, type SavedProgress } from '../game/storage';

export type LevelCellStatus = 'locked' | 'current' | 'completed' | 'progress' | 'open';

export type LevelPickerOptions = {
  levelIds: number[];
  currentLevel: number;
  highestUnlocked: number;
  completedLevelIds: Set<number>;
  inProgressLevelIds: Set<number>;
  progress: SavedProgress;
  levelPars: Map<number, number | undefined>;
  completionSummary: string;
  onSelect: (levelId: number) => void;
  onImport: () => void;
  onClose: () => void;
};

export function resolveLevelCellStatus(
  levelId: number,
  options: Pick<
    LevelPickerOptions,
    'currentLevel' | 'highestUnlocked' | 'completedLevelIds' | 'inProgressLevelIds'
  >,
): LevelCellStatus {
  if (levelId > options.highestUnlocked) return 'locked';
  if (levelId === options.currentLevel) return 'current';
  if (options.completedLevelIds.has(levelId)) return 'completed';
  if (options.inProgressLevelIds.has(levelId)) return 'progress';
  return 'open';
}

function statusLabel(
  status: LevelCellStatus,
  levelId: number,
  bestMoves: number | undefined,
  par: number | undefined,
): string {
  const score = formatLevelScore(bestMoves, par);
  const parMedal = metPar(bestMoves, par);
  const scoreText = score ? `, ${score}${parMedal ? ', at par' : ''}` : '';

  switch (status) {
    case 'locked':
      return `Level ${levelId}, locked`;
    case 'current':
      return `Level ${levelId}, current${scoreText}`;
    case 'completed':
      return `Level ${levelId}, completed${scoreText}`;
    case 'progress':
      return `Level ${levelId}, in progress`;
    default:
      return `Level ${levelId}${scoreText}`;
  }
}

function statusMark(status: LevelCellStatus): string {
  switch (status) {
    case 'completed':
      return '✓';
    case 'progress':
      return '•';
    case 'locked':
      return '🔒';
    default:
      return '';
  }
}

export function openLevelPicker(options: LevelPickerOptions): void {
  const existing = document.getElementById('level-picker');
  existing?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'level-picker';
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'level-picker-title');

  const panel = document.createElement('div');
  panel.className = 'modal-panel';

  const title = document.createElement('h2');
  title.id = 'level-picker-title';
  title.className = 'modal-title';
  title.textContent = 'Choose level';

  const summary = document.createElement('p');
  summary.className = 'level-summary';
  summary.textContent = options.completionSummary;

  const legend = document.createElement('p');
  legend.className = 'level-legend';
  legend.textContent = '✓ cleared · ★ at par · • in progress · outline = current';

  const grid = document.createElement('div');
  grid.className = 'level-grid';
  grid.setAttribute('role', 'listbox');
  grid.setAttribute('aria-label', 'Levels');

  for (const id of options.levelIds) {
    const status = resolveLevelCellStatus(id, options);
    const locked = status === 'locked';
    const par = options.levelPars.get(id);
    const bestMoves = getBestMoves(options.progress, id);
    const scoreText = formatLevelScore(bestMoves, par);
    const showParMedal = metPar(bestMoves, par);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `level-cell level-cell-${status}`;
    btn.setAttribute('role', 'option');
    btn.dataset.levelId = String(id);
    btn.setAttribute('aria-label', statusLabel(status, id, bestMoves, par));
    if (locked) btn.disabled = true;

    const mark = document.createElement('span');
    mark.className = 'level-cell-mark';
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = statusMark(status);

    const num = document.createElement('span');
    num.className = 'level-cell-num';
    num.textContent = String(id);

    btn.append(mark, num);

    if (scoreText) {
      const score = document.createElement('span');
      score.className = 'level-cell-score';
      score.textContent = scoreText;
      btn.appendChild(score);
    }

    if (showParMedal) {
      const medal = document.createElement('span');
      medal.className = 'level-cell-par-medal';
      medal.setAttribute('aria-hidden', 'true');
      medal.textContent = '★';
      btn.appendChild(medal);
    }

    btn.addEventListener('click', () => {
      if (!btn.disabled) {
        options.onSelect(id);
        options.onClose();
      }
    });
    grid.appendChild(btn);
  }

  const importBtn = document.createElement('button');
  importBtn.type = 'button';
  importBtn.className = 'btn';
  importBtn.textContent = 'Import from clipboard';
  importBtn.addEventListener('click', () => {
    options.onImport();
  });

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'btn modal-close';
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', options.onClose);

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) options.onClose();
  });

  panel.append(title, summary, legend, grid, importBtn, closeBtn);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  closeBtn.focus();
}

export function closeLevelPicker(): void {
  document.getElementById('level-picker')?.remove();
}
