"use client";

import { REVEAL_RADIUS_M, revealedPoints } from "backend-core";
import { useEffect, useRef, type RefObject } from "react";
import type { Destination, LatLng, WalkingRoute } from "shared/contract";
import type { NavLive } from "../../lib/navigation/use-navigation";
import { fogMask, prepareSpots, type FogSpots } from "./fog-mask";
import { getMinimapMaps, hasTiles, type MinimapMaps } from "./maps";
import styles from "./minimap.module.css";
import { metersPerPx, toScreen, worldPx, zoomFor, type Camera } from "./projection";

// Google's logo and attribution live in the bottom strip and must stay fully
// visible (Maps Platform terms): the colored map and the overlay stop above it.
const LOGO_STRIP_PX = 28;

type Props = {
  route: WalkingRoute;
  destination: Destination;
  live: RefObject<NavLive>;
  headingUp: boolean; // compass ok: the map turns so where you face is up
  size: number; // CSS px across; always 1 m per px, so a bigger map shows more
};

type Px = { x: number; y: number };

// The minimap (VISION → 5): you, the accuracy circle, a triangle for where
// you face, a faint route and the store, over a dark map that lights up into
// color wherever you've walked. One rAF loop draws it imperatively, and skips
// any frame where nothing moved.
export function Minimap({ route, destination, live, headingUp, size }: Props) {
  const darkSlot = useRef<HTMLDivElement>(null);
  const lightSlot = useRef<HTMLDivElement>(null);
  const exploredRef = useRef<HTMLDivElement>(null);
  const routeRef = useRef<SVGPolylineElement>(null);
  const pinRef = useRef<SVGGElement>(null);
  const accuracyRef = useRef<SVGCircleElement>(null);
  const triangleRef = useRef<SVGGElement>(null);

  // A reroute swaps the route mid-walk; the loop reads the latest.
  const routeNow = useRef(route);
  useEffect(() => {
    routeNow.current = route;
  }, [route]);

  useEffect(() => {
    let maps: MinimapMaps | null = null;
    let requested = false;
    let disposed = false;
    let raf = 0;
    let zoom: number | null = null;
    let spots: FogSpots | null = null;
    let spotsCenter: Px | null = null;
    let routeWorld: { route: WalkingRoute | null; px: Px[] } = { route: null, px: [] };
    let last = { x: NaN, y: NaN, heading: NaN, accuracy: NaN, points: null as readonly LatLng[] | null, route: null as WalkingRoute | null };

    const attach = (m: MinimapMaps) => {
      if (disposed) return;
      maps = m;
      darkSlot.current?.appendChild(m.darkEl);
      lightSlot.current?.appendChild(m.lightEl);
      last = { ...last, x: NaN }; // force a redraw with the maps in place
    };

    const setMask = (el: HTMLElement | null, mask: string) => {
      if (!el) return;
      el.style.setProperty("-webkit-mask-image", mask);
      el.style.setProperty("mask-image", mask);
    };

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const fix = live.current?.fix;
      if (!fix) return; // keep the last frame (e.g. on arrival)

      zoom ??= zoomFor(fix.position.lat, size, size);
      if (!requested) {
        requested = true;
        getMinimapMaps(fix.position, zoom).then((m) => m && attach(m));
      }

      const compass = live.current?.headingDeg ?? null;
      const rotates = headingUp && compass !== null && (!maps || maps.canRotate());
      const heading = rotates ? compass : 0;
      const center = worldPx(fix.position, zoom);
      const points = revealedPoints();
      const current = routeNow.current;

      const moved = Math.abs(center.x - last.x) > 0.25 || Math.abs(center.y - last.y) > 0.25;
      const turned = Math.abs(((heading - last.heading + 540) % 360) - 180) > 0.5;
      if (!moved && !turned && fix.accuracyM === last.accuracy && points === last.points && current === last.route) return;
      last = { x: center.x, y: center.y, heading, accuracy: fix.accuracyM, points, route: current };

      if (maps) {
        const camera = { center: fix.position, heading, zoom };
        maps.dark.moveCamera(camera);
        maps.light.moveCamera(camera);
      }

      const cam: Camera = { center, headingDeg: heading, size };
      const mPerPx = metersPerPx(fix.position.lat, zoom);

      // Fog: re-bucket explored points only when a new one is saved or you've walked far.
      if (!spots || spots.source !== points || !spotsCenter || Math.hypot(center.x - spotsCenter.x, center.y - spotsCenter.y) > 60) {
        spots = prepareSpots(points, fix.position, zoom);
        spotsCenter = center;
      }
      setMask(maps ? lightSlot.current : exploredRef.current, fogMask(spots, center, cam, REVEAL_RADIUS_M / mPerPx));

      if (routeWorld.route !== current) routeWorld = { route: current, px: current.path.map((p) => worldPx(p, zoom!)) };
      routeRef.current?.setAttribute(
        "points",
        routeWorld.px.map((w) => toScreen(w, cam)).map((s) => `${s.x.toFixed(1)},${s.y.toFixed(1)}`).join(" "),
      );
      const pin = toScreen(worldPx(destination.location, zoom), cam);
      pinRef.current?.setAttribute("transform", `translate(${pin.x.toFixed(1)} ${pin.y.toFixed(1)})`);
      accuracyRef.current?.setAttribute("r", Math.min(fix.accuracyM / mPerPx, size * 0.75).toFixed(1));

      // Heading-up: you always face up. North-up (no rotation possible): the triangle turns instead.
      const triangle = triangleRef.current;
      if (triangle) {
        triangle.style.display = compass === null ? "none" : "";
        triangle.setAttribute("transform", `rotate(${rotates ? 0 : compass ?? 0})`);
      }
    };

    raf = requestAnimationFrame(frame);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      // Detach, never destroy: the maps are reused by the next minimap.
      const m = maps as MinimapMaps | null;
      m?.darkEl.remove();
      m?.lightEl.remove();
    };
  }, [live, headingUp, size, destination]);

  const visibleHeight = hasTiles ? size - LOGO_STRIP_PX : size;

  return (
    <div className={styles.frame} aria-hidden>
      <div className={styles.map} style={{ width: size, height: size }}>
        {hasTiles ? (
          <>
            <div ref={darkSlot} className={styles.layer} />
            <div className={styles.clip} style={{ height: visibleHeight }}>
              <div ref={lightSlot} className={styles.layer} style={{ height: size }} />
            </div>
          </>
        ) : (
          <div ref={exploredRef} className={`${styles.layer} ${styles.explored}`} />
        )}
        <div className={styles.clip} style={{ height: visibleHeight }}>
          <svg className={styles.overlay} width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <polyline ref={routeRef} className={styles.route} />
            <g ref={pinRef}>
              <circle r={5.5} className={styles.pin} />
            </g>
            <g transform={`translate(${size / 2} ${size / 2})`}>
              <circle ref={accuracyRef} r={0} className={styles.accuracy} />
              <g ref={triangleRef}>
                <path d="M0 -17.5 L5.5 -10 L-5.5 -10 Z" className={styles.triangle} />
              </g>
              <circle r={6.5} className={styles.dot} />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
