import { AXIAL_DIRS, coordKey } from '../core/hex';
import type { HexCoord, HexDirection } from '../core/types';
import type { EditorDraft } from './editorState';

export type PopulateParams = {
  cellCount: number;
  tileCount: number;
  wallCount: number;
  holeCount: number;
  frozenCount: number;
};

export type PopulateResult = { ok: true } | { ok: false; message: string };

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

export function validatePopulateParams(params: PopulateParams): PopulateResult {
  const cellCount = Math.floor(params.cellCount);
  const tileCount = Math.floor(params.tileCount);
  const wallCount = Math.floor(params.wallCount);
  const holeCount = Math.floor(params.holeCount);
  const frozenCount = Math.floor(params.frozenCount);

  if (cellCount < 1) {
    return { ok: false, message: 'Need at least one cell.' };
  }
  if (tileCount < 0 || wallCount < 0 || holeCount < 0 || frozenCount < 0) {
    return { ok: false, message: 'Counts cannot be negative.' };
  }
  if (tileCount + wallCount + holeCount > cellCount) {
    return {
      ok: false,
      message: 'Tiles, walls, and holes cannot exceed the number of cells.',
    };
  }
  if (frozenCount > tileCount) {
    return { ok: false, message: 'Frozen count cannot exceed tile count.' };
  }
  return { ok: true };
}

/** Grow a connected hex blob of `count` cells from the origin. */
export function generateConnectedCells(count: number, random: () => number): HexCoord[] {
  if (count <= 0) return [];

  const origin: HexCoord = { q: 0, r: 0 };
  const cells: HexCoord[] = [origin];
  const seen = new Set([coordKey(origin)]);
  const frontier: HexCoord[] = [origin];

  while (cells.length < count) {
    if (frontier.length === 0) {
      const base = cells[Math.floor(random() * cells.length)]!;
      frontier.push(base);
    }

    const baseIndex = Math.floor(random() * frontier.length);
    const base = frontier[baseIndex]!;
    const neighbors = shuffle(
      AXIAL_DIRS.map((delta) => ({ q: base.q + delta.q, r: base.r + delta.r })),
      random,
    );

    let grew = false;
    for (const neighbor of neighbors) {
      const key = coordKey(neighbor);
      if (seen.has(key)) continue;
      seen.add(key);
      cells.push(neighbor);
      frontier.push(neighbor);
      grew = true;
      if (cells.length >= count) break;
    }

    if (!grew) {
      frontier.splice(baseIndex, 1);
    }
  }

  return cells;
}

export function populateDraft(
  draft: EditorDraft,
  params: PopulateParams,
  random: () => number = Math.random,
): PopulateResult {
  const check = validatePopulateParams(params);
  if (!check.ok) return check;

  const cellCount = Math.floor(params.cellCount);
  const tileCount = Math.floor(params.tileCount);
  const wallCount = Math.floor(params.wallCount);
  const holeCount = Math.floor(params.holeCount);
  const frozenCount = Math.floor(params.frozenCount);

  const cells = generateConnectedCells(cellCount, random);
  const assignment = shuffle(cells, random);

  draft.cells = cells.map((cell) => ({ ...cell }));
  draft.holes = assignment.slice(0, holeCount).map((cell) => ({ ...cell }));
  draft.walls = assignment.slice(holeCount, holeCount + wallCount).map((cell) => ({ ...cell }));

  const tileCoords = assignment.slice(holeCount + wallCount, holeCount + wallCount + tileCount);
  draft.tiles = tileCoords.map((cell, index) => {
    const dir = Math.floor(random() * 6) as HexDirection;
    return {
      id: `t${index + 1}`,
      q: cell.q,
      r: cell.r,
      dir,
    };
  });

  if (frozenCount > 0) {
    const frozenIndexes = shuffle(
      draft.tiles.map((_, index) => index),
      random,
    ).slice(0, frozenCount);
    for (const index of frozenIndexes) {
      draft.tiles[index]!.frozen = true;
    }
  }

  return { ok: true };
}
