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
import { debugKnobs } from "./lib/debug";
import { detectDevice, readFlags, type Device, type Flags } from "./lib/env";
import { findFlow } from "./lib/find-flow";
import { useNavigation } from "./lib/navigation/use-navigation";
import { openRearCamera, stopStream } from "./lib/sensors/camera";
import { fixedLocation, realLocation } from "./lib/sensors/location";
import { requestMotionPermission } from "./lib/sensors/permissions";
import { realSensors, simSensors, type NavSensors } from "./lib/sensors/source";
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
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [sensors, setSensors] = useState<NavSensors | null>(null);

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
      // Ending the trip already stopped the tracks; drop the dead stream.
      streamRef.current = null;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStream(null);
      setSensors(null);
    }
  }, [state.screen]);

  // Hands a camera stream to the trip, so ending the trip stops it, and to
  // the screen. A stream that arrives after the trip ended is stopped at once.
  const adoptStream = useCallback((session: Session, next: MediaStream | null) => {
    if (!next) return;
    session.own(() => stopStream(next));
    if (session.ended) return;
    // A replacement stream retires the old one right away, not at trip end.
    if (streamRef.current && streamRef.current !== next) stopStream(streamRef.current);
    streamRef.current = next;
    setStream(next);
  }, []);

  // Enable camera: one tap grants camera and compass together (VISION → 3.
  // Found). Order matters on iPhone: the motion prompt needs the tap's user
  // gesture, which doesn't survive waiting on the camera prompt, so it goes
  // first, synchronously, before anything is awaited.
  const onEnableCamera = useCallback(() => {
    const session = sessionRef.current;
    if (!env || !session || session.ended || session.starting || state.screen !== "found") return;
    const route = state.route;
    session.starting = true; // a second tap during the prompts does nothing
    const motion = env.flags.sim ? Promise.resolve("granted" as const) : requestMotionPermission();
    const camera = openRearCamera();
    dispatch({ type: "START" });
    Promise.all([motion, camera]).then(([motionAnswer, cameraStream]) => {
      adoptStream(session, cameraStream);
      if (session.ended) return;
      setSensors(
        env.flags.sim ? simSensors(route, env.flags.simSpeed, () => debugKnobs.headingOffsetDeg) : realSensors(session),
      );
      dispatch({
        type: "STARTED",
        camera: cameraStream ? "live" : "denied",
        compass: motionAnswer === "granted" ? "pending" : "denied",
      });
    });
  }, [env, state, adoptStream]);

  // iOS can end the camera while the app is in the background. Try to get it
  // back; if that fails, carry on over the dark background.
  const onCameraLost = useCallback(() => {
    const session = sessionRef.current;
    // The track's "ended" and the return to the foreground can both report
    // the same loss; recover once.
    if (!session || session.ended || session.recoveringCamera) return;
    session.recoveringCamera = true;
    openRearCamera().then((next) => {
      session.recoveringCamera = false;
      adoptStream(session, next);
      if (!session.ended) dispatch({ type: "CAMERA", camera: next ? "live" : "denied" });
      if (!next) {
        streamRef.current = null;
        setStream(null);
      }
    });
  }, [adoptStream]);

  const onExit = useCallback(() => dispatch({ type: "EXIT" }), []);

  const getTripSignal = useCallback(() => sessionRef.current?.signal, []);
  const trip = state.screen === "navigating" || state.screen === "arrived" ? state : null;
  const { view } = useNavigation({
    active: state.screen === "navigating",
    sensors,
    route: trip?.route ?? null,
    destination: trip?.destination ?? null,
    compass: state.screen === "navigating" ? state.compass : null,
    flags: env?.flags ?? null,
    tripSignal: getTripSignal,
    dispatch,
  });

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
        <NavigateScreen
          state={state as Extract<AppState, { screen: "navigating" | "arrived" }>}
          stream={stream}
          view={view}
          onCameraLost={onCameraLost}
          onExit={onExit}
        />
      )}
      {state.screen === "home" && device.isIOS && !device.isStandalone && <InstallHint />}
      <RotateOverlay />
      {flags.debug && <DebugPanel dispatch={dispatch} sim={flags.sim} />}
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
