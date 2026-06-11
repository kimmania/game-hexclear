export type GameSettings = {
  sound: boolean;
  reducedMotion: boolean;
  /** Allow one-step undo during play. */
  undo: boolean;
};

const STORAGE_KEY = 'hexclear-settings';

const DEFAULTS: GameSettings = {
  sound: true,
  reducedMotion: false,
  undo: false,
};

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS, reducedMotion: prefersReducedMotion() };
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return {
      sound: parsed.sound ?? DEFAULTS.sound,
      reducedMotion: parsed.reducedMotion ?? prefersReducedMotion(),
      undo: parsed.undo ?? DEFAULTS.undo,
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
