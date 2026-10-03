import { describe, expect, it } from "vitest";
import { arrowheadPose, leanFor, lerpShape, nextCurl, pathD, shapeFor } from "./guide-shapes";

describe("guide shapes", () => {
  it("points the arrowhead the way each state means", () => {
    expect(arrowheadPose(shapeFor("STRAIGHT", "right")).angleDeg).toBeCloseTo(0, 5);
    expect(arrowheadPose(shapeFor("RIGHT", "right")).angleDeg).toBeCloseTo(90, 5);
    expect(arrowheadPose(shapeFor("LEFT", "right")).angleDeg).toBeCloseTo(-90, 5);
    expect(Math.abs(arrowheadPose(shapeFor("U_TURN", "right")).angleDeg)).toBeCloseTo(180, 5);
  });

  it("returns the same object for the same state, so a steady arrow never re-morphs", () => {
    expect(shapeFor("LEFT", "right")).toBe(shapeFor("LEFT", "left"));
    expect(shapeFor("U_TURN", "left")).toBe(shapeFor("U_TURN", "left"));
  });

  it("curls the U-turn toward the side you chose", () => {
    expect(arrowheadPose(shapeFor("U_TURN", "right")).x).toBeGreaterThan(100);
    expect(arrowheadPose(shapeFor("U_TURN", "left")).x).toBeLessThan(100);
  });

  it("morphs by interpolating the same structure", () => {
    const half = lerpShape(shapeFor("STRAIGHT", "right"), shapeFor("RIGHT", "right"), 0.5);
    expect(half[6][0]).toBeCloseTo(141, 5);
    expect(pathD(half)).toMatch(/^M100\.00 292\.00 C.* C.*$/);
  });

  it("latches the U-turn curl while in U_TURN", () => {
    expect(nextCurl("U_TURN", "RIGHT", 170, "left")).toBe("right"); // entering: follow the angle
    expect(nextCurl("U_TURN", "U_TURN", -179, "right")).toBe("right"); // jitter across ±180: hold
    expect(nextCurl("STRAIGHT", "U_TURN", -10, "right")).toBe("right");
  });

  it("leans only within STRAIGHT, at most 15°", () => {
    expect(leanFor("STRAIGHT", 20)).toBe(10);
    expect(leanFor("STRAIGHT", -60)).toBe(-15);
    expect(leanFor("RIGHT", 60)).toBe(0);
  });
});
