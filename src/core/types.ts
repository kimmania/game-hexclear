export type HexCoord = {
  q: number;
  r: number;
};

/** 0 = E, 1 = NE, 2 = NW, 3 = W, 4 = SW, 5 = SE (pointy-top axial). */
export type HexDirection = 0 | 1 | 2 | 3 | 4 | 5;

export type TileColor =
  | 'coral'
  | 'sky'
  | 'mint'
  | 'gold'
  | 'lavender'
  | 'rose';

export type TileDef = {
  id: string;
  q: number;
  r: number;
  dir: HexDirection;
  /** Cannot slide while a tile occupies an adjacent hex. */
  frozen?: boolean;
  /** Partner tile id — both move together when either is tapped. */
  linked?: string;
};

export type CrateDef = {
  id: string;
  q: number;
  r: number;
};

/** Blocks entering this cell when sliding in the given direction. */
export type OneWayWallDef = {
  q: number;
  r: number;
  dir: HexDirection;
};

/** Rotates a sliding tile's direction when it passes through this cell. */
export type RotatorDef = {
  q: number;
  r: number;
  /** Clockwise steps (default 1). Use -1 for counter-clockwise. */
  turn?: 1 | -1 | 2;
};

/** Paired portal — same `group` teleports between cells, preserving direction. */
export type TeleporterDef = {
  q: number;
  r: number;
  group: string;
};

/** Slide over the switch toggles whether the gate hex blocks. */
export type ToggleGateDef = {
  switchQ: number;
  switchR: number;
  gateQ: number;
  gateR: number;
  /** When true the gate starts open (passable). Default false. */
  open?: boolean;
};

export type LevelDef = {
  id: number;
  name: string;
  cells: HexCoord[];
  tiles: TileDef[];
  walls?: HexCoord[];
  holes?: HexCoord[];
  oneWayWalls?: OneWayWallDef[];
  rotators?: RotatorDef[];
  teleporters?: TeleporterDef[];
  toggleGates?: ToggleGateDef[];
  /** Cells that vanish after a slide crosses them once. */
  crumbling?: HexCoord[];
  crates?: CrateDef[];
  /** Cells that break linked pairs when crossed. */
  splitters?: HexCoord[];
  /** Attracts adjacent tiles one step closer when a neighbor clears. */
  magnets?: HexCoord[];
  /** Target move count for an optimal clear. */
  par?: number;
};

export type TileState = {
  id: string;
  q: number;
  r: number;
  dir: HexDirection;
  frozen?: boolean;
  linked?: string;
};

export type CrateState = {
  id: string;
  q: number;
  r: number;
};

export type GameStatus = 'playing' | 'won';

export type GameState = {
  levelId: number;
  levelName: string;
  status: GameStatus;
  cells: HexCoord[];
  walls: HexCoord[];
  holes: HexCoord[];
  oneWayWalls: OneWayWallDef[];
  rotators: RotatorDef[];
  teleporters: TeleporterDef[];
  toggleGates: ToggleGateDef[];
  crumbling: HexCoord[];
  splitters: HexCoord[];
  magnets: HexCoord[];
  tiles: TileState[];
  crates: CrateState[];
  /** Cell keys that have crumbled and are no longer passable. */
  crumbledKeys: string[];
  /** Per gate index — true when passable. */
  gateOpen: boolean[];
  moveCount: number;
  par?: number;
};

export type SlideBlockReason = 'blocked' | 'missing' | 'finished' | 'frozen';

export type SlideAnimation = {
  tileId: TileId;
  path: HexCoord[];
};

export type SlideResult =
  | { ok: true; path: HexCoord[]; animations: SlideAnimation[] }
  | { ok: false; reason: SlideBlockReason; bounceAnimations?: SlideAnimation[] };

export type TileId = string;
