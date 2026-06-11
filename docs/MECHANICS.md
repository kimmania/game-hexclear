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

Tutorial levels: **31** (one-way), **32** (rotator), **33** (linked pair).

## Ideas for later levels

These are not implemented yet — candidates for future packs:

- **Teleporters** — paired portals; exiting one re-enters at the other with preserved or rotated direction
- **Toggle gates** — slide past a switch to flip a wall or one-way on/off elsewhere
- **Direction locks** — cell that forces a specific exit direction (one-way for all dirs except one)
- **Crumbling tiles** — tile hex vanishes after a slide crosses it (limits re-use of paths)
- **Push crates** — heavy blocks that slide like tiles but don't auto-clear; must reach a goal or hole
- **Color gates** — only tiles whose direction color matches may pass (needs alternate win condition or mixed rules)
- **Delayed rotators** — rotate the tile one beat after leaving the cell (timing puzzles in animated mode)
- **Splitters** — linked group breaks apart when crossing a marked cell
- **Ice patches** — slide continues one extra hex in the same direction after leaving ice
- **Magnets** — non-linked tiles pulled one step toward a pole when a neighbor clears

When adding a mechanic, update `board.ts`, `validateLevel.ts`, the solver BFS, editor tools, and ship at least one tutorial level.
