import type { LatLng, SimSample, WalkingRoute } from "shared/contract";

// Simulated walk. Runs on the phone. See VISION.md > "Technical shape" and
// backend/INSTRUCTIONS.md. Pure, no DOM/Node-only APIs, no network calls:
// generates fake GPS+heading samples along a recorded route (shaped exactly
// like real sensor readings), and a timer-based player for the ?sim=1
// desk-demo flow.

const DEFAULT_SPEED_M_PER_S = 1.3;
const DEFAULT_SAMPLE_INTERVAL_MS = 1000;
const EARTH_RADIUS_M = 6371000;

// Baseline + a fixed oscillation, not true randomness, so GPS noise looks
// real but tests stay deterministic.
const ACCURACY_BASELINE_M = 7;
const ACCURACY_AMPLITUDE_M = 2.5;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDegrees(rad: number): number {
  return (rad * 180) / Math.PI;
}

// Equirectangular approximation: fine at the scale of a walking route.
function distanceMetersBetween(a: LatLng, b: LatLng): number {
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const meanLat = (lat1 + lat2) / 2;
  const dLat = lat2 - lat1;
  const dLng = toRadians(b.lng - a.lng);
  const x = dLng * Math.cos(meanLat);
  const y = dLat;
  return Math.sqrt(x * x + y * y) * EARTH_RADIUS_M;
}

// Bearing from a to b: 0 = north, clockwise, in [0, 360).
function bearingDegBetween(a: LatLng, b: LatLng): number {
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const dLng = toRadians(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

function interpolateLatLng(a: LatLng, b: LatLng, fraction: number): LatLng {
  return {
    lat: a.lat + (b.lat - a.lat) * fraction,
    lng: a.lng + (b.lng - a.lng) * fraction,
  };
}

function totalPathLengthM(path: LatLng[]): number {
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    total += distanceMetersBetween(path[i], path[i + 1]);
  }
  return total;
}

// The point reached after walking `distanceM` of cumulative distance along
// the polyline, starting from path[0]. Clamps to the final point.
function pointAtDistance(path: LatLng[], distanceM: number): LatLng {
  let remaining = distanceM;
  for (let i = 0; i < path.length - 1; i++) {
    const segStart = path[i];
    const segEnd = path[i + 1];
    const segLengthM = distanceMetersBetween(segStart, segEnd);
    if (segLengthM <= 0) continue;
    if (remaining <= segLengthM) {
      return interpolateLatLng(segStart, segEnd, remaining / segLengthM);
    }
    remaining -= segLengthM;
  }
  return path[path.length - 1];
}

function simulatedAccuracyM(sampleIndex: number): number {
  return ACCURACY_BASELINE_M + ACCURACY_AMPLITUDE_M * Math.sin(sampleIndex * 1.3);
}

export function simulatedWalk(
  route: WalkingRoute,
  options?: { speedMetersPerSecond?: number; sampleIntervalMs?: number }
): SimSample[] {
  const path = route.path;
  if (path.length === 0) return [];

  if (path.length === 1) {
    return [
      {
        t: 0,
        position: path[0],
        accuracyM: simulatedAccuracyM(0),
        headingDeg: 0,
      },
    ];
  }

  const speedMetersPerSecond = options?.speedMetersPerSecond ?? DEFAULT_SPEED_M_PER_S;
  const sampleIntervalMs = options?.sampleIntervalMs ?? DEFAULT_SAMPLE_INTERVAL_MS;
  const distancePerSampleM = speedMetersPerSecond * (sampleIntervalMs / 1000);
  const totalDistanceM = totalPathLengthM(path);

  const positions: LatLng[] = [];
  const times: number[] = [];

  let cumulativeDistanceM = 0;
  let sampleIndex = 0;
  for (;;) {
    const atEnd = cumulativeDistanceM >= totalDistanceM;
    positions.push(atEnd ? path[path.length - 1] : pointAtDistance(path, cumulativeDistanceM));
    times.push(sampleIndex * sampleIntervalMs);
    if (atEnd) break;
    cumulativeDistanceM += distancePerSampleM;
    sampleIndex++;
  }

  // Clamp the final sample exactly onto the destination: don't overshoot or
  // stop short.
  positions[positions.length - 1] = path[path.length - 1];

  const samples: SimSample[] = positions.map((position, i) => ({
    t: times[i],
    position,
    accuracyM: simulatedAccuracyM(i),
    headingDeg: 0,
  }));

  for (let i = 0; i < samples.length; i++) {
    if (i < samples.length - 1) {
      samples[i].headingDeg = bearingDegBetween(samples[i].position, samples[i + 1].position);
    } else {
      samples[i].headingDeg = samples.length > 1 ? samples[i - 1].headingDeg : 0;
    }
  }

  return samples;
}

export function playSimulatedWalk(
  samples: SimSample[],
  onSample: (sample: SimSample) => void,
  options?: { speedMultiplier?: number }
): () => void {
  const speedMultiplier = options?.speedMultiplier ?? 1;
  let cancelled = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const scheduleNext = (index: number) => {
    if (cancelled || index >= samples.length) return;

    const delayMs = index === 0 ? 0 : (samples[index].t - samples[index - 1].t) / speedMultiplier;

    timeoutId = setTimeout(() => {
      if (cancelled) return;
      onSample(samples[index]);
      scheduleNext(index + 1);
    }, Math.max(0, delayMs));
  };

  scheduleNext(0);

  return () => {
    cancelled = true;
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  };
}
