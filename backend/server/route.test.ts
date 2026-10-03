import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { getRoute } from "./route";

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
const DESTINATION = { lat: 37.779, lng: -122.4194 };

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

test("getRoute: happy path returns OK with the decoded route", async () => {
  const route = loadFixture("routes-computeRoutes.json");
  global.fetch = (async (url: string | URL | Request) => {
    const href = typeof url === "string" ? url : url.toString();
    if (!href.includes("computeRoutes")) throw new Error(`unexpected url: ${href}`);
    return jsonResponse(route);
  }) as typeof fetch;

  const result = await getRoute({ origin: ORIGIN, destination: DESTINATION });

  assert.equal(result.status, "OK");
  if (result.status !== "OK") return;
  assert.equal(result.route.durationS, 120);
  assert.equal(result.route.distanceM, 150);
  assert.ok(result.route.path.length > 0);
});

test("getRoute: missing GOOGLE_MAPS_SERVER_KEY returns ERROR without calling fetch", async () => {
  delete process.env.GOOGLE_MAPS_SERVER_KEY;
  global.fetch = (async () => {
    throw new Error("fetch should not be called");
  }) as typeof fetch;

  const result = await getRoute({ origin: ORIGIN, destination: DESTINATION });

  assert.equal(result.status, "ERROR");
  if (result.status !== "ERROR") return;
  assert.match(result.message, /GOOGLE_MAPS_SERVER_KEY/);
});

test("getRoute: a network/API failure is caught and mapped to ERROR", async () => {
  global.fetch = (async () => {
    throw new Error("network down");
  }) as typeof fetch;

  const result = await getRoute({ origin: ORIGIN, destination: DESTINATION });

  assert.equal(result.status, "ERROR");
  if (result.status !== "ERROR") return;
  assert.match(result.message, /network down/);
});

test("getRoute: a non-OK API response is caught and mapped to ERROR", async () => {
  global.fetch = (async () => jsonResponse({ error: "bad request" }, false, 400)) as typeof fetch;

  const result = await getRoute({ origin: ORIGIN, destination: DESTINATION });

  assert.equal(result.status, "ERROR");
});
