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
