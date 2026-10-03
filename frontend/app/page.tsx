"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { findBevFound } from "shared/fixtures";
import { Backdrop } from "./components/find-bev/backdrop";
import { HomeStage, type HomeScreen } from "./components/find-bev/home-stage";
import { NavigateScreen } from "./components/navigate/navigate-screen";
import { DesktopGate } from "./components/shell/desktop-gate";
import { InstallHint } from "./components/shell/install-hint";
import { RotateOverlay } from "./components/shell/rotate-overlay";
import { appReducer, initialState, type AppState } from "./lib/app-state";
import { detectDevice, readFlags, type Device, type Flags } from "./lib/env";
import { findFlow } from "./lib/find-flow";
import { fixedLocation, realLocation } from "./lib/sensors/location";
import { Session } from "./lib/session";
import styles from "./page.module.css";

const DebugPanel = dynamic(() => import("./components/shell/debug-panel").then((m) => m.DebugPanel), {
  ssr: false,
});

// The simulated walk starts where the fixture route starts.
const SIM_ORIGIN = findBevFound.status === "FOUND" ? findBevFound.route.path[0] : { lat: 0, lng: 0 };

type Env = { flags: Flags; device: Device };

// One screen that changes state: Home → Finding → Found → Navigate → Arrived,
// plus edge states (VISION → The flow). The reducer is lib/app-state.ts; this
// component runs the side effects: sensors, requests, and the trip's lifetime.
export default function BevMaps() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  // Flags and device only exist in the browser. Until they're known, render
  // just the backdrop, so a computer never flashes the Home screen.
  const [env, setEnv] = useState<Env | null>(null);
  const sessionRef = useRef<Session | null>(null);

  useEffect(() => {
    // A one-time read of the browser environment after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnv({ flags: readFlags(window.location.search), device: detectDevice() });

    // iOS ignores user-scalable=no; stop pinch-zoom by hand.
    const stop = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", stop);
    return () => document.removeEventListener("gesturestart", stop);
  }, []);

  // Find Bev and Try again start a new trip. Location is asked for on this tap.
  const onFind = useCallback(() => {
    if (!env) return;
    sessionRef.current?.end();
    sessionRef.current = new Session(env.flags.sim ? fixedLocation(SIM_ORIGIN) : realLocation);
    dispatch({ type: "FIND", attempt: Date.now() });
  }, [env]);

  // Finding Bev: wait for a usable fix, ask the backend, report back.
  const findingAttempt = state.screen === "finding" ? state.attempt : null;
  useEffect(() => {
    const session = sessionRef.current;
    if (findingAttempt === null || !env || !session || session.ended) return;
    const controller = new AbortController();
    findFlow(session, env.flags, controller.signal).then((outcome) => {
      if (outcome.kind === "location-failed") {
        dispatch({ type: "LOCATION_FAILED", attempt: findingAttempt, notice: outcome.notice });
      } else if (outcome.kind === "result") {
        dispatch({ type: "FIND_RESULT", attempt: findingAttempt, response: outcome.response });
      }
    });
    // iOS freezes timers in the background; a search resumed later would
    // time out on the spot. Leaving the app mid-search goes back to Home.
    const onVisibility = () => {
      if (document.hidden) dispatch({ type: "EXIT" });
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      controller.abort();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [findingAttempt, env]);

  // Back on Home or showing a notice: the trip is over, release its sensors.
  useEffect(() => {
    if (state.screen === "home" || state.screen === "notice") {
      sessionRef.current?.end();
      sessionRef.current = null;
    }
  }, [state.screen]);

  // Enable camera. Camera and compass permissions land with the sensors PR;
  // until then navigation opens without them.
  const onEnableCamera = useCallback(() => {
    dispatch({ type: "START" });
    dispatch({ type: "STARTED", camera: "denied", compass: "unavailable" });
  }, []);

  const onExit = useCallback(() => dispatch({ type: "EXIT" }), []);

  const homeScreen = isHomeScreen(state) ? state : null;

  if (!env) {
    return (
      <div className={styles.app}>
        <Backdrop />
      </div>
    );
  }

  const { flags, device } = env;
  if (!device.isPhone && !flags.sim && !flags.debug) {
    return (
      <div className={styles.app}>
        <Backdrop />
        <DesktopGate />
      </div>
    );
  }

  return (
    <div className={styles.app}>
      {homeScreen && <Backdrop />}
      {homeScreen ? (
        <HomeStage state={homeScreen} onFind={onFind} onEnableCamera={onEnableCamera} />
      ) : (
        <NavigateScreen state={state as Extract<AppState, { screen: "navigating" | "arrived" }>} onExit={onExit} />
      )}
      {state.screen === "home" && device.isIOS && !device.isStandalone && <InstallHint />}
      <RotateOverlay />
      {flags.debug && <DebugPanel dispatch={dispatch} />}
    </div>
  );
}

function isHomeScreen(state: AppState): state is HomeScreen {
  return (
    state.screen === "home" ||
    state.screen === "finding" ||
    state.screen === "found" ||
    state.screen === "starting" ||
    state.screen === "notice"
  );
}
