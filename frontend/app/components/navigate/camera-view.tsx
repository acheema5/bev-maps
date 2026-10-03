"use client";

import { useEffect, useRef } from "react";
import { isLive } from "../../lib/sensors/camera";
import styles from "./navigate-screen.module.css";

type Props = {
  stream: MediaStream;
  onLost: () => void; // the track ended (iOS can end it in the background)
};

// The live rear camera, full-bleed: what the Camera app shows, minus every
// control (VISION → 4. Navigate).
export function CameraView({ stream, onLost }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    video.play().catch(() => {});
    return () => {
      video.srcObject = null;
    };
  }, [stream]);

  useEffect(() => {
    const check = () => {
      if (document.hidden) return;
      if (!isLive(stream)) onLost();
      else videoRef.current?.play().catch(() => {}); // un-freeze after a background trip
    };
    const tracks = stream.getVideoTracks();
    document.addEventListener("visibilitychange", check);
    tracks.forEach((t) => t.addEventListener("ended", check));
    return () => {
      document.removeEventListener("visibilitychange", check);
      tracks.forEach((t) => t.removeEventListener("ended", check));
    };
  }, [stream, onLost]);

  return <video ref={videoRef} className={styles.camera} autoPlay playsInline muted />;
}
