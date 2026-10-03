import { afterEach, describe, expect, it, vi } from "vitest";
import { findBevFound, findBevNoneNearby } from "shared/fixtures";
import { apiSource, requestBev, requestRoute } from "./api";
import { readFlags } from "./env";

const origin = { lat: 37.78583, lng: -122.40641 };
const live = readFlags("?live=1");

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("apiSource", () => {
  it("uses fixtures for ?fixture= and ?sim=1 in any build", () => {
    expect(apiSource(readFlags("?fixture=none"), "production")).toBe("fixtures");
    expect(apiSource(readFlags("?sim=1"), "production")).toBe("fixtures");
  });

  it("uses fixtures in development unless ?live=1", () => {
    expect(apiSource(readFlags(""), "development")).toBe("fixtures");
    expect(apiSource(readFlags("?live=1"), "development")).toBe("live");
  });

  it("is live in production", () => {
    expect(apiSource(readFlags(""), "production")).toBe("live");
  });
});

describe("requestBev: live", () => {
  it("returns the backend's answer as-is", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(findBevNoneNearby)));
    await expect(requestBev({ origin, accuracyM: 10 }, { flags: live })).resolves.toEqual(findBevNoneNearby);
    expect(fetch).toHaveBeenCalledWith("/api/find-bev", expect.objectContaining({ method: "POST" }));
  });

  it("turns a network failure into ERROR instead of throwing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Load failed"); }));
    await expect(requestBev({ origin, accuracyM: 10 }, { flags: live })).resolves.toMatchObject({ status: "ERROR" });
  });

  it("turns a non-contract response (e.g. a 504 page) into ERROR", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>Gateway Timeout</html>", { status: 504 })));
    await expect(requestBev({ origin, accuracyM: 10 }, { flags: live })).resolves.toMatchObject({ status: "ERROR" });
  });

  it("times out into ERROR", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => init.signal?.addEventListener("abort", () => reject(init.signal?.reason))),
      ),
    );
    await expect(requestBev({ origin, accuracyM: 10 }, { flags: live, timeoutMs: 20 })).resolves.toMatchObject({
      status: "ERROR",
    });
  });

  it("stops when the caller aborts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => init.signal?.addEventListener("abort", () => reject(init.signal?.reason))),
      ),
    );
    const controller = new AbortController();
    const pending = requestBev({ origin, accuracyM: 10 }, { flags: live, signal: controller.signal });
    controller.abort();
    await expect(pending).resolves.toMatchObject({ status: "ERROR" });
  });
});

describe("fixtures", () => {
  it("serves each ?fixture= variant", async () => {
    vi.useFakeTimers();
    const none = requestBev({ origin, accuracyM: 10 }, { flags: readFlags("?fixture=none") });
    const found = requestBev({ origin, accuracyM: 10 }, { flags: readFlags("?sim=1") });
    await vi.runAllTimersAsync();
    await expect(none).resolves.toEqual(findBevNoneNearby);
    await expect(found).resolves.toEqual(findBevFound);
  });

  it("serves an OK reroute", async () => {
    vi.useFakeTimers();
    const reroute = requestRoute({ origin, destination: origin }, { flags: readFlags("?sim=1") });
    await vi.runAllTimersAsync();
    await expect(reroute).resolves.toMatchObject({ status: "OK" });
  });
});
