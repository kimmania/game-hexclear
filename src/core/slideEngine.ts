import {
  buildCellSet,
  coordKey,
  parseCoordKey,
  stepCoord,
} from './hex';
import type {
  CrateState,
  GameState,
  HexCoord,
  HexDirection,
  OneWayWallDef,
  RotatorDef,
  TeleporterDef,
  TileId,
} from './types';

export type SlideSideEffects = {
  crumbledKeys: string[];
  toggledGateIndices: number[];
  crateUpdates: CrateState[];
  removedCrateIds: string[];
  unlinkedTileIds: string[];
  clearedTileKeys: string[];
};

export type EntitySlideResult = {
  path: HexCoord[];
  finalDir: HexDirection;
  /** Tile left the board via a hole, edge, or crumbled cell. */
  removed: boolean;
  /** Tile cleared after hitting a gate, wall, one-way, or unpushable crate. */
  stopped: boolean;
  /** Slide halted by another tile in the path. */
  blockedByTile: boolean;
  sideEffects: SlideSideEffects;
};

export type SlideSimulationContext = {
  cells: Set<string>;
  holes: Set<string>;
  walls: Set<string>;
  oneWayWalls: OneWayWallDef[];
  rotators: RotatorDef[];
  teleporters: TeleporterDef[];
  splitters: Set<string>;
  crumbling: Set<string>;
  crumbledKeys: Set<string>;
  gateOpen: boolean[];
  toggleGates: GameState['toggleGates'];
  crates: Map<string, CrateState>;
  ignoreTileIds: Set<TileId>;
  tileOccupancy: Map<string, TileId>;
};

function slideCompletes(result: Pick<EntitySlideResult, 'removed' | 'stopped'>): boolean {
  return result.removed || result.stopped;
}

export { slideCompletes };

function emptySideEffects(): SlideSideEffects {
  return {
    crumbledKeys: [],
    toggledGateIndices: [],
    crateUpdates: [],
    removedCrateIds: [],
    unlinkedTileIds: [],
    clearedTileKeys: [],
  };
}

function mergeSideEffects(into: SlideSideEffects, from: SlideSideEffects): void {
  into.crumbledKeys.push(...from.crumbledKeys);
  into.toggledGateIndices.push(...from.toggledGateIndices);
  into.crateUpdates.push(...from.crateUpdates);
  into.removedCrateIds.push(...from.removedCrateIds);
  into.unlinkedTileIds.push(...from.unlinkedTileIds);
  into.clearedTileKeys.push(...from.clearedTileKeys);
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

function portalAt(teleporters: TeleporterDef[], coord: HexCoord): TeleporterDef | undefined {
  return teleporters.find((entry) => entry.q === coord.q && entry.r === coord.r);
}

function teleporterDest(
  teleporters: TeleporterDef[],
  portal: TeleporterDef,
): HexCoord | undefined {
  const exit = teleporters.find(
    (entry) =>
      entry.group === portal.group && (entry.q !== portal.q || entry.r !== portal.r),
  );
  return exit ? { q: exit.q, r: exit.r } : undefined;
}

function gateClosedAt(ctx: SlideSimulationContext, coord: HexCoord): boolean {
  for (let index = 0; index < ctx.toggleGates.length; index += 1) {
    const gate = ctx.toggleGates[index]!;
    if (gate.gateQ === coord.q && gate.gateR === coord.r && !ctx.gateOpen[index]) {
      return true;
    }
  }
  return false;
}

function switchIndexAt(ctx: SlideSimulationContext, coord: HexCoord): number {
  return ctx.toggleGates.findIndex(
    (gate) => gate.switchQ === coord.q && gate.switchR === coord.r,
  );
}

function crateAt(ctx: SlideSimulationContext, coord: HexCoord): CrateState | undefined {
  for (const crate of ctx.crates.values()) {
    if (crate.q === coord.q && crate.r === coord.r) return crate;
  }
  return undefined;
}

function isTileBlocked(ctx: SlideSimulationContext, coord: HexCoord): boolean {
  const tileId = ctx.tileOccupancy.get(coordKey(coord));
  if (!tileId) return false;
  return !ctx.ignoreTileIds.has(tileId);
}

function isBlocked(ctx: SlideSimulationContext, coord: HexCoord): boolean {
  const key = coordKey(coord);
  if (ctx.walls.has(key)) return true;
  if (gateClosedAt(ctx, coord)) return true;
  if (crateAt(ctx, coord)) return true;
  if (isTileBlocked(ctx, coord)) return true;
  return false;
}

function isPassableCell(ctx: SlideSimulationContext, coord: HexCoord): boolean {
  const key = coordKey(coord);
  if (ctx.crumbledKeys.has(key)) return false;
  return ctx.cells.has(key);
}

function markCrumble(ctx: SlideSimulationContext, coord: HexCoord, effects: SlideSideEffects): void {
  const key = coordKey(coord);
  if (!ctx.crumbling.has(key) || ctx.crumbledKeys.has(key)) return;
  ctx.crumbledKeys.add(key);
  effects.crumbledKeys.push(key);
}

function toggleGate(ctx: SlideSimulationContext, index: number, effects: SlideSideEffects): void {
  if (index < 0) return;
  ctx.gateOpen[index] = !ctx.gateOpen[index];
  effects.toggledGateIndices.push(index);
}

function updateCratePosition(
  ctx: SlideSimulationContext,
  crate: CrateState,
  next: HexCoord,
  effects: SlideSideEffects,
): void {
  const updated = { id: crate.id, q: next.q, r: next.r };
  ctx.crates.set(crate.id, updated);
  effects.crateUpdates.push(updated);
}

function removeCrate(ctx: SlideSimulationContext, crateId: string, effects: SlideSideEffects): void {
  ctx.crates.delete(crateId);
  effects.removedCrateIds.push(crateId);
}

function canPushCrate(
  ctx: SlideSimulationContext,
  crate: CrateState,
  dir: HexDirection,
): HexCoord | 'hole' | 'off' | null {
  const next = stepCoord(crate, dir);
  const nextKey = coordKey(next);

  if (ctx.holes.has(nextKey)) return 'hole';
  if (!isPassableCell(ctx, next)) return 'off';
  if (isBlocked(ctx, next)) return null;

  return next;
}

function tryPushCrate(
  ctx: SlideSimulationContext,
  crate: CrateState,
  dir: HexDirection,
  effects: SlideSideEffects,
): boolean {
  const pushResult = canPushCrate(ctx, crate, dir);
  if (pushResult === null) return false;
  if (pushResult === 'hole' || pushResult === 'off') {
    removeCrate(ctx, crate.id, effects);
    return true;
  }

  const chainCrate = crateAt(ctx, pushResult);
  if (chainCrate) {
    if (!tryPushCrate(ctx, chainCrate, dir, effects)) return false;
  }

  updateCratePosition(ctx, crate, pushResult, effects);
  return true;
}

function applyCellEnterEffects(
  ctx: SlideSimulationContext,
  coord: HexCoord,
  dir: HexDirection,
  usedTeleporterGroups: Set<string>,
): { coord: HexCoord; dir: HexDirection; extraPath: HexCoord[] } {
  let position = { ...coord };
  let nextDir = dir;
  const extraPath: HexCoord[] = [];

  const rotator = rotatorAt(ctx.rotators, position);
  if (rotator) {
    nextDir = applyTurn(nextDir, rotator.turn ?? 1);
  }

  const portal = portalAt(ctx.teleporters, position);
  if (portal && !usedTeleporterGroups.has(portal.group)) {
    const dest = teleporterDest(ctx.teleporters, portal);
    if (dest && isPassableCell(ctx, dest) && !isBlocked(ctx, dest)) {
      usedTeleporterGroups.add(portal.group);
      extraPath.push({ ...dest });
      position = { ...dest };

      const exitRotator = rotatorAt(ctx.rotators, position);
      if (exitRotator) {
        nextDir = applyTurn(nextDir, exitRotator.turn ?? 1);
      }
    }
  }

  return { coord: position, dir: nextDir, extraPath };
}

function applyCellLeaveEffects(
  ctx: SlideSimulationContext,
  coord: HexCoord,
  effects: SlideSideEffects,
): void {
  const switchIdx = switchIndexAt(ctx, coord);
  if (switchIdx >= 0) {
    toggleGate(ctx, switchIdx, effects);
  }
}

export function buildSlideContext(
  state: GameState,
  ignoreTileIds: Set<TileId>,
): SlideSimulationContext {
  const effectiveCells = buildCellSet(state.cells);
  for (const key of state.crumbledKeys) {
    effectiveCells.delete(key);
  }

  const tileOccupancy = new Map<string, TileId>();
  for (const tile of state.tiles) {
    tileOccupancy.set(coordKey(tile), tile.id);
  }

  return {
    cells: effectiveCells,
    holes: buildCellSet(state.holes),
    walls: buildCellSet(state.walls),
    oneWayWalls: state.oneWayWalls,
    rotators: state.rotators,
    teleporters: state.teleporters,
    splitters: new Set(state.splitters.map(coordKey)),
    crumbling: new Set(state.crumbling.map(coordKey)),
    crumbledKeys: new Set(state.crumbledKeys),
    gateOpen: [...state.gateOpen],
    toggleGates: state.toggleGates,
    crates: new Map(state.crates.map((crate) => [crate.id, { ...crate }])),
    ignoreTileIds,
    tileOccupancy,
  };
}

export function simulateEntitySlide(
  start: HexCoord,
  startDir: HexDirection,
  ctx: SlideSimulationContext,
): EntitySlideResult {
  const oneWays = buildOneWaySet(ctx.oneWayWalls);
  const usedTeleporterGroups = new Set<string>();
  const path: HexCoord[] = [{ q: start.q, r: start.r }];
  let current = { q: start.q, r: start.r };
  let dir = startDir;
  const sideEffects = emptySideEffects();

  while (true) {
    const next = stepCoord(current, dir);
    const nextKey = coordKey(next);

    if (oneWays.has(oneWayKey(next.q, next.r, dir))) {
      return {
        path: path.length === 1 ? [] : path,
        finalDir: dir,
        removed: false,
        stopped: path.length > 1,
        blockedByTile: false,
        sideEffects,
      };
    }

    if (ctx.holes.has(nextKey)) {
      markCrumble(ctx, current, sideEffects);
      applyCellLeaveEffects(ctx, current, sideEffects);
      path.push({ ...next });
      return {
        path,
        finalDir: dir,
        removed: true,
        stopped: false,
        blockedByTile: false,
        sideEffects,
      };
    }

    if (!isPassableCell(ctx, next)) {
      markCrumble(ctx, current, sideEffects);
      applyCellLeaveEffects(ctx, current, sideEffects);
      path.push({ ...next });
      return {
        path,
        finalDir: dir,
        removed: true,
        stopped: false,
        blockedByTile: false,
        sideEffects,
      };
    }

    markCrumble(ctx, current, sideEffects);
    applyCellLeaveEffects(ctx, current, sideEffects);

    const crate = crateAt(ctx, next);
    if (crate) {
      if (!tryPushCrate(ctx, crate, dir, sideEffects)) {
        return {
          path: path.length === 1 ? [] : path,
          finalDir: dir,
          removed: false,
          stopped: false,
          blockedByTile: false,
          sideEffects,
        };
      }
    } else if (isBlocked(ctx, next)) {
      const blockedByTile = isTileBlocked(ctx, next);
      return {
        path: path.length === 1 ? [] : path,
        finalDir: dir,
        removed: false,
        stopped: path.length > 1 && !blockedByTile,
        blockedByTile,
        sideEffects,
      };
    }

    path.push({ ...next });
    current = { ...next };

    const enter = applyCellEnterEffects(ctx, current, dir, usedTeleporterGroups);
    dir = enter.dir;
    for (const extra of enter.extraPath) {
      path.push({ ...extra });
      current = { ...extra };
    }
  }
}

function mergePaths(prefix: HexCoord[], continuation: HexCoord[]): HexCoord[] {
  if (prefix.length === 0) return continuation;
  if (continuation.length === 0) return prefix;
  const last = prefix[prefix.length - 1]!;
  const first = continuation[0]!;
  if (last.q === first.q && last.r === first.r) {
    return [...prefix, ...continuation.slice(1)];
  }
  return [...prefix, ...continuation];
}

export function simulatePairSlide(
  leaderStart: HexCoord,
  partnerStart: HexCoord,
  slideDir: HexDirection,
  leaderId: TileId,
  partnerId: TileId,
  ctx: SlideSimulationContext,
): { leaderPath: HexCoord[]; partnerPath: HexCoord[]; sideEffects: SlideSideEffects; cleared: boolean; blockedByTile: boolean } {
  const oneWays = buildOneWaySet(ctx.oneWayWalls);
  const usedTeleporterGroups = new Set<string>();
  const leaderPath: HexCoord[] = [{ ...leaderStart }];
  const partnerPath: HexCoord[] = [{ ...partnerStart }];
  let leader = { ...leaderStart };
  let partner = { ...partnerStart };
  let dir = slideDir;
  let linked = true;
  const sideEffects = emptySideEffects();

  while (true) {
    if (!linked) {
      const leaderResult = simulateEntitySlide(leader, dir, ctx);
      mergeSideEffects(sideEffects, leaderResult.sideEffects);
      const partnerResult = simulateEntitySlide(partner, dir, ctx);
      mergeSideEffects(sideEffects, partnerResult.sideEffects);
      return {
        leaderPath: mergePaths(leaderPath, leaderResult.path),
        partnerPath: mergePaths(partnerPath, partnerResult.path),
        sideEffects,
        cleared: slideCompletes(leaderResult) && slideCompletes(partnerResult),
        blockedByTile: leaderResult.blockedByTile || partnerResult.blockedByTile,
      };
    }

    const nextLeader = stepCoord(leader, dir);
    const nextPartner = stepCoord(partner, dir);

    for (const next of [nextLeader, nextPartner]) {
      if (oneWays.has(oneWayKey(next.q, next.r, dir))) {
        const moved = leaderPath.length > 1 || partnerPath.length > 1;
        return {
          leaderPath: leaderPath.length === 1 ? [] : leaderPath,
          partnerPath: partnerPath.length === 1 ? [] : partnerPath,
          sideEffects,
          cleared: moved,
          blockedByTile: false,
        };
      }
    }

    for (const next of [nextLeader, nextPartner]) {
      if (ctx.holes.has(coordKey(next))) {
        leaderPath.push({ ...nextLeader });
        partnerPath.push({ ...nextPartner });
        return { leaderPath, partnerPath, sideEffects, cleared: true, blockedByTile: false };
      }
    }

    for (const next of [nextLeader, nextPartner]) {
      if (!isPassableCell(ctx, next)) {
        markCrumble(ctx, leader, sideEffects);
        markCrumble(ctx, partner, sideEffects);
        applyCellLeaveEffects(ctx, leader, sideEffects);
        applyCellLeaveEffects(ctx, partner, sideEffects);
        leaderPath.push({ ...nextLeader });
        partnerPath.push({ ...nextPartner });
        return { leaderPath, partnerPath, sideEffects, cleared: true, blockedByTile: false };
      }
    }

    markCrumble(ctx, leader, sideEffects);
    markCrumble(ctx, partner, sideEffects);
    applyCellLeaveEffects(ctx, leader, sideEffects);
    applyCellLeaveEffects(ctx, partner, sideEffects);

    for (const next of [nextLeader, nextPartner]) {
      const crate = crateAt(ctx, next);
      if (crate) {
        if (!tryPushCrate(ctx, crate, dir, sideEffects)) {
          const moved = leaderPath.length > 1 || partnerPath.length > 1;
          return {
            leaderPath: leaderPath.length === 1 ? [] : leaderPath,
            partnerPath: partnerPath.length === 1 ? [] : partnerPath,
            sideEffects,
            cleared: moved,
            blockedByTile: false,
          };
        }
      } else if (isBlocked(ctx, next)) {
        const blockedByTile = isTileBlocked(ctx, next);
        const moved = leaderPath.length > 1 || partnerPath.length > 1;
        return {
          leaderPath: leaderPath.length === 1 ? [] : leaderPath,
          partnerPath: partnerPath.length === 1 ? [] : partnerPath,
          sideEffects,
          cleared: moved && !blockedByTile,
          blockedByTile: blockedByTile && moved,
        };
      }
    }

    leaderPath.push({ ...nextLeader });
    partnerPath.push({ ...nextPartner });
    leader = { ...nextLeader };
    partner = { ...nextPartner };

    const leaderEnter = applyCellEnterEffects(ctx, leader, dir, usedTeleporterGroups);
    dir = leaderEnter.dir;
    for (const extra of leaderEnter.extraPath) {
      leaderPath.push({ ...extra });
      leader = { ...extra };
    }

    const partnerEnter = applyCellEnterEffects(ctx, partner, dir, usedTeleporterGroups);
    for (const extra of partnerEnter.extraPath) {
      partnerPath.push({ ...extra });
      partner = { ...extra };
    }

    if (ctx.splitters.has(coordKey(leader)) || ctx.splitters.has(coordKey(partner))) {
      linked = false;
      sideEffects.unlinkedTileIds.push(leaderId, partnerId);
    }
  }
}

function hexDistance(a: HexCoord, b: HexCoord): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr));
}

function directionToward(from: HexCoord, to: HexCoord): HexDirection | null {
  let bestDir: HexDirection | null = null;
  let bestDist = hexDistance(from, to);

  for (let dir = 0; dir < 6; dir += 1) {
    const next = stepCoord(from, dir as HexDirection);
    const dist = hexDistance(next, to);
    if (dist < bestDist) {
      bestDist = dist;
      bestDir = dir as HexDirection;
    }
  }

  return bestDir;
}

export function applyMagnetPull(
  state: GameState,
  clearedKeys: string[],
): GameState {
  if (state.magnets.length === 0 || clearedKeys.length === 0) {
    return state;
  }

  const tiles = state.tiles.map((tile) => ({ ...tile }));
  const tileById = new Map(tiles.map((tile) => [tile.id, tile]));
  const occupancy = new Map(tiles.map((tile) => [coordKey(tile), tile.id]));

  const walls = buildCellSet(state.walls);
  const holes = buildCellSet(state.holes);
  const crumbled = new Set(state.crumbledKeys);
  const cells = buildCellSet(state.cells);
  for (const key of crumbled) cells.delete(key);

  const crateCells = new Set(state.crates.map((crate) => coordKey(crate)));

  function gateBlocks(coord: HexCoord): boolean {
    for (let index = 0; index < state.toggleGates.length; index += 1) {
      const gate = state.toggleGates[index]!;
      if (gate.gateQ === coord.q && gate.gateR === coord.r && !state.gateOpen[index]) {
        return true;
      }
    }
    return false;
  }

  function canOccupy(coord: HexCoord): boolean {
    const key = coordKey(coord);
    if (!cells.has(key) || crumbled.has(key)) return false;
    if (walls.has(key) || holes.has(key) || gateBlocks(coord)) return false;
    if (occupancy.has(key) || crateCells.has(key)) return false;
    return true;
  }

  const pulled = new Set<string>();

  for (const clearedKey of clearedKeys) {
    const cleared = parseCoordKey(clearedKey);
    for (let dir = 0; dir < 6; dir += 1) {
      const neighbor = stepCoord(cleared, dir as HexDirection);
      const neighborKey = coordKey(neighbor);
      const tileId = occupancy.get(neighborKey);
      if (!tileId || pulled.has(tileId)) continue;

      const tile = tileById.get(tileId);
      if (!tile) continue;
      if (tile.linked && tileById.has(tile.linked)) continue;

      let nearestMagnet = state.magnets[0]!;
      let nearestDist = hexDistance(neighbor, nearestMagnet);
      for (const magnet of state.magnets.slice(1)) {
        const dist = hexDistance(neighbor, magnet);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestMagnet = magnet;
        }
      }

      if (nearestDist === 0) continue;

      const pullDir = directionToward(neighbor, nearestMagnet);
      if (pullDir === null) continue;

      const dest = stepCoord(neighbor, pullDir);
      if (!canOccupy(dest)) continue;

      occupancy.delete(neighborKey);
      occupancy.set(coordKey(dest), tileId);
      tile.q = dest.q;
      tile.r = dest.r;
      pulled.add(tileId);
    }
  }

  if (pulled.size === 0) return state;
  return { ...state, tiles };
}

export function collectCratesFromContext(ctx: SlideSimulationContext): CrateState[] {
  return [...ctx.crates.values()];
}
