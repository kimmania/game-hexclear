import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  dismissTutorial,
  isTutorialDismissed,
  shouldShowLevel1Tutorial,
} from '../src/game/tutorial';

describe('level 1 tutorial', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      key: (index: number) => [...store.keys()][index] ?? null,
      get length() {
        return store.size;
      },
      clear: () => store.clear(),
    });
  });

  it('shows on level 1 until dismissed', () => {
    expect(shouldShowLevel1Tutorial(1, false)).toBe(true);
    dismissTutorial();
    expect(isTutorialDismissed()).toBe(true);
    expect(shouldShowLevel1Tutorial(1, false)).toBe(false);
  });

  it('does not show on other levels or imported play', () => {
    expect(shouldShowLevel1Tutorial(2, false)).toBe(false);
    expect(shouldShowLevel1Tutorial(1, true)).toBe(false);
  });
});
