// Example payloads typed against the contract. If the contract changes, these
// stop compiling, so both sides find out immediately. The frontend builds
// against these until the real API is live; the backend tests its output
// against the same shapes.

import type { FindBevResponse, RouteResponse } from "./contract";

export const findBevFound: FindBevResponse = {
  status: "FOUND",
  destination: {
    placeId: "fixture-7eleven-1",
    name: "7-Eleven",
    kind: "convenience_store",
    location: { lat: 37.78795, lng: -122.40745 },
    closesAt: "2026-10-03T23:59:00-07:00",
  },
  route: {
    path: [
      { lat: 37.78583, lng: -122.40641 },
      { lat: 37.78655, lng: -122.40656 },
      { lat: 37.78727, lng: -122.4067 },
      { lat: 37.78745, lng: -122.40735 },
      { lat: 37.78795, lng: -122.40745 },
    ],
    distanceM: 290,
    durationS: 240,
  },
};

export const findBevNoneNearby: FindBevResponse = {
  status: "NONE_NEARBY",
  searchedRadiusM: 1200,
};

export const findBevError: FindBevResponse = {
  status: "ERROR",
  message: "Couldn't reach Bev.",
};

export const rerouteOk: RouteResponse = {
  status: "OK",
  route: findBevFound.route,
};
