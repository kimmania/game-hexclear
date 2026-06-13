import { findShortestSolutionMoves } from '../src/core/solver';
import { validateLevel } from '../src/core/validateLevel';
import type { LevelDef } from '../src/core/types';
import {
  populateDraft,
  validatePopulateParams,
  type PopulateParams,
} from '../src/editor/editorPopulate';
import { createEmptyDraft, toLevelDef } from '../src/editor/editorState';
import { pickInt, type IntRange } from './cliArgs';

export type BoardParamRanges = {
  cells: IntRange;
  tiles: IntRange;
  walls: IntRange;
  holes: IntRange;
  frozen: IntRange;
  crumbling: IntRange;
  rotators: IntRange;
  links: IntRange;
  portals: IntRange;
  gates: IntRange;
  crates: IntRange;
};

export type GenerateLevelOptions = {
  id: number;
  name: string;
  ranges: BoardParamRanges;
  random: () => number;
  maxAttempts?: number;
  setPar?: boolean;
  maxSolverStates?: number;
};

export type GenerateLevelSuccess = {
  ok: true;
  level: LevelDef;
  params: PopulateParams;
  attempts: number;
  statesExplored: number;
};

export type GenerateLevelFailure = {
  ok: false;
  message: string;
  attempts: number;
};

export type GenerateLevelResult = GenerateLevelSuccess | GenerateLevelFailure;

export function pickPopulateParams(ranges: BoardParamRanges, random: () => number): PopulateParams {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const params: PopulateParams = {
      cellCount: pickInt(ranges.cells, random),
      holeCount: pickInt(ranges.holes, random),
      wallCount: pickInt(ranges.walls, random),
      tileCount: pickInt(ranges.tiles, random),
      frozenCount: pickInt(ranges.frozen, random),
      crumblingCount: pickInt(ranges.crumbling, random),
      rotatorCount: pickInt(ranges.rotators, random),
      linkPairCount: pickInt(ranges.links, random),
      portalPairCount: pickInt(ranges.portals, random),
      gateCount: pickInt(ranges.gates, random),
      crateCount: pickInt(ranges.crates, random),
    };
    if (validatePopulateParams(params).ok) return params;
  }

  const cellCount = ranges.cells.min;
  const holeCount = Math.min(ranges.holes.min, cellCount);
  const wallCount = Math.min(ranges.walls.min, cellCount - holeCount);
  const tileCount = Math.min(
    Math.max(ranges.tiles.min, 1),
    cellCount - holeCount - wallCount,
  );
  const frozenCount = Math.min(ranges.frozen.min, tileCount);
  return {
    cellCount,
    tileCount,
    wallCount,
    holeCount,
    frozenCount,
    crumblingCount: ranges.crumbling.min,
    rotatorCount: ranges.rotators.min,
    linkPairCount: ranges.links.min,
    portalPairCount: ranges.portals.min,
    gateCount: ranges.gates.min,
    crateCount: ranges.crates.min,
  };
}

export function generateLevel(options: GenerateLevelOptions): GenerateLevelResult {
  const maxAttempts = options.maxAttempts ?? 40;
  const setPar = options.setPar !== false;
  const maxSolverStates = options.maxSolverStates ?? 500_000;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const params = pickPopulateParams(options.ranges, options.random);
    const draft = createEmptyDraft();
    draft.id = options.id;
    draft.name = options.name;

    const populated = populateDraft(draft, params, options.random);
    if (!populated.ok) continue;

    const level = toLevelDef(draft);

    try {
      validateLevel(level, options.id);
    } catch {
      continue;
    }

    const solved = findShortestSolutionMoves(level, { maxStates: maxSolverStates });
    if (!solved.solvable || solved.moves === null) continue;

    if (setPar) {
      level.par = solved.moves;
    }

    return {
      ok: true,
      level,
      params,
      attempts: attempt,
      statesExplored: solved.statesExplored,
    };
  }

  return {
    ok: false,
    message: `Could not generate a solvable level after ${maxAttempts} attempts.`,
    attempts: maxAttempts,
  };
}
