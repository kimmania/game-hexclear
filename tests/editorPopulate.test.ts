import { describe, expect, it } from 'vitest';
import { createEmptyDraft } from '../src/editor/editorState';
import {
  generateConnectedCells,
  populateDraft,
  validatePopulateParams,
} from '../src/editor/editorPopulate';

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 0x100000000;
    return state / 0x100000000;
  };
}

describe('editor populate', () => {
  it('rejects impossible counts', () => {
    expect(validatePopulateParams({
      cellCount: 3,
      tileCount: 2,
      wallCount: 1,
      holeCount: 1,
      frozenCount: 0,
      crumblingCount: 0,
      rotatorCount: 0,
      linkPairCount: 0,
      portalPairCount: 0,
      gateCount: 0,
      crateCount: 0,
    }).ok).toBe(false);
  });

  it('generates connected cells', () => {
    const cells = generateConnectedCells(7, seededRandom(42));
    expect(cells).toHaveLength(7);
    const keys = new Set(cells.map((cell) => `${cell.q},${cell.r}`));
    expect(keys.size).toBe(7);
    expect(cells.some((cell) => cell.q === 0 && cell.r === 0)).toBe(true);
  });

  it('populates draft with requested features', () => {
    const draft = createEmptyDraft();
    const random = seededRandom(7);
    const result = populateDraft(
      draft,
      {
        cellCount: 8,
        tileCount: 4,
        wallCount: 1,
        holeCount: 1,
        frozenCount: 2,
        crumblingCount: 0,
        rotatorCount: 0,
        linkPairCount: 0,
        portalPairCount: 0,
        gateCount: 0,
        crateCount: 0,
      },
      random,
    );

    expect(result.ok).toBe(true);
    expect(draft.cells).toHaveLength(8);
    expect(draft.tiles).toHaveLength(4);
    expect(draft.walls).toHaveLength(1);
    expect(draft.holes).toHaveLength(1);
    expect(draft.tiles.filter((tile) => tile.frozen).length).toBe(2);

    const occupied = new Set([
      ...draft.tiles.map((tile) => `${tile.q},${tile.r}`),
      ...draft.walls.map((wall) => `${wall.q},${wall.r}`),
      ...draft.holes.map((hole) => `${hole.q},${hole.r}`),
    ]);
    expect(occupied.size).toBe(6);
  });

  it('places advanced mechanics on empty cells', () => {
    const draft = createEmptyDraft();
    const result = populateDraft(
      draft,
      {
        cellCount: 12,
        tileCount: 4,
        wallCount: 0,
        holeCount: 0,
        frozenCount: 0,
        crumblingCount: 1,
        rotatorCount: 1,
        linkPairCount: 1,
        portalPairCount: 1,
        gateCount: 1,
        crateCount: 1,
      },
      seededRandom(11),
    );

    expect(result.ok).toBe(true);
    expect(draft.crumbling).toHaveLength(1);
    expect(draft.rotators).toHaveLength(1);
    expect(draft.teleporters).toHaveLength(2);
    expect(draft.toggleGates).toHaveLength(1);
    expect(draft.crates).toHaveLength(1);
    expect(draft.tiles.filter((tile) => tile.linked)).toHaveLength(2);
  });
});
