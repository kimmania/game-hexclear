import { describe, expect, it } from 'vitest';
import { parseLevelJson } from '../src/core/levelImport';
import { findShortestSolutionMoves } from '../src/core/solver';
import type { LevelDef } from '../src/core/types';
import { importDraftFromJson } from '../src/editor/editorImport';
import { suggestParForDraft } from '../src/editor/editorPar';
import { draftFromLevel } from '../src/editor/editorState';

const level1: LevelDef = {
  id: 1,
  name: 'Warm up',
  cells: [
    { q: 0, r: 0 },
    { q: 1, r: 0 },
    { q: 2, r: 0 },
  ],
  tiles: [
    { id: 't1', q: 0, r: 0, dir: 0 },
    { id: 't2', q: 1, r: 0, dir: 0 },
  ],
  par: 2,
};

describe('level import', () => {
  it('parses valid level JSON', () => {
    const result = parseLevelJson(JSON.stringify(level1));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.level.name).toBe('Warm up');
      expect(result.level.tiles).toHaveLength(2);
    }
  });

  it('strips legacy tile color fields', () => {
    const withColor = {
      ...level1,
      tiles: [{ ...level1.tiles[0], color: 'coral' }, level1.tiles[1]],
    };
    const result = parseLevelJson(JSON.stringify(withColor));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.level.tiles[0]).not.toHaveProperty('color');
    }
  });

  it('rejects invalid JSON', () => {
    expect(parseLevelJson('{').ok).toBe(false);
  });

  it('imports into an editor draft', () => {
    const result = importDraftFromJson(JSON.stringify(level1));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.draft.name).toBe('Warm up');
      expect(result.draft.par).toBe(2);
    }
  });
});

describe('par suggestion', () => {
  it('finds shortest solution length for level 1', () => {
    const result = findShortestSolutionMoves(level1);
    expect(result.solvable).toBe(true);
    expect(result.moves).toBe(2);
  });

  it('suggests par for a solvable draft', () => {
    const draft = draftFromLevel({ ...level1, par: undefined });
    const result = suggestParForDraft(draft);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.par).toBe(2);
    }
  });
});
