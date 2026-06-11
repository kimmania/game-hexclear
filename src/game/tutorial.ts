const STORAGE_KEY = 'hexclear-tutorial-dismissed';

export function isTutorialDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dismissed';
  } catch {
    return false;
  }
}

export function dismissTutorial(): void {
  try {
    localStorage.setItem(STORAGE_KEY, 'dismissed');
  } catch {
    /* storage unavailable */
  }
}

export function shouldShowLevel1Tutorial(levelId: number, isImported: boolean): boolean {
  if (isImported || levelId !== 1) return false;
  return !isTutorialDismissed();
}
