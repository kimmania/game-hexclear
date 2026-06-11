import { coordKey } from '../core/hex';
import type {
  CrateDef,
  HexCoord,
  HexDirection,
  LevelDef,
  OneWayWallDef,
  RotatorDef,
  TeleporterDef,
  TileDef,
  ToggleGateDef,
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
  | 'teleporter'
  | 'toggle'
  | 'crumble'
  | 'crate'
  | 'splitter'
  | 'magnet'
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
  teleporters: TeleporterDef[];
  toggleGates: ToggleGateDef[];
  crumbling: HexCoord[];
  crates: CrateDef[];
  splitters: HexCoord[];
  magnets: HexCoord[];
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
    teleporters: (level.teleporters ?? []).map((teleporter) => ({ ...teleporter })),
    toggleGates: (level.toggleGates ?? []).map((gate) => ({ ...gate })),
    crumbling: (level.crumbling ?? []).map((cell) => ({ ...cell })),
    crates: (level.crates ?? []).map((crate) => ({ ...crate })),
    splitters: (level.splitters ?? []).map((cell) => ({ ...cell })),
    magnets: (level.magnets ?? []).map((cell) => ({ ...cell })),
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
    teleporters: [],
    toggleGates: [],
    crumbling: [],
    crates: [],
    splitters: [],
    magnets: [],
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
  if (draft.teleporters.length > 0) {
    level.teleporters = draft.teleporters.map((teleporter) => ({ ...teleporter }));
  }
  if (draft.toggleGates.length > 0) {
    level.toggleGates = draft.toggleGates.map((gate) => ({ ...gate }));
  }
  if (draft.crumbling.length > 0) {
    level.crumbling = draft.crumbling.map((cell) => ({ ...cell }));
  }
  if (draft.crates.length > 0) {
    level.crates = draft.crates.map((crate) => ({ ...crate }));
  }
  if (draft.splitters.length > 0) {
    level.splitters = draft.splitters.map((cell) => ({ ...cell }));
  }
  if (draft.magnets.length > 0) {
    level.magnets = draft.magnets.map((cell) => ({ ...cell }));
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

function removeTeleporterAt(draft: EditorDraft, q: number, r: number): void {
  draft.teleporters = draft.teleporters.filter((entry) => entry.q !== q || entry.r !== r);
}

function removeCrumbleAt(draft: EditorDraft, q: number, r: number): void {
  removeAtCoord(draft.crumbling, q, r);
}

function removeSplitterAt(draft: EditorDraft, q: number, r: number): void {
  removeAtCoord(draft.splitters, q, r);
}

function removeMagnetAt(draft: EditorDraft, q: number, r: number): void {
  removeAtCoord(draft.magnets, q, r);
}

function nextCrateId(draft: EditorDraft): string {
  let n = 1;
  while (draft.crates.some((crate) => crate.id === `c${n}`)) n += 1;
  return `c${n}`;
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
  removeTeleporterAt(draft, q, r);
  removeCrumbleAt(draft, q, r);
  removeSplitterAt(draft, q, r);
  removeMagnetAt(draft, q, r);
  draft.crates = draft.crates.filter((crate) => crate.q !== q || crate.r !== r);
  draft.toggleGates = draft.toggleGates.filter(
    (gate) =>
      (gate.switchQ !== q || gate.switchR !== r) && (gate.gateQ !== q || gate.gateR !== r),
  );
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

export function toggleTeleporter(draft: EditorDraft, q: number, r: number): void {
  if (!hasCell(draft, q, r)) return;
  const index = draft.teleporters.findIndex((entry) => entry.q === q && entry.r === r);
  if (index >= 0) {
    draft.teleporters.splice(index, 1);
    return;
  }
  draft.teleporters.push({ q, r, group: 'a' });
}

export function toggleCrumbling(draft: EditorDraft, q: number, r: number): void {
  if (!hasCell(draft, q, r)) return;
  const existing = draft.crumbling.some((cell) => cell.q === q && cell.r === r);
  if (existing) removeCrumbleAt(draft, q, r);
  else draft.crumbling.push({ q, r });
}

export function toggleCrate(draft: EditorDraft, q: number, r: number): void {
  if (!hasCell(draft, q, r)) return;
  const index = draft.crates.findIndex((crate) => crate.q === q && crate.r === r);
  if (index >= 0) {
    draft.crates.splice(index, 1);
    return;
  }
  if (findTile(draft, q, r)) return;
  draft.crates.push({ id: nextCrateId(draft), q, r });
}

export function toggleSplitter(draft: EditorDraft, q: number, r: number): void {
  if (!hasCell(draft, q, r)) return;
  const existing = draft.splitters.some((cell) => cell.q === q && cell.r === r);
  if (existing) removeSplitterAt(draft, q, r);
  else draft.splitters.push({ q, r });
}

export function toggleMagnet(draft: EditorDraft, q: number, r: number): void {
  if (!hasCell(draft, q, r)) return;
  const existing = draft.magnets.some((cell) => cell.q === q && cell.r === r);
  if (existing) removeMagnetAt(draft, q, r);
  else draft.magnets.push({ q, r });
}

export function addToggleGate(
  draft: EditorDraft,
  switchCoord: HexCoord,
  gateCoord: HexCoord,
): void {
  draft.toggleGates.push({
    switchQ: switchCoord.q,
    switchR: switchCoord.r,
    gateQ: gateCoord.q,
    gateR: gateCoord.r,
  });
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

export type EditorPending = {
  linkTileId: string | null;
  toggleSwitch: HexCoord | null;
};

export function applyTool(
  draft: EditorDraft,
  tool: EditorTool,
  coord: HexCoord,
  tileOptions: TilePlacementOptions = {},
  pending: EditorPending = { linkTileId: null, toggleSwitch: null },
): EditorPending {
  const { q, r } = coord;

  switch (tool) {
    case 'cell':
      addCell(draft, q, r);
      return pending;
    case 'tile':
      addOrCycleTile(draft, q, r, tileOptions);
      return pending;
    case 'wall':
      toggleWall(draft, q, r);
      return pending;
    case 'hole':
      toggleHole(draft, q, r);
      return pending;
    case 'frozen':
      toggleTileFrozen(draft, q, r);
      return pending;
    case 'oneway':
      toggleOneWayWall(draft, q, r);
      return pending;
    case 'rotator':
      toggleRotator(draft, q, r);
      return pending;
    case 'teleporter':
      toggleTeleporter(draft, q, r);
      return pending;
    case 'crumble':
      toggleCrumbling(draft, q, r);
      return pending;
    case 'crate':
      toggleCrate(draft, q, r);
      return pending;
    case 'splitter':
      toggleSplitter(draft, q, r);
      return pending;
    case 'magnet':
      toggleMagnet(draft, q, r);
      return pending;
    case 'toggle': {
      if (!pending.toggleSwitch) {
        return { ...pending, toggleSwitch: { q, r } };
      }
      if (pending.toggleSwitch.q === q && pending.toggleSwitch.r === r) {
        return { ...pending, toggleSwitch: null };
      }
      addToggleGate(draft, pending.toggleSwitch, { q, r });
      return { ...pending, toggleSwitch: null };
    }
    case 'link': {
      const tile = findTile(draft, q, r);
      if (!tile) return pending;
      if (!pending.linkTileId) return { ...pending, linkTileId: tile.id };
      if (pending.linkTileId === tile.id) return { ...pending, linkTileId: null };
      const first = draft.tiles.find((entry) => entry.id === pending.linkTileId);
      if (!first) return { ...pending, linkTileId: tile.id };
      linkTiles(draft, first, tile);
      return { ...pending, linkTileId: null };
    }
    case 'erase':
      removeCell(draft, q, r);
      return pending;
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
