// The live rear camera (VISION → 4. Navigate). Prefers the main wide lens:
// WebKit maps zoom 1 to the wide camera (0.5 is ultra-wide). zoom goes in
// `advanced`, because WebKit rejects it as a required constraint.
export async function openRearCamera(): Promise<MediaStream | null> {
  if (!navigator.mediaDevices?.getUserMedia) return null;
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        advanced: [{ zoom: 1 } as MediaTrackConstraintSet],
      },
    });
  } catch {
    return null; // denied, no camera, or in use elsewhere: navigate over a dark background
  }
}

export function stopStream(stream: MediaStream): void {
  for (const track of stream.getTracks()) track.stop();
}

/** iOS can end the track while the app is in the background. */
export function isLive(stream: MediaStream): boolean {
  return stream.getVideoTracks().some((track) => track.readyState === "live");
}
