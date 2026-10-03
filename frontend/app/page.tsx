"use client";

import { useEffect, useReducer, useState } from "react";
import { DesktopGate } from "./components/shell/desktop-gate";
import { InstallHint } from "./components/shell/install-hint";
import { RotateOverlay } from "./components/shell/rotate-overlay";
import { appReducer, initialState } from "./lib/app-state";
import { detectDevice, readFlags, type Device, type Flags } from "./lib/env";
import styles from "./page.module.css";

type Session = { flags: Flags; device: Device };

// One screen that changes state: Home → Finding → Found → Navigate → Arrived,
// plus edge states (VISION → The flow). See lib/app-state.ts.
export default function BevMaps() {
  const [state] = useReducer(appReducer, initialState);
  // Flags and device only exist in the browser. Until they're known, render
  // just the background, so a computer never flashes the Home screen.
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Reading the environment once after mount is a one-time sync from an
    // external system, not derived state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession({ flags: readFlags(window.location.search), device: detectDevice() });

    // iOS ignores user-scalable=no; stop pinch-zoom by hand.
    const stop = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", stop);
    return () => document.removeEventListener("gesturestart", stop);
  }, []);

  if (!session) return <div className={styles.app} />;

  const { flags, device } = session;
  if (!device.isPhone && !flags.sim && !flags.debug) return <DesktopGate />;

  return (
    <div className={styles.app}>
      <div className={styles.placeholder} data-screen={state.screen}>
        {state.screen}
      </div>
      {state.screen === "home" && device.isIOS && !device.isStandalone && <InstallHint />}
      <RotateOverlay />
    </div>
  );
}
