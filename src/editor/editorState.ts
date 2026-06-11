import { coordKey } from '../core/hex';
import type {
  HexCoord,
  HexDirection,
  LevelDef,
  OneWayWallDef,
  RotatorDef,
  TileDef,
} from '../core/types';

export type EditorTool =
  | 'cell'
  | 'tile'
  | 'wall'
  | 'hole'
  | 'frozen'
  | 'oneway'
  | 'rotator'
  | 'link'
  | 'erase';

export type EditorDraft = {
  id: number;
  name: string;
  cells: HexCoord[];
  tiles: TileDef[];
  walls: HexCoord[];
  holes: HexCoord[];
  oneWayWalls: OneWayWallDef[];
  rotators: RotatorDef[];
  par?: number;
};

export type TilePlacementOptions = {
  frozen?: boolean;
};

export function draftFromLevel(level: LevelDef): EditorDraft {
  return {
    id: level.id,
    name: level.name,
    cells: level.cells.map((cell) => ({ ...cell })),
    tiles: level.tiles.map(({ id, q, r, dir, frozen, linked }) => {
      const tile: TileDef = { id, q, r, dir };
      if (frozen) tile.frozen = true;
      if (linked) tile.linked = linked;
      return tile;
    }),
    walls: (level.walls ?? []).map((wall) => ({ ...wall })),
    holes: (level.holes ?? []).map((hole) => ({ ...hole })),
    oneWayWalls: (level.oneWayWalls ?? []).map((wall) => ({ ...wall })),
    rotators: (level.rotators ?? []).map((rotator) => ({ ...rotator })),
    ...(level.par !== undefined ? { par: level.par } : {}),
  };
}

export function createEmptyDraft(): EditorDraft {
  return {
    id: 99,
    name: 'New level',
    cells: [{ q: 0, r: 0 }],
    tiles: [],
    walls: [],
    holes: [],
    oneWayWalls: [],
    rotators: [],
  };
}

export function toLevelDef(draft: EditorDraft): LevelDef {
  const level: LevelDef = {
    id: draft.id,
    name: draft.name,
    cells: draft.cells.map((cell) => ({ ...cell })),
    tiles: draft.tiles.map(({ id, q, r, dir, frozen, linked }) => {
      const tile: TileDef = { id, q, r, dir };
      if (frozen) tile.frozen = true;
      if (linked) tile.linked = linked;
      return tile;
    }),
  };
  if (draft.walls.length > 0) {
    level.walls = draft.walls.map((wall) => ({ ...wall }));
  }
  if (draft.holes.length > 0) {
    level.holes = draft.holes.map((hole) => ({ ...hole }));
  }
  if (draft.oneWayWalls.length > 0) {
    level.oneWayWalls = draft.oneWayWalls.map((wall) => ({ ...wall }));
  }
  if (draft.rotators.length > 0) {
    level.rotators = draft.rotators.map((rotator) => ({ ...rotator }));
  }
  if (draft.par !== undefined && draft.par > 0) {
    level.par = draft.par;
  }
  return level;
}

function cellIndex(draft: EditorDraft, q: number, r: number): number {
  return draft.cells.findIndex((cell) => cell.q === q && cell.r === r);
}

function hasCell(draft: EditorDraft, q: number, r: number): boolean {
  return cellIndex(draft, q, r) >= 0;
}

function removeAtCoord(list: HexCoord[], q: number, r: number): void {
  const index = list.findIndex((entry) => entry.q === q && entry.r === r);
  if (index >= 0) list.splice(index, 1);
}

function removeOneWayAt(draft: EditorDraft, q: number, r: number): void {
  draft.oneWayWalls = draft.oneWayWalls.filter((wall) => wall.q !== q || wall.r !== r);
}

function removeRotatorAt(draft: EditorDraft, q: number, r: number): void {
  draft.rotators = draft.rotators.filter((rotator) => rotator.q !== q || rotator.r !== r);
}

function nextTileId(draft: EditorDraft): string {
  let n = 1;
  while (draft.tiles.some((tile) => tile.id === `t${n}`)) n += 1;
  return `t${n}`;
}

export function findTile(draft: EditorDraft, q: number, r: number): TileDef | undefined {
  return draft.tiles.find((tile) => tile.q === q && tile.r === r);
}

export function clearCellFeatures(draft: EditorDraft, q: number, r: number): void {
  draft.tiles = draft.tiles.filter((tile) => tile.q !== q || tile.r !== r);
  removeAtCoord(draft.walls, q, r);
  removeAtCoord(draft.holes, q, r);
  removeOneWayAt(draft, q, r);
  removeRotatorAt(draft, q, r);
}

export function addCell(draft: EditorDraft, q: number, r: number): void {
  if (hasCell(draft, q, r)) return;
  draft.cells.push({ q, r });
}

export function removeCell(draft: EditorDraft, q: number, r: number): void {
  const index = cellIndex(draft, q, r);
  if (index < 0) return;
  draft.cells.splice(index, 1);
  clearCellFeatures(draft, q, r);
}

export function toggleWall(draft: EditorDraft, q: number, r: number): void {
  if (!hasCell(draft, q, r)) return;
  const existing = draft.walls.some((wall) => wall.q === q && wall.r === r);
  if (existing) {
    removeAtCoord(draft.walls, q, r);
    return;
  }
  clearCellFeatures(draft, q, r);
  draft.walls.push({ q, r });
}

export function toggleHole(draft: EditorDraft, q: number, r: number): void {
  if (!hasCell(draft, q, r)) return;
  const existing = draft.holes.some((hole) => hole.q === q && hole.r === r);
  if (existing) {
    removeAtCoord(draft.holes, q, r);
    return;
  }
  clearCellFeatures(draft, q, r);
  draft.holes.push({ q, r });
}

export function toggleOneWayWall(draft: EditorDraft, q: number, r: number): void {
  if (!hasCell(draft, q, r)) return;
  if (draft.walls.some((wall) => wall.q === q && wall.r === r)) return;

  const index = draft.oneWayWalls.findIndex((wall) => wall.q === q && wall.r === r);
  if (index < 0) {
    removeAtCoord(draft.holes, q, r);
    draft.oneWayWalls.push({ q, r, dir: 0 });
    return;
  }

  const current = draft.oneWayWalls[index]!;
  if (current.dir >= 5) {
    draft.oneWayWalls.splice(index, 1);
    return;
  }
  current.dir = ((current.dir + 1) % 6) as HexDirection;
}

export function toggleRotator(draft: EditorDraft, q: number, r: number): void {
  if (!hasCell(draft, q, r)) return;
  const index = draft.rotators.findIndex((rotator) => rotator.q === q && rotator.r === r);
  if (index >= 0) {
    draft.rotators.splice(index, 1);
    return;
  }
  removeAtCoord(draft.holes, q, r);
  draft.rotators.push({ q, r, turn: 1 });
}

export function unlinkTile(draft: EditorDraft, tile: TileDef): void {
  if (!tile.linked) return;
  const partner = draft.tiles.find((entry) => entry.id === tile.linked);
  if (partner) delete partner.linked;
  delete tile.linked;
}

export function linkTiles(draft: EditorDraft, first: TileDef, second: TileDef): void {
  if (first.id === second.id) return;
  unlinkTile(draft, first);
  unlinkTile(draft, second);
  first.linked = second.id;
  second.linked = first.id;
}

export function toggleTileFrozen(draft: EditorDraft, q: number, r: number): void {
  const tile = findTile(draft, q, r);
  if (!tile) return;
  if (tile.frozen) {
    delete tile.frozen;
  } else {
    tile.frozen = true;
  }
}

export function addOrCycleTile(
  draft: EditorDraft,
  q: number,
  r: number,
  options: TilePlacementOptions = {},
): void {
  if (!hasCell(draft, q, r)) return;
  if (draft.walls.some((wall) => wall.q === q && wall.r === r)) return;
  if (draft.holes.some((hole) => hole.q === q && hole.r === r)) return;

  const existing = findTile(draft, q, r);
  if (existing) {
    existing.dir = ((existing.dir + 1) % 6) as HexDirection;
    return;
  }

  const dir = 0 as HexDirection;
  const tile: TileDef = {
    id: nextTileId(draft),
    q,
    r,
    dir,
  };
  if (options.frozen) {
    tile.frozen = true;
  }
  draft.tiles.push(tile);
}

export function applyTool(
  draft: EditorDraft,
  tool: EditorTool,
  coord: HexCoord,
  tileOptions: TilePlacementOptions = {},
  linkPendingId?: string | null,
): string | null {
  const { q, r } = coord;

  switch (tool) {
    case 'cell':
      addCell(draft, q, r);
      return linkPendingId ?? null;
    case 'tile':
      addOrCycleTile(draft, q, r, tileOptions);
      return linkPendingId ?? null;
    case 'wall':
      toggleWall(draft, q, r);
      return linkPendingId ?? null;
    case 'hole':
      toggleHole(draft, q, r);
      return linkPendingId ?? null;
    case 'frozen':
      toggleTileFrozen(draft, q, r);
      return linkPendingId ?? null;
    case 'oneway':
      toggleOneWayWall(draft, q, r);
      return linkPendingId ?? null;
    case 'rotator':
      toggleRotator(draft, q, r);
      return linkPendingId ?? null;
    case 'link': {
      const tile = findTile(draft, q, r);
      if (!tile) return linkPendingId ?? null;
      if (!linkPendingId) return tile.id;
      if (linkPendingId === tile.id) return null;
      const first = draft.tiles.find((entry) => entry.id === linkPendingId);
      if (!first) return tile.id;
      linkTiles(draft, first, tile);
      return null;
    }
    case 'erase':
      removeCell(draft, q, r);
      return linkPendingId ?? null;
  }
}

export function neighborCoordsForEditor(draft: EditorDraft): HexCoord[] {
  const cellSet = new Set(draft.cells.map(coordKey));
  const extras: HexCoord[] = [];
  for (const cell of draft.cells) {
    for (const delta of [
      { q: 1, r: 0 },
      { q: 1, r: -1 },
      { q: 0, r: -1 },
      { q: -1, r: 0 },
      { q: -1, r: 1 },
      { q: 0, r: 1 },
    ]) {
      const q = cell.q + delta.q;
      const r = cell.r + delta.r;
      const key = coordKey({ q, r });
      if (!cellSet.has(key)) {
        extras.push({ q, r });
        cellSet.add(key);
      }
    }
  }
  return extras;
}
