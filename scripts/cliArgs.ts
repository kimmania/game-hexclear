export type IntRange = { min: number; max: number };

export function parseIntRange(value: string, label: string): IntRange {
  const trimmed = value.trim();
  const rangeMatch = /^(\d+)\s*-\s*(\d+)$/.exec(trimmed);
  if (rangeMatch) {
    const min = Number(rangeMatch[1]);
    const max = Number(rangeMatch[2]);
    if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) {
      throw new Error(`${label} range must be min-max with min ≤ max.`);
    }
    return { min, max };
  }

  const single = Number(trimmed);
  if (!Number.isInteger(single) || single < 0) {
    throw new Error(`${label} must be a non-negative integer or min-max range.`);
  }
  return { min: single, max: single };
}

export function pickInt(range: IntRange, random: () => number): number {
  if (range.min === range.max) return range.min;
  return range.min + Math.floor(random() * (range.max - range.min + 1));
}

export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export type ArgMap = Map<string, string | true>;

export function parseArgs(argv: string[]): ArgMap {
  const args: ArgMap = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]!;
    if (!token.startsWith('--')) continue;

    const eq = token.indexOf('=');
    if (eq > 2) {
      args.set(token.slice(2, eq), token.slice(eq + 1));
      continue;
    }

    const key = token.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      args.set(key, next);
      i += 1;
    } else {
      args.set(key, true);
    }
  }
  return args;
}

export function argString(args: ArgMap, key: string): string | undefined {
  const value = args.get(key);
  return value === true ? undefined : value;
}

export function argFlag(args: ArgMap, key: string): boolean {
  return args.get(key) === true;
}

export function argInt(args: ArgMap, key: string): number | undefined {
  const value = argString(args, key);
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error(`--${key} must be an integer.`);
  }
  return parsed;
}
