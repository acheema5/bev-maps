// A tiny spring for JS-driven animation (the guide's morph). Semi-implicit
// Euler, frame-rate independent; a touch under critical damping, so shapes
// settle with the faintest overshoot.
export type Spring = { x: number; v: number };

export function stepSpring(s: Spring, target: number, dtMs: number, stiffness = 210, damping = 24): Spring {
  const dt = Math.min(dtMs, 48) / 1000; // a dropped frame shouldn't explode the spring
  const v = s.v + (-stiffness * (s.x - target) - damping * s.v) * dt;
  return { x: s.x + v * dt, v };
}

export function springAtRest(s: Spring, target: number): boolean {
  return Math.abs(s.x - target) < 0.001 && Math.abs(s.v) < 0.001;
}
