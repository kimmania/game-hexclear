import { normalizeColorblindMode, type ColorblindMode } from '../core/tileColors';

export type BoardZoomMode = 'auto' | 'off';

export type ThemeMode = 'dark' | 'light';

export type GameSettings = {
  sound: boolean;
  reducedMotion: boolean;
  /** Allow one-step undo during play. */
  undo: boolean;
  colorblindMode: ColorblindMode;
  /** Scale up dense boards for easier tapping. */
  boardZoom: BoardZoomMode;
  theme: ThemeMode;
};

const STORAGE_KEY = 'hexclear-settings';

const DEFAULTS: GameSettings = {
  sound: true,
  reducedMotion: false,
  undo: false,
  colorblindMode: 'off',
  boardZoom: 'auto',
  theme: 'dark',
};

function parseColorblindMode(value: unknown): ColorblindMode {
  return normalizeColorblindMode(value);
}

function parseBoardZoom(value: unknown): BoardZoomMode {
  return value === 'off' ? 'off' : 'auto';
}

function parseTheme(value: unknown): ThemeMode {
  return value === 'light' ? 'light' : 'dark';
}

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS, reducedMotion: prefersReducedMotion() };
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return {
      sound: parsed.sound ?? DEFAULTS.sound,
      reducedMotion: parsed.reducedMotion ?? prefersReducedMotion(),
      undo: parsed.undo ?? DEFAULTS.undo,
      colorblindMode: parseColorblindMode(parsed.colorblindMode),
      boardZoom: parseBoardZoom(parsed.boardZoom),
      theme: parseTheme(parsed.theme),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings: GameSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Cell count at which auto board zoom kicks in. */
export const DENSE_BOARD_CELL_THRESHOLD = 22;

export function shouldZoomBoard(cellCount: number, boardZoom: BoardZoomMode): boolean {
  return boardZoom === 'auto' && cellCount >= DENSE_BOARD_CELL_THRESHOLD;
}
