// Motion & orientation permission (iOS 13+). WebKit only shows the prompt
// from a user gesture, and the gesture does NOT survive waiting on another
// prompt: call this FIRST in the Enable camera tap handler, before any await
// or getUserMedia. iOS remembers the answer, including "no", until the app is
// relaunched, so asking again in the same session can't show a prompt.
export type MotionPermission = "granted" | "denied";

export function requestMotionPermission(): Promise<MotionPermission> {
  const DeviceOrientation = window.DeviceOrientationEvent as
    | (typeof DeviceOrientationEvent & { requestPermission?: () => Promise<PermissionState | "granted" | "denied"> })
    | undefined;
  // No permission API (Android, desktop): nothing to ask; readings either arrive or don't.
  if (typeof DeviceOrientation?.requestPermission !== "function") return Promise.resolve("granted");
  return DeviceOrientation.requestPermission().then(
    (answer) => (answer === "granted" ? "granted" : "denied"),
    () => "denied",
  );
}
