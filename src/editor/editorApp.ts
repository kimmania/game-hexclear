import { fetchLevel } from '../core/levels';
import { gameBaseUrl } from './editMode';
import { createEditorBoard } from './editorBoard';
import { downloadLevelJson, prepareLevelExport, previewLevelExport } from './editorExport';
import { importDraftFromJson, readClipboardText } from './editorImport';
import { suggestParForDraft } from './editorPar';
import {
  populateDraft,
  validatePopulateParams,
  type PopulateParams,
} from './editorPopulate';
import {
  clearEditorDraft,
  loadEditorDraft,
  saveEditorDraft,
} from './editorStorage';
import {
  applyTool,
  createEmptyDraft,
  draftFromLevel,
  type EditorDraft,
  type EditorTool,
} from './editorState';
import { COLOR_BY_DIRECTION, DIRECTION_LABELS } from '../core/tileColors';
import type { HexDirection } from '../core/types';

const COLOR_LEGEND = (Object.entries(COLOR_BY_DIRECTION) as [string, string][])
  .map(([dir, color]) => `${DIRECTION_LABELS[Number(dir) as HexDirection]} → ${color}`)
  .join(' · ');

const TOOL_HINTS: Record<EditorTool, string> = {
  cell: 'Tap a faint hex to add a board cell. Ghost hexes show valid expansions.',
  tile: `Tap a cell to place a tile. Tap again to rotate arrow (color follows direction). ${COLOR_LEGEND}`,
  wall: 'Tap a cell to toggle a wall (blocks slides).',
  hole: 'Tap a cell to toggle a pit (tiles fall in and are removed).',
  frozen: 'Tap a tile to toggle frozen (locked while neighbors remain).',
  oneway: 'Tap a cell to add a one-way barrier; tap again to rotate, then remove.',
  rotator: 'Tap a cell to toggle a rotator (turns sliding tiles clockwise).',
  link: 'Tap one tile, then a second to link them as a sticky pair. Tap same tile to cancel.',
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
  let tileFrozen = false;
  let linkPendingId: string | null = null;

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
    { id: 'oneway', label: 'One-way' },
    { id: 'rotator', label: 'Rotator' },
    { id: 'link', label: 'Link' },
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

  const frozenLabel = document.createElement('label');
  frozenLabel.className = 'editor-color-label';
  const frozenCheck = document.createElement('input');
  frozenCheck.type = 'checkbox';
  frozenCheck.addEventListener('change', () => {
    tileFrozen = frozenCheck.checked;
  });
  frozenLabel.append(frozenCheck, document.createTextNode(' Frozen'));

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
    draft.oneWayWalls = [];
    draft.rotators = [];
    linkPendingId = null;
    render();
  });

  optionsBar.append(frozenLabel, clearBtn);

  const generatePanel = document.createElement('section');
  generatePanel.className = 'editor-generate';

  const generateTitle = document.createElement('h2');
  generateTitle.className = 'editor-generate-title';
  generateTitle.textContent = 'Generate board';

  const generateFields = document.createElement('div');
  generateFields.className = 'editor-generate-fields';

  const generateDefaults: PopulateParams = {
    cellCount: 7,
    tileCount: 4,
    wallCount: 0,
    holeCount: 0,
    frozenCount: 0,
  };

  const generateInputs: Record<keyof PopulateParams, HTMLInputElement> = {
    cellCount: document.createElement('input'),
    tileCount: document.createElement('input'),
    wallCount: document.createElement('input'),
    holeCount: document.createElement('input'),
    frozenCount: document.createElement('input'),
  };

  const generateLabels: Record<keyof PopulateParams, string> = {
    cellCount: 'Cells',
    tileCount: 'Tiles',
    wallCount: 'Walls',
    holeCount: 'Holes',
    frozenCount: 'Frozen',
  };

  for (const key of Object.keys(generateDefaults) as (keyof PopulateParams)[]) {
    const label = document.createElement('label');
    label.className = 'editor-generate-label';

    const input = generateInputs[key];
    input.type = 'number';
    input.min = key === 'cellCount' ? '1' : '0';
    input.className = 'editor-field';
    input.value = String(generateDefaults[key]);
    input.setAttribute('aria-label', generateLabels[key]);

    label.append(generateLabels[key], input);
    generateFields.appendChild(label);
  }

  const populateBtn = document.createElement('button');
  populateBtn.type = 'button';
  populateBtn.className = 'btn btn-primary editor-populate-btn';
  populateBtn.textContent = 'Populate board';

  populateBtn.addEventListener('click', () => {
    const params: PopulateParams = {
      cellCount: Math.floor(Number(generateInputs.cellCount.value)) || 0,
      tileCount: Math.floor(Number(generateInputs.tileCount.value)) || 0,
      wallCount: Math.floor(Number(generateInputs.wallCount.value)) || 0,
      holeCount: Math.floor(Number(generateInputs.holeCount.value)) || 0,
      frozenCount: Math.floor(Number(generateInputs.frozenCount.value)) || 0,
    };

    const check = validatePopulateParams(params);
    if (!check.ok) {
      statusEl.textContent = check.message;
      return;
    }

    const hasContent =
      draft.cells.length > 1 ||
      draft.tiles.length > 0 ||
      draft.walls.length > 0 ||
      draft.holes.length > 0;
    if (hasContent && !window.confirm('Replace the current board with a generated layout?')) {
      return;
    }

    const result = populateDraft(draft, params);
    if (!result.ok) {
      statusEl.textContent = result.message;
      return;
    }

    statusEl.textContent = `Generated ${params.cellCount} cells, ${params.tileCount} tiles. Edit as needed.`;
    render();
  });

  generatePanel.append(generateTitle, generateFields, populateBtn);

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

  const suggestParBtn = document.createElement('button');
  suggestParBtn.type = 'button';
  suggestParBtn.className = 'btn';
  suggestParBtn.textContent = 'Suggest par';

  const parRow = document.createElement('div');
  parRow.className = 'editor-par-row';
  parRow.append(parInput, suggestParBtn);

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

  const importBtn = document.createElement('button');
  importBtn.type = 'button';
  importBtn.className = 'btn';
  importBtn.textContent = 'Import JSON';

  const importPaste = document.createElement('textarea');
  importPaste.className = 'editor-json editor-import-paste hidden';
  importPaste.rows = 6;
  importPaste.placeholder = 'Paste level JSON here, then click Import JSON again…';

  const importApplyBtn = document.createElement('button');
  importApplyBtn.type = 'button';
  importApplyBtn.className = 'btn hidden editor-import-apply';
  importApplyBtn.textContent = 'Apply pasted JSON';

  exportActions.append(saveDraftBtn, downloadBtn, copyBtn, importBtn, clearDraftBtn);

  const jsonPreview = document.createElement('textarea');
  jsonPreview.className = 'editor-json';
  jsonPreview.readOnly = true;
  jsonPreview.rows = 8;
  jsonPreview.placeholder = 'Level JSON preview…';

  const previewStatusEl = document.createElement('p');
  previewStatusEl.className = 'editor-preview-status';
  previewStatusEl.setAttribute('role', 'status');

  const shipHint = document.createElement('p');
  shipHint.className = 'editor-ship-hint';
  shipHint.textContent =
    'To ship: save to public/levels/{id}.json, add the id to index.json, run npm run validate-levels.';

  saveDraftBtn.addEventListener('click', handleSaveDraft);
  downloadBtn.addEventListener('click', handleDownload);
  copyBtn.addEventListener('click', () => void handleCopy());
  importBtn.addEventListener('click', () => void handleImport());
  importApplyBtn.addEventListener('click', () => handleImportText(importPaste.value));
  clearDraftBtn.addEventListener('click', handleClearDraft);
  suggestParBtn.addEventListener('click', handleSuggestPar);

  nameInput.addEventListener('input', () => {
    draft.name = nameInput.value.trim() || 'New level';
    scheduleJsonPreview();
  });

  idInput.addEventListener('change', () => {
    draft.id = Math.max(1, Math.floor(Number(idInput.value)) || 1);
    scheduleJsonPreview();
  });

  parInput.addEventListener('change', () => {
    const value = Math.floor(Number(parInput.value));
    if (!Number.isFinite(value) || value < 1) {
      delete draft.par;
      parInput.value = '';
    } else {
      draft.par = value;
    }
    scheduleJsonPreview();
  });

  exportPanel.append(
    nameInput,
    idInput,
    parRow,
    exportActions,
    importPaste,
    importApplyBtn,
    statusEl,
    jsonPreview,
    previewStatusEl,
    shipHint,
  );
  app.append(header, toolbar, optionsBar, generatePanel, hint, boardHost, exportPanel);

  const board = createEditorBoard(boardInner, (coord) => {
    linkPendingId = applyTool(
      draft,
      tool,
      coord,
      { frozen: tileFrozen },
      linkPendingId,
    );
    render();
  });

  function selectTool(next: EditorTool): void {
    tool = next;
    if (next !== 'link') {
      linkPendingId = null;
    }
    for (const [id, btn] of toolButtons) {
      btn.classList.toggle('editor-tool-active', id === tool);
    }
    hint.textContent =
      tool === 'link' && linkPendingId
        ? `${TOOL_HINTS.link} Selected ${linkPendingId} — tap partner.`
        : TOOL_HINTS[tool];
    frozenCheck.disabled = tool !== 'tile';
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

  function refreshJsonPreview(): void {
    syncDraftMeta();
    const preview = previewLevelExport(draft);
    jsonPreview.value = preview.json;
    previewStatusEl.textContent = preview.message;
    previewStatusEl.dataset.variant = preview.solvable
      ? 'ok'
      : preview.valid
        ? 'warn'
        : 'error';
  }

  let previewTimer: number | null = null;

  function scheduleJsonPreview(): void {
    if (previewTimer !== null) {
      window.clearTimeout(previewTimer);
    }
    previewTimer = window.setTimeout(() => {
      previewTimer = null;
      refreshJsonPreview();
    }, 200);
  }

  function render(): void {
    syncDraftMeta();
    board.render(draft, tool);
    saveEditorDraft(draft);
    scheduleJsonPreview();
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
      refreshJsonPreview();
      return;
    }
    saveEditorDraft(draft);
    refreshJsonPreview();
    downloadLevelJson(result.level, result.json);
    statusEl.textContent = `Downloaded ${result.level.id}.json (solvable, ${result.statesExplored} states).`;
  }

  async function handleCopy(): Promise<void> {
    syncDraftMeta();
    const result = prepareLevelExport(draft);
    if (!result.ok) {
      statusEl.textContent = result.message;
      refreshJsonPreview();
      return;
    }
    saveEditorDraft(draft);
    refreshJsonPreview();
    try {
      await navigator.clipboard.writeText(result.json);
      statusEl.textContent = `JSON copied (${result.statesExplored} states explored).`;
    } catch {
      statusEl.textContent = `Solvable (${result.statesExplored} states). Copy from the box below.`;
    }
  }

  function replaceDraft(next: EditorDraft): void {
    draft.id = next.id;
    draft.name = next.name;
    draft.cells = next.cells.map((cell) => ({ ...cell }));
    draft.tiles = next.tiles.map((tile) => ({ ...tile }));
    draft.walls = next.walls.map((wall) => ({ ...wall }));
    draft.holes = next.holes.map((hole) => ({ ...hole }));
    if (next.par !== undefined) draft.par = next.par;
    else delete draft.par;
  }

  function handleImportText(text: string): void {
    const result = importDraftFromJson(text);
    if (!result.ok) {
      statusEl.textContent = result.message;
      return;
    }

    replaceDraft(result.draft);
    importPaste.classList.add('hidden');
    importApplyBtn.classList.add('hidden');
    importPaste.value = '';
    statusEl.textContent = `Imported “${result.draft.name}”.`;
    render();
  }

  async function handleImport(): Promise<void> {
    const fromClipboard = await readClipboardText();
    if (fromClipboard) {
      handleImportText(fromClipboard);
      return;
    }

    importPaste.classList.remove('hidden');
    importApplyBtn.classList.remove('hidden');
    statusEl.textContent = 'Paste JSON below, then click Apply pasted JSON.';
    importPaste.focus();
  }

  function handleSuggestPar(): void {
    syncDraftMeta();
    const result = suggestParForDraft(draft);
    if (!result.ok) {
      statusEl.textContent = result.message;
      refreshJsonPreview();
      return;
    }

    draft.par = result.par;
    parInput.value = String(result.par);
    statusEl.textContent = `Suggested par ${result.par} (${result.statesExplored} states explored).`;
    scheduleJsonPreview();
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
  refreshJsonPreview();
}
