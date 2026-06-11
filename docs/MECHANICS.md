# Hex Clear — mechanics reference

## Shipped tile & board features

| Feature | JSON field | Behavior |
|---------|------------|----------|
| **Tiles** | `tiles[]` | Slide in arrow direction until off board or hole |
| **Walls** | `walls[]` | Block all entry |
| **Holes** | `holes[]` | Swallow sliding tiles |
| **Frozen** | `tile.frozen` | Locked while any neighbor tile remains |
| **One-way walls** | `oneWayWalls[]` | `{ q, r, dir }` blocks entering that cell when moving in `dir` |
| **Rotators** | `rotators[]` | `{ q, r, turn? }` rotates slide direction clockwise (`1`, default), counter-clockwise (`-1`), or 180° (`2`) |
| **Linked pairs** | `tile.linked` | Mutual id link; tapping either slides both in the tapped tile's direction |
| **Teleporters** | `teleporters[]` | `{ q, r, group }` — paired portals (same `group`) warp slides, preserving direction; each group fires at most once per slide |
| **Toggle gates** | `toggleGates[]` | `{ switchQ, switchR, gateQ, gateR, open? }` — leaving the switch toggles the gate hex |
| **Crumbling paths** | `crumbling[]` | Hex coords that vanish after a slide crosses them once |
| **Push crates** | `crates[]` | `{ id, q, r }` — block slides but can be pushed (into holes or off-board) |
| **Splitters** | `splitters[]` | Linked pairs break apart when they cross a splitter cell |
| **Magnets** | `magnets[]` | When a neighbor clears, unlinked tiles pull one step toward the nearest magnet |

Tutorial levels:

| Levels | Mechanic |
|--------|----------|
| 31–33 | One-way, rotator, linked pair |
| 34–39 | Teleporter, toggle gate, crumbling, crate, splitter, magnet |

## Ideas for later levels

- **Direction locks** — cell that forces a specific exit direction
- **Color gates** — only matching direction colors may pass
- **Delayed rotators** — rotate one beat after leaving the cell
- **Ice patches** — slide continues one extra hex after leaving ice
- **Toggle one-ways** — switches that flip directional barriers elsewhere

When adding a mechanic, update `slideEngine.ts`, `board.ts`, `validateLevel.ts`, the solver BFS, editor tools, and ship at least one tutorial level.
