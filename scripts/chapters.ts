import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export type ChapterRange = { name: string; from: number; to: number };

const chaptersPath = join(dirname(fileURLToPath(import.meta.url)), 'chapters.json');

export function loadChapters(): ChapterRange[] {
  const raw = readFileSync(chaptersPath, 'utf8');
  const data = JSON.parse(raw) as ChapterRange[];
  return data.map((entry) => ({ ...entry })).sort((a, b) => a.from - b.from);
}

export function saveChapters(chapters: ChapterRange[]): void {
  const sorted = [...chapters].sort((a, b) => a.from - b.from);
  writeFileSync(chaptersPath, `${JSON.stringify(sorted, null, 2)}\n`);
}

export function chapterForLevel(chapters: ChapterRange[], levelId: number): ChapterRange | undefined {
  return chapters.find((chapter) => levelId >= chapter.from && levelId <= chapter.to);
}

/** Returns true when two inclusive id ranges overlap. */
export function chapterRangesOverlap(a: ChapterRange, b: ChapterRange): boolean {
  return a.from <= b.to && b.from <= a.to;
}

export type UpsertChapterResult =
  | { ok: true; chapters: ChapterRange[] }
  | { ok: false; message: string };

/**
 * Adds or extends a named chapter to cover `from`–`to`. Fails if the new range
 * would overlap a different chapter.
 */
export function upsertChapter(
  chapters: ChapterRange[],
  name: string,
  from: number,
  to: number,
): UpsertChapterResult {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from) {
    return { ok: false, message: 'Chapter range must be positive integers with from ≤ to.' };
  }

  const existing = chapters.find((chapter) => chapter.name === name);
  const nextFrom = existing ? Math.min(existing.from, from) : from;
  const nextTo = existing ? Math.max(existing.to, to) : to;
  const candidate: ChapterRange = { name, from: nextFrom, to: nextTo };

  for (const chapter of chapters) {
    if (chapter.name === name) continue;
    if (chapterRangesOverlap(chapter, candidate)) {
      return {
        ok: false,
        message: `Chapter "${name}" (${nextFrom}–${nextTo}) overlaps "${chapter.name}" (${chapter.from}–${chapter.to}).`,
      };
    }
  }

  const next = existing
    ? chapters.map((chapter) => (chapter.name === name ? candidate : chapter))
    : [...chapters, candidate];

  return { ok: true, chapters: next.sort((a, b) => a.from - b.from) };
}
