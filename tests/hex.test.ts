import { describe, expect, it } from 'vitest';
import { applySlide, canSlideTile, createGameState, isWin } from '../src/core/board';
import { AXIAL_DIRS, buildCellSet, coordKey, directionVector, slidePath, stepCoord } from '../src/core/hex';
import { axialToPixel, slideDirectionAngleDeg } from '../src/ui/hexLayout';
import type { LevelDef } from '../src/core/types';
import { solveLevel } from '../src/core/solver';
import { validateLevel } from '../src/core/validateLevel';

describe('hex math', () => {
  it('steps in six axial directions', () => {
    expect(stepCoord({ q: 0, r: 0 }, 0)).toEqual(AXIAL_DIRS[0]);
    expect(stepCoord({ q: 1, r: 0 }, 3)).toEqual({ q: 0, r: 0 });
  });

  it('maps direction vectors to pointy-top pixel axes', () => {
    for (let dir = 0; dir < 6; dir += 1) {
      const delta = AXIAL_DIRS[dir]!;
      const from = axialToPixel(0, 0);
      const to = axialToPixel(delta.q, delta.r);
      const pixelDx = to.x - from.x;
      const pixelDy = to.y - from.y;
      const len = Math.hypot(pixelDx, pixelDy);
      const unit = directionVector(dir as 0 | 1 | 2 | 3 | 4 | 5);
      expect(unit.x).toBeCloseTo(pixelDx / len, 5);
      expect(unit.y).toBeCloseTo(pixelDy / len, 5);
      expect(slideDirectionAngleDeg(0, 0, dir as 0 | 1 | 2 | 3 | 4 | 5)).toBeCloseTo(
        (Math.atan2(pixelDy, pixelDx) * 180) / Math.PI,
        5,
      );
    }
  });

  it('builds slide path until off board', () => {
    const cells = buildCellSet([
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 2, r: 0 },
    ]);
    const path = slidePath({ q: 1, r: 0 }, 0, cells, new Set(), new Set());
    expect(path.map(coordKey)).toEqual(['1,0', '2,0', '3,0']);
  });

  it('stops at a hole and removes the tile there', () => {
    const cells = buildCellSet([
      { q: -1, r: 0 },
      { q: 0, r: 0 },
      { q: 1, r: 0 },
    ]);
    const holes = buildCellSet([{ q: 0, r: 0 }]);
    const path = slidePath({ q: -1, r: 0 }, 0, cells, holes, new Set());
    expect(path.map(coordKey)).toEqual(['-1,0', '0,0']);
  });

  it('returns empty path when blocked immediately', () => {
    const cells = buildCellSet([
      { q: 0, r: 0 },
      { q: 1, r: 0 },
    ]);
    const blocked = new Set(['1,0']);
    const path = slidePath({ q: 0, r: 0 }, 0, cells, new Set(), blocked);
    expect(path).toEqual([]);
  });
});

describe('board rules', () => {
  const level: LevelDef = {
    id: 99,
    name: 'Test',
    cells: [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 2, r: 0 },
    ],
    tiles: [
      { id: 'a', q: 0, r: 0, dir: 0, color: 'coral' },
      { id: 'b', q: 1, r: 0, dir: 0, color: 'sky' },
    ],
  };

  it('blocks when path is occupied', () => {
    const state = createGameState(level);
    expect(canSlideTile(state, 'a').ok).toBe(false);
    expect(canSlideTile(state, 'b').ok).toBe(true);
  });

  it('clears tiles in order and wins', () => {
    let state = createGameState(level);
    state = applySlide(state, 'b');
    expect(isWin(state)).toBe(false);
    expect(state.moveCount).toBe(1);
    state = applySlide(state, 'a');
    expect(isWin(state)).toBe(true);
    expect(state.moveCount).toBe(2);
  });
});

describe('frozen tiles', () => {
  const frozenLevel: LevelDef = {
    id: 101,
    name: 'Frozen',
    cells: [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 2, r: 0 },
    ],
    tiles: [
      { id: 'core', q: 1, r: 0, dir: 0, color: 'sky', frozen: true },
      { id: 'outer', q: 2, r: 0, dir: 0, color: 'coral' },
    ],
  };

  it('blocks frozen tiles while neighbors remain', () => {
    const state = createGameState(frozenLevel);
    expect(canSlideTile(state, 'core').ok).toBe(false);
    expect(canSlideTile(state, 'outer').ok).toBe(true);
  });

  it('unlocks frozen tile after neighbors are cleared', () => {
    let state = createGameState(frozenLevel);
    state = applySlide(state, 'outer');
    expect(canSlideTile(state, 'core').ok).toBe(true);
    expect(solveLevel(frozenLevel).solvable).toBe(true);
  });
});

describe('par', () => {
  it('stores par on game state', () => {
    const level: LevelDef = {
      id: 103,
      name: 'Par',
      par: 2,
      cells: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
      tiles: [
        { id: 'a', q: 0, r: 0, dir: 0, color: 'coral' },
        { id: 'b', q: 1, r: 0, dir: 0, color: 'sky' },
      ],
    };
    const state = createGameState(level);
    expect(state.par).toBe(2);
    expect(state.moveCount).toBe(0);
  });
});

describe('holes', () => {
  const pitLevel: LevelDef = {
    id: 100,
    name: 'Pit',
    cells: [
      { q: -1, r: 0 },
      { q: 0, r: 0 },
      { q: 1, r: 0 },
    ],
    holes: [{ q: 0, r: 0 }],
    tiles: [
      { id: 'a', q: -1, r: 0, dir: 0, color: 'coral' },
      { id: 'b', q: 1, r: 0, dir: 3, color: 'sky' },
    ],
  };

  it('removes a tile when it slides into a hole', () => {
    const state = createGameState(pitLevel);
    const result = canSlideTile(state, 'a');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.path.map(coordKey)).toEqual(['-1,0', '0,0']);
    }
    const next = applySlide(state, 'a');
    expect(next.tiles.map((tile) => tile.id)).toEqual(['b']);
  });

  it('solves pit level', () => {
    expect(solveLevel(pitLevel).solvable).toBe(true);
  });
});

describe('levels', () => {
  const level1: LevelDef = {
    id: 1,
    name: 'Warm up',
    cells: [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 2, r: 0 },
    ],
    tiles: [
      { id: 't1', q: 0, r: 0, dir: 0, color: 'coral' },
      { id: 't2', q: 1, r: 0, dir: 0, color: 'sky' },
    ],
  };

  it('validates level schema', () => {
    expect(() => validateLevel(level1, 1)).not.toThrow();
  });

  it('solves bundled level 1', () => {
    expect(solveLevel(level1).solvable).toBe(true);
  });
});
