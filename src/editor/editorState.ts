import { coordKey } from '../core/hex';
import type { HexCoord, HexDirection, LevelDef, TileColor, TileDef } from '../core/types';

export type EditorTool = 'cell' | 'tile' | 'wall' | 'hole' | 'erase';

export type EditorDraft = {
  id: number;
  name: string;
  cells: HexCoord[];
  tiles: TileDef[];
  walls: HexCoord[];
  holes: HexCoord[];
};

export const TILE_COLOR_OPTIONS: TileColor[] = [
  'coral',
  'sky',
  'mint',
  'gold',
  'lavender',
  'rose',
];

export function draftFromLevel(level: LevelDef): EditorDraft {
  return {
    id: level.id,
    name: level.name,
    cells: level.cells.map((cell) => ({ ...cell })),
    tiles: level.tiles.map((tile) => ({ ...tile })),
    walls: (level.walls ?? []).map((wall) => ({ ...wall })),
    holes: (level.holes ?? []).map((hole) => ({ ...hole })),
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
  };
}

export function toLevelDef(draft: EditorDraft): LevelDef {
  const level: LevelDef = {
    id: draft.id,
    name: draft.name,
    cells: draft.cells.map((cell) => ({ ...cell })),
    tiles: draft.tiles.map((tile) => ({ ...tile })),
  };
  if (draft.walls.length > 0) {
    level.walls = draft.walls.map((wall) => ({ ...wall }));
  }
  if (draft.holes.length > 0) {
    level.holes = draft.holes.map((hole) => ({ ...hole }));
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

export function addOrCycleTile(draft: EditorDraft, q: number, r: number, color: TileColor): void {
  if (!hasCell(draft, q, r)) return;
  if (draft.walls.some((wall) => wall.q === q && wall.r === r)) return;
  if (draft.holes.some((hole) => hole.q === q && hole.r === r)) return;

  const existing = findTile(draft, q, r);
  if (existing) {
    existing.dir = ((existing.dir + 1) % 6) as HexDirection;
    existing.color = color;
    return;
  }

  draft.tiles.push({
    id: nextTileId(draft),
    q,
    r,
    dir: 0,
    color,
  });
}

export function applyTool(
  draft: EditorDraft,
  tool: EditorTool,
  coord: HexCoord,
  tileColor: TileColor,
): void {
  const { q, r } = coord;

  switch (tool) {
    case 'cell':
      addCell(draft, q, r);
      break;
    case 'tile':
      addOrCycleTile(draft, q, r, tileColor);
      break;
    case 'wall':
      toggleWall(draft, q, r);
      break;
    case 'hole':
      toggleHole(draft, q, r);
      break;
    case 'erase':
      removeCell(draft, q, r);
      break;
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
