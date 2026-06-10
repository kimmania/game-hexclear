import { fetchLevel } from '../core/levels';
import { gameBaseUrl } from './editMode';
import { createEditorBoard } from './editorBoard';
import { downloadLevelJson, prepareLevelExport } from './editorExport';
import {
  clearEditorDraft,
  loadEditorDraft,
  saveEditorDraft,
} from './editorStorage';
import type { TileColor } from '../core/types';
import {
  applyTool,
  createEmptyDraft,
  draftFromLevel,
  type EditorDraft,
  type EditorTool,
  TILE_COLOR_OPTIONS,
} from './editorState';

const TOOL_HINTS: Record<EditorTool, string> = {
  cell: 'Tap a faint hex to add a board cell. Ghost hexes show valid expansions.',
  tile: 'Tap a cell to place a tile. Tap again on the same cell to rotate its arrow.',
  wall: 'Tap a cell to toggle a wall (blocks slides).',
  hole: 'Tap a cell to toggle a pit (tiles fall in and are removed).',
  frozen: 'Tap a tile to toggle frozen (locked while neighbors remain).',
  erase: 'Tap a cell to remove it and anything on it.',
};

async function loadInitialDraft(): Promise<EditorDraft> {
  const levelParam = new URLSearchParams(window.location.search).get('level');
  if (levelParam) {
    const levelId = Number(levelParam);
    if (Number.isFinite(levelId) && levelId >= 1) {
      try {
        return draftFromLevel(await fetchLevel(levelId));
      } catch {
        /* fall through */
      }
    }
  }

  const saved = loadEditorDraft();
  if (saved) {
    const restore = window.confirm('Restore your last saved editor draft?');
    if (restore) return saved;
  }

  return createEmptyDraft();
}

export async function bootstrapEditor(): Promise<void> {
  const app = document.getElementById('app');
  if (!app) return;

  const draft = await loadInitialDraft();
  let tool: EditorTool = 'cell';
  let tileColor: TileColor = 'coral';
  let tileFrozen = false;
  let tileChain = 0;

  app.innerHTML = '';
  app.className = 'editor-app';

  const header = document.createElement('header');
  header.className = 'header';
  header.innerHTML = `
    <div>
      <h1 class="title">Level editor</h1>
      <a class="level-meta-btn" href="${gameBaseUrl()}">← Back to game</a>
    </div>
  `;

  const toolbar = document.createElement('div');
  toolbar.className = 'editor-toolbar';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', 'Editor tools');

  const tools: { id: EditorTool; label: string }[] = [
    { id: 'cell', label: 'Cell' },
    { id: 'tile', label: 'Tile' },
    { id: 'wall', label: 'Wall' },
    { id: 'hole', label: 'Hole' },
    { id: 'frozen', label: 'Frozen' },
    { id: 'erase', label: 'Erase' },
  ];

  const toolButtons = new Map<EditorTool, HTMLButtonElement>();
  for (const entry of tools) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn editor-tool-btn';
    btn.textContent = entry.label;
    btn.addEventListener('click', () => selectTool(entry.id));
    toolButtons.set(entry.id, btn);
    toolbar.appendChild(btn);
  }

  const optionsBar = document.createElement('div');
  optionsBar.className = 'editor-options-bar';

  const colorLabel = document.createElement('label');
  colorLabel.className = 'editor-color-label';
  colorLabel.textContent = 'Tile color';

  const colorSelect = document.createElement('select');
  colorSelect.className = 'editor-field editor-color-select';
  colorSelect.setAttribute('aria-label', 'Tile color');
  for (const color of TILE_COLOR_OPTIONS) {
    const option = document.createElement('option');
    option.value = color;
    option.textContent = color;
    colorSelect.appendChild(option);
  }
  colorSelect.value = tileColor;
  colorSelect.addEventListener('change', () => {
    tileColor = colorSelect.value as TileColor;
  });

  const frozenLabel = document.createElement('label');
  frozenLabel.className = 'editor-color-label';
  const frozenCheck = document.createElement('input');
  frozenCheck.type = 'checkbox';
  frozenCheck.addEventListener('change', () => {
    tileFrozen = frozenCheck.checked;
  });
  frozenLabel.append(frozenCheck, document.createTextNode(' Frozen'));

  const chainLabel = document.createElement('label');
  chainLabel.className = 'editor-color-label';
  chainLabel.textContent = 'Chain';
  const chainInput = document.createElement('input');
  chainInput.type = 'number';
  chainInput.min = '0';
  chainInput.max = '9';
  chainInput.value = '0';
  chainInput.className = 'editor-field editor-chain-input';
  chainInput.setAttribute('aria-label', 'Chain order for new tiles');
  chainInput.addEventListener('change', () => {
    tileChain = Math.max(0, Math.min(9, Math.floor(Number(chainInput.value)) || 0));
    chainInput.value = String(tileChain);
  });
  chainLabel.append(chainInput);

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'btn';
  clearBtn.textContent = 'Clear all';
  clearBtn.addEventListener('click', () => {
    if (!window.confirm('Clear the entire draft?')) return;
    draft.cells = [{ q: 0, r: 0 }];
    draft.tiles = [];
    draft.walls = [];
    draft.holes = [];
    render();
  });

  colorLabel.append(colorSelect);
  optionsBar.append(colorLabel, frozenLabel, chainLabel, clearBtn);

  const hint = document.createElement('p');
  hint.className = 'hint editor-hint';

  const boardHost = document.createElement('main');
  boardHost.className = 'game-area';
  const boardInner = document.createElement('div');
  boardInner.className = 'board-host';
  boardHost.appendChild(boardInner);

  const exportPanel = document.createElement('section');
  exportPanel.className = 'editor-export';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'editor-field';
  nameInput.placeholder = 'Level name';

  const idInput = document.createElement('input');
  idInput.type = 'number';
  idInput.min = '1';
  idInput.className = 'editor-field';
  idInput.value = String(draft.id);

  const statusEl = document.createElement('p');
  statusEl.className = 'editor-status';
  statusEl.setAttribute('role', 'status');

  const parInput = document.createElement('input');
  parInput.type = 'number';
  parInput.min = '0';
  parInput.className = 'editor-field';
  parInput.placeholder = 'Par (optional)';
  parInput.value = draft.par !== undefined ? String(draft.par) : '';

  const exportActions = document.createElement('div');
  exportActions.className = 'editor-export-actions';

  const saveDraftBtn = document.createElement('button');
  saveDraftBtn.type = 'button';
  saveDraftBtn.className = 'btn';
  saveDraftBtn.textContent = 'Save draft';

  const downloadBtn = document.createElement('button');
  downloadBtn.type = 'button';
  downloadBtn.className = 'btn btn-primary';
  downloadBtn.textContent = 'Download .json';

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'btn';
  copyBtn.textContent = 'Copy JSON';

  const clearDraftBtn = document.createElement('button');
  clearDraftBtn.type = 'button';
  clearDraftBtn.className = 'btn';
  clearDraftBtn.textContent = 'Clear draft';

  exportActions.append(saveDraftBtn, downloadBtn, copyBtn, clearDraftBtn);

  const jsonPreview = document.createElement('textarea');
  jsonPreview.className = 'editor-json';
  jsonPreview.readOnly = true;
  jsonPreview.rows = 8;
  jsonPreview.placeholder = 'Validated JSON appears here…';

  const shipHint = document.createElement('p');
  shipHint.className = 'editor-ship-hint';
  shipHint.textContent =
    'To ship: save to public/levels/{id}.json, add the id to index.json, run npm run validate-levels.';

  saveDraftBtn.addEventListener('click', handleSaveDraft);
  downloadBtn.addEventListener('click', handleDownload);
  copyBtn.addEventListener('click', () => void handleCopy());
  clearDraftBtn.addEventListener('click', handleClearDraft);

  nameInput.addEventListener('input', () => {
    draft.name = nameInput.value.trim() || 'New level';
  });

  idInput.addEventListener('change', () => {
    draft.id = Math.max(1, Math.floor(Number(idInput.value)) || 1);
  });

  parInput.addEventListener('change', () => {
    const value = Math.floor(Number(parInput.value));
    if (!Number.isFinite(value) || value < 1) {
      delete draft.par;
      parInput.value = '';
      return;
    }
    draft.par = value;
  });

  exportPanel.append(nameInput, idInput, parInput, exportActions, statusEl, jsonPreview, shipHint);
  app.append(header, toolbar, optionsBar, hint, boardHost, exportPanel);

  const board = createEditorBoard(boardInner, (coord) => {
    applyTool(draft, tool, coord, tileColor, {
      frozen: tileFrozen,
      chain: tileChain > 0 ? tileChain : undefined,
    });
    render();
  });

  function selectTool(next: EditorTool): void {
    tool = next;
    for (const [id, btn] of toolButtons) {
      btn.classList.toggle('editor-tool-active', id === tool);
    }
    hint.textContent = TOOL_HINTS[tool];
    colorSelect.disabled = tool !== 'tile';
    frozenCheck.disabled = tool !== 'tile';
    chainInput.disabled = tool !== 'tile';
    render();
  }

  function syncDraftMeta(): void {
    draft.name = nameInput.value.trim() || 'New level';
    draft.id = Math.max(1, Math.floor(Number(idInput.value)) || 1);
    const parValue = Math.floor(Number(parInput.value));
    if (Number.isFinite(parValue) && parValue >= 1) {
      draft.par = parValue;
    } else {
      delete draft.par;
    }
    nameInput.value = draft.name;
    idInput.value = String(draft.id);
    parInput.value = draft.par !== undefined ? String(draft.par) : '';
  }

  function render(): void {
    syncDraftMeta();
    board.render(draft, tool);
    saveEditorDraft(draft);
  }

  function handleSaveDraft(): void {
    syncDraftMeta();
    saveEditorDraft(draft);
    statusEl.textContent = 'Draft saved in this browser.';
  }

  function handleDownload(): void {
    syncDraftMeta();
    const result = prepareLevelExport(draft);
    if (!result.ok) {
      statusEl.textContent = result.message;
      jsonPreview.value = '';
      return;
    }
    jsonPreview.value = result.json;
    saveEditorDraft(draft);
    downloadLevelJson(result.level, result.json);
    statusEl.textContent = `Downloaded ${result.level.id}.json (solvable, ${result.statesExplored} states).`;
  }

  async function handleCopy(): Promise<void> {
    syncDraftMeta();
    const result = prepareLevelExport(draft);
    if (!result.ok) {
      statusEl.textContent = result.message;
      jsonPreview.value = '';
      return;
    }
    jsonPreview.value = result.json;
    saveEditorDraft(draft);
    try {
      await navigator.clipboard.writeText(result.json);
      statusEl.textContent = `JSON copied (${result.statesExplored} states explored).`;
    } catch {
      statusEl.textContent = `Solvable (${result.statesExplored} states). Copy from the box below.`;
    }
  }

  function handleClearDraft(): void {
    if (!window.confirm('Clear the saved editor draft from this browser?')) return;
    clearEditorDraft();
    statusEl.textContent = 'Saved draft cleared.';
  }

  nameInput.value = draft.name;
  idInput.value = String(draft.id);
  parInput.value = draft.par !== undefined ? String(draft.par) : '';
  selectTool('cell');
  render();
}
