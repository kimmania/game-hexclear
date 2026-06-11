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

export type LevelDef = {
  id: number;
  name: string;
  cells: HexCoord[];
  tiles: TileDef[];
  walls?: HexCoord[];
  holes?: HexCoord[];
  oneWayWalls?: OneWayWallDef[];
  rotators?: RotatorDef[];
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
  tiles: TileState[];
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
  | { ok: false; reason: SlideBlockReason };

export type TileId = string;
