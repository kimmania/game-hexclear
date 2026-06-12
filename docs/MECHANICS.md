# Hex Clear — mechanics reference

## Core slide rules

Each tile slides in its arrow direction until the slide **completes** or **collides**.

A slide **completes** when the tile is removed from the board:

| Outcome | Meaning |
|---------|---------|
| **Removed** | Tile falls off the board edge, into a **hole**, or through a **crumbled** hex (a gap left after a crumbling path breaks). |
| **Stopped** | Tile hits a **wall**, **closed gate**, **one-way barrier**, or an **unpushable crate** and clears on that hex. |

A slide **collides** when another **tile** occupies the next hex along the path before any of the above can happen. Collisions do **not** clear the sliding tile or the blocker. The board state is unchanged; the piece animates along its partial path and **bounces back** to its start. Blocked taps (including bounces) still count as a move.

Pieces do not need to be adjacent to collide — if a slide would run into another tile anywhere along its path, that is a collision. Direction and distance between start positions do not matter; only whether another tile blocks the route before a hole, crumbled gap, or board edge.

**Crumbling paths** are the main way to break a collision deadlock: once a crumbling hex has been crossed, it becomes a gap. Slides can pass through that gap and leave the board instead of meeting on the former bridge hex (see level 36).

**Push crates** are different: a tile that cannot push a crate (blocked chain or edge) is a failed push, not a tile collision — the slide does not complete and the tile does not clear.

Implementation: `slideEngine.ts` (`simulateEntitySlide`, `slideCompletes`), `board.ts` (`computeSlide`, `canSlideTile`).

## Shipped tile & board features

| Feature | JSON field | Behavior |
|---------|------------|----------|
| **Tiles** | `tiles[]` | Slide in arrow direction; clear on remove/stop outcomes above; bounce on tile collision |
| **Walls** | `walls[]` | Block entry; sliding tile stops and clears |
| **Holes** | `holes[]` | Swallow sliding tiles |
| **Frozen** | `tile.frozen` | Locked while any neighbor tile remains |
| **One-way walls** | `oneWayWalls[]` | `{ q, r, dir }` blocks entering that cell when moving in `dir` |
| **Rotators** | `rotators[]` | `{ q, r, turn? }` rotates slide direction clockwise (`1`, default), counter-clockwise (`-1`), or 180° (`2`) |
| **Linked pairs** | `tile.linked` | Mutual id link; tapping either slides both in the tapped tile's direction; both must complete or the slide is blocked (with bounce if stopped by a tile) |
| **Teleporters** | `teleporters[]` | `{ q, r, group }` — paired portals (same `group`) warp slides, preserving direction; each group fires at most once per slide |
| **Toggle gates** | `toggleGates[]` | `{ switchQ, switchR, gateQ, gateR, open? }` — leaving the switch toggles the gate hex |
| **Crumbling paths** | `crumbling[]` | Hex coords that vanish after a slide crosses them once; later slides treat the hex as a gap (removed) |
| **Push crates** | `crates[]` | `{ id, q, r }` — block slides but can be pushed (into holes or off-board) |
| **Splitters** | `splitters[]` | Linked pairs break apart when they cross a splitter cell |
| **Magnets** | `magnets[]` | When a neighbor clears, unlinked tiles pull one step toward the nearest magnet |

Tutorial levels:

| Levels | Mechanic |
|--------|----------|
| 31–33 | One-way, rotator, linked pair |
| 34–39 | Teleporter, toggle gate, crumbling bridge, crate, splitter, magnet |

## Ideas for later levels

- **Direction locks** — cell that forces a specific exit direction
- **Color gates** — only matching direction colors may pass
- **Delayed rotators** — rotate one beat after leaving the cell
- **Ice patches** — slide continues one extra hex after leaving ice
- **Toggle one-ways** — switches that flip directional barriers elsewhere

When adding a mechanic, update `slideEngine.ts`, `board.ts`, `validateLevel.ts`, the solver BFS, editor tools, and ship at least one tutorial level.
