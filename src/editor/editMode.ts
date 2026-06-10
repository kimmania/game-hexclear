/** True when the level editor should load instead of the game. */
export function isEditMode(): boolean {
  if (typeof window === 'undefined') return false;
  if (new URLSearchParams(window.location.search).has('edit')) return true;
  const hash = window.location.hash;
  return hash === '#edit' || hash.startsWith('#edit');
}

export function gameBaseUrl(): string {
  const base = import.meta.env.BASE_URL;
  return typeof base === 'string' && base.length > 0 ? base : '/';
}
