import { canSlideTile } from '../core/board';
import type { GameState, HexCoord, TileId } from '../core/types';
import {
  HEX_RADIUS,
  TILE_COLORS,
  axialToPixel,
  computeViewBox,
  createDirectionArrow,
  hexPolygonPoints,
} from './hexLayout';

export type HexBoard = {
  svg: SVGSVGElement;
  render: (state: GameState) => void;
  animateSlide: (state: GameState, tileId: TileId, path: HexCoord[]) => Promise<void>;
  flashBlocked: (tileId: TileId) => void;
};

export function createHexBoard(
  host: HTMLElement,
  onTileTap: (tileId: TileId) => void,
): HexBoard {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'hex-board');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Hex puzzle board');
  host.replaceChildren(svg);

  let animating = false;

  function render(state: GameState): void {
    if (animating) return;

    svg.setAttribute('viewBox', computeViewBox(state.cells));
    svg.replaceChildren();

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

    const tilesLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    tilesLayer.setAttribute('class', 'hex-tiles');
    svg.appendChild(tilesLayer);

    for (const tile of state.tiles) {
      const { x, y } = axialToPixel(tile.q, tile.r);
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.setAttribute('class', 'hex-tile');
      group.dataset.tileId = tile.id;
      group.setAttribute('role', 'button');
      group.setAttribute('tabindex', '0');
      group.setAttribute('aria-label', `Hex tile pointing direction ${tile.dir}`);

      const colors = TILE_COLORS[tile.color] ?? TILE_COLORS.coral;
      const body = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      body.setAttribute('points', hexPolygonPoints(x, y, HEX_RADIUS - 2));
      body.setAttribute('fill', colors.fill);
      body.setAttribute('stroke', colors.edge);
      body.setAttribute('stroke-width', '2');
      group.appendChild(body);

      group.appendChild(createDirectionArrow(tile.q, tile.r, tile.dir));

      const slide = canSlideTile(state, tile.id);
      if (!slide.ok) {
        group.classList.add('hex-tile-blocked');
      }

      const handleTap = (): void => {
        if (animating) return;
        onTileTap(tile.id);
      };

      group.addEventListener('click', handleTap);
      group.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleTap();
        }
      });

      tilesLayer.appendChild(group);
    }
  }

  function flashBlocked(tileId: TileId): void {
    if (document.documentElement.classList.contains('reduce-motion')) return;
    const tile = svg.querySelector(`[data-tile-id="${tileId}"]`);
    tile?.classList.add('hex-tile-shake');
    window.setTimeout(() => tile?.classList.remove('hex-tile-shake'), 400);
  }

  function animateSlide(state: GameState, tileId: TileId, path: HexCoord[]): Promise<void> {
    if (document.documentElement.classList.contains('reduce-motion') || path.length < 2) {
      return Promise.resolve();
    }

    animating = true;

    const tileEl = svg.querySelector(`[data-tile-id="${tileId}"]`) as SVGGElement | null;
    if (!tileEl || path.length < 2) {
      animating = false;
      return Promise.resolve();
    }

    const tile = state.tiles.find((entry) => entry.id === tileId);
    if (!tile) {
      animating = false;
      return Promise.resolve();
    }

    const origin = axialToPixel(path[0].q, path[0].r);

    return new Promise((resolve) => {
      let step = 0;
      const tick = (): void => {
        step += 1;
        if (step >= path.length) {
          tileEl.removeAttribute('transform');
          animating = false;
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

  return { svg, render, animateSlide, flashBlocked };
}
