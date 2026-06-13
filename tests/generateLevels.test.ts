import { describe, expect, it } from 'vitest';
import { parseIntRange, pickInt, createSeededRandom } from '../scripts/cliArgs';
import { chapterRangesOverlap, upsertChapter } from '../scripts/chapters';
import { generateLevel } from '../scripts/levelGenerator';

describe('cliArgs', () => {
  it('parses fixed and range values', () => {
    expect(parseIntRange('7', 'cells')).toEqual({ min: 7, max: 7 });
    expect(parseIntRange('8-12', 'cells')).toEqual({ min: 8, max: 12 });
  });

  it('picks within range', () => {
    const random = createSeededRandom(99);
    for (let i = 0; i < 20; i += 1) {
      const value = pickInt({ min: 3, max: 5 }, random);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThanOrEqual(5);
    }
  });
});

describe('chapters', () => {
  it('detects overlap', () => {
    expect(
      chapterRangesOverlap(
        { name: 'A', from: 1, to: 10 },
        { name: 'B', from: 8, to: 15 },
      ),
    ).toBe(true);
    expect(
      chapterRangesOverlap(
        { name: 'A', from: 1, to: 10 },
        { name: 'B', from: 11, to: 20 },
      ),
    ).toBe(false);
  });

  it('upserts and extends a chapter', () => {
    const chapters = [
      { name: 'First steps', from: 1, to: 10 },
      { name: 'Rising challenge', from: 11, to: 20 },
    ];
    const result = upsertChapter(chapters, 'Expert pack', 40, 49);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.chapters.find((chapter) => chapter.name === 'Expert pack')).toEqual({
      name: 'Expert pack',
      from: 40,
      to: 49,
    });
  });

  it('rejects overlapping chapter ranges', () => {
    const chapters = [{ name: 'Pack A', from: 1, to: 20 }];
    const result = upsertChapter(chapters, 'Pack B', 15, 30);
    expect(result.ok).toBe(false);
  });
});

describe('levelGenerator', () => {
  it('generates a solvable level from editor-style params', () => {
    const result = generateLevel({
      id: 900,
      name: 'Test generated',
      ranges: {
        cells: { min: 6, max: 8 },
        tiles: { min: 3, max: 4 },
        walls: { min: 0, max: 0 },
        holes: { min: 0, max: 0 },
        frozen: { min: 0, max: 1 },
        crumbling: { min: 0, max: 0 },
        rotators: { min: 0, max: 0 },
        links: { min: 0, max: 0 },
        portals: { min: 0, max: 0 },
        gates: { min: 0, max: 0 },
        crates: { min: 0, max: 0 },
      },
      random: createSeededRandom(42),
      maxAttempts: 60,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.level.id).toBe(900);
    expect(result.level.cells.length).toBeGreaterThanOrEqual(6);
    expect(result.level.tiles.length).toBeGreaterThanOrEqual(3);
    expect(result.level.par).toBeGreaterThan(0);
  });

  it('generates a solvable level with advanced mechanics', () => {
    const result = generateLevel({
      id: 901,
      name: 'Advanced generated',
      ranges: {
        cells: { min: 10, max: 12 },
        tiles: { min: 4, max: 4 },
        walls: { min: 0, max: 0 },
        holes: { min: 0, max: 0 },
        frozen: { min: 0, max: 0 },
        crumbling: { min: 1, max: 1 },
        rotators: { min: 0, max: 1 },
        links: { min: 0, max: 1 },
        portals: { min: 0, max: 1 },
        gates: { min: 0, max: 1 },
        crates: { min: 0, max: 1 },
      },
      random: createSeededRandom(7),
      maxAttempts: 80,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { level } = result;
    const hasFeature =
      (level.crumbling?.length ?? 0) > 0 ||
      (level.rotators?.length ?? 0) > 0 ||
      level.tiles.some((tile) => tile.linked) ||
      (level.teleporters?.length ?? 0) > 0 ||
      (level.toggleGates?.length ?? 0) > 0 ||
      (level.crates?.length ?? 0) > 0;
    expect(hasFeature).toBe(true);
  });
});
