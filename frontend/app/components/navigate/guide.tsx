"use client";

import { useEffect, useRef } from "react";
import type { ArrowState } from "shared/contract";
import { springAtRest, stepSpring, type Spring } from "../../lib/spring";
import styles from "./guide.module.css";
import { arrowheadPose, leanFor, lerpShape, nextCurl, pathD, shapeFor, type Curl, type Shape } from "./guide-shapes";

type Props = {
  arrow: ArrowState;
  relativeAngleDeg: number;
  hidden: boolean; // no heading yet, phone held flat, or arrived
};

const HEAD = "M0 -24 L21 10 L-21 10 Z"; // points up the screen; rotated to the path's end

// The four-state guide (VISION → The guide). Shape changes morph with a
// spring, driven by rAF only while morphing; the dash flow is pure CSS.
export function Guide({ arrow, relativeAngleDeg, hidden }: Props) {
  const pathRefs = useRef<SVGPathElement[]>([]);
  const headRefs = useRef<SVGPathElement[]>([]);
  const anim = useRef<{ from: Shape; to: Shape; current: Shape; spring: Spring; curl: Curl; arrow: ArrowState | null; raf: number | null }>(null);

  useEffect(() => {
    const draw = (shape: Shape) => {
      const d = pathD(shape);
      for (const p of pathRefs.current) p.setAttribute("d", d);
      const { x, y, angleDeg } = arrowheadPose(shape);
      for (const h of headRefs.current) h.setAttribute("transform", `translate(${x} ${y}) rotate(${angleDeg})`);
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

  return (
    <div className={styles.guide} data-hidden={hidden ? "" : undefined} data-testid="guide" aria-hidden>
      <div className={styles.plane}>
        <div className={styles.lean} style={{ transform: `rotate(${lean}deg)` }}>
          <svg className={styles.svg} viewBox="0 0 200 300">
            <path ref={(el) => void (el && (pathRefs.current[0] = el))} className={styles.dashesShadow} pathLength={100} />
            <path ref={(el) => void (el && (headRefs.current[0] = el))} className={styles.headShadow} d={HEAD} />
            <path ref={(el) => void (el && (pathRefs.current[1] = el))} className={styles.dashes} pathLength={100} />
            <path ref={(el) => void (el && (headRefs.current[1] = el))} className={styles.head} d={HEAD} />
          </svg>
        </div>
      </div>
    </div>
  );
}
