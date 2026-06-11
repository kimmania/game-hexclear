import type { EditorDraft } from './editorState';
import { createEmptyDraft } from './editorState';

const DRAFT_KEY = 'hexclear-editor-draft';

export function saveEditorDraft(draft: EditorDraft): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* quota or private mode */
  }
}

export function loadEditorDraft(): EditorDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EditorDraft;
    if (
      typeof parsed.id !== 'number' ||
      typeof parsed.name !== 'string' ||
      !Array.isArray(parsed.cells) ||
      !Array.isArray(parsed.tiles) ||
      !Array.isArray(parsed.walls) ||
      !Array.isArray(parsed.holes)
    ) {
      return null;
    }
    return {
      id: parsed.id,
      name: parsed.name,
      cells: parsed.cells.map((cell) => ({ ...cell })),
      tiles: parsed.tiles.map((tile) => ({ ...tile })),
      walls: parsed.walls.map((wall) => ({ ...wall })),
      holes: parsed.holes.map((hole) => ({ ...hole })),
      oneWayWalls: (parsed.oneWayWalls ?? []).map((wall) => ({ ...wall })),
      rotators: (parsed.rotators ?? []).map((rotator) => ({ ...rotator })),
      teleporters: (parsed.teleporters ?? []).map((teleporter) => ({ ...teleporter })),
      toggleGates: (parsed.toggleGates ?? []).map((gate) => ({ ...gate })),
      crumbling: (parsed.crumbling ?? []).map((cell) => ({ ...cell })),
      crates: (parsed.crates ?? []).map((crate) => ({ ...crate })),
      splitters: (parsed.splitters ?? []).map((cell) => ({ ...cell })),
      magnets: (parsed.magnets ?? []).map((cell) => ({ ...cell })),
      ...(parsed.par !== undefined ? { par: parsed.par } : {}),
    };
  } catch {
    return null;
  }
}

export function clearEditorDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export function loadDraftOrEmpty(): EditorDraft {
  return loadEditorDraft() ?? createEmptyDraft();
}
