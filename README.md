# Hex Clear

A mobile-first hex tile logic puzzle PWA. Tap colorful hexes to slide them off the board — but only when their path is clear. Order matters.

Inspired by the *hex slide* puzzle genre (arrow tiles, sequencing, relaxing play). Original levels and artwork.

## How to play

1. **Tap a hex tile** to slide it in the direction its arrow points.
2. The tile moves along that line until it **leaves the board**.
3. If another tile or wall is in the way, the move is **blocked**.
4. **Clear every hex** to win the level.

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
