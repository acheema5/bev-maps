import type { Fix, LocationSource } from "./sensors/location";

const MAX_FIXES = 60;

// Everything one trip holds open, from the Find Bev tap until it's over: the
// GPS watch, requests in flight, and later the camera and the sim player.
// end() releases all of it, so leaving a trip can never leak a sensor.
export class Session {
  private readonly controller = new AbortController();
  private readonly listeners = new Set<() => void>();
  private readonly cleanups: (() => void)[] = [];
  private readonly stopLocation: () => void;

  /** Recent fixes, oldest first (bounded). */
  readonly fixes: Fix[] = [];
  latest: Fix | null = null;
  locationDenied = false;
  /** Enable camera was tapped; its permission prompts are in flight or done. */
  starting = false;

  constructor(location: LocationSource) {
    this.stopLocation = location.start(
      (fix) => {
        this.latest = fix;
        this.fixes.push(fix);
        if (this.fixes.length > MAX_FIXES) this.fixes.shift();
        this.emit();
      },
      () => {
        this.locationDenied = true;
        this.emit();
      },
    );
  }

  get signal(): AbortSignal {
    return this.controller.signal;
  }

  get ended(): boolean {
    return this.controller.signal.aborted;
  }

  /** Called on every new fix or location error. Returns an unsubscribe. */
  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Release this when the trip ends (camera tracks, sim player). Runs now if it already has. */
  own(cleanup: () => void): void {
    if (this.ended) cleanup();
    else this.cleanups.push(cleanup);
  }

  end(): void {
    if (this.ended) return;
    this.controller.abort();
    this.stopLocation();
    for (const cleanup of this.cleanups.splice(0)) cleanup();
    this.listeners.clear();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
