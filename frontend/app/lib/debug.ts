// ?debug=1 plumbing. Knobs the debug panel turns, and a readout the sensors
// and navigation loop write into for the panel to show. Plain mutable
// objects: written at sensor rate, read a few times a second, never rendered
// from React state.
export const debugKnobs = {
  headingOffsetDeg: 0, // sim only: rotate the simulated phone to demo turns
};

export const debugReadout: Record<string, string> = {};

export function report(key: string, value: number | string | null | undefined, digits = 1): void {
  debugReadout[key] = value == null ? "–" : typeof value === "number" ? value.toFixed(digits) : value;
}
