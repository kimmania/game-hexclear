import { coordKey, pixelToAxial } from '../core/hex';
import type { HexCoord } from '../core/types';
import type { EditorDraft, EditorTool } from './editorState';
import { neighborCoordsForEditor } from './editorState';
import {
  HEX_RADIUS,
  TILE_COLORS,
  axialToPixel,
  computeViewBox,
  createDirectionArrow,
  hexPolygonPoints,
} from '../ui/hexLayout';

export type EditorBoard = {
  render: (draft: EditorDraft, tool: EditorTool) => void;
};

function clientToAxial(svg: SVGSVGElement, clientX: number, clientY: number): HexCoord {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { q: 0, r: 0 };
  const local = pt.matrixTransform(ctm.inverse());
  return pixelToAxial(local.x, local.y, HEX_RADIUS);
}

export function createEditorBoard(
  host: HTMLElement,
  onTap: (coord: HexCoord) => void,
): EditorBoard {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'hex-board editor-board');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Level editor board');
  host.replaceChildren(svg);

  svg.addEventListener('click', (event) => {
    onTap(clientToAxial(svg, event.clientX, event.clientY));
  });

  function render(draft: EditorDraft, tool: EditorTool): void {
    const allCells = [...draft.cells];
    if (tool === 'cell') {
      for (const ghost of neighborCoordsForEditor(draft)) {
        if (!allCells.some((cell) => cell.q === ghost.q && cell.r === ghost.r)) {
          allCells.push(ghost);
        }
      }
    }

    svg.setAttribute('viewBox', computeViewBox(draft.cells.length > 0 ? draft.cells : [{ q: 0, r: 0 }]));
    svg.replaceChildren();

    const cellKeys = new Set(draft.cells.map(coordKey));
    const holeKeys = new Set(draft.holes.map(coordKey));

    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    bg.setAttribute('class', 'hex-cells');
    svg.appendChild(bg);

    for (const cell of allCells) {
      const { x, y } = axialToPixel(cell.q, cell.r);
      const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      poly.setAttribute('points', hexPolygonPoints(x, y));
      const key = coordKey(cell);
      if (!cellKeys.has(key)) {
        poly.setAttribute('class', 'hex-cell hex-cell-ghost');
      } else if (holeKeys.has(key)) {
        poly.setAttribute('class', 'hex-hole');
      } else {
        poly.setAttribute('class', 'hex-cell');
      }
      bg.appendChild(poly);
    }

    for (const wall of draft.walls) {
      const { x, y } = axialToPixel(wall.q, wall.r);
      const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      poly.setAttribute('points', hexPolygonPoints(x, y));
      poly.setAttribute('class', 'hex-wall');
      bg.appendChild(poly);
    }

    const tilesLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    tilesLayer.setAttribute('class', 'hex-tiles');
    svg.appendChild(tilesLayer);

    for (const tile of draft.tiles) {
      const { x, y } = axialToPixel(tile.q, tile.r);
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.setAttribute('class', 'hex-tile');

      const colors = TILE_COLORS[tile.color] ?? TILE_COLORS.coral;
      const body = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      body.setAttribute('points', hexPolygonPoints(x, y, HEX_RADIUS - 2));
      body.setAttribute('fill', colors.fill);
      body.setAttribute('stroke', colors.edge);
      body.setAttribute('stroke-width', '2');
      group.appendChild(body);
      group.appendChild(createDirectionArrow(tile.q, tile.r, tile.dir));
      tilesLayer.appendChild(group);
    }
  }

  return { render };
}
