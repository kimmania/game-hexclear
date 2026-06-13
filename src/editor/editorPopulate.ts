import { AXIAL_DIRS, coordKey } from '../core/hex';
import type { HexCoord, HexDirection } from '../core/types';
import type { EditorDraft } from './editorState';

export type PopulateParams = {
  cellCount: number;
  tileCount: number;
  wallCount: number;
  holeCount: number;
  frozenCount: number;
  /** Empty cells that crumble after one slide crosses them. */
  crumblingCount: number;
  rotatorCount: number;
  /** Linked tile pairs — each pair consumes two tiles. */
  linkPairCount: number;
  /** Teleporter pairs — each pair consumes two empty cells. */
  portalPairCount: number;
  /** Toggle switch + gate pairs — each pair consumes two empty cells. */
  gateCount: number;
  crateCount: number;
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
  const crumblingCount = Math.floor(params.crumblingCount);
  const rotatorCount = Math.floor(params.rotatorCount);
  const linkPairCount = Math.floor(params.linkPairCount);
  const portalPairCount = Math.floor(params.portalPairCount);
  const gateCount = Math.floor(params.gateCount);
  const crateCount = Math.floor(params.crateCount);

  const counts = [
    tileCount,
    wallCount,
    holeCount,
    frozenCount,
    crumblingCount,
    rotatorCount,
    linkPairCount,
    portalPairCount,
    gateCount,
    crateCount,
  ];
  if (cellCount < 1) {
    return { ok: false, message: 'Need at least one cell.' };
  }
  if (counts.some((count) => count < 0)) {
    return { ok: false, message: 'Counts cannot be negative.' };
  }
  if (tileCount < 1) {
    return { ok: false, message: 'Need at least one tile.' };
  }

  const featureCells =
    crumblingCount + rotatorCount + portalPairCount * 2 + gateCount * 2 + crateCount;
  if (tileCount + wallCount + holeCount + featureCells > cellCount) {
    return {
      ok: false,
      message:
        'Tiles, walls, holes, and feature cells (crumble, rotator, portal, gate, crate) exceed cell count.',
    };
  }
  if (frozenCount > tileCount) {
    return { ok: false, message: 'Frozen count cannot exceed tile count.' };
  }
  if (linkPairCount * 2 > tileCount) {
    return { ok: false, message: 'Each link pair needs two tiles.' };
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

function clearDraftFeatures(draft: EditorDraft): void {
  draft.holes = [];
  draft.walls = [];
  draft.tiles = [];
  draft.oneWayWalls = [];
  draft.rotators = [];
  draft.teleporters = [];
  draft.toggleGates = [];
  draft.crumbling = [];
  draft.crates = [];
  draft.splitters = [];
  draft.magnets = [];
}

function placeAdvancedFeatures(
  draft: EditorDraft,
  params: PopulateParams,
  freeCells: HexCoord[],
  random: () => number,
): PopulateResult {
  const crumblingCount = Math.floor(params.crumblingCount);
  const rotatorCount = Math.floor(params.rotatorCount);
  const linkPairCount = Math.floor(params.linkPairCount);
  const portalPairCount = Math.floor(params.portalPairCount);
  const gateCount = Math.floor(params.gateCount);
  const crateCount = Math.floor(params.crateCount);

  const needed =
    crumblingCount + rotatorCount + portalPairCount * 2 + gateCount * 2 + crateCount;
  if (needed > freeCells.length) {
    return { ok: false, message: 'Not enough empty cells for requested features.' };
  }

  const pool = shuffle(freeCells, random);
  let index = 0;

  const take = (count: number): HexCoord[] => {
    const picked = pool.slice(index, index + count);
    index += count;
    return picked;
  };

  draft.crumbling = take(crumblingCount).map((cell) => ({ ...cell }));

  draft.rotators = take(rotatorCount).map((cell) => ({
    q: cell.q,
    r: cell.r,
    turn: 1 as const,
  }));

  draft.teleporters = [];
  for (let groupIndex = 0; groupIndex < portalPairCount; groupIndex += 1) {
    const group = String.fromCharCode(97 + groupIndex);
    for (const cell of take(2)) {
      draft.teleporters.push({ q: cell.q, r: cell.r, group });
    }
  }

  draft.toggleGates = [];
  for (const [switchCell, gateCell] of chunkPairs(take(gateCount * 2))) {
    draft.toggleGates.push({
      switchQ: switchCell.q,
      switchR: switchCell.r,
      gateQ: gateCell.q,
      gateR: gateCell.r,
    });
  }

  draft.crates = take(crateCount).map((cell, crateIndex) => ({
    id: `c${crateIndex + 1}`,
    q: cell.q,
    r: cell.r,
  }));

  if (linkPairCount > 0) {
    const linkTiles = shuffle(draft.tiles, random).slice(0, linkPairCount * 2);
    for (let pairIndex = 0; pairIndex < linkPairCount; pairIndex += 1) {
      const first = linkTiles[pairIndex * 2]!;
      const second = linkTiles[pairIndex * 2 + 1]!;
      first.linked = second.id;
      second.linked = first.id;
    }
  }

  return { ok: true };
}

function chunkPairs(cells: HexCoord[]): Array<[HexCoord, HexCoord]> {
  const pairs: Array<[HexCoord, HexCoord]> = [];
  for (let i = 0; i + 1 < cells.length; i += 2) {
    pairs.push([cells[i]!, cells[i + 1]!]);
  }
  return pairs;
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

  clearDraftFeatures(draft);

  const cells = generateConnectedCells(cellCount, random);
  const assignment = shuffle(cells, random);

  draft.cells = cells.map((cell) => ({ ...cell }));
  draft.holes = assignment.slice(0, holeCount).map((cell) => ({ ...cell }));
  draft.walls = assignment.slice(holeCount, holeCount + wallCount).map((cell) => ({ ...cell }));

  const tileCoords = assignment.slice(holeCount + wallCount, holeCount + wallCount + tileCount);
  draft.tiles = tileCoords.map((cell, tileIndex) => {
    const dir = Math.floor(random() * 6) as HexDirection;
    return {
      id: `t${tileIndex + 1}`,
      q: cell.q,
      r: cell.r,
      dir,
    };
  });

  if (frozenCount > 0) {
    const frozenIndexes = shuffle(
      draft.tiles.map((_, tileIndex) => tileIndex),
      random,
    ).slice(0, frozenCount);
    for (const tileIndex of frozenIndexes) {
      draft.tiles[tileIndex]!.frozen = true;
    }
  }

  const occupied = new Set([
    ...draft.tiles.map((tile) => coordKey(tile)),
    ...draft.holes.map(coordKey),
    ...draft.walls.map(coordKey),
  ]);
  const freeCells = draft.cells.filter((cell) => !occupied.has(coordKey(cell)));

  const features = placeAdvancedFeatures(draft, params, freeCells, random);
  if (!features.ok) return features;

  return { ok: true };
}
