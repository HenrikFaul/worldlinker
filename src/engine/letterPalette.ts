export interface Point {
  x: number;
  y: number;
}

/**
 * Evenly spaced points on a circle of the given radius, starting at the top
 * (12 o'clock) and going clockwise. Coordinates are relative to the circle
 * centre (so {0,0} is the middle). A single letter sits dead-centre.
 */
export function radialPositions(count: number, radius: number): Point[] {
  if (count <= 0) return [];
  if (count === 1) return [{ x: 0, y: 0 }];
  const out: Point[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2; // -90° = top
    out.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  }
  return out;
}

export interface PaletteLayout {
  size: number; // square edge length, px
  center: number; // size / 2
  tile: number; // tile diameter, px
  ring: number; // placement radius, px
  positions: Point[]; // tile centres, relative to the container origin (top-left)
  hitRadius: number; // generous radius for touch hit-testing
}

/**
 * Compute a responsive palette layout for `count` tiles inside a square of edge
 * `size`. Tile size scales with the container but stays within comfortable
 * touch-target bounds.
 */
export function computeLayout(count: number, size: number): PaletteLayout {
  const center = size / 2;
  const tile = Math.max(40, Math.min(84, size * (count > 6 ? 0.17 : 0.2)));
  const ring = count <= 1 ? 0 : size / 2 - tile / 2 - 6;
  const positions = radialPositions(count, ring).map((p) => ({
    x: center + p.x,
    y: center + p.y,
  }));
  return { size, center, tile, ring, positions, hitRadius: tile * 0.62 };
}

/** Index of the tile whose centre is closest to (x, y) within hitRadius, else -1. */
export function tileAtPoint(layout: PaletteLayout, x: number, y: number): number {
  let best = -1;
  let bestDist = layout.hitRadius;
  for (let i = 0; i < layout.positions.length; i++) {
    const p = layout.positions[i];
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}
