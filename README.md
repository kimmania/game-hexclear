# Hex Clear

A mobile-first hex tile logic puzzle PWA. Tap colorful hexes to slide them off the board — but only when their path is clear. Order matters.

Inspired by the *hex slide* puzzle genre (arrow tiles, sequencing, relaxing play). Original levels and artwork.

## How to play

1. **Tap a hex tile** to slide it in the direction its arrow points.
2. **Color follows direction** — the UI picks a color from the arrow direction (see `src/core/tileColors.ts` to change the palette).

3. The tile moves along that line until it **leaves the board**.
4. If another tile or wall is in the way, the move is **blocked**.
5. **Holes** in the board swallow any tile that slides over them.
6. **Frozen** tiles cannot slide while another tile sits next to them — clear neighbors first, then slide through the gap they leave.
7. **One-way walls** (from level 31) block entry from a single direction — the orange chevron shows which slides are stopped.
8. **Rotators** (from level 32) spin a tile's direction when it passes through the marked cell.
9. **Linked pairs** (from level 33) move together — tap either tile to slide both in that tile's direction.
10. **Teleporters** (level 34), **toggle gates** (35), **crumbling paths** (36), **push crates** (37), **splitters** (38), and **magnets** (39) extend routing and timing puzzles.
11. **Clear every hex** to win the level. Beat **par** for a perfect score.

## Features

- 39 puzzle levels with progressive difficulty (frozen from level 6, walls from 11, holes from 18; advanced mechanics from 31–39)
- Move counter and par targets on advanced levels; best scores saved locally
- Level picker, unlock progress, and in-progress save per level
- Settings: sound effects and reduce motion
- Light haptic feedback on supported phones
- Installable PWA with offline play

## Development

```bash
npm install
npm run generate-icons
npm run dev
```

Open the URL from the terminal (usually `http://localhost:5174/game-hexclear/`).

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Type-check and production build |
| `npm run preview` | Preview production build |
| `npm test` | Run unit tests |
| `npm run validate-levels` | BFS solvability check for every level |
| `npm run generate-icons` | Regenerate PNG icons from `public/icons/icon.svg` |
| `npm run lighthouse` | Build + preview, then run Lighthouse (mobile) |
| Level editor | Add `?edit=1` or `#edit` to the game URL (e.g. `?edit=1&level=16`) |

## Level editor

Open **`/game-hexclear/?edit=1`** in the browser.

| Tool | Action |
|------|--------|
| **Cell** | Tap ghost hexes to expand the board |
| **Tile** | Place a tile; tap again to rotate arrow (0→5) |
| **Wall** | Toggle a blocking wall on a cell |
| **Hole** | Toggle a pit — tiles fall in when slid over |
| **Frozen** | Toggle frozen lock on a tile |
| **One-way** | Toggle a directional barrier; tap to rotate, then remove |
| **Rotator** | Toggle a turnstile cell (clockwise turn) |
| **Link** | Tap two tiles to link them as a sticky pair |
| **Erase** | Remove a cell and its contents |

Set **Frozen** when placing tiles. Optional **Par** is the target move count. Level JSON stores direction only — colors are derived at render time.

Use **Generate board** to auto-fill a connected hex layout: set counts for cells, tiles (random arrows), walls, holes, and frozen tiles, then **Populate board** to replace the draft. Tweak the result by hand before export.

**Download .json** or **Copy JSON** runs schema + solvability checks first. To ship a level: save to `public/levels/{id}.json`, run `npm run generate-manifest`, then `npm run validate-levels`.

Edit an existing level: `?edit=1&level=5`

## Lighthouse (quality check)

```bash
npm run build
npm run preview
# In another terminal:
npx lighthouse http://localhost:4173/game-hexclear/ \
  --form-factor=mobile \
  --chrome-flags="--headless=new" \
  --view
```

## Levels

Levels live in `public/levels/*.json`. `public/levels/index.json` is a generated manifest (level ids, names, pars, and chapter groupings) loaded by the app in a single request — never edit it by hand. To ship a new puzzle, drop `{id}.json` into the folder and run `npm run generate-manifest` (chapter names live in `scripts/manifest.ts`; levels outside named ranges are auto-grouped into packs of 15). `npm run validate-levels` fails if the manifest is stale.

To review level layouts quickly, run `npm run generate-level-previews` — this writes PNG/SVG snapshots of every level's **initial board state** to `previews/` and opens a browsable gallery at `previews/index.html`. Pass level ids to regenerate only those levels, e.g. `npm run generate-level-previews -- 36 37`.

See `docs/MECHANICS.md` for feature reference and ideas for future level packs.

## GitHub Pages

Pushes to `main` run tests, validate levels, build, and deploy via GitHub Actions.

1. Repo **Settings → Pages → Build and deployment → Source:** GitHub Actions
2. Live site: `https://kimmania.github.io/game-hexclear/`

## Install (PWA)

Works on **HTTPS** (GitHub Pages) or `npm run preview` locally.

### iPhone / iPad (Safari)

1. Open the game in **Safari**.
2. Tap **Share** → **Add to Home Screen**.

### Android (Chrome)

1. Open the site in Chrome.
2. Menu → **Install app** or **Add to Home screen**.

## License

MIT
