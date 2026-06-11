import { describe, expect, it } from 'vitest';
import { applySlide, canSlideTile, createGameState, isWin, recordMove } from '../src/core/board';
import { AXIAL_DIRS, buildCellSet, coordKey, directionVector, slidePath, stepCoord } from '../src/core/hex';
import { axialToPixel, slideDirectionAngleDeg } from '../src/ui/hexLayout';
import type { LevelDef } from '../src/core/types';
import { findHintMove, solveLevel } from '../src/core/solver';
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
      { id: 'a', q: 0, r: 0, dir: 0 },
      { id: 'b', q: 1, r: 0, dir: 0 },
    ],
  };

  it('blocks when path is occupied', () => {
    const state = createGameState(level);
    expect(canSlideTile(state, 'a').ok).toBe(false);
    expect(canSlideTile(state, 'b').ok).toBe(true);
  });

  it('increments move count on every tap including blocked attempts', () => {
    const state = createGameState(level);
    const blocked = recordMove(state);
    expect(blocked.moveCount).toBe(1);
    expect(canSlideTile(blocked, 'a').ok).toBe(false);
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
      { id: 'core', q: 1, r: 0, dir: 0, frozen: true },
      { id: 'outer', q: 2, r: 0, dir: 0 },
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
        { id: 'a', q: 0, r: 0, dir: 0 },
        { id: 'b', q: 1, r: 0, dir: 0 },
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
      { id: 'a', q: -1, r: 0, dir: 0 },
      { id: 'b', q: 1, r: 0, dir: 3 },
    ],
  };

  it('removes a tile when it slides into a hole', () => {
    const state = createGameState(pitLevel);
    const result = canSlideTile(state, 'a');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.path.map(coordKey)).toEqual(['-1,0', '0,0']);
      expect(result.animations).toHaveLength(1);
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
      { id: 't1', q: 0, r: 0, dir: 0 },
      { id: 't2', q: 1, r: 0, dir: 0 },
    ],
  };

  it('validates level schema', () => {
    expect(() => validateLevel(level1, 1)).not.toThrow();
  });

  it('solves bundled level 1', () => {
    expect(solveLevel(level1).solvable).toBe(true);
  });
});

describe('one-way walls', () => {
  const level: LevelDef = {
    id: 201,
    name: 'One way',
    cells: [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 2, r: 0 },
      { q: 1, r: -1 },
    ],
    oneWayWalls: [{ q: 1, r: 0, dir: 0 }],
    tiles: [
      { id: 'a', q: 0, r: 0, dir: 1 },
      { id: 'b', q: 2, r: 0, dir: 3 },
    ],
  };

  it('blocks entry from the barred direction', () => {
    const state = createGameState(level);
    const eastAttempt: LevelDef = {
      ...level,
      tiles: [
        { id: 'a', q: 0, r: 0, dir: 0 },
        { id: 'b', q: 2, r: 0, dir: 3 },
      ],
    };
    expect(canSlideTile(createGameState(eastAttempt), 'a').ok).toBe(false);
    expect(canSlideTile(state, 'b').ok).toBe(false);
  });

  it('solves after using the open direction', () => {
    let state = createGameState(level);
    state = applySlide(state, 'a');
    expect(canSlideTile(state, 'b').ok).toBe(true);
    expect(solveLevel(level).solvable).toBe(true);
  });
});

describe('rotators', () => {
  const level: LevelDef = {
    id: 202,
    name: 'Turn',
    cells: [
      { q: -1, r: 0 },
      { q: 0, r: 0 },
      { q: 1, r: -1 },
      { q: 2, r: -1 },
    ],
    rotators: [{ q: 0, r: 0, turn: 1 }],
    tiles: [{ id: 'a', q: -1, r: 0, dir: 0 }],
  };

  it('redirects a slide through a rotator', () => {
    const result = canSlideTile(createGameState(level), 'a');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.path.map(coordKey)).toEqual(['-1,0', '0,0', '1,-1', '2,-2']);
    }
  });
});

describe('linked pairs', () => {
  const level: LevelDef = {
    id: 203,
    name: 'Linked',
    cells: [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 2, r: 0 },
      { q: 3, r: 0 },
    ],
    tiles: [
      { id: 'a', q: 0, r: 0, dir: 0, linked: 'b' },
      { id: 'b', q: 1, r: 0, dir: 0, linked: 'a' },
      { id: 'c', q: 2, r: 0, dir: 0 },
    ],
  };

  it('slides both linked tiles together', () => {
    const state = createGameState(level);
    expect(canSlideTile(state, 'a').ok).toBe(false);
    expect(canSlideTile(state, 'c').ok).toBe(true);

    const after = applySlide(state, 'c');
    const pair = canSlideTile(after, 'a');
    expect(pair.ok).toBe(true);
    if (pair.ok) {
      expect(pair.animations).toHaveLength(2);
    }
  });

  it('solves linked tutorial layout', () => {
    expect(solveLevel(level).solvable).toBe(true);
  });
});

describe('hints', () => {
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
  };

  it('finds a slideable tile when one exists', () => {
    const state = createGameState(level1);
    expect(findHintMove(state)).toBe('t2');
  });

  it('returns null when no legal moves exist', () => {
    const state = createGameState({
      id: 99,
      name: 'Stuck',
      cells: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
      tiles: [
        { id: 'a', q: 0, r: 0, dir: 0 },
        { id: 'b', q: 1, r: 0, dir: 3 },
      ],
    });
    expect(findHintMove(state)).toBeNull();
  });
});

describe('advanced mechanics', () => {
  it('teleports through paired portals', () => {
    const level: LevelDef = {
      id: 301,
      name: 'Portal',
      cells: [
        { q: -1, r: 0 },
        { q: 0, r: 0 },
        { q: 2, r: 0 },
        { q: 3, r: 0 },
      ],
      teleporters: [
        { q: 0, r: 0, group: 'a' },
        { q: 2, r: 0, group: 'a' },
      ],
      tiles: [{ id: 'a', q: -1, r: 0, dir: 0 }],
    };
    const result = canSlideTile(createGameState(level), 'a');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.path.map(coordKey)).toEqual(['-1,0', '0,0', '2,0', '3,0', '4,0']);
    }
  });

  it('opens toggle gates when leaving a switch', () => {
    const level: LevelDef = {
      id: 302,
      name: 'Gate',
      par: 2,
      cells: [
        { q: -1, r: 0 },
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        { q: 2, r: 0 },
        { q: 2, r: -1 },
      ],
      toggleGates: [{ switchQ: 0, switchR: 0, gateQ: 1, gateR: 0 }],
      tiles: [
        { id: 'a', q: -1, r: 0, dir: 0 },
        { id: 'b', q: 2, r: -1, dir: 5 },
      ],
    };
    expect(solveLevel(level).solvable).toBe(true);
  });

  it('crumbles a bridge after crossing', () => {
    const level: LevelDef = {
      id: 303,
      name: 'Crumble',
      par: 3,
      cells: [
        { q: -1, r: 0 },
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        { q: 2, r: 0 },
        { q: 0, r: 1 },
        { q: 0, r: -1 },
      ],
      crumbling: [{ q: 0, r: 0 }],
      tiles: [
        { id: 'a', q: -1, r: 0, dir: 0 },
        { id: 'b', q: 2, r: 0, dir: 3 },
        { id: 'c', q: 0, r: 1, dir: 2 },
      ],
    };
    const start = createGameState(level);
    const blockedA = canSlideTile(start, 'a');
    expect(blockedA.ok).toBe(false);
    if (!blockedA.ok) {
      expect(blockedA.bounceAnimations?.[0]?.path.map(coordKey)).toEqual(['-1,0', '0,0', '1,0']);
    }
    const blockedB = canSlideTile(start, 'b');
    expect(blockedB.ok).toBe(false);
    if (!blockedB.ok) {
      expect(blockedB.bounceAnimations?.[0]?.path.map(coordKey)).toEqual(['2,0', '1,0', '0,0']);
    }
    expect(canSlideTile(start, 'c').ok).toBe(true);
    let state = applySlide(start, 'c');
    expect(state.crumbledKeys).toContain('0,0');
    expect(canSlideTile(state, 'a').ok).toBe(true);
    expect(canSlideTile(state, 'b').ok).toBe(true);
    state = applySlide(state, 'a');
    state = applySlide(state, 'b');
    expect(state.status).toBe('won');
    expect(solveLevel(level).solvable).toBe(true);
  });

  it('pushes crates out of the way', () => {
    const level: LevelDef = {
      id: 304,
      name: 'Crate',
      cells: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        { q: 2, r: 0 },
        { q: 3, r: 0 },
      ],
      crates: [{ id: 'c1', q: 1, r: 0 }],
      tiles: [{ id: 'a', q: 0, r: 0, dir: 0 }],
    };
    const next = applySlide(createGameState(level), 'a');
    expect(next.tiles).toHaveLength(0);
    expect(next.crates).toHaveLength(0);
  });

  it('pulls tiles toward magnets after a neighbor clears', () => {
    const level: LevelDef = {
      id: 305,
      name: 'Magnet',
      cells: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        { q: 1, r: -1 },
      ],
      magnets: [{ q: 1, r: -1 }],
      tiles: [
        { id: 'a', q: 1, r: 0, dir: 1 },
        { id: 'b', q: 0, r: 0, dir: 0 },
      ],
    };
    let state = createGameState(level);
    state = applySlide(state, 'a');
    const remaining = state.tiles.find((tile) => tile.id === 'b');
    expect(remaining?.q).toBe(1);
    expect(remaining?.r).toBe(-1);
  });

  it('level 34 hops past a blocker between portals', () => {
    const level: LevelDef = {
      id: 34,
      name: 'Portal hop',
      par: 2,
      cells: [
        { q: -1, r: 0 },
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        { q: 2, r: 0 },
        { q: 3, r: 0 },
      ],
      teleporters: [
        { q: 0, r: 0, group: 'a' },
        { q: 2, r: 0, group: 'a' },
      ],
      tiles: [
        { id: 't1', q: -1, r: 0, dir: 0 },
        { id: 't2', q: 1, r: 0, dir: 3 },
      ],
    };
    const start = createGameState(level);
    const slide = canSlideTile(start, 't1');
    expect(slide.ok).toBe(true);
    if (slide.ok) {
      expect(slide.path.map(coordKey)).not.toContain('1,0');
    }
    let after = applySlide(start, 't1');
    expect(after.tiles.map((t) => t.id)).toEqual(['t2']);
    after = applySlide(after, 't2');
    expect(after.status).toBe('won');
    expect(solveLevel(level).solvable).toBe(true);
  });

  it('level 37 stops yellow before the white blocker', () => {
    const level: LevelDef = {
      id: 37,
      name: 'Push through',
      par: 2,
      cells: [
        { q: -1, r: 0 },
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        { q: 2, r: 0 },
        { q: 3, r: 0 },
      ],
      crates: [{ id: 'c1', q: 1, r: 0 }],
      tiles: [
        { id: 't1', q: -1, r: 0, dir: 0 },
        { id: 't2', q: 2, r: 0, dir: 0 },
      ],
    };
    const start = createGameState(level);
    expect(canSlideTile(start, 't1').ok).toBe(false);
    expect(canSlideTile(start, 't2').ok).toBe(true);
    expect(solveLevel(level).solvable).toBe(true);
  });

  it('solves magnet tutorial layout', () => {
    const level: LevelDef = {
      id: 39,
      name: 'Magnetic pull',
      par: 2,
      cells: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        { q: 1, r: -1 },
      ],
      magnets: [{ q: 1, r: -1 }],
      tiles: [
        { id: 't1', q: 1, r: 0, dir: 1 },
        { id: 't2', q: 0, r: 0, dir: 0 },
      ],
    };
    expect(solveLevel(level).solvable).toBe(true);
  });
});
