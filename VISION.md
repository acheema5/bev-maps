# Bev Maps

> Tap **Find Bev**. Hold up your phone. Follow the arrow to the closest open place to grab a drink.

**Status:** v1 in build · **Source:** founding conversation, October 2, 2026

This file is the source of truth for what Bev Maps is. If the code and this doc disagree, fix one of them on purpose.

**Reading this doc:** everything here comes from the founding conversation unless it's marked *(proposed)*. Proposed items fill gaps the conversation didn't cover. Treat them as working defaults: build with them, change them freely, and record changes in the [decision log](#decision-log).

---

## What Bev Maps is

Bev Maps is a mobile app with one job: walk you to the closest open place to grab a drink.

You open it and the screen says one thing: **Find Bev**. You tap it. While the app works, the words become **Finding Bev**, with light streaming through them. Once it has a store, you enable your camera and hold your phone up in front of you, like playing Pokémon Go. A big animated arrow, overlaid on the live camera view, tells you where to walk: straight, left, right, or turn around. In the top-left corner, a minimap shows where you are and which way you're facing. It starts dark and lights up into full color as you walk through new streets.

No search box. No list of results. No settings. One tap, one answer, one arrow.

## Principles

These settle tradeoffs. When two options both work, pick the one that fits these better.

1. **One tap, one answer.** The app picks the destination. Nobody compares stores, scrolls a list, or types anything.
2. **Extremely simple.** Only the core loop ships: tap, find, walk. Everything else waits, including good ideas.
3. **Premium, never AI-looking.** Apple-grade glass, clean type, a lot of restraint. Nothing should look generated: no sparkle icons, no purple gradients, no chatbot feel.
4. **Built for walking.** On foot only. "Closest" means closest to walk to.
5. **Eyes on the street.** You navigate through the camera, over the real world, instead of looking down at a flat map.
6. **Plays like a game.** Pokémon Go's hold-it-up camera, a Call of Duty minimap, and a map that rewards exploring. Apple-clean on the surface, playful underneath.
7. **Money goes into Bev Maps.** We ship as a Home Screen web app instead of paying for App Store access, and stay inside free tiers wherever we can.

## The experience

### The flow

| Step | Screen | What you see | What's happening |
|---|---|---|---|
| 1 | Home | One glass button: **Find Bev** | Nothing yet |
| 2 | Finding | **Finding Bev**, shimmering | Get your location → find open stores nearby → pick the closest → get a walking route |
| 3 | Found | **Enable camera** | Waiting for the tap that turns on the camera |
| 4 | Navigate | Live camera, a big animated arrow, a minimap top-left | Guidance updates continuously as you walk and turn |
| 5 | Arrived | **You found Bev** glass card | Navigation ends; Done returns home (decision #8) |

*(proposed)* The whole flow is a single screen that changes state, with no page loads or URL changes between steps. It feels more like an app, and Home Screen web apps have historically dropped camera access when the page navigates.

### 1. Home: Find Bev

- The screen holds one button that says **Find Bev**. No logo bar, menu, onboarding, or explanation.
- **Look:** Apple glassmorphism, the frosted, translucent glass of current iOS (Liquid Glass). White, with a little gray toward the corners, so it reads as a physical piece of glass rather than a flat shape.
- **Feel:** seamlessly integrated, as if Apple shipped it. Not even slightly like an AI-generated button.
- **Type:** clean and Apple-like. Use SF Pro, the iPhone's system font, through the system font stack, so there's nothing to download. References for the overall feel: Apple's own apps, Granola, Wispr Flow.
- **Behind the glass** (decision #9): an off-white field with two or three very soft, slowly drifting white and gray light shapes. No color.
- **Always light**, whatever the phone's appearance setting.
- **One morphing button:** Find Bev → Finding Bev → Enable camera is the same piece of glass changing its label. The "7-Eleven · 4 min" line fades in above it.
- **Status bar:** `black-translucent`, so the camera can run full-bleed under it later (iOS reads this once at launch, so it can't switch per screen). Its clock and battery are white, so Home draws a very faint gray fade behind the status bar to keep them readable on the off-white background.

### 2. Finding Bev

- On tap, **Find Bev** becomes **Finding Bev** and stays that way until the backend returns a store.
- **The shimmer:** a band of light streams through the letters on a loop, like the old iPhone "slide to unlock" text. The letters are secondary gray with a brighter band sweeping through them (decision #10). The conversation described white letters with gray moving through, but literal white-on-white doesn't read on white glass. The shimmer *is* the loading indicator; there's no spinner.
- Dots appearing one at a time came up too. They're optional; the shimmer is the agreed core.
- *(proposed)* Hold the shimmer for at least ~0.8 s, even when the answer is instant, so it never flickers. If nothing comes back within ~10 s, show a calm error with Try again.
- *(proposed)* This state includes getting a GPS fix, which can take a few seconds. Ask for high accuracy, and start searching as soon as the fix is good enough (within ~50 m) rather than waiting for a perfect one.

### 3. Found: Enable camera

- Once a store is found, the app shows **Enable camera**, the way into navigation.
- *(proposed)* One quiet line above it with the store's name and walking time, e.g. "7-Eleven · 4 min". It shows the app found something real without asking the user to decide anything (decision #4).
- *(proposed)* This tap does two jobs. iPhone only grants camera and compass access after a tap, so **Enable camera** requests both together.

### 4. Navigate: the camera view

This screen is Bev Maps.

**The view.** The live rear camera fills the screen: what you'd see opening the Camera app to take a photo, minus the shutter button and every other control. You hold the phone upright in front of you, the way people play Pokémon Go.

**The guide.** Centered over the camera image is one large animated guide: a translucent blue line ending in a notched arrowhead, with a band of light sweeping along it into the arrowhead on the Finding Bev shimmer's rhythm, so the guide always pulls you forward (decided 2026-10-03; it replaces the founding conversation's dashed line, which had two to four dashes flowing toward the arrowhead).

The guide has four states:

| State | When | Shape |
|---|---|---|
| **Straight** | The route continues the way you're facing | Line runs up the screen, into the scene |
| **Left** | The route turns left | Line bends left |
| **Right** | The route turns right | Line bends right |
| **U-turn** | You're facing away from the route | Line curls into a U, arrowhead pointing back |

**How the four states are chosen** *(working default, decision #1).* One view in the conversation was that the arrow should account for every angle; the other, that the user should see a large arrow with four clear choices. Both fit. The app computes the exact angle between the direction you're facing and the direction of the route, then shows the matching state:

| Angle between your facing and the route | State |
|---|---|
| Within 30° either side | Straight |
| 30°–135° to the right | Right |
| 30°–135° to the left | Left |
| More than 135° either side | U-turn |

*(proposed)* About 10° of hysteresis at each boundary keeps the guide from flickering when you're near a line. Within Straight, the guide can lean slightly with the exact angle so it feels alive.

**Legibility.** iOS blue at partial opacity with a thin white rim and a soft shadow, so it reads over bright sidewalks, dark streets, and neon alike. *(proposed)* Tilt it slightly onto the ground plane so it looks painted on the street, not stuck to the glass. Animate with transforms and SVG dash offsets only, at 60 fps.

*(proposed)* **Leaving.** A small glass × in the top-right ends navigation and returns home.

**Later:** a capture button to take a photo of the view, in a left-hand corner (probably bottom-left, since the minimap owns top-left). It needs deeper integration with the phone, so it waits for v2.

### 5. The minimap

A small map in the **upper-left corner**, like the minimap in Call of Duty. The guide does the navigating; the minimap is for orientation and exploration.

**You.** A circle marks your position, sized to how sure the phone is about where you are: the accuracy circle Apple Maps draws. Wide when the fix is rough, tight when it's precise. A small triangle on the circle points the way your phone is facing. *Facing* means straight out of the back of the phone held upright in its normal vertical position, the direction the camera looks.

**Fog of war.** The minimap starts in Google's dark mode (decision #3). As you walk, the area around you lights up into the normal full-color Google Map (green parks, tan city blocks, blue water) and stays lit. Anywhere you haven't been stays dark. Picture the dark map on top, the regular colored map underneath, and your path cutting windows through the dark layer.

- **Reveal radius: 15 m** around you (working interpretation, decision #2).
- **You explore it with your feet.** To see more of the map, you go there. *(proposed: no panning or pinch-zoom; the minimap always follows you.)*
- *(proposed)* **It remembers.** Discovered areas stay discovered across sessions, saved on the phone.
- **Heading-up.** The map turns so the direction you're facing is always up, matching the camera view. The triangle then always points to the top, the way game minimaps work (decision #6).
- A faint route line and the destination pin, when they're in view (decision #7).

### Edge states *(proposed)*

Each is one calm line in the same glass style, never a wall of text.

| Situation | What the user sees |
|---|---|
| Location permission denied | "Bev Maps needs your location to find a bev." + how to turn it on |
| Nothing open within walking range | "No bev open nearby." + Try again |
| Camera denied | Navigation continues: the guide over a dark background, minimap as usual |
| Compass or motion denied | iPhone remembers a denial until the app is relaunched, so the "ask once more" is the line "Reopen Bev Maps to allow compass". Meanwhile: enlarge the minimap and show the route line |
| Compass gives no usable reading | Same as denied, without the reopen hint |
| Weak GPS | Stay on Finding Bev a little longer while accuracy improves |
| Precise Location off | Fixes stay city-sized and never improve: one line on where to turn Precise Location on |
| No usable GPS fix in time | "Couldn't find you. Step outside and try again." + Try again |
| Phone turned sideways | "Turn your phone upright" (iPhone can't lock a web app to portrait) |
| Phone held flat | "Hold your phone up" |
| Network error | "Couldn't reach Bev." + Try again |
| Opened in a Safari tab, not installed | A small hint: Share → Add to Home Screen |
| Opened on a computer | "Bev Maps lives on your phone." |

## How a bev gets found

When the user taps **Find Bev**, the backend returns exactly one destination and a walking route to it.

1. **Locate:** the phone's GPS position and its accuracy.
2. **Gather:** places nearby that sell drinks, from Google Maps: convenience stores, supermarkets, and the like.
3. **Filter:** keep only places open now.
4. **Choose:** the closest one.
5. **Route:** a walking route from the user to that store, which the frontend turns into the guide and the minimap.

Refinements *(proposed)*:

- **Closest on foot, not as the crow flies.** Straight-line distance lies: the "closest" store can sit across a river or a highway. Shortlist the nearest ~5 by straight line, get walking times for all of them in one request, and pick the shortest walk.
- **Open when you get there.** Skip stores that close before you'd arrive, plus a few minutes of buffer.
- **Walking range.** Search out to about a 15-minute walk (~1.2 km), widening in steps if nothing turns up. Past that: "No bev open nearby."
- **Fast.** Start the search the moment a usable location arrives. Steps 2–5 should land within a couple of seconds.

**What counts as a bev** (decision #5). Any place open right now that sells drinks: convenience stores, supermarkets, grocery stores, pharmacies, gas stations, liquor stores, cafés, coffee, tea, and juice shops, delis, bakeries, bagel and donut shops. We don't search for restaurants or bars, but one that Google also lists as a café, deli, or bakery counts. When the nearest results are all closed (cafés and bakeries at night), a second search looks at long-hours stores only. The conversation also named vending machines (see below).

**Google can't see the shelves.** The conversation framed this as finding which bevs are in which stores, but Google Maps doesn't publish inventory. In v1, store type stands in for inventory: an open convenience store is assumed to have a bev.

**Vending machines aren't on Google Maps.** They came up as a bev source, and, as the conversation itself pointed out, Google doesn't list them. They come into Bev Maps through user-added locations, later.

## Platform: a web app on the Home Screen

- **Phones only.** Bev Maps is used exclusively on mobile. iPhone with Safari is the reference device. *(proposed: Android Chrome should mostly work as a side effect, but it isn't a target.)*
- **No App Store.** Bev Maps is a website deployed on Vercel. You open it in Safari, tap Share → **Add to Home Screen**, and from then on it launches full-screen from its own icon, like a native app. It can still talk to a backend that stores data when we need one.
- **Why.** An Apple Developer account costs $99 a year. That money, and our capital in general, goes into expanding Bev Maps rather than to Apple. *(proposed side benefit: every deploy is live instantly, with no App Store review.)*
- **What "AR" means here** *(proposed)*. Safari on iPhone has historically not supported WebXR, the web's AR API, so we don't anchor 3D objects in the world. The camera is a full-screen video, and the guide is an overlay steered by GPS and the compass. That's exactly what the vision calls for, and it works in Safari today.
- **One tap per permission** *(proposed)*. Location is requested on the **Find Bev** tap; camera and motion/compass on the **Enable camera** tap. iPhone won't show the motion prompt at all without a tap. Home Screen web apps have historically re-asked for camera access on each launch, so the Enable camera step should make that feel natural.
- **Home Screen polish** *(proposed)*. A web app manifest and Apple touch icon so the name and icon look right; standalone full-screen mode; respect the notch and Dynamic Island safe areas; design for portrait.

## Technical shape *(proposed)*

Nothing in this section was decided in the conversation. It's the simplest build that delivers everything above, using tools we already know.

**Stack**

- **App:** Next.js + TypeScript on Vercel. One deploy for the UI and the API routes.
- **Maps:** Google Maps JavaScript API for the minimap; Places API (New) to find stores; Routes API for walking times to the shortlist (`computeRouteMatrix`) and the winning route (`computeRoutes`).
- **Keys:** Places and Routes calls run server-side, so that key never reaches the phone. The Maps JavaScript key is restricted to our domain.
- **Data:** no database in v1. The server keeps nothing about users; a location is used for one request and dropped. Exploration history lives on the phone. When Later features need accounts and shared data, add Supabase.

**Server API**

```ts
type LatLng = { lat: number; lng: number };

// POST /api/find-bev
type FindBevRequest = {
  origin: LatLng;
  accuracyM: number;           // phone-reported accuracy, meters
};

type FindBevResponse =
  | { status: "FOUND"; destination: Destination; route: WalkingRoute }
  | { status: "NONE_NEARBY"; searchedRadiusM: number }
  | { status: "ERROR"; message: string };

// POST /api/route — reroute when the user leaves the path
type RouteRequest = { origin: LatLng; destination: LatLng };

type RouteResponse =
  | { status: "OK"; route: WalkingRoute }
  | { status: "ERROR"; message: string };

type Destination = {
  placeId: string;
  name: string;                // "7-Eleven"
  kind: string;                // e.g. "convenience_store"
  location: LatLng;
  closesAt?: string;           // ISO 8601, when known
};

type WalkingRoute = {
  path: LatLng[];              // user → store
  distanceM: number;
  durationS: number;
};
```

**On-phone logic: pure functions, no UI**

```ts
type ArrowState = "STRAIGHT" | "LEFT" | "RIGHT" | "U_TURN";

type Guidance = {
  arrow: ArrowState;
  relativeAngleDeg: number;    // -180..180; positive = route is to your right
  offRoute: boolean;           // true → call /api/route
  arrived: boolean;
};

declare function guide(input: {
  position: LatLng;
  accuracyM: number;
  headingDeg: number;          // where the back camera faces; 0 = north, clockwise
  route: WalkingRoute;
  previous?: Guidance;         // enables hysteresis
}): Guidance;

// Fog of war
declare function recordPosition(position: LatLng, accuracyM: number): void;
declare function revealedPoints(): LatLng[];   // each reveals a 15 m circle
```

Starting values for the guidance loop. Tune them on a real sidewalk.

- **Inputs:** GPS position about once a second; heading continuously, smoothed; the route.
- **Target:** snap the user onto the route, then aim at a point ~25 m further along it. Aiming ahead along the path, rather than at the next turn, keeps the guide steady and makes turns feel natural.
- **Arrow:** relative angle = bearing to target − heading, mapped to a state with the thresholds above.
- **Off route:** farther than max(30 m, 2 × accuracy) from the path for ~5 s → reroute, at most once every ~15 s.
- **Arrived:** within ~20 m of the store (somewhat more when GPS is weak).
- **Heading:** the direction the back camera faces with the phone upright, not the top edge of a phone lying flat. Check that iPhone's compass reading (`webkitCompassHeading`) holds up in that pose; if not, derive heading from the full device orientation. Smooth it: compass readings jitter, especially near cars and steel.

**Fog of war rendering**

- Save a point whenever the user has moved at least 5 m and accuracy is 30 m or better. The revealed area is the union of 15 m circles around saved points. Store on the phone (localStorage to start, IndexedDB if it grows).
- Render two stacked minimaps that move together: Google's dark color scheme on top, the standard scheme underneath, with revealed circles masked out of the top one. A Google map's color scheme is fixed when the map is created, so two instances is the direct route. The minimap never pans on its own, so keeping them in sync is just "both follow the user." Heading-up rotation needs Google's vector maps (a Map ID).
- If two map instances prove heavy, fall back to one standard map under a dark overlay with the circles cut out.

**Cost**

- Each Find Bev is one place search, one walking-times request, and one route; reroutes are throttled. Request only the fields we use. Google Maps Platform bills per call with a free monthly allowance per API, and normal use should stay inside it. Set a budget alert on day one.

## Scope

**v1: five pieces, shipped together**

1. **Find Bev:** the glass button and the Finding Bev shimmer.
2. **The bev engine:** the closest open store and a walking route to it.
3. **Camera navigation:** the live camera view and the animated four-state guide.
4. **The minimap:** top-left, with accuracy circle and heading.
5. **Fog of war:** the minimap lighting up as you explore.

**Done means:** standing on a sidewalk, you open Bev Maps from your Home Screen, tap **Find Bev**, and reach an open store by following only the arrow, while the minimap colors in behind you.

Checks *(proposed)*:

- Outdoors, tap to **Enable camera** takes under ~5 s.
- Walking a straight block, the guide never flickers between states.
- Close and reopen the app: everything you uncovered is still uncovered.

**Later**

- **Capture:** a photo button in a left-hand corner of the camera view.
- **Add a location:** users scan spots Google Maps doesn't know, especially vending machines (often open 24/7), and earn points for each.
- **Profiles:** accounts, needed for points and for the next item.
- **Access-aware spots:** many vending machines sit behind doors only residents can open. Before routing anyone to one, Bev Maps has to know who can get in.

**Not doing**

- Driving, biking, or transit directions.
- Lists, search, filters, ratings, or store browsing.
- A native App Store app.

## Open decisions

Each has a working default so the build never waits. Confirm or change it, then log it below and mark it decided here.

| # | Question | Options | Working default | Status |
|---|---|---|---|---|
| 1 | How does the arrow move? | Every angle · four fixed states | Compute every angle, display four states | Open |
| 2 | What does "15 m" refer to? | Fog reveal radius · how much the minimap shows | Reveal radius. If the minimap showed only 15 m, everything on it would always be revealed and the fog would never appear. The minimap shows ~150 m across. | Open |
| 3 | What does the unexplored map look like? | Black-and-white · Google dark mode | Google dark mode (both were mentioned) | **Decided 2026-10-03:** Google dark mode |
| 4 | Show the destination before navigating? | Name + minutes · keep it a surprise | Name + minutes | Open |
| 5 | What counts as a bev? | Grab-and-go stores · + pharmacies and gas stations · + cafés · + alcohol | Grab-and-go stores | **Decided 2026-10-03:** any place open now that sells drinks (stores, pharmacies, gas stations, liquor stores, cafés, coffee/tea/juice shops, delis, bakeries). We don't search for restaurants or bars |
| 6 | Minimap orientation | Heading-up · north-up | Heading-up | **Decided 2026-10-03:** heading-up |
| 7 | Route on the minimap? | Route + destination pin · fog only | Faint route + pin | **Decided 2026-10-03:** faint route + pin |
| 8 | Arrival moment | Quiet glass card · something celebratory | "You found Bev" glass card | **Decided 2026-10-03:** quiet "You found Bev" card, Done → home |
| 9 | What sits behind the Find Bev glass? | Soft neutral · blurred local map · texture | Soft neutral. A local map would need location before the first tap. | **Decided 2026-10-03:** off-white with soft drifting white/gray light shapes |
| 10 | Shimmer contrast | White text, gray band · gray text, white band | Whichever reads on white glass; literal white-on-white won't | **Decided 2026-10-03:** gray text, brighter band |

## How we build it

The plan from the conversation: this file is the shared vision. The repo splits into two subfolders, one per person. Each of us points an agent at our own folder, and a third agent combines both continuously, as we go, not only at the end. Responsibilities split the way the conversation did, UI and backend, with one adjustment explained below.

**Repo layout** *(proposed)*

```
bev-maps/
├── VISION.md       this file: what we're building and why
├── shared/         contract.ts: the types both sides build against
├── frontend/       Next.js app: screens, camera, guide, minimap, Home Screen shell
└── backend/
    ├── core/       pure logic that runs on the phone: guidance, fog of war
    └── server/     server-only: store search, ranking, routing (holds API keys)
```

One Vercel project. `frontend/` is the deployed app; its `/api/*` routes are thin wrappers around `backend/server/`. npm workspaces let `frontend/` import `shared/` and `backend/core/` directly. Keeping `server/` separate means no API key can leak into the phone's bundle.

**Frontend: everything you see and touch** · owner: Matt (@mbwiller)

- Find Bev, the Finding Bev shimmer, the Found screen, arrival, and edge states
- Full-screen rear camera and the animated four-state guide
- Minimap rendering: dark and color layers, fog mask, accuracy circle, heading triangle
- Sensors and permissions: reads raw GPS, compass, and camera; smooths the compass and converts magnetic to true north; hands values to `backend/core/`. Owns the reroute timing (`offRoute` held ~5 s, at most every ~15 s)
- Home Screen shell: manifest, icon, standalone mode, safe areas, install hint

**Backend: everything that finds, routes, and computes** · owner: Arjun (@acheema5)

- `/api/find-bev` and `/api/route`: candidate search, open-now and open-on-arrival filters, walking-time ranking, routing
- Google Maps Platform keys, field masks, budget alert
- Guidance: route snapping, look-ahead target, arrow state, off-route, arrival
- Fog of war data: what's revealed, saved on the phone
- Fixtures and a **simulated walk** (fake GPS and heading moving along a recorded route, e.g. `?sim=1`) so the frontend can be built and demoed at a desk

The adjustment: guidance math lives in `backend/` even though it runs on the phone. It's pure logic with no UI, it's easy to unit-test, and it evens out the work, since the frontend list is already the longer one.

**Integration agent: runs continuously** *(proposed)*

- Works alongside both workstreams from the start.
- Merges both folders, keeps `shared/contract.ts` authoritative, and wires `backend/server/` into the API routes.
- After each merge: build, test, deploy a Vercel preview, and run the simulated walk end to end.
- Flags anything that drifts from this doc or creeps past v1.

**Rules for every agent in this repo** *(proposed)*

1. Read VISION.md before starting.
2. Stay in your folder. Changes to `shared/` go through the integration agent.
3. Build against the contract, not the other side's internals. The frontend uses fixtures until the real API is live.
4. v1 only. Anything else goes to Later or Open decisions; don't build it.
5. When unsure, choose the simpler option and log the choice.
6. Never commit keys. Server keys live in Vercel environment variables.
7. Test on a real iPhone using the Vercel preview URL. Camera, location, and compass need HTTPS and a real device.

## Glossary

| Term | Meaning |
|---|---|
| **Bev** | A drink you can grab and go |
| **Destination** | The one store chosen for this tap |
| **Guide** | The animated blue line and arrowhead over the camera |
| **Heading** | The compass direction the back camera faces |
| **Relative angle** | The angle from your heading to the route; decides the arrow state |
| **Accuracy circle** | The circle around you, sized to GPS accuracy |
| **Fog of war** | The dark minimap layer that clears as you explore |
| **Reveal radius** | How far around you the fog clears: 15 m |

## Decision log

Decisions from the founding conversation. Add new ones at the bottom.

| Date | Decision |
|---|---|
| 2026-10-02 | Extremely simple, clean app; the home screen is one Apple-glass button: **Find Bev** |
| 2026-10-02 | Loading state: **Finding Bev**, with light streaming through the text |
| 2026-10-02 | Phones only, shipped as a Home Screen web app on Vercel. No App Store, so capital goes into Bev Maps instead of Apple's $99/year fee |
| 2026-10-02 | On foot only |
| 2026-10-02 | Destination = the closest store that's open now |
| 2026-10-02 | Navigation through the camera, Pokémon Go-style, with an animated dashed-line arrow: straight, left, right, U-turn |
| 2026-10-02 | Minimap in the upper-left (moved from upper-right), with accuracy circle and heading |
| 2026-10-02 | Minimap uses fog of war: dark until explored, full color after, 15 m around the user |
| 2026-10-02 | Photo capture deferred to v2 |
| 2026-10-02 | User-added locations, points, and profiles deferred |
| 2026-10-02 | Build process: VISION.md → two subfolders, one per person → agents in parallel → an integration agent combining work continuously |
| 2026-10-03 | #3: the unexplored minimap is Google dark mode; #6 heading-up and #7 faint route + pin confirmed |
| 2026-10-03 | #8: arrival is the quiet "You found Bev" glass card, Done → home |
| 2026-10-03 | #9: behind the Find Bev glass, an off-white field with two or three very soft, slowly drifting white and gray light shapes. No color |
| 2026-10-03 | #10: "Finding Bev" is secondary-gray text with a brighter band sweeping through it |
| 2026-10-03 | Find Bev → Finding Bev → Enable camera is one glass button that morphs; the "7-Eleven · 4 min" line fades in above it |
| 2026-10-03 | Home is always light, whatever the phone's appearance setting. Status bar is black-translucent so the camera runs full-bleed; Home adds a very faint gray fade behind it so the white clock and battery stay readable |
| 2026-10-03 | Minimap: rounded square, ~150 pt, ~150 m across, no labels or POIs. Google's logo and attribution stay fully visible (Maps Platform terms), so it isn't a circle |
| 2026-10-03 | Heading smoothing and magnetic → true north correction move to the frontend (they're sensor input); `guide()` receives a smoothed true-north heading. The frontend owns reroute timing |
| 2026-10-03 | New edge states: compass unusable, Precise Location off, no GPS fix, phone sideways. Motion "ask once more" is a reopen hint (iPhone can't re-prompt in the same session) |
| 2026-10-03 | The guide's dashes flow with an SVG dash-offset animation (a paint, not a transform); fine for one path; to be verified at 60 fps on a real iPhone |
| 2026-10-03 | No screen wake lock in v1 |
| 2026-10-03 | Development builds use fixtures for `/api/find-bev` unless `?live=1`; production is live. Protects the Places free tier |
| 2026-10-03 | Finding Bev location: after 8 s settle for ≤100 m; at 15 s use the best fix within 200 m (findBev treats the fix as exact), else "Couldn't find you". "Precise Location off" only when every fix is worse than 1 km (cell-only fixes indoors can exceed 500 m) |
| 2026-10-03 | /api/find-bev client timeout is 12 s, not 10 s: the server's worst case is ~9 s (3 Google calls × 3 s) plus a cold start |
| 2026-10-03 | #5: a bev is any place open now that sells drinks, cafés included. Convenience stores and supermarkets alone sent a user at Cornell Tech to a Duane Reade 505 m away past an open café 101 m away. Restaurants and bars aren't searched for. If the nearest 20 results are all closed, a second search covers long-hours stores only |
| 2026-10-03 | The guide is a translucent blue line with a band of light sweeping into a notched arrowhead (1.7 s, like the Finding Bev shimmer), replacing the white dashed line. Matt picked it from five blue, translucent options. The band is three dash-offset strokes inside one SVG mask; verify 60 fps on a real iPhone |

## References

- Google Maps JavaScript API, map color scheme (light or dark, fixed when the map is created): https://developers.google.com/maps/documentation/javascript/mapcolorscheme
- WebKit bug 215884, camera permission in Home Screen web apps: https://bugs.webkit.org/show_bug.cgi?id=215884
- Background on WebXR and Safari on iPhone (2022): https://www.mactech.com/2022/05/09/apples-lack-of-webar-in-safari-reportedly-hampered-ar-adoption/amp/
