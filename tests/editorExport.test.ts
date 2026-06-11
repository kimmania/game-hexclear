import { describe, expect, it } from 'vitest';
import { prepareLevelExport } from '../src/editor/editorExport';
import { createEmptyDraft, draftFromLevel } from '../src/editor/editorState';
import type { LevelDef } from '../src/core/types';

describe('editor export', () => {
  it('rejects an empty draft without tiles', () => {
    const draft = createEmptyDraft();
    const result = prepareLevelExport(draft);
    expect(result.ok).toBe(false);
  });

  it('exports a solvable draft from level 1', () => {
    const level: LevelDef = {
      id: 1,
      name: 'Warm up',
      cells: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        { q: 2, r: 0 },
      ],
      tiles: [
        { id: 't1', q: 0, r: 0, dir: 0, color: 'coral' },
        { id: 't2', q: 1, r: 0, dir: 0, color: 'coral' },
      ],
    };
    const result = prepareLevelExport(draftFromLevel(level));
    expect(result.ok).toBe(true);
  });
});
