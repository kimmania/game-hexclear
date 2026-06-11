import {
  AXIAL_DIRS,
  buildCellSet,
  coordKey,
  simulateSlide,
  type SlideMechanics,
} from './hex';
import type {
  GameState,
  HexCoord,
  HexDirection,
  LevelDef,
  OneWayWallDef,
  RotatorDef,
  SlideBlockReason,
  SlideResult,
  TileId,
  TileState,
} from './types';

function copyTile(tile: TileState): TileState {
  return {
    id: tile.id,
    q: tile.q,
    r: tile.r,
    dir: tile.dir,
    ...(tile.frozen ? { frozen: true } : {}),
    ...(tile.linked ? { linked: tile.linked } : {}),
  };
}

export function createGameState(level: LevelDef): GameState {
  return {
    levelId: level.id,
    levelName: level.name,
    status: 'playing',
    cells: level.cells.map((cell) => ({ ...cell })),
    walls: (level.walls ?? []).map((wall) => ({ ...wall })),
    holes: (level.holes ?? []).map((hole) => ({ ...hole })),
    oneWayWalls: (level.oneWayWalls ?? []).map((wall) => ({ ...wall })),
    rotators: (level.rotators ?? []).map((rotator) => ({ ...rotator })),
    tiles: level.tiles.map((tile) => ({
      id: tile.id,
      q: tile.q,
      r: tile.r,
      dir: tile.dir,
      ...(tile.frozen ? { frozen: true } : {}),
      ...(tile.linked ? { linked: tile.linked } : {}),
    })),
    moveCount: 0,
    ...(level.par !== undefined ? { par: level.par } : {}),
  };
}

function occupiedKeys(state: GameState, ignoreTileIds: Set<TileId> = new Set()): Set<string> {
  const keys = new Set<string>();
  for (const tile of state.tiles) {
    if (ignoreTileIds.has(tile.id)) continue;
    keys.add(coordKey(tile));
  }
  for (const wall of state.walls) {
    keys.add(coordKey(wall));
  }
  return keys;
}

function slideMechanics(state: GameState, ignoreTileIds: Set<TileId>): SlideMechanics {
  return {
    cells: buildCellSet(state.cells),
    holes: buildCellSet(state.holes),
    blocked: occupiedKeys(state, ignoreTileIds),
    oneWayWalls: state.oneWayWalls,
    rotators: state.rotators,
  };
}

export function hasAdjacentTile(state: GameState, tile: TileState): boolean {
  for (const delta of AXIAL_DIRS) {
    const nq = tile.q + delta.q;
    const nr = tile.r + delta.r;
    if (state.tiles.some((other) => other.id !== tile.id && other.q === nq && other.r === nr)) {
      return true;
    }
  }
  return false;
}

export function isFrozenLocked(state: GameState, tile: TileState): boolean {
  return tile.frozen === true && hasAdjacentTile(state, tile);
}

function findLinkedPartner(state: GameState, tile: TileState): TileState | undefined {
  if (!tile.linked) return undefined;
  const partner = state.tiles.find((entry) => entry.id === tile.linked);
  if (!partner || partner.linked !== tile.id) return undefined;
  return partner;
}

function oneWayKey(q: number, r: number, dir: HexDirection): string {
  return `${q},${r}:${dir}`;
}

function buildOneWaySet(oneWayWalls: OneWayWallDef[]): Set<string> {
  return new Set(oneWayWalls.map((wall) => oneWayKey(wall.q, wall.r, wall.dir)));
}

function rotatorAt(rotators: RotatorDef[], coord: HexCoord): RotatorDef | undefined {
  return rotators.find((entry) => entry.q === coord.q && entry.r === coord.r);
}

function applyTurn(dir: HexDirection, turn: 1 | -1 | 2): HexDirection {
  const steps = turn === -1 ? 5 : turn;
  return ((dir + steps) % 6) as HexDirection;
}

function simulatePairSlide(
  leaderStart: HexCoord,
  partnerStart: HexCoord,
  slideDir: HexDirection,
  mechanics: SlideMechanics,
): { leaderPath: HexCoord[]; partnerPath: HexCoord[]; removed: boolean } {
  const oneWays = buildOneWaySet(mechanics.oneWayWalls);
  const leaderPath: HexCoord[] = [leaderStart];
  const partnerPath: HexCoord[] = [partnerStart];
  let leader = leaderStart;
  let partner = partnerStart;
  let dir = slideDir;

  while (true) {
    const nextLeader = { q: leader.q + AXIAL_DIRS[dir].q, r: leader.r + AXIAL_DIRS[dir].r };
    const nextPartner = { q: partner.q + AXIAL_DIRS[dir].q, r: partner.r + AXIAL_DIRS[dir].r };

    for (const next of [nextLeader, nextPartner]) {
      if (oneWays.has(oneWayKey(next.q, next.r, dir))) {
        return {
          leaderPath: leaderPath.length === 1 ? [] : leaderPath,
          partnerPath: partnerPath.length === 1 ? [] : partnerPath,
          removed: false,
        };
      }
    }

    for (const next of [nextLeader, nextPartner]) {
      const nextKey = coordKey(next);
      if (mechanics.holes.has(nextKey)) {
        leaderPath.push(nextLeader);
        partnerPath.push(nextPartner);
        return { leaderPath, partnerPath, removed: true };
      }
    }

    for (const next of [nextLeader, nextPartner]) {
      const nextKey = coordKey(next);
      if (!mechanics.cells.has(nextKey)) {
        leaderPath.push(nextLeader);
        partnerPath.push(nextPartner);
        return { leaderPath, partnerPath, removed: true };
      }
    }

    for (const next of [nextLeader, nextPartner]) {
      if (mechanics.blocked.has(coordKey(next))) {
        return {
          leaderPath: leaderPath.length === 1 ? [] : leaderPath,
          partnerPath: partnerPath.length === 1 ? [] : partnerPath,
          removed: false,
        };
      }
    }

    leaderPath.push(nextLeader);
    partnerPath.push(nextPartner);
    leader = nextLeader;
    partner = nextPartner;

    const leaderRotator = rotatorAt(mechanics.rotators, leader);
    const partnerRotator = rotatorAt(mechanics.rotators, partner);
    if (leaderRotator) {
      dir = applyTurn(dir, leaderRotator.turn ?? 1);
    } else if (partnerRotator) {
      dir = applyTurn(dir, partnerRotator.turn ?? 1);
    }
  }
}

function slideGroup(state: GameState, leader: TileState): SlideResult {
  const partner = findLinkedPartner(state, leader);
  const ignore = new Set<TileId>([leader.id]);
  if (partner) ignore.add(partner.id);

  const mechanics = slideMechanics(state, ignore);

  if (partner) {
    if (isFrozenLocked(state, leader) || isFrozenLocked(state, partner)) {
      return { ok: false, reason: 'frozen' };
    }

    const { leaderPath, partnerPath } = simulatePairSlide(
      { q: leader.q, r: leader.r },
      { q: partner.q, r: partner.r },
      leader.dir,
      mechanics,
    );

    if (leaderPath.length <= 1) {
      return { ok: false, reason: 'blocked' };
    }

    return {
      ok: true,
      path: leaderPath,
      animations: [
        { tileId: leader.id, path: leaderPath },
        { tileId: partner.id, path: partnerPath },
      ],
    };
  }

  if (isFrozenLocked(state, leader)) {
    return { ok: false, reason: 'frozen' };
  }

  const { path } = simulateSlide({ q: leader.q, r: leader.r }, leader.dir, mechanics);
  if (path.length <= 1) {
    return { ok: false, reason: 'blocked' };
  }

  return {
    ok: true,
    path,
    animations: [{ tileId: leader.id, path }],
  };
}

export function slideBlockReason(state: GameState, tile: TileState): SlideBlockReason | null {
  const result = slideGroup(state, tile);
  if (!result.ok) return result.reason;
  return null;
}

export function canSlideTile(state: GameState, tileId: TileId): SlideResult {
  if (state.status !== 'playing') {
    return { ok: false, reason: 'finished' };
  }

  const tile = state.tiles.find((entry) => entry.id === tileId);
  if (!tile) {
    return { ok: false, reason: 'missing' };
  }

  return slideGroup(state, tile);
}

export function recordMove(state: GameState): GameState {
  return { ...state, moveCount: state.moveCount + 1 };
}

export function applySlide(state: GameState, tileId: TileId): GameState {
  const result = canSlideTile(state, tileId);
  if (!result.ok) {
    return state;
  }

  const removeIds = new Set(result.animations.map((entry) => entry.tileId));

  const next: GameState = {
    ...state,
    tiles: state.tiles.filter((tile) => !removeIds.has(tile.id)),
  };

  if (next.tiles.length === 0) {
    next.status = 'won';
  }

  return recordMove(next);
}

export function isWin(state: GameState): boolean {
  return state.status === 'won';
}

export function cloneState(state: GameState): GameState {
  return {
    levelId: state.levelId,
    levelName: state.levelName,
    status: state.status,
    cells: state.cells.map((cell) => ({ ...cell })),
    walls: state.walls.map((wall) => ({ ...wall })),
    holes: state.holes.map((hole) => ({ ...hole })),
    oneWayWalls: state.oneWayWalls.map((wall) => ({ ...wall })),
    rotators: state.rotators.map((rotator) => ({ ...rotator })),
    tiles: state.tiles.map(copyTile),
    moveCount: state.moveCount,
    ...(state.par !== undefined ? { par: state.par } : {}),
  };
}

export function resetGameState(level: LevelDef): GameState {
  return createGameState(level);
}

export function statusLabel(state: GameState): string {
  if (state.status === 'won') return 'Cleared';
  return 'Playing';
}

export function tilesRemaining(state: GameState): number {
  return state.tiles.length;
}

export function findTileAt(state: GameState, q: number, r: number): TileState | undefined {
  return state.tiles.find((tile) => tile.q === q && tile.r === r);
}

export function hintForBlockReason(reason: SlideBlockReason): string {
  switch (reason) {
    case 'frozen':
      return 'That hex is frozen — clear its neighbors first.';
    case 'blocked':
      return 'That hex is blocked — clear the path first.';
    default:
      return 'That move is not available.';
  }
}
