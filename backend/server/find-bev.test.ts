import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { findBev } from "./find-bev";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, "__fixtures__");

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(fixturesDir, name), "utf-8"));
}

function jsonResponse(data: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    json: async () => data,
  } as Response;
}

const ORIGIN = { lat: 37.7749, lng: -122.4194 };

let originalFetch: typeof fetch;
let originalKey: string | undefined;

beforeEach(() => {
  originalFetch = global.fetch;
  originalKey = process.env.GOOGLE_MAPS_SERVER_KEY;
  process.env.GOOGLE_MAPS_SERVER_KEY = "test-key";
});

afterEach(() => {
  global.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.GOOGLE_MAPS_SERVER_KEY;
  else process.env.GOOGLE_MAPS_SERVER_KEY = originalKey;
});

function routeUrlDispatch(handlers: {
  searchNearby?: () => Response;
  computeRouteMatrix?: () => Response;
  computeRoutes?: () => Response;
}) {
  return async (url: string | URL | Request): Promise<Response> => {
    const href = typeof url === "string" ? url : url.toString();
    if (href.includes("searchNearby")) {
      if (!handlers.searchNearby) throw new Error("unexpected searchNearby call");
      return handlers.searchNearby();
    }
    if (href.includes("computeRouteMatrix")) {
      if (!handlers.computeRouteMatrix) throw new Error("unexpected computeRouteMatrix call");
      return handlers.computeRouteMatrix();
    }
    if (href.includes("computeRoutes")) {
      if (!handlers.computeRoutes) throw new Error("unexpected computeRoutes call");
      return handlers.computeRoutes();
    }
    throw new Error(`unexpected fetch url: ${href}`);
  };
}

test("findBev: happy path picks the shortest walk among open candidates", async () => {
  const places = loadFixture("places-searchNearby.json");
  const matrix = loadFixture("routes-computeRouteMatrix.json");
  const route = loadFixture("routes-computeRoutes.json");

  global.fetch = routeUrlDispatch({
    searchNearby: () => jsonResponse(places),
    computeRouteMatrix: () => jsonResponse(matrix),
    computeRoutes: () => jsonResponse(route),
  }) as typeof fetch;

  const result = await findBev({ origin: ORIGIN, accuracyM: 10 });

  assert.equal(result.status, "FOUND");
  if (result.status !== "FOUND") return;
  // place-2 ("Big Mart") has the shortest walking duration (120s) even
  // though place-1 is nearer in a straight line.
  assert.equal(result.destination.placeId, "place-2");
  assert.equal(result.destination.name, "Big Mart");
  assert.equal(result.destination.kind, "supermarket");
  assert.equal(result.route.durationS, 120);
  assert.equal(result.route.distanceM, 150);
  assert.ok(result.route.path.length > 0);
  assert.deepEqual(result.route.path[0], { lat: 38.5, lng: -120.2 });
});

test("findBev: a closed nearer candidate is skipped for the next open one", async () => {
  const places = {
    places: [
      {
        id: "closed-1",
        types: ["convenience_store"],
        displayName: { text: "Closed Store" },
        location: { latitude: 37.7759, longitude: -122.4194 }, // nearest
        currentOpeningHours: { openNow: false },
      },
      {
        id: "open-2",
        types: ["supermarket"],
        displayName: { text: "Open Market" },
        location: { latitude: 37.779, longitude: -122.4194 },
        currentOpeningHours: { openNow: true, nextCloseTime: "2099-01-01T00:00:00Z" },
      },
    ],
  };
  const matrix = [
    { originIndex: 0, destinationIndex: 0, duration: "200s", distanceMeters: 220, condition: "ROUTE_EXISTS" },
  ];
  const route = {
    routes: [{ duration: "200s", distanceMeters: 220, polyline: { encodedPolyline: "_p~iF~ps|U_ulLnnqC" } }],
  };

  global.fetch = routeUrlDispatch({
    searchNearby: () => jsonResponse(places),
    computeRouteMatrix: () => jsonResponse(matrix),
    computeRoutes: () => jsonResponse(route),
  }) as typeof fetch;

  const result = await findBev({ origin: ORIGIN, accuracyM: 10 });

  assert.equal(result.status, "FOUND");
  if (result.status !== "FOUND") return;
  assert.equal(result.destination.placeId, "open-2");
});

test("findBev: a candidate closing before arrival is skipped for the next-shortest", async () => {
  const now = Date.now();
  const closesSoon = new Date(now + 60_000).toISOString(); // closes in 1 minute
  const closesLate = new Date(now + 3_600_000).toISOString(); // closes in 1 hour

  const places = {
    places: [
      {
        id: "closes-soon",
        types: ["convenience_store"],
        displayName: { text: "Almost Closed" },
        location: { latitude: 37.7759, longitude: -122.4194 },
        currentOpeningHours: { openNow: true, nextCloseTime: closesSoon },
      },
      {
        id: "stays-open",
        types: ["convenience_store"],
        displayName: { text: "Stays Open" },
        location: { latitude: 37.779, longitude: -122.4194 },
        currentOpeningHours: { openNow: true, nextCloseTime: closesLate },
      },
    ],
  };
  // "Almost Closed" has the shortest walk (60s), but arrival (60s + 5 min
  // buffer) is after its nextCloseTime, so it must be skipped in favor of
  // "Stays Open" even though that walk is longer (300s).
  const matrix = [
    { originIndex: 0, destinationIndex: 0, duration: "60s", distanceMeters: 70, condition: "ROUTE_EXISTS" },
    { originIndex: 0, destinationIndex: 1, duration: "300s", distanceMeters: 320, condition: "ROUTE_EXISTS" },
  ];
  const route = {
    routes: [{ duration: "300s", distanceMeters: 320, polyline: { encodedPolyline: "_p~iF~ps|U_ulLnnqC" } }],
  };

  global.fetch = routeUrlDispatch({
    searchNearby: () => jsonResponse(places),
    computeRouteMatrix: () => jsonResponse(matrix),
    computeRoutes: () => jsonResponse(route),
  }) as typeof fetch;

  const result = await findBev({ origin: ORIGIN, accuracyM: 10 });

  assert.equal(result.status, "FOUND");
  if (result.status !== "FOUND") return;
  assert.equal(result.destination.placeId, "stays-open");
});

test("findBev: returns NONE_NEARBY after one ~15-minute-walk search with nothing open", async () => {
  let searchCalls = 0;
  global.fetch = routeUrlDispatch({
    searchNearby: () => {
      searchCalls++;
      return jsonResponse({ places: [] });
    },
  }) as typeof fetch;

  const result = await findBev({ origin: ORIGIN, accuracyM: 10 });

  assert.equal(result.status, "NONE_NEARBY");
  if (result.status !== "NONE_NEARBY") return;
  assert.equal(result.searchedRadiusM, 1200);
  assert.equal(searchCalls, 1);
});

test("findBev: missing GOOGLE_MAPS_SERVER_KEY returns ERROR without calling fetch", async () => {
  delete process.env.GOOGLE_MAPS_SERVER_KEY;
  global.fetch = (async () => {
    throw new Error("fetch should not be called");
  }) as typeof fetch;

  const result = await findBev({ origin: ORIGIN, accuracyM: 10 });

  assert.equal(result.status, "ERROR");
  if (result.status !== "ERROR") return;
  assert.match(result.message, /GOOGLE_MAPS_SERVER_KEY/);
});

test("findBev: a network failure is caught and mapped to ERROR", async () => {
  global.fetch = (async () => {
    throw new Error("network down");
  }) as typeof fetch;

  const result = await findBev({ origin: ORIGIN, accuracyM: 10 });

  assert.equal(result.status, "ERROR");
  if (result.status !== "ERROR") return;
  assert.match(result.message, /network down/);
});

test("findBev: a non-OK API response is caught and mapped to ERROR", async () => {
  global.fetch = routeUrlDispatch({
    searchNearby: () => jsonResponse({ error: "bad request" }, false, 400),
  }) as typeof fetch;

  const result = await findBev({ origin: ORIGIN, accuracyM: 10 });

  assert.equal(result.status, "ERROR");
});

test("findBev: searches by distance with a timeout on every request", async () => {
  const places = loadFixture("places-searchNearby.json");
  const matrix = loadFixture("routes-computeRouteMatrix.json");
  const route = loadFixture("routes-computeRoutes.json");
  const seen: { url: string; body: any; hasSignal: boolean }[] = [];

  const dispatch = routeUrlDispatch({
    searchNearby: () => jsonResponse(places),
    computeRouteMatrix: () => jsonResponse(matrix),
    computeRoutes: () => jsonResponse(route),
  });
  global.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    seen.push({
      url: url.toString(),
      body: JSON.parse(String(init?.body)),
      hasSignal: init?.signal instanceof AbortSignal,
    });
    return dispatch(url);
  }) as typeof fetch;

  await findBev({ origin: ORIGIN, accuracyM: 10 });

  assert.equal(seen.length, 3);
  assert.ok(seen.every((r) => r.hasSignal));
  const search = seen.find((r) => r.url.includes("searchNearby"));
  assert.equal(search?.body.rankPreference, "DISTANCE");
});

test("findBev: stores more than a 15-minute walk away are not returned", async () => {
  const places = loadFixture("places-searchNearby.json");
  const route = loadFixture("routes-computeRoutes.json");
  global.fetch = routeUrlDispatch({
    searchNearby: () => jsonResponse(places),
    computeRouteMatrix: () =>
      jsonResponse([
        { originIndex: 0, destinationIndex: 0, duration: "1200s", distanceMeters: 1500, condition: "ROUTE_EXISTS" },
        { originIndex: 0, destinationIndex: 1, duration: "1300s", distanceMeters: 1600, condition: "ROUTE_EXISTS" },
        { originIndex: 0, destinationIndex: 2, duration: "1400s", distanceMeters: 1700, condition: "ROUTE_EXISTS" },
      ]),
    computeRoutes: () => jsonResponse(route),
  }) as typeof fetch;

  const result = await findBev({ origin: ORIGIN, accuracyM: 10 });

  assert.equal(result.status, "NONE_NEARBY");
});

test("findBev: invalid origin returns ERROR without calling fetch", async () => {
  global.fetch = (async () => {
    throw new Error("fetch should not be called");
  }) as typeof fetch;

  for (const origin of [
    { lat: NaN, lng: 0 },
    { lat: 91, lng: 0 },
    { lat: 0, lng: -181 },
    undefined as unknown as { lat: number; lng: number },
  ]) {
    const result = await findBev({ origin, accuracyM: 10 });
    assert.equal(result.status, "ERROR");
    if (result.status !== "ERROR") return;
    assert.equal(result.message, "invalid origin");
  }
});

test("findBev: places without a location are skipped", async () => {
  const places = loadFixture("places-searchNearby.json") as { places: any[] };
  const noLocation = {
    places: places.places.map((p) => ({ ...p, location: undefined })),
  };
  global.fetch = routeUrlDispatch({
    searchNearby: () => jsonResponse(noLocation),
  }) as typeof fetch;

  const result = await findBev({ origin: ORIGIN, accuracyM: 10 });

  assert.equal(result.status, "NONE_NEARBY");
});

test("findBev: a route with no polyline is an ERROR, not FOUND with an empty path", async () => {
  const places = loadFixture("places-searchNearby.json");
  const matrix = loadFixture("routes-computeRouteMatrix.json");
  global.fetch = routeUrlDispatch({
    searchNearby: () => jsonResponse(places),
    computeRouteMatrix: () => jsonResponse(matrix),
    computeRoutes: () => jsonResponse({ routes: [{ duration: "120s", distanceMeters: 150 }] }),
  }) as typeof fetch;

  const result = await findBev({ origin: ORIGIN, accuracyM: 10 });

  assert.equal(result.status, "ERROR");
});
