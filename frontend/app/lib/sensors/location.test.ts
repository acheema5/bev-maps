import { describe, expect, it } from "vitest";
import { decideFix, type Fix } from "./location";

const at = (accuracyM: number, timestampMs = 0): Fix => ({
  position: { lat: 40.7, lng: -74 },
  accuracyM,
  timestampMs,
});

describe("decideFix", () => {
  it("waits with no fixes, then gives up at 15 s", () => {
    expect(decideFix([], 0)).toEqual({ kind: "wait" });
    expect(decideFix([], 9_000)).toEqual({ kind: "wait" });
    expect(decideFix([], 15_000)).toEqual({ kind: "fail", notice: "no-fix" });
  });

  it("goes immediately with a fix within 50 m", () => {
    const good = at(35);
    expect(decideFix([at(200), good], 300)).toEqual({ kind: "use", fix: good });
  });

  it("waits for a better fix, then settles for ≤100 m after 8 s", () => {
    const ok = at(80);
    expect(decideFix([ok], 2_000)).toEqual({ kind: "wait" });
    expect(decideFix([ok], 8_000)).toEqual({ kind: "use", fix: ok });
  });

  it("calls Precise Location off at 8 s only if every fix is city-sized", () => {
    expect(decideFix([at(3_000), at(4_500)], 8_000)).toEqual({ kind: "fail", notice: "precise-off" });
    // One fix that's merely rough means real GPS is warming up: keep waiting.
    expect(decideFix([at(3_000), at(400)], 8_000)).toEqual({ kind: "wait" });
  });

  it("at 15 s uses the best fix within 200 m rather than failing", () => {
    const rough = at(180);
    expect(decideFix([at(900), rough], 15_000)).toEqual({ kind: "use", fix: rough });
    expect(decideFix([at(400)], 15_000)).toEqual({ kind: "fail", notice: "no-fix" });
  });

  it("picks the most accurate fix, newest on ties", () => {
    const newer = at(30, 2);
    expect(decideFix([at(30, 1), at(45, 3), newer], 0)).toEqual({ kind: "use", fix: newer });
  });
});
