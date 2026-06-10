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
};

export type LevelDef = {
  id: number;
  name: string;
  cells: HexCoord[];
  tiles: TileDef[];
  walls?: HexCoord[];
  /** Pit cells — tiles slide in and are removed; nothing can start here. */
  holes?: HexCoord[];
};

export type TileState = {
  id: string;
  q: number;
  r: number;
  dir: HexDirection;
  color: TileColor;
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
};

export type SlideResult =
  | { ok: true; path: HexCoord[] }
  | { ok: false; reason: 'blocked' | 'missing' | 'finished' };

export type TileId = string;
