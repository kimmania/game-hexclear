import { coordKey, pixelToAxial } from '../core/hex';
import type { HexCoord } from '../core/types';
import type { EditorDraft, EditorTool } from './editorState';
import { neighborCoordsForEditor } from './editorState';
import { tileStyleForDirection } from '../core/tileColors';
import {
  HEX_RADIUS,
  axialToPixel,
  computeViewBox,
  createDirectionArrow,
  createOneWayWallMarker,
  createRotatorMarker,
  createTeleporterMarker,
  createToggleSwitchMarker,
  createClosedGateMarker,
  createCrumblingMarker,
  createSplitterMarker,
  createMagnetMarker,
  createCrateMarker,
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

    for (const oneWay of draft.oneWayWalls) {
      bg.appendChild(createOneWayWallMarker(oneWay.q, oneWay.r, oneWay.dir));
    }

    for (const rotator of draft.rotators) {
      bg.appendChild(createRotatorMarker(rotator.q, rotator.r));
    }

    for (const teleporter of draft.teleporters) {
      bg.appendChild(createTeleporterMarker(teleporter.q, teleporter.r, teleporter.group));
    }

    for (const gate of draft.toggleGates) {
      bg.appendChild(createToggleSwitchMarker(gate.switchQ, gate.switchR));
      bg.appendChild(createClosedGateMarker(gate.gateQ, gate.gateR));
    }

    for (const cell of draft.crumbling) {
      bg.appendChild(createCrumblingMarker(cell.q, cell.r, false));
    }

    for (const cell of draft.splitters) {
      bg.appendChild(createSplitterMarker(cell.q, cell.r));
    }

    for (const cell of draft.magnets) {
      bg.appendChild(createMagnetMarker(cell.q, cell.r));
    }

    for (const crate of draft.crates) {
      bg.appendChild(createCrateMarker(crate.q, crate.r));
    }

    const linkLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    linkLayer.setAttribute('class', 'hex-links');
    svg.appendChild(linkLayer);

    const drawnLinks = new Set<string>();
    for (const tile of draft.tiles) {
      if (!tile.linked) continue;
      const linkKey = [tile.id, tile.linked].sort().join(':');
      if (drawnLinks.has(linkKey)) continue;
      const partner = draft.tiles.find((entry) => entry.id === tile.linked);
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

    for (const tile of draft.tiles) {
      const { x, y } = axialToPixel(tile.q, tile.r);
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.setAttribute('class', 'hex-tile');
      if (tile.linked) {
        group.classList.add('hex-tile-linked');
      }

      const colors = tileStyleForDirection(tile.dir);
      const body = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      body.setAttribute('points', hexPolygonPoints(x, y, HEX_RADIUS - 2));
      body.setAttribute('fill', colors.fill);
      body.setAttribute('stroke', colors.edge);
      body.setAttribute('stroke-width', '2');
      group.appendChild(body);
      group.appendChild(createDirectionArrow(tile.q, tile.r, tile.dir));

      if (tile.frozen) {
        const frost = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        frost.setAttribute('points', hexPolygonPoints(x, y, HEX_RADIUS - 5));
        frost.setAttribute('class', 'hex-tile-frost');
        group.appendChild(frost);
      }

      tilesLayer.appendChild(group);
    }
  }

  return { render };
}
