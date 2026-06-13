import { isFrozenLocked } from '../core/board';
import { coordKey } from '../core/hex';
import { tileStyleForDirection, type ColorblindMode } from '../core/tileColors';
import type { GameState, HexDirection, TileState } from '../core/types';
import {
  axialToPixel,
  computeViewBox,
  createClosedGateMarker,
  createCrateMarker,
  createCrumblingMarker,
  createDirectionArrow,
  createMagnetMarker,
  createOneWayWallMarker,
  createRotatorMarker,
  createSplitterMarker,
  createTeleporterMarker,
  createToggleSwitchMarker,
  HEX_RADIUS,
  hexPolygonPoints,
} from './hexLayout';

export type LevelPreviewOptions = {
  colorblindMode?: ColorblindMode;
  /** Include level id, name, and par in a title bar above the board. Default true. */
  showTitle?: boolean;
};

/** Static dark-theme styles embedded in exported SVG (no app CSS required). */
export const LEVEL_PREVIEW_STYLES = `
  .hex-cell { fill: #33435e; stroke: #445572; stroke-width: 1.5; }
  .hex-hole { fill: #0a0f18; stroke: #050810; stroke-width: 2; }
  .hex-hole-inner { fill: #04070d; stroke: none; }
  .hex-wall { fill: #1f2838; stroke: #0f1520; stroke-width: 2; }
  .hex-oneway-bar { stroke: #e07a5f; stroke-width: 4; stroke-linecap: round; }
  .hex-oneway-chevron { fill: none; stroke: #e07a5f; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
  .hex-rotator-ring { fill: none; stroke: rgba(120, 180, 255, 0.35); stroke-width: 2; }
  .hex-rotator-arc, .hex-rotator-tip { fill: none; stroke: #6eb5ff; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
  .hex-rotator-tip { fill: #6eb5ff; stroke: none; }
  .hex-link-line { stroke: #f4a261; stroke-width: 3; stroke-dasharray: 6 4; stroke-linecap: round; }
  .hex-cell-crumbled { fill: #2a2218; opacity: 0.55; stroke: #1a140e; }
  .hex-teleporter-ring { fill: rgba(160, 100, 255, 0.2); stroke: #a064ff; stroke-width: 2.5; stroke-dasharray: 5 3; }
  .hex-teleporter-label { fill: #d4b5ff; font-size: 12px; font-weight: 700; }
  .hex-toggle-plate { fill: #3d4a5c; stroke: #8ea4bd; stroke-width: 1.5; }
  .hex-toggle-lever { fill: #7dd87d; stroke: #2d6b2d; stroke-width: 1.5; }
  .hex-toggle-gate { fill: rgba(255, 90, 90, 0.45); stroke: #ff5a5a; stroke-width: 2; }
  .hex-crumble-crack { fill: none; stroke: #c4a574; stroke-width: 2.5; stroke-linecap: round; }
  .hex-crumble-gone .hex-crumble-crack { stroke: #6b5340; opacity: 0.5; }
  .hex-crate { fill: #8b6914; stroke: #5c4510; stroke-width: 2; }
  .hex-splitter-fork { fill: none; stroke: #ff79c6; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
  .hex-magnet-n { fill: #e63946; stroke: #9b1c26; stroke-width: 1; }
  .hex-magnet-s { fill: #457b9d; stroke: #1d3557; stroke-width: 1; }
  .hex-tile-frost { fill: rgba(210, 235, 255, 0.45); stroke: rgba(180, 220, 255, 0.85); stroke-width: 2; }
  .hex-tile-ready-ring { fill: none; stroke: #5fd4ff; stroke-width: 3; stroke-dasharray: 6 4; stroke-opacity: 1; }
  .hex-tile-frozen-locked { opacity: 0.88; }
  .preview-title { fill: #eef3fb; font-family: ui-rounded, system-ui, sans-serif; font-size: 15px; font-weight: 700; }
  .preview-subtitle { fill: #9aadc4; font-family: system-ui, sans-serif; font-size: 11px; }
`;

const PREVIEW_BG = '#1a2332';
const TITLE_HEIGHT = 36;

function appendFrozenMarkers(
  group: SVGGElement,
  x: number,
  y: number,
  tile: TileState,
  state: GameState,
): void {
  if (!tile.frozen) return;

  group.classList.add('hex-tile-frozen');
  const locked = isFrozenLocked(state, tile);

  if (locked) {
    group.classList.add('hex-tile-frozen-locked');
    const frost = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    frost.setAttribute('points', hexPolygonPoints(x, y, HEX_RADIUS - 5));
    frost.setAttribute('class', 'hex-tile-frost');
    group.appendChild(frost);
    return;
  }

  const ring = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  ring.setAttribute('points', hexPolygonPoints(x, y, HEX_RADIUS - 1));
  ring.setAttribute('class', 'hex-tile-ready-ring');
  group.appendChild(ring);
}

function renderBoardContent(
  root: SVGGElement,
  state: GameState,
  colorblindMode: ColorblindMode,
): void {
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  bg.setAttribute('class', 'hex-cells');
  root.appendChild(bg);

  for (const cell of state.cells) {
    const { x, y } = axialToPixel(cell.q, cell.r);
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    poly.setAttribute('points', hexPolygonPoints(x, y));
    const key = coordKey(cell);
    const isHole = state.holes.some((hole) => hole.q === cell.q && hole.r === cell.r);
    const isCrumbled = state.crumbledKeys.includes(key);
    if (isCrumbled) {
      poly.setAttribute('class', 'hex-cell hex-cell-crumbled');
    } else if (isHole) {
      poly.setAttribute('class', 'hex-hole');
    } else {
      poly.setAttribute('class', 'hex-cell');
    }
    bg.appendChild(poly);

    if (isHole && !isCrumbled) {
      const inner = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      inner.setAttribute('points', hexPolygonPoints(x, y, HEX_RADIUS - 7));
      inner.setAttribute('class', 'hex-hole-inner');
      bg.appendChild(inner);
    }
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

  for (const teleporter of state.teleporters) {
    bg.appendChild(createTeleporterMarker(teleporter.q, teleporter.r, teleporter.group));
  }

  for (const gate of state.toggleGates) {
    bg.appendChild(createToggleSwitchMarker(gate.switchQ, gate.switchR));
  }
  state.toggleGates.forEach((gate, index) => {
    if (!state.gateOpen[index]) {
      bg.appendChild(createClosedGateMarker(gate.gateQ, gate.gateR));
    }
  });

  for (const cell of state.crumbling) {
    const key = coordKey(cell);
    bg.appendChild(createCrumblingMarker(cell.q, cell.r, state.crumbledKeys.includes(key)));
  }

  for (const cell of state.splitters) {
    bg.appendChild(createSplitterMarker(cell.q, cell.r));
  }

  for (const cell of state.magnets) {
    bg.appendChild(createMagnetMarker(cell.q, cell.r));
  }

  for (const crate of state.crates) {
    bg.appendChild(createCrateMarker(crate.q, crate.r));
  }

  const linkLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  linkLayer.setAttribute('class', 'hex-links');
  root.appendChild(linkLayer);

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
  root.appendChild(tilesLayer);

  for (const tile of state.tiles) {
    const { x, y } = axialToPixel(tile.q, tile.r);
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'hex-tile');

    const colors = tileStyleForDirection(tile.dir as HexDirection, colorblindMode);
    const body = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    body.setAttribute('points', hexPolygonPoints(x, y, HEX_RADIUS - 2));
    body.setAttribute('fill', colors.fill);
    body.setAttribute('stroke', colors.edge);
    body.setAttribute('stroke-width', '2');
    group.appendChild(body);

    group.appendChild(createDirectionArrow(tile.q, tile.r, tile.dir));
    appendFrozenMarkers(group, x, y, tile, state);
    tilesLayer.appendChild(group);
  }
}

/** Renders the initial board state as a standalone SVG string. */
export function renderLevelPreviewSvg(
  state: GameState,
  options: LevelPreviewOptions = {},
): string {
  const colorblindMode = options.colorblindMode ?? 'off';
  const showTitle = options.showTitle !== false;

  const boardViewBox = computeViewBox(state.cells);
  const [vbX, vbY, vbW, vbH] = boardViewBox.split(/\s+/).map(Number);
  const titleOffset = showTitle ? TITLE_HEIGHT : 0;
  const viewBox = `${vbX} ${vbY - titleOffset} ${vbW} ${vbH + titleOffset}`;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('role', 'img');

  const parText = state.par !== undefined ? ` · par ${state.par}` : '';
  svg.setAttribute(
    'aria-label',
    `Level ${state.levelId}, ${state.levelName}${parText}`,
  );

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = LEVEL_PREVIEW_STYLES;
  defs.appendChild(style);
  svg.appendChild(defs);

  const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  background.setAttribute('x', String(vbX));
  background.setAttribute('y', String(vbY - titleOffset));
  background.setAttribute('width', String(vbW));
  background.setAttribute('height', String(vbH + titleOffset));
  background.setAttribute('fill', PREVIEW_BG);
  svg.appendChild(background);

  if (showTitle) {
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    title.setAttribute('class', 'preview-title');
    title.setAttribute('x', String(vbX + 8));
    title.setAttribute('y', String(vbY - titleOffset + 22));
    title.textContent = `${state.levelId}. ${state.levelName}`;
    svg.appendChild(title);

    const subtitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    subtitle.setAttribute('class', 'preview-subtitle');
    subtitle.setAttribute('x', String(vbX + 8));
    subtitle.setAttribute('y', String(vbY - titleOffset + 34));
    const tileCount = state.tiles.length;
    subtitle.textContent =
      state.par !== undefined
        ? `${tileCount} tile${tileCount === 1 ? '' : 's'} · par ${state.par}`
        : `${tileCount} tile${tileCount === 1 ? '' : 's'}`;
    svg.appendChild(subtitle);
  }

  const board = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  board.setAttribute('class', 'hex-board');
  svg.appendChild(board);
  renderBoardContent(board, state, colorblindMode);

  return new XMLSerializer().serializeToString(svg);
}
