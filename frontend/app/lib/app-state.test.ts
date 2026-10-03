import { describe, expect, it } from "vitest";
import { findBevError, findBevFound, findBevNoneNearby } from "shared/fixtures";
import { appReducer, foundLine, initialState, type AppState } from "./app-state";

if (findBevFound.status !== "FOUND") throw new Error("findBevFound fixture must be FOUND");
const trip = { destination: findBevFound.destination, route: findBevFound.route };

function finding(attempt = 1): AppState {
  return appReducer(initialState, { type: "FIND", attempt });
}

describe("appReducer: finding", () => {
  it("Find Bev starts a search", () => {
    expect(finding(7)).toEqual({ screen: "finding", attempt: 7 });
  });

  it("maps every FindBevResponse variant to a screen", () => {
    expect(appReducer(finding(), { type: "FIND_RESULT", attempt: 1, response: findBevFound })).toEqual({
      screen: "found",
      ...trip,
    });
    expect(appReducer(finding(), { type: "FIND_RESULT", attempt: 1, response: findBevNoneNearby })).toEqual({
      screen: "notice",
      notice: "none-nearby",
    });
    expect(appReducer(finding(), { type: "FIND_RESULT", attempt: 1, response: findBevError })).toEqual({
      screen: "notice",
      notice: "network",
    });
  });

  it("maps location and network failures to notices", () => {
    expect(appReducer(finding(), { type: "LOCATION_FAILED", attempt: 1, notice: "location-denied" })).toEqual({
      screen: "notice",
      notice: "location-denied",
    });
    expect(appReducer(finding(), { type: "FIND_FAILED", attempt: 1 })).toEqual({
      screen: "notice",
      notice: "network",
    });
  });

  it("treats a FOUND route with fewer than two points as an error", () => {
    const broken = { ...findBevFound, route: { ...trip.route, path: [trip.route.path[0]] } };
    expect(appReducer(finding(), { type: "FIND_RESULT", attempt: 1, response: broken })).toEqual({
      screen: "notice",
      notice: "network",
    });
  });

  it("ignores results from an abandoned attempt", () => {
    const state = finding(2);
    expect(appReducer(state, { type: "FIND_RESULT", attempt: 1, response: findBevFound })).toBe(state);
    expect(appReducer(state, { type: "FIND_FAILED", attempt: 1 })).toBe(state);
  });

  it("ignores results once the search is over", () => {
    const home = appReducer(finding(), { type: "EXIT" });
    expect(appReducer(home, { type: "FIND_RESULT", attempt: 1, response: findBevFound })).toBe(home);
  });

  it("Try again from a notice searches again; a second tap while finding does nothing", () => {
    const notice = appReducer(finding(1), { type: "FIND_FAILED", attempt: 1 });
    expect(appReducer(notice, { type: "FIND", attempt: 2 })).toEqual({ screen: "finding", attempt: 2 });
    const busy = finding(3);
    expect(appReducer(busy, { type: "FIND", attempt: 4 })).toBe(busy);
  });
});

describe("appReducer: navigating", () => {
  const foundState: AppState = { screen: "found", ...trip };

  it("Enable camera → starting → navigating with permission results", () => {
    const starting = appReducer(foundState, { type: "START" });
    expect(starting).toEqual({ screen: "starting", ...trip });
    expect(appReducer(starting, { type: "STARTED", camera: "denied", compass: "ok" })).toEqual({
      screen: "navigating",
      ...trip,
      camera: "denied",
      compass: "ok",
    });
  });

  it("reroutes, permission changes, and arrival only apply while navigating", () => {
    const nav: AppState = { screen: "navigating", ...trip, camera: "live", compass: "pending" };
    const newRoute = { ...trip.route, distanceM: 10 };
    expect(appReducer(nav, { type: "ROUTE_UPDATED", route: newRoute })).toMatchObject({ route: newRoute });
    expect(appReducer(nav, { type: "COMPASS", compass: "denied" })).toMatchObject({ compass: "denied" });
    expect(appReducer(nav, { type: "ROUTE_UPDATED", route: { ...newRoute, path: [] } })).toBe(nav);
    expect(appReducer(nav, { type: "ARRIVED" })).toEqual({ screen: "arrived", ...trip, compass: "pending" });

    // A reroute that lands after the user left changes nothing.
    const home = appReducer(nav, { type: "EXIT" });
    expect(appReducer(home, { type: "ROUTE_UPDATED", route: newRoute })).toBe(home);
    const arrived = appReducer(nav, { type: "ARRIVED" });
    expect(appReducer(arrived, { type: "ROUTE_UPDATED", route: newRoute })).toBe(arrived);
  });

  it("EXIT returns home from anywhere", () => {
    for (const s of [foundState, { screen: "arrived", ...trip, compass: "ok" } as AppState, finding()]) {
      expect(appReducer(s, { type: "EXIT" })).toEqual(initialState);
    }
  });
});

describe("foundLine", () => {
  it("shows the store and whole walking minutes, never 0", () => {
    expect(foundLine(trip.destination, { ...trip.route, durationS: 240 })).toBe("7-Eleven · 4 min");
    expect(foundLine(trip.destination, { ...trip.route, durationS: 20 })).toBe("7-Eleven · 1 min");
    expect(foundLine(trip.destination, { ...trip.route, durationS: 150 })).toBe("7-Eleven · 3 min");
  });
});
