"use client";

import { useEffect, useId, useRef } from "react";
import type { ArrowState } from "shared/contract";
import { springAtRest, stepSpring, type Spring } from "../../lib/spring";
import styles from "./guide.module.css";
import { arrowheadPose, leanFor, lerpShape, nextCurl, pathD, shapeFor, type Curl, type Shape } from "./guide-shapes";

type Props = {
  arrow: ArrowState;
  relativeAngleDeg: number;
  hidden: boolean; // no heading yet, phone held flat, or arrived
};

// Notched arrowhead, pointing up the screen; rotated to the path's end.
const HEAD =
  "M0 -27C2.4 -27 4.2 -25.6 5.4 -23.2L21.2 6.6C23.4 10.8 19.6 14.4 15.6 12.2L0 4L-15.6 12.2C-19.6 14.4 -23.4 10.8 -21.2 6.6L-5.4 -23.2C-4.2 -25.6 -2.4 -27 0 -27Z";
const GLINT = "M-2.6 -21.5L-14.2 3.6"; // catches the light as the band arrives

// The four-state guide (VISION → The guide). Shape changes morph with a
// spring, driven by rAF only while morphing; the shimmer is pure CSS.
export function Guide({ arrow, relativeAngleDeg, hidden }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const anim = useRef<{ from: Shape; to: Shape; current: Shape; spring: Spring; curl: Curl; arrow: ArrowState | null; raf: number | null }>(null);

  useEffect(() => {
    // Every layer that follows the line or the arrowhead is tagged in the SVG.
    const svg = svgRef.current;
    if (!svg) return;
    const lines = svg.querySelectorAll("[data-line]");
    const heads = svg.querySelectorAll("[data-head]");
    const draw = (shape: Shape) => {
      const d = pathD(shape);
      for (const p of lines) p.setAttribute("d", d);
      const { x, y, angleDeg } = arrowheadPose(shape);
      for (const h of heads) h.setAttribute("transform", `translate(${x} ${y}) rotate(${angleDeg})`);
    };

    let a = anim.current;
    if (!a) {
      const first = shapeFor(arrow, relativeAngleDeg >= 0 ? "right" : "left");
      a = anim.current = { from: first, to: first, current: first, spring: { x: 1, v: 0 }, curl: "right", arrow: null, raf: null };
    }
    const curl = nextCurl(arrow, a.arrow, relativeAngleDeg, a.curl);
    const target = shapeFor(arrow, curl);
    a.curl = curl;
    a.arrow = arrow;
    if (target === a.to) {
      draw(a.current);
      return;
    }

    // Morph from wherever we are now, even mid-morph.
    a.from = a.current;
    a.to = target;
    a.spring = { x: 0, v: 0 };
    let last = performance.now();
    const tick = (now: number) => {
      const s = anim.current!;
      s.spring = stepSpring(s.spring, 1, now - last);
      last = now;
      s.current = lerpShape(s.from, s.to, s.spring.x);
      draw(s.current);
      s.raf = springAtRest(s.spring, 1) ? null : requestAnimationFrame(tick);
    };
    if (a.raf !== null) cancelAnimationFrame(a.raf);
    a.raf = requestAnimationFrame(tick);
  }, [arrow, relativeAngleDeg]);

  useEffect(() => () => {
    const a = anim.current;
    if (a?.raf != null) cancelAnimationFrame(a.raf);
  }, []);

  const lean = leanFor(arrow, relativeAngleDeg);
  const id = useId().replace(/[^\w-]/g, "");

  return (
    <div className={styles.guide} data-hidden={hidden ? "" : undefined} data-testid="guide" aria-hidden>
      <div className={styles.plane}>
        <div className={styles.lean} style={{ transform: `rotate(${lean}deg)` }}>
          <svg ref={svgRef} className={styles.svg} viewBox="0 0 200 300">
            <defs>
              {/* The line fades in from the user's feet and stops short of the
                  arrowhead, so translucent layers never double up. */}
              <linearGradient id={`${id}fade`} gradientUnits="userSpaceOnUse" x1="0" y1="298" x2="0" y2="236">
                <stop offset="0" stopColor="#000" />
                <stop offset="1" stopColor="#fff" />
              </linearGradient>
              <mask id={`${id}mask`} maskUnits="userSpaceOnUse" x="-200" y="-200" width="600" height="700">
                <rect x="-200" y="-200" width="600" height="700" fill={`url(#${id}fade)`} />
                <g data-head="">
                  <path className={styles.headCut} d={HEAD} />
                </g>
              </mask>
            </defs>
            <g mask={`url(#${id}mask)`}>
              <g transform="translate(0 2.5)">
                <path data-line="" className={styles.lineShadow} />
              </g>
              <g className={styles.glass}>
                <path data-line="" className={styles.lineRim} />
                <path data-line="" className={styles.line} />
              </g>
              <path data-line="" className={`${styles.band} ${styles.bandWide}`} pathLength={100} />
              <path data-line="" className={`${styles.band} ${styles.bandMid}`} pathLength={100} />
              <path data-line="" className={`${styles.band} ${styles.bandCore}`} pathLength={100} />
            </g>
            <g transform="translate(0 2.5)">
              <g data-head="">
                <path className={styles.headShadow} d={HEAD} />
              </g>
            </g>
            <g data-head="">
              <g className={styles.headGlass}>
                <path className={styles.head} d={HEAD} />
              </g>
              <path className={styles.glint} d={GLINT} />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
