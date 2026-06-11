import { clearEditorDraft } from '../editor/editorStorage';
import { clearAllSessions, PROGRESS_STORAGE_KEY } from './storage';

const SETTINGS_STORAGE_KEY = 'hexclear-settings';
const INSTALL_HINT_STORAGE_KEY = 'hexclear-install-hint';
const TUTORIAL_STORAGE_KEY = 'hexclear-tutorial-dismissed';

export function clearAllUserData(): void {
  localStorage.removeItem(PROGRESS_STORAGE_KEY);
  clearAllSessions();
  localStorage.removeItem(SETTINGS_STORAGE_KEY);
  clearEditorDraft();
  localStorage.removeItem(INSTALL_HINT_STORAGE_KEY);
  localStorage.removeItem(TUTORIAL_STORAGE_KEY);
}
