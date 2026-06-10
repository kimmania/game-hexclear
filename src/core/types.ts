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
  color: TileColor;
  /** Cannot slide while a tile occupies an adjacent hex. */
  frozen?: boolean;
  /** Lower numbers must be cleared before this tile can slide. */
  chain?: number;
};

export type LevelDef = {
  id: number;
  name: string;
  cells: HexCoord[];
  tiles: TileDef[];
  walls?: HexCoord[];
  holes?: HexCoord[];
  /** Target move count for an optimal clear. */
  par?: number;
};

export type TileState = {
  id: string;
  q: number;
  r: number;
  dir: HexDirection;
  color: TileColor;
  frozen?: boolean;
  chain?: number;
};

export type GameStatus = 'playing' | 'won';

export type GameState = {
  levelId: number;
  levelName: string;
  status: GameStatus;
  cells: HexCoord[];
  walls: HexCoord[];
  holes: HexCoord[];
  tiles: TileState[];
  moveCount: number;
  par?: number;
};

export type SlideBlockReason = 'blocked' | 'missing' | 'finished' | 'frozen' | 'chain';

export type SlideResult =
  | { ok: true; path: HexCoord[] }
  | { ok: false; reason: SlideBlockReason };

export type TileId = string;
