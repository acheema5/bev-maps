import type { ArrowState } from "shared/contract";

// The guide's path, drawn in a 200 × 300 box with the user at the bottom
// center, lying on the ground plane. Every shape has the same structure (a
// start point and two cubic Béziers), so morphing between states is just
// interpolating 14 numbers.
export type Pt = readonly [number, number];
export type Shape = readonly [Pt, Pt, Pt, Pt, Pt, Pt, Pt]; // start, c1, c2, mid, c3, c4, end

export type Curl = "left" | "right";

const START: Pt = [100, 292];

const STRAIGHT: Shape = [START, [100, 240], [100, 210], [100, 170], [100, 130], [100, 90], [100, 46]];

// The route turns right: run forward, then bend and point right.
const RIGHT: Shape = [START, [100, 236], [100, 196], [100, 164], [100, 118], [126, 96], [182, 96]];

// You're facing away: run forward, curl over, and point back at the user.
const U_TURN_RIGHT: Shape = [START, [100, 236], [100, 168], [100, 136], [100, 46], [168, 46], [168, 150]];

function mirror(shape: Shape): Shape {
  return shape.map(([x, y]) => [200 - x, y] as Pt) as unknown as Shape;
}

const LEFT = mirror(RIGHT);
const U_TURN_LEFT = mirror(U_TURN_RIGHT);

// Always the same object per state, so the guide can tell "same target"
// from "new target" by identity and only morph on a real change.
export function shapeFor(arrow: ArrowState, curl: Curl): Shape {
  switch (arrow) {
    case "STRAIGHT":
      return STRAIGHT;
    case "RIGHT":
      return RIGHT;
    case "LEFT":
      return LEFT;
    case "U_TURN":
      return curl === "right" ? U_TURN_RIGHT : U_TURN_LEFT;
  }
}

/**
 * Which way the U-turn curls. Latched on entering U_TURN: walking directly
 * away, the angle's sign jitters around ±180°, and a curl that followed it
 * would flip back and forth (VISION → "the guide never flickers").
 */
export function nextCurl(arrow: ArrowState, previousArrow: ArrowState | null, relativeAngleDeg: number, curl: Curl): Curl {
  if (arrow === "U_TURN" && previousArrow === "U_TURN") return curl;
  if (arrow === "U_TURN") return relativeAngleDeg >= 0 ? "right" : "left";
  return curl;
}

export function lerpShape(from: Shape, to: Shape, t: number): Shape {
  return from.map(([x, y], i) => [x + (to[i][0] - x) * t, y + (to[i][1] - y) * t] as Pt) as unknown as Shape;
}

export function pathD(s: Shape): string {
  const f = (p: Pt) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`;
  return `M${f(s[0])} C${f(s[1])} ${f(s[2])} ${f(s[3])} C${f(s[4])} ${f(s[5])} ${f(s[6])}`;
}

/** Where the arrowhead sits and which way it points (degrees, 0 = up the screen, clockwise). */
export function arrowheadPose(s: Shape): { x: number; y: number; angleDeg: number } {
  const [x, y] = s[6];
  const [cx, cy] = s[5];
  // Tangent at the end of a cubic Bézier points from its last control point.
  const angleDeg = (Math.atan2(x - cx, cy - y) * 180) / Math.PI;
  return { x, y, angleDeg };
}

/** Within STRAIGHT the guide leans a little with the exact angle, so it feels alive. */
export function leanFor(arrow: ArrowState, relativeAngleDeg: number): number {
  if (arrow !== "STRAIGHT") return 0;
  return Math.max(-15, Math.min(15, relativeAngleDeg * 0.5));
}
