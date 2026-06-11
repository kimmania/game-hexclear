import type { GameState, HexCoord, HexDirection } from '../core/types';
import { AXIAL_DIRS, boundsOfCells, coordKey } from '../core/hex';

const SQRT3 = Math.sqrt(3);
export const HEX_RADIUS = 34;

/** Pointy-top axial → pixel center. */
export function axialToPixel(q: number, r: number, size = HEX_RADIUS): { x: number; y: number } {
  const x = size * (SQRT3 * q + (SQRT3 / 2) * r);
  const y = size * (1.5 * r);
  return { x, y };
}

export function hexPolygonPoints(cx: number, cy: number, size = HEX_RADIUS): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = ((60 * i - 30) * Math.PI) / 180;
    const x = cx + size * Math.cos(angle);
    const y = cy + size * Math.sin(angle);
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return points.join(' ');
}

export function computeViewBox(cells: HexCoord[], padding = HEX_RADIUS * 2): string {
  const { minQ, maxQ, minR, maxR } = boundsOfCells(cells);
  const corners = [
    axialToPixel(minQ, minR),
    axialToPixel(maxQ, minR),
    axialToPixel(minQ, maxR),
    axialToPixel(maxQ, maxR),
    axialToPixel(minQ - 1, minR),
    axialToPixel(maxQ + 1, minR),
  ];

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const { x, y } of corners) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;
  const x = minX - padding;
  const y = minY - padding;
  return `${x.toFixed(1)} ${y.toFixed(1)} ${width.toFixed(1)} ${height.toFixed(1)}`;
}

export function boardCellKeys(state: GameState): Set<string> {
  return new Set(state.cells.map(coordKey));
}

const ARROW_FILL = '#122033';
const ARROW_STROKE = '#ffffff';

/** Rotation angle that matches the pixel direction a tile slides on the board. */
export function slideDirectionAngleDeg(q: number, r: number, dir: HexDirection): number {
  const from = axialToPixel(q, r);
  const delta = AXIAL_DIRS[dir];
  const to = axialToPixel(q + delta.q, r + delta.r);
  return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
}

/** Classic one-way arrow: tail on the left, tip on the right (+X). */
export function createDirectionArrow(
  q: number,
  r: number,
  dir: HexDirection,
): SVGGElement {
  const { x: cx, y: cy } = axialToPixel(q, r);
  const angle = slideDirectionAngleDeg(q, r, dir);

  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('class', 'hex-tile-arrow');
  group.setAttribute('transform', `translate(${cx} ${cy}) rotate(${angle})`);
  group.setAttribute('pointer-events', 'none');

  const outline = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  outline.setAttribute(
    'd',
    'M -15 -5 L 4 -5 L 4 -10 L 20 0 L 4 10 L 4 5 L -15 5 Z',
  );
  outline.setAttribute('fill', ARROW_STROKE);
  outline.setAttribute('stroke', ARROW_STROKE);
  outline.setAttribute('stroke-width', '2.5');
  outline.setAttribute('stroke-linejoin', 'round');
  group.appendChild(outline);

  const body = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  body.setAttribute(
    'd',
    'M -13 -3.5 L 3.5 -3.5 L 3.5 -8 L 16 0 L 3.5 8 L 3.5 3.5 L -13 3.5 Z',
  );
  body.setAttribute('fill', ARROW_FILL);
  group.appendChild(body);

  return group;
}

/** Barrier on the edge from which slides in `dir` are blocked. */
export function createOneWayWallMarker(
  q: number,
  r: number,
  dir: HexDirection,
): SVGGElement {
  const { x: cx, y: cy } = axialToPixel(q, r);
  const entryFrom = ((dir + 3) % 6) as HexDirection;
  const angle = slideDirectionAngleDeg(q, r, entryFrom);

  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('class', 'hex-oneway');
  group.setAttribute('transform', `translate(${cx} ${cy}) rotate(${angle})`);
  group.setAttribute('pointer-events', 'none');

  const bar = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  bar.setAttribute('x1', String(HEX_RADIUS - 4));
  bar.setAttribute('y1', '-12');
  bar.setAttribute('x2', String(HEX_RADIUS - 4));
  bar.setAttribute('y2', '12');
  bar.setAttribute('class', 'hex-oneway-bar');
  group.appendChild(bar);

  const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  chevron.setAttribute('d', 'M 8 -8 L 18 0 L 8 8');
  chevron.setAttribute('class', 'hex-oneway-chevron');
  group.appendChild(chevron);

  return group;
}

export function createRotatorMarker(q: number, r: number): SVGGElement {
  const { x: cx, y: cy } = axialToPixel(q, r);
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('class', 'hex-rotator');
  group.setAttribute('transform', `translate(${cx} ${cy})`);
  group.setAttribute('pointer-events', 'none');

  const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  ring.setAttribute('r', '14');
  ring.setAttribute('class', 'hex-rotator-ring');
  group.appendChild(ring);

  const arc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  arc.setAttribute('d', 'M 10 -4 A 12 12 0 1 1 4 10');
  arc.setAttribute('class', 'hex-rotator-arc');
  group.appendChild(arc);

  const tip = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  tip.setAttribute('points', '4 10 8 6 0 6');
  tip.setAttribute('class', 'hex-rotator-tip');
  group.appendChild(tip);

  return group;
}

export function createTeleporterMarker(q: number, r: number, group: string): SVGGElement {
  const { x: cx, y: cy } = axialToPixel(q, r);
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'hex-teleporter');
  g.setAttribute('transform', `translate(${cx} ${cy})`);
  g.setAttribute('pointer-events', 'none');

  const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  ring.setAttribute('r', '16');
  ring.setAttribute('class', 'hex-teleporter-ring');
  g.appendChild(ring);

  const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  label.setAttribute('class', 'hex-teleporter-label');
  label.setAttribute('x', '0');
  label.setAttribute('y', '5');
  label.setAttribute('text-anchor', 'middle');
  label.textContent = group.slice(0, 1).toUpperCase();
  g.appendChild(label);

  return g;
}

export function createToggleSwitchMarker(q: number, r: number): SVGGElement {
  const { x: cx, y: cy } = axialToPixel(q, r);
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'hex-toggle-switch');
  g.setAttribute('transform', `translate(${cx} ${cy})`);
  g.setAttribute('pointer-events', 'none');

  const plate = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  plate.setAttribute('x', '-10');
  plate.setAttribute('y', '-6');
  plate.setAttribute('width', '20');
  plate.setAttribute('height', '12');
  plate.setAttribute('rx', '3');
  plate.setAttribute('class', 'hex-toggle-plate');
  g.appendChild(plate);

  const lever = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  lever.setAttribute('cx', '0');
  lever.setAttribute('cy', '0');
  lever.setAttribute('r', '5');
  lever.setAttribute('class', 'hex-toggle-lever');
  g.appendChild(lever);

  return g;
}

export function createClosedGateMarker(q: number, r: number): SVGGElement {
  const { x: cx, y: cy } = axialToPixel(q, r);
  const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  poly.setAttribute('points', hexPolygonPoints(cx, cy, HEX_RADIUS - 4));
  poly.setAttribute('class', 'hex-toggle-gate');
  poly.setAttribute('pointer-events', 'none');
  return poly;
}

export function createCrumblingMarker(q: number, r: number, crumbled: boolean): SVGGElement {
  const { x: cx, y: cy } = axialToPixel(q, r);
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', crumbled ? 'hex-crumble hex-crumble-gone' : 'hex-crumble');
  g.setAttribute('transform', `translate(${cx} ${cy})`);
  g.setAttribute('pointer-events', 'none');

  const crack = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  crack.setAttribute('d', crumbled ? 'M -12 -4 L 0 6 L 12 -2' : 'M -10 0 L 0 -8 L 10 2');
  crack.setAttribute('class', 'hex-crumble-crack');
  g.appendChild(crack);

  return g;
}

export function createSplitterMarker(q: number, r: number): SVGGElement {
  const { x: cx, y: cy } = axialToPixel(q, r);
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'hex-splitter');
  g.setAttribute('transform', `translate(${cx} ${cy})`);
  g.setAttribute('pointer-events', 'none');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M 0 -12 L 0 0 M -10 8 L 0 0 L 10 8');
  path.setAttribute('class', 'hex-splitter-fork');
  g.appendChild(path);

  return g;
}

export function createMagnetMarker(q: number, r: number): SVGGElement {
  const { x: cx, y: cy } = axialToPixel(q, r);
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'hex-magnet');
  g.setAttribute('transform', `translate(${cx} ${cy})`);
  g.setAttribute('pointer-events', 'none');

  const north = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  north.setAttribute('x', '-8');
  north.setAttribute('y', '-14');
  north.setAttribute('width', '16');
  north.setAttribute('height', '8');
  north.setAttribute('class', 'hex-magnet-n');
  g.appendChild(north);

  const south = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  south.setAttribute('x', '-8');
  south.setAttribute('y', '6');
  south.setAttribute('width', '16');
  south.setAttribute('height', '8');
  south.setAttribute('class', 'hex-magnet-s');
  g.appendChild(south);

  return g;
}

export function createCrateMarker(q: number, r: number): SVGGElement {
  const { x: cx, y: cy } = axialToPixel(q, r);
  const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  poly.setAttribute('points', hexPolygonPoints(cx, cy, HEX_RADIUS - 6));
  poly.setAttribute('class', 'hex-crate');
  poly.setAttribute('pointer-events', 'none');
  return poly;
}
