import { canSlideTile, isFrozenLocked } from '../core/board';
import {
  DIRECTION_LABELS,
  DIRECTION_SHORT,
  showDirectionLabels,
  tileStyleForDirection,
  type ColorblindMode,
} from '../core/tileColors';
import type { GameState, HexCoord, HexDirection, SlideAnimation, TileId, TileState } from '../core/types';
import { sortTileIdsForFocus } from '../game/keyboard';
import {
  HEX_RADIUS,
  axialToPixel,
  computeViewBox,
  createDirectionArrow,
  createOneWayWallMarker,
  createRotatorMarker,
  hexPolygonPoints,
} from './hexLayout';

export type BoardRenderOptions = {
  colorblindMode?: ColorblindMode;
};

function appendTileMarkers(
  group: SVGGElement,
  x: number,
  y: number,
  tile: TileState,
  state: GameState,
): void {
  if (!tile.frozen) return;

  const locked = isFrozenLocked(state, tile);
  group.classList.add('hex-tile-frozen');

  if (locked) {
    group.classList.add('hex-tile-frozen-locked');
    const frost = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    frost.setAttribute('points', hexPolygonPoints(x, y, HEX_RADIUS - 5));
    frost.setAttribute('class', 'hex-tile-frost');
    group.appendChild(frost);
    return;
  }

  group.classList.add('hex-tile-frozen-ready');
  const ring = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  ring.setAttribute('points', hexPolygonPoints(x, y, HEX_RADIUS - 1));
  ring.setAttribute('class', 'hex-tile-ready-ring');
  group.appendChild(ring);
}

function appendDirectionLabel(
  group: SVGGElement,
  x: number,
  y: number,
  dir: HexDirection,
): void {
  const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  label.setAttribute('class', 'hex-tile-dir-label');
  label.setAttribute('x', String(x));
  label.setAttribute('y', String(y + 4));
  label.setAttribute('text-anchor', 'middle');
  label.setAttribute('pointer-events', 'none');
  label.textContent = DIRECTION_SHORT[dir];
  group.appendChild(label);
}

export type HexBoard = {
  svg: SVGSVGElement;
  render: (state: GameState, options?: BoardRenderOptions) => void;
  animateSlides: (state: GameState, animations: SlideAnimation[]) => Promise<void>;
  flashBlocked: (tileId: TileId) => void;
  highlightTile: (tileId: TileId | null) => void;
  focusTile: (tileId: TileId | null) => void;
  focusNextTile: () => void;
  focusPreviousTile: () => void;
  focusTileInDirection: (direction: 'up' | 'down' | 'left' | 'right') => void;
  slideFocusedTile: () => void;
  getFocusedTileId: () => TileId | null;
};

export function createHexBoard(
  host: HTMLElement,
  onTileTap: (tileId: TileId) => void,
): HexBoard {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'hex-board');
  svg.setAttribute('role', 'application');
  svg.setAttribute(
    'aria-label',
    'Hex puzzle board. Tab between tiles, Enter to slide, arrow keys to move, H for hint.',
  );
  host.replaceChildren(svg);

  let animating = false;
  let highlightedTileId: TileId | null = null;
  let focusedTileId: TileId | null = null;
  let focusOrder: TileId[] = [];
  let tilePositions = new Map<TileId, { x: number; y: number; q: number; r: number }>();
  let latestState: GameState | null = null;
  let latestRenderOptions: BoardRenderOptions = {};

  function tileAriaLabel(tile: TileState, state: GameState, slideable: boolean): string {
    const direction = DIRECTION_LABELS[tile.dir];
    let status = slideable ? 'can slide' : 'blocked';
    if (tile.frozen) {
      status = isFrozenLocked(state, tile)
        ? 'frozen, locked until neighbors clear'
        : slideable
          ? 'frozen, thawed and can slide'
          : 'frozen, thawed but blocked';
    }
    if (tile.linked) {
      status += ', linked pair';
    }
    return `Hex tile ${tile.id}, points ${direction}, ${status}`;
  }

  function updateTabIndexes(): void {
    for (const tileId of focusOrder) {
      const el = svg.querySelector(`[data-tile-id="${tileId}"]`) as SVGGElement | null;
      if (!el) continue;
      el.setAttribute('tabindex', tileId === focusedTileId ? '0' : '-1');
      el.classList.toggle('hex-tile-focused', tileId === focusedTileId);
    }
  }

  function focusTile(tileId: TileId | null): void {
    focusedTileId = tileId;
    updateTabIndexes();
    if (!tileId) return;
    const el = svg.querySelector(`[data-tile-id="${tileId}"]`) as SVGGElement | null;
    el?.focus({ preventScroll: true });
  }

  function focusNextTile(): void {
    if (focusOrder.length === 0) return;
    if (!focusedTileId) {
      focusTile(focusOrder[0]!);
      return;
    }
    const index = focusOrder.indexOf(focusedTileId);
    const next = focusOrder[(index + 1) % focusOrder.length]!;
    focusTile(next);
  }

  function focusPreviousTile(): void {
    if (focusOrder.length === 0) return;
    if (!focusedTileId) {
      focusTile(focusOrder[focusOrder.length - 1]!);
      return;
    }
    const index = focusOrder.indexOf(focusedTileId);
    const prev = focusOrder[(index - 1 + focusOrder.length) % focusOrder.length]!;
    focusTile(prev);
  }

  function focusTileInDirection(direction: 'up' | 'down' | 'left' | 'right'): void {
    if (!focusedTileId || focusOrder.length === 0) {
      focusTile(focusOrder[0] ?? null);
      return;
    }

    const origin = tilePositions.get(focusedTileId);
    if (!origin) return;

    const vector = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
    }[direction];

    let bestId: TileId | null = null;
    let bestScore = -Infinity;

    for (const tileId of focusOrder) {
      if (tileId === focusedTileId) continue;
      const point = tilePositions.get(tileId);
      if (!point) continue;

      const dx = point.x - origin.x;
      const dy = point.y - origin.y;
      const projection = dx * vector.x + dy * vector.y;
      if (projection <= 0) continue;

      const lateral = Math.abs(dx * vector.y - dy * vector.x);
      const score = projection - lateral * 0.35;
      if (score > bestScore) {
        bestScore = score;
        bestId = tileId;
      }
    }

    if (bestId) focusTile(bestId);
  }

  function slideFocusedTile(): void {
    if (!focusedTileId || animating) return;
    onTileTap(focusedTileId);
  }

  function applyHighlight(): void {
    svg.querySelectorAll('.hex-tile-hint').forEach((node) => {
      node.classList.remove('hex-tile-hint');
    });
    if (!highlightedTileId) return;
    svg.querySelector(`[data-tile-id="${highlightedTileId}"]`)?.classList.add('hex-tile-hint');
  }

  function highlightTile(tileId: TileId | null): void {
    highlightedTileId = tileId;
    applyHighlight();
  }

  function render(state: GameState, options: BoardRenderOptions = {}): void {
    if (animating) return;

    latestState = state;
    latestRenderOptions = options;
    const colorblindMode = options.colorblindMode ?? 'off';

    svg.setAttribute('viewBox', computeViewBox(state.cells));
    svg.replaceChildren();

    focusOrder = sortTileIdsForFocus(state.tiles.map((tile) => tile.id));
    tilePositions = new Map();

    if (focusedTileId && !focusOrder.includes(focusedTileId)) {
      focusedTileId = focusOrder[0] ?? null;
    }
    if (!focusedTileId && focusOrder.length > 0) {
      focusedTileId = focusOrder[0]!;
    }

    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    bg.setAttribute('class', 'hex-cells');
    svg.appendChild(bg);

    for (const cell of state.cells) {
      const { x, y } = axialToPixel(cell.q, cell.r);
      const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      poly.setAttribute('points', hexPolygonPoints(x, y));
      const isHole = state.holes.some((hole) => hole.q === cell.q && hole.r === cell.r);
      poly.setAttribute('class', isHole ? 'hex-hole' : 'hex-cell');
      bg.appendChild(poly);
    }

    for (const wall of state.walls) {
      const { x, y } = axialToPixel(wall.q, wall.r);
      const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      poly.setAttribute('points', hexPolygonPoints(x, y));
      poly.setAttribute('class', 'hex-wall');
      bg.appendChild(poly);
    }

    for (const oneWay of state.oneWayWalls) {
      bg.appendChild(createOneWayWallMarker(oneWay.q, oneWay.r, oneWay.dir));
    }

    for (const rotator of state.rotators) {
      bg.appendChild(createRotatorMarker(rotator.q, rotator.r));
    }

    const linkLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    linkLayer.setAttribute('class', 'hex-links');
    svg.appendChild(linkLayer);

    const drawnLinks = new Set<string>();
    for (const tile of state.tiles) {
      if (!tile.linked) continue;
      const linkKey = [tile.id, tile.linked].sort().join(':');
      if (drawnLinks.has(linkKey)) continue;
      const partner = state.tiles.find((entry) => entry.id === tile.linked);
      if (!partner) continue;
      drawnLinks.add(linkKey);

      const from = axialToPixel(tile.q, tile.r);
      const to = axialToPixel(partner.q, partner.r);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(from.x));
      line.setAttribute('y1', String(from.y));
      line.setAttribute('x2', String(to.x));
      line.setAttribute('y2', String(to.y));
      line.setAttribute('class', 'hex-link-line');
      linkLayer.appendChild(line);
    }

    const tilesLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    tilesLayer.setAttribute('class', 'hex-tiles');
    svg.appendChild(tilesLayer);

    for (const tile of state.tiles) {
      const { x, y } = axialToPixel(tile.q, tile.r);
      tilePositions.set(tile.id, { x, y, q: tile.q, r: tile.r });

      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.setAttribute('class', 'hex-tile');
      group.dataset.tileId = tile.id;
      group.setAttribute('role', 'button');
      group.setAttribute('tabindex', tile.id === focusedTileId ? '0' : '-1');

      const slide = canSlideTile(state, tile.id);
      group.setAttribute('aria-label', tileAriaLabel(tile, state, slide.ok));
      if (!slide.ok) {
        group.classList.add('hex-tile-blocked');
      }

      const colors = tileStyleForDirection(tile.dir, colorblindMode);
      const body = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      body.setAttribute('points', hexPolygonPoints(x, y, HEX_RADIUS - 2));
      body.setAttribute('fill', colors.fill);
      body.setAttribute('stroke', colors.edge);
      body.setAttribute('stroke-width', '2');
      group.appendChild(body);

      group.appendChild(createDirectionArrow(tile.q, tile.r, tile.dir));
      if (tile.linked && state.tiles.some((entry) => entry.id === tile.linked)) {
        group.classList.add('hex-tile-linked');
      }
      appendTileMarkers(group, x, y, tile, state);
      if (showDirectionLabels(colorblindMode)) {
        appendDirectionLabel(group, x, y, tile.dir);
      }

      const handleTap = (): void => {
        if (animating) return;
        focusTile(tile.id);
        onTileTap(tile.id);
      };

      group.addEventListener('click', handleTap);
      group.addEventListener('focus', () => {
        focusedTileId = tile.id;
        updateTabIndexes();
      });
      group.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleTap();
        }
      });

      tilesLayer.appendChild(group);
    }

    updateTabIndexes();
    applyHighlight();
  }

  function flashBlocked(tileId: TileId): void {
    if (document.documentElement.classList.contains('reduce-motion')) return;
    const tile = svg.querySelector(`[data-tile-id="${tileId}"]`);
    tile?.classList.add('hex-tile-shake');
    window.setTimeout(() => tile?.classList.remove('hex-tile-shake'), 400);
  }

  function animateOneSlide(state: GameState, tileId: TileId, path: HexCoord[]): Promise<void> {
    if (document.documentElement.classList.contains('reduce-motion') || path.length < 2) {
      return Promise.resolve();
    }

    const tileEl = svg.querySelector(`[data-tile-id="${tileId}"]`) as SVGGElement | null;
    if (!tileEl || path.length < 2) {
      return Promise.resolve();
    }

    const tile = state.tiles.find((entry) => entry.id === tileId);
    if (!tile) {
      return Promise.resolve();
    }

    const origin = axialToPixel(path[0].q, path[0].r);

    return new Promise((resolve) => {
      let step = 0;
      const tick = (): void => {
        step += 1;
        if (step >= path.length) {
          tileEl.removeAttribute('transform');
          resolve();
          return;
        }

        const coord = path[step];
        const { x, y } = axialToPixel(coord.q, coord.r);
        tileEl.setAttribute('transform', `translate(${x - origin.x} ${y - origin.y})`);
        window.setTimeout(tick, 65);
      };

      tick();
    });
  }

  function animateSlides(state: GameState, animations: SlideAnimation[]): Promise<void> {
    if (document.documentElement.classList.contains('reduce-motion')) {
      return Promise.resolve();
    }

    animating = true;
    return Promise.all(animations.map((entry) => animateOneSlide(state, entry.tileId, entry.path)))
      .then(() => {
        animating = false;
        if (latestState) {
          render(latestState, latestRenderOptions);
        }
      })
      .catch(() => {
        animating = false;
      });
  }

  return {
    svg,
    render,
    animateSlides,
    flashBlocked,
    highlightTile,
    focusTile,
    focusNextTile,
    focusPreviousTile,
    focusTileInDirection,
    slideFocusedTile,
    getFocusedTileId: () => focusedTileId,
  };
}
