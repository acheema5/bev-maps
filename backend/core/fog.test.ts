import { test } from "node:test";
import assert from "node:assert/strict";
import type { LatLng } from "shared/contract";

// Minimal in-memory localStorage stub for Node (localStorage doesn't exist
// outside a browser).
type StorageStub = {
  store: Map<string, string>;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
};

function makeStorage(): StorageStub {
  const store = new Map<string, string>();
  return {
    store,
    getItem(key) {
      return store.has(key) ? (store.get(key) as string) : null;
    },
    setItem(key, value) {
      store.set(key, value);
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

function makeThrowingStorage(): StorageStub {
  return {
    store: new Map(),
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
    removeItem() {
      throw new Error("blocked");
    },
    clear() {
      throw new Error("blocked");
    },
  };
}

function installWindow(storage: StorageStub | undefined) {
  if (storage === undefined) {
    delete (globalThis as Record<string, unknown>).window;
    return;
  }
  (globalThis as Record<string, unknown>).window = { localStorage: storage };
}

// fog.ts keeps a module-level in-memory cache, so each test imports a fresh
// module instance (via a unique query string, a standard ESM cache-busting
// trick) to get isolated state — this also lets us simulate an "app
// restart" by re-importing against the same underlying mock storage.
let moduleCounter = 0;
async function freshFog(): Promise<typeof import("./fog.ts")> {
  moduleCounter++;
  return import(`./fog.ts?instance=${moduleCounter}`);
}

const SF: LatLng = { lat: 37.7749, lng: -122.4194 };

// Matches the haversine helper in fog.ts exactly for a pure north/south
// offset (same R, no longitude change), so test distances are exact.
const EARTH_RADIUS_M = 6371000;
function offsetNorth(base: LatLng, meters: number): LatLng {
  const dLatRad = meters / EARTH_RADIUS_M;
  return { lat: base.lat + (dLatRad * 180) / Math.PI, lng: base.lng };
}

test("first call to recordPosition always saves", async () => {
  installWindow(makeStorage());
  const { recordPosition, revealedPoints } = await freshFog();
  recordPosition(SF, 5);
  assert.deepEqual(revealedPoints(), [SF]);
});

test("a call within 5m of the last saved point does not add a new point", async () => {
  installWindow(makeStorage());
  const { recordPosition, revealedPoints } = await freshFog();
  recordPosition(SF, 5);
  recordPosition(offsetNorth(SF, 2), 5);
  assert.equal(revealedPoints().length, 1);
});

test("a call beyond 5m adds a new point", async () => {
  installWindow(makeStorage());
  const { recordPosition, revealedPoints } = await freshFog();
  recordPosition(SF, 5);
  recordPosition(offsetNorth(SF, 10), 5);
  assert.equal(revealedPoints().length, 2);
});

test("a call with accuracyM > 30 is dropped even if far away", async () => {
  installWindow(makeStorage());
  const { recordPosition, revealedPoints } = await freshFog();
  recordPosition(SF, 5);
  recordPosition(offsetNorth(SF, 100), 31);
  assert.equal(revealedPoints().length, 1);
});

test("revealedPoints returns points shaped as LatLng[]", async () => {
  installWindow(makeStorage());
  const { recordPosition, revealedPoints } = await freshFog();
  recordPosition(SF, 5);
  recordPosition(offsetNorth(SF, 20), 5);
  const points = revealedPoints();
  assert.ok(Array.isArray(points));
  assert.equal(points.length, 2);
  for (const p of points) {
    assert.equal(typeof p.lat, "number");
    assert.equal(typeof p.lng, "number");
    assert.deepEqual(Object.keys(p).sort(), ["lat", "lng"]);
  }
});

test("points persist across a simulated app restart", async () => {
  const storage = makeStorage();
  installWindow(storage);

  const before = await freshFog();
  before.recordPosition(SF, 5);
  before.recordPosition(offsetNorth(SF, 50), 5);
  assert.equal(before.revealedPoints().length, 2);

  // Simulate closing and reopening the app: fresh module instance (empty
  // in-memory cache), same underlying persisted storage.
  const after = await freshFog();
  const points = after.revealedPoints();
  assert.equal(points.length, 2);
  assert.deepEqual(points[0], SF);
});

test("no window/localStorage: recordPosition no-ops, revealedPoints returns []", async () => {
  installWindow(undefined);
  const { recordPosition, revealedPoints } = await freshFog();
  assert.doesNotThrow(() => recordPosition(SF, 5));
  assert.deepEqual(revealedPoints(), []);
});

test("throwing localStorage: recordPosition no-ops, revealedPoints returns []", async () => {
  installWindow(makeThrowingStorage());
  const { recordPosition, revealedPoints } = await freshFog();
  assert.doesNotThrow(() => recordPosition(SF, 5));
  assert.deepEqual(revealedPoints(), []);
});
