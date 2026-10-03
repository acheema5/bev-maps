import type { NoticeKind } from "../../lib/app-state";

// VISION → Edge states: each is one calm line, never a wall of text.
export const NOTICE_COPY: Record<NoticeKind, { line: string; hint?: string }> = {
  "location-denied": {
    line: "Bev Maps needs your location to find a bev.",
    hint: "Turn it on in Settings → Privacy & Security → Location Services → Safari Websites.",
  },
  "precise-off": {
    line: "Bev Maps needs your precise location.",
    hint: "Turn on Precise Location in Settings → Privacy & Security → Location Services → Safari Websites.",
  },
  "no-fix": { line: "Couldn't find you.", hint: "Step outside and try again." },
  "none-nearby": { line: "No bev open nearby." },
  network: { line: "Couldn't reach Bev." },
};
