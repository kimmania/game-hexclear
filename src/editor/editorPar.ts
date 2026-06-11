import { findShortestSolutionMoves } from '../core/solver';
import { validateLevel } from '../core/validateLevel';
import type { LevelDef } from '../core/types';
import type { EditorDraft } from './editorState';
import { toLevelDef } from './editorState';

export type ParSuggestSuccess = {
  ok: true;
  par: number;
  statesExplored: number;
};

export type ParSuggestFailure = {
  ok: false;
  message: string;
};

export type ParSuggestResult = ParSuggestSuccess | ParSuggestFailure;

export function suggestParForDraft(draft: EditorDraft): ParSuggestResult {
  const level = toLevelDef(draft);

  try {
    validateLevel(level);
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Invalid level',
    };
  }

  const { solvable, moves, statesExplored } = findShortestSolutionMoves(level);
  if (!solvable || moves === null) {
    return {
      ok: false,
      message: `Not solvable (${statesExplored} states explored). Fix the puzzle before suggesting par.`,
    };
  }

  return { ok: true, par: moves, statesExplored };
}

export function suggestParForLevel(level: LevelDef): ParSuggestResult {
  try {
    validateLevel(level);
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Invalid level',
    };
  }

  const { solvable, moves, statesExplored } = findShortestSolutionMoves(level);
  if (!solvable || moves === null) {
    return {
      ok: false,
      message: `Not solvable (${statesExplored} states explored).`,
    };
  }

  return { ok: true, par: moves, statesExplored };
}
