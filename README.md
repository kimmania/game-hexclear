# Hex Clear

A mobile-first hex tile logic puzzle PWA. Tap colorful hexes to slide them off the board — but only when their path is clear. Order matters.

Inspired by the *hex slide* puzzle genre (arrow tiles, sequencing, relaxing play). Original levels and artwork.

## How to play

1. **Tap a hex tile** to slide it in the direction its arrow points.
2. **Color matches direction** — each arrow direction always uses the same color:

   | Direction | Color |
   |-----------|-------|
   | East | coral |
   | Northeast | sky |
   | Northwest | mint |
   | West | gold |
   | Southwest | lavender |
   | Southeast | rose |

3. The tile moves along that line until it **leaves the board**.
4. If another tile or wall is in the way, the move is **blocked**.
5. **Holes** in the board swallow any tile that slides over them.
6. **Frozen** tiles cannot slide while another tile sits next to them — clear neighbors first, then slide through the gap they leave.
7. **Clear every hex** to win the level. Beat **par** for a perfect score.

## Features

- 30 puzzle levels with progressive difficulty (frozen tiles from level 6, walls from level 11, holes from level 18)
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

Open the URL from the terminal (usually `http://localhost:5173/game-hexclear/`).

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
| **Erase** | Remove a cell and its contents |

Set **Frozen** when placing tiles (color is set automatically from arrow direction). Optional **Par** is the target move count.

**Download .json** or **Copy JSON** runs schema + solvability checks first. To ship a level: save to `public/levels/{id}.json`, add the id to `index.json`, run `npm run validate-levels`.

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

Levels live in `public/levels/*.json`. Add an id to `public/levels/index.json` to ship a new puzzle.

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
