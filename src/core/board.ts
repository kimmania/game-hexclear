import { coordKey } from './hex';
import {
  applyMagnetPull,
  buildSlideContext,
  collectCratesFromContext,
  simulateEntitySlide,
  simulatePairSlide,
  slideCompletes,
} from './slideEngine';
import type {
  GameState,
  HexCoord,
  LevelDef,
  SlideAnimation,
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
    teleporters: (level.teleporters ?? []).map((teleporter) => ({ ...teleporter })),
    toggleGates: (level.toggleGates ?? []).map((gate) => ({ ...gate })),
    crumbling: (level.crumbling ?? []).map((cell) => ({ ...cell })),
    splitters: (level.splitters ?? []).map((cell) => ({ ...cell })),
    magnets: (level.magnets ?? []).map((cell) => ({ ...cell })),
    tiles: level.tiles.map((tile) => ({
      id: tile.id,
      q: tile.q,
      r: tile.r,
      dir: tile.dir,
      ...(tile.frozen ? { frozen: true } : {}),
      ...(tile.linked ? { linked: tile.linked } : {}),
    })),
    crates: (level.crates ?? []).map((crate) => ({ ...crate })),
    crumbledKeys: [],
    gateOpen: (level.toggleGates ?? []).map((gate) => gate.open === true),
    moveCount: 0,
    ...(level.par !== undefined ? { par: level.par } : {}),
  };
}

export function hasAdjacentTile(state: GameState, tile: TileState): boolean {
  const deltas = [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 },
  ];
  for (const delta of deltas) {
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

type SlideComputation = {
  ok: true;
  path: HexCoord[];
  animations: SlideAnimation[];
  ctx: ReturnType<typeof buildSlideContext>;
  unlinkedTileIds: string[];
};

type SlideFailure = {
  ok: false;
  reason: SlideBlockReason;
  bounceAnimations?: SlideAnimation[];
};

function blockedFailure(
  reason: SlideBlockReason,
  bounceAnimations?: SlideAnimation[],
): SlideFailure {
  return { ok: false, reason, bounceAnimations };
}

function computeSlide(state: GameState, leader: TileState): SlideComputation | SlideFailure {
  const partner = findLinkedPartner(state, leader);
  const ignore = new Set<TileId>([leader.id]);
  if (partner) ignore.add(partner.id);

  if (isFrozenLocked(state, leader) || (partner && isFrozenLocked(state, partner))) {
    return blockedFailure('frozen');
  }

  const ctx = buildSlideContext(state, ignore);

  if (partner) {
    const { leaderPath, partnerPath, sideEffects, cleared, blockedByTile } = simulatePairSlide(
      { q: leader.q, r: leader.r },
      { q: partner.q, r: partner.r },
      leader.dir,
      leader.id,
      partner.id,
      ctx,
    );

    if (leaderPath.length <= 1 || !cleared) {
      const bounceAnimations =
        blockedByTile && leaderPath.length > 1
          ? [
              { tileId: leader.id, path: leaderPath },
              ...(partnerPath.length > 1 ? [{ tileId: partner.id, path: partnerPath }] : []),
            ]
          : undefined;
      return blockedFailure('blocked', bounceAnimations);
    }

    return {
      ok: true,
      path: leaderPath,
      animations: [
        { tileId: leader.id, path: leaderPath },
        { tileId: partner.id, path: partnerPath },
      ],
      ctx,
      unlinkedTileIds: sideEffects.unlinkedTileIds,
    };
  }

  const result = simulateEntitySlide({ q: leader.q, r: leader.r }, leader.dir, ctx);
  if (result.path.length <= 1 || !slideCompletes(result)) {
    const bounceAnimations =
      result.blockedByTile && result.path.length > 1
        ? [{ tileId: leader.id, path: result.path }]
        : undefined;
    return blockedFailure('blocked', bounceAnimations);
  }

  return {
    ok: true,
    path: result.path,
    animations: [{ tileId: leader.id, path: result.path }],
    ctx,
    unlinkedTileIds: result.sideEffects.unlinkedTileIds,
  };
}

export function slideBlockReason(state: GameState, tile: TileState): SlideBlockReason | null {
  const result = computeSlide(state, tile);
  return result.ok ? null : result.reason;
}

export function canSlideTile(state: GameState, tileId: TileId): SlideResult {
  if (state.status !== 'playing') {
    return { ok: false, reason: 'finished' };
  }

  const tile = state.tiles.find((entry) => entry.id === tileId);
  if (!tile) {
    return { ok: false, reason: 'missing' };
  }

  const result = computeSlide(state, tile);
  if (!result.ok) {
    return {
      ok: false,
      reason: result.reason,
      ...(result.bounceAnimations ? { bounceAnimations: result.bounceAnimations } : {}),
    };
  }

  return {
    ok: true,
    path: result.path,
    animations: result.animations,
  };
}

export function recordMove(state: GameState): GameState {
  return { ...state, moveCount: state.moveCount + 1 };
}

export function applySlide(state: GameState, tileId: TileId): GameState {
  const tile = state.tiles.find((entry) => entry.id === tileId);
  if (!tile) return state;

  const result = computeSlide(state, tile);
  if (!result.ok) return state;

  const removeIds = new Set(result.animations.map((entry) => entry.tileId));
  const clearedTileKeys = state.tiles
    .filter((entry) => removeIds.has(entry.id))
    .map((entry) => coordKey(entry));

  let tiles = state.tiles.filter((entry) => !removeIds.has(entry.id));
  if (result.unlinkedTileIds.length > 0) {
    const unlinked = new Set(result.unlinkedTileIds);
    tiles = tiles.map((entry) => {
      if (!unlinked.has(entry.id)) return entry;
      const next = copyTile(entry);
      delete next.linked;
      return next;
    });
  }

  let next: GameState = {
    ...state,
    tiles,
    gateOpen: [...result.ctx.gateOpen],
    crumbledKeys: [...result.ctx.crumbledKeys],
    crates: collectCratesFromContext(result.ctx),
  };

  if (next.tiles.length === 0) {
    next.status = 'won';
  }

  next = applyMagnetPull(next, clearedTileKeys);
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
    teleporters: state.teleporters.map((teleporter) => ({ ...teleporter })),
    toggleGates: state.toggleGates.map((gate) => ({ ...gate })),
    crumbling: state.crumbling.map((cell) => ({ ...cell })),
    splitters: state.splitters.map((cell) => ({ ...cell })),
    magnets: state.magnets.map((cell) => ({ ...cell })),
    tiles: state.tiles.map(copyTile),
    crates: state.crates.map((crate) => ({ ...crate })),
    crumbledKeys: [...state.crumbledKeys],
    gateOpen: [...state.gateOpen],
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
