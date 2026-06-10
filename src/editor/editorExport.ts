import { solveLevel } from '../core/solver';
import { validateLevel } from '../core/validateLevel';
import type { LevelDef } from '../core/types';
import type { EditorDraft } from './editorState';
import { toLevelDef } from './editorState';

export type ExportSuccess = {
  ok: true;
  level: LevelDef;
  json: string;
  statesExplored: number;
};

export type ExportFailure = {
  ok: false;
  message: string;
};

export type ExportResult = ExportSuccess | ExportFailure;

export function prepareLevelExport(draft: EditorDraft): ExportResult {
  const level = toLevelDef(draft);

  try {
    validateLevel(level);
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Invalid level',
    };
  }

  const { solvable, statesExplored } = solveLevel(level);
  if (!solvable) {
    return {
      ok: false,
      message: `Not solvable (${statesExplored} states explored). Adjust the puzzle before saving.`,
    };
  }

  return {
    ok: true,
    level,
    json: JSON.stringify(level, null, 2),
    statesExplored,
  };
}

export function downloadLevelJson(level: LevelDef, json: string): void {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${level.id}.json`;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
