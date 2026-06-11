import { parseLevelJson, readClipboardText } from '../core/levelImport';
import { draftFromLevel } from './editorState';
import type { EditorDraft } from './editorState';

export type ImportDraftSuccess = {
  ok: true;
  draft: EditorDraft;
};

export type ImportDraftFailure = {
  ok: false;
  message: string;
};

export type ImportDraftResult = ImportDraftSuccess | ImportDraftFailure;

export function importDraftFromJson(text: string): ImportDraftResult {
  const parsed = parseLevelJson(text);
  if (!parsed.ok) {
    return parsed;
  }

  return {
    ok: true,
    draft: draftFromLevel(parsed.level),
  };
}

export { readClipboardText };
