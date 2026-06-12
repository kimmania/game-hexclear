import type { LevelChapter } from '../core/levels';
import { formatLevelScore, getBestMoves, metPar, type SavedProgress } from '../game/storage';

export type LevelCellStatus = 'locked' | 'current' | 'completed' | 'progress' | 'open';

export type LevelPickerOptions = {
  levelIds: number[];
  chapters: LevelChapter[];
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

function buildLevelCell(id: number, options: LevelPickerOptions): HTMLButtonElement {
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
  return btn;
}

function buildLevelGrid(
  levelIds: number[],
  ariaLabel: string,
  options: LevelPickerOptions,
): HTMLDivElement {
  const grid = document.createElement('div');
  grid.className = 'level-grid';
  grid.setAttribute('role', 'listbox');
  grid.setAttribute('aria-label', ariaLabel);
  for (const id of levelIds) {
    grid.appendChild(buildLevelCell(id, options));
  }
  return grid;
}

function buildChapterSection(
  chapter: LevelChapter,
  index: number,
  options: LevelPickerOptions,
): HTMLElement {
  const known = new Set(options.levelIds);
  const ids = chapter.levelIds.filter((id) => known.has(id));
  const cleared = ids.filter((id) => options.completedLevelIds.has(id)).length;
  const stars = ids.filter((id) =>
    metPar(getBestMoves(options.progress, id), options.levelPars.get(id)),
  ).length;
  const expanded = ids.includes(options.currentLevel);

  const section = document.createElement('section');
  section.className = 'level-chapter';
  if (expanded) section.classList.add('level-chapter-open');

  const gridId = `level-chapter-grid-${index}`;
  const grid = buildLevelGrid(ids, chapter.name, options);
  grid.id = gridId;
  grid.hidden = !expanded;

  const header = document.createElement('button');
  header.type = 'button';
  header.className = 'level-chapter-header';
  header.setAttribute('aria-expanded', String(expanded));
  header.setAttribute('aria-controls', gridId);

  const chevron = document.createElement('span');
  chevron.className = 'level-chapter-chevron';
  chevron.setAttribute('aria-hidden', 'true');
  chevron.textContent = '▸';

  const name = document.createElement('span');
  name.className = 'level-chapter-name';
  name.textContent = chapter.name;

  const progress = document.createElement('span');
  progress.className = 'level-chapter-progress';
  progress.textContent = stars > 0 ? `${cleared}/${ids.length} · ★${stars}` : `${cleared}/${ids.length}`;
  progress.setAttribute(
    'aria-label',
    `${cleared} of ${ids.length} cleared${stars > 0 ? `, ${stars} at par` : ''}`,
  );

  header.append(chevron, name, progress);
  header.addEventListener('click', () => {
    const isOpen = header.getAttribute('aria-expanded') === 'true';
    header.setAttribute('aria-expanded', String(!isOpen));
    grid.hidden = isOpen;
    section.classList.toggle('level-chapter-open', !isOpen);
  });

  section.append(header, grid);
  return section;
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
  panel.className = 'modal-panel modal-panel-levels';

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

  let levelsRoot: HTMLElement;
  if (options.chapters.length <= 1) {
    levelsRoot = buildLevelGrid(options.levelIds, 'Levels', options);
  } else {
    levelsRoot = document.createElement('div');
    levelsRoot.className = 'level-chapters';
    options.chapters.forEach((chapter, index) => {
      levelsRoot.appendChild(buildChapterSection(chapter, index, options));
    });
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

  panel.append(title, summary, legend, levelsRoot, importBtn, closeBtn);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  closeBtn.focus({ preventScroll: true });

  const current = panel.querySelector<HTMLElement>('.level-cell-current');
  current?.scrollIntoView({ block: 'center' });
}

export function closeLevelPicker(): void {
  document.getElementById('level-picker')?.remove();
}
