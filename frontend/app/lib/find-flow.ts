import type { FindBevResponse } from "shared/contract";
import { requestBev } from "./api";
import type { NoticeKind } from "./app-state";
import type { Flags } from "./env";
import { decideFix, type Fix } from "./sensors/location";
import type { Session } from "./session";
import { MIN_SHIMMER_MS } from "./tuning";

export type FindOutcome =
  | { kind: "location-failed"; notice: Extract<NoticeKind, "location-denied" | "precise-off" | "no-fix"> }
  | { kind: "result"; response: FindBevResponse }
  | { kind: "aborted" };

// Finding Bev, start to finish (VISION → 2. Finding Bev): wait for a usable
// fix, ask the backend, and hold the shimmer at least MIN_SHIMMER_MS so it
// never flickers. Never throws; `signal` cancels it.
export async function findFlow(session: Session, flags: Flags, signal: AbortSignal): Promise<FindOutcome> {
  const startedAt = Date.now();
  const located = await waitForFix(session, signal);
  if (located.kind === "aborted") return located;

  const outcome: FindOutcome =
    located.kind === "fix"
      ? {
          kind: "result",
          response: await requestBev(
            { origin: located.fix.position, accuracyM: located.fix.accuracyM },
            { flags, signal },
          ),
        }
      : located;

  await delay(MIN_SHIMMER_MS - (Date.now() - startedAt), signal);
  return signal.aborted ? { kind: "aborted" } : outcome;
}

type Located =
  | { kind: "fix"; fix: Fix }
  | { kind: "location-failed"; notice: "location-denied" | "precise-off" | "no-fix" }
  | { kind: "aborted" };

function waitForFix(session: Session, signal: AbortSignal): Promise<Located> {
  const startedAt = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      if (signal.aborted || session.ended) return finish({ kind: "aborted" });
      if (session.locationDenied) return finish({ kind: "location-failed", notice: "location-denied" });
      const decision = decideFix(session.fixes, Date.now() - startedAt);
      if (decision.kind === "use") finish({ kind: "fix", fix: decision.fix });
      if (decision.kind === "fail") finish({ kind: "location-failed", notice: decision.notice });
    };
    const unsubscribe = session.onChange(check);
    const ticker = setInterval(check, 250);
    signal.addEventListener("abort", check, { once: true });
    let done = false;
    function finish(result: Located) {
      if (done) return;
      done = true;
      unsubscribe();
      clearInterval(ticker);
      signal.removeEventListener("abort", check);
      resolve(result);
    }
    check();
  });
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  if (ms <= 0 || signal.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}
